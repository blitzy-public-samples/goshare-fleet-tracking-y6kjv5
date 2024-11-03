//
// NetworkManager.swift
// FleetTracker
//
// HUMAN TASKS:
// 1. Configure SSL certificate pinning in URLSession configuration
// 2. Set up background URLSession capabilities in Info.plist
// 3. Configure network access permissions in Info.plist
// 4. Verify WebSocket endpoint configurations match backend
// 5. Test offline request persistence across app restarts

import Foundation // iOS 14.0+
import Combine   // iOS 14.0+
import Network   // iOS 14.0+

/// NetworkManager handles all network communication in the Fleet Tracking System's iOS application
/// Implements requirements:
/// - RESTful API communication (1.2 Scope/Integration Capabilities)
/// - Real-time WebSocket connections (1.2 Scope/Technical Implementation)
/// - Offline request queueing (1.2 Scope/Technical Implementation)
/// - Sub-second response times (1.2 Scope/Performance Requirements)
public final class NetworkManager {
    
    // MARK: - Properties
    
    /// URLSession instance for network requests
    private let session: URLSession
    
    /// Serial queue for processing network requests
    private let requestQueue: DispatchQueue
    
    /// Set of pending network tasks
    private var pendingTasks: Set<URLSessionTask>
    
    /// Queue for storing offline requests
    private var offlineQueue: [URLRequest]
    
    /// Network path monitor for connectivity status
    private let networkMonitor: NWPathMonitor
    
    /// Current network connectivity status
    private var isConnected: Bool = false
    
    /// WebSocket task for real-time updates
    private var webSocketTask: URLSessionWebSocketTask?
    
    /// Singleton instance
    public static let shared = NetworkManager()
    
    // MARK: - Constants
    
    private enum NetworkError: Error {
        case noConnection
        case invalidResponse
        case requestFailed
        case webSocketError
    }
    
    // MARK: - Initialization
    
    private init() {
        // Configure URLSession with default timeout
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = APIConstants.defaultTimeout
        configuration.timeoutIntervalForResource = APIConstants.defaultTimeout * 2
        configuration.waitsForConnectivity = true
        
        self.session = URLSession(configuration: configuration)
        self.requestQueue = DispatchQueue(label: "com.fleettracker.networkQueue")
        self.pendingTasks = Set<URLSessionTask>()
        self.offlineQueue = []
        self.networkMonitor = NWPathMonitor()
        
        setupNetworkMonitoring()
    }
    
    // MARK: - Network Monitoring
    
    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            self?.isConnected = path.status == .satisfied
            if self?.isConnected == true {
                self?.processOfflineQueue()
            }
        }
        networkMonitor.start(queue: requestQueue)
    }
    
    // MARK: - Request Handling
    
    /// Performs a network request with automatic retry and offline queueing
    /// - Parameters:
    ///   - request: The URLRequest to be executed
    ///   - retryCount: Number of retry attempts for failed requests
    /// - Returns: Publisher that emits response data or error
    public func performRequest(
        _ request: URLRequest,
        retryCount: Int = 3
    ) -> AnyPublisher<Data, Error> {
        return Deferred {
            Future { [weak self] promise in
                guard let self = self else {
                    promise(.failure(NetworkError.requestFailed))
                    return
                }
                
                // Check network connectivity
                guard self.isConnected else {
                    self.queueOfflineRequest(request)
                    promise(.failure(NetworkError.noConnection))
                    return
                }
                
                // Add authentication if needed
                var authenticatedRequest = request
                if let authToken = KeychainManager.shared.retrieveItem(key: "authToken") {
                    authenticatedRequest.addValue(
                        "Bearer \(String(data: authToken, encoding: .utf8) ?? "")",
                        forHTTPHeaderField: APIHeaders.authorization
                    )
                }
                
                // Add common headers
                authenticatedRequest.addValue(
                    APIHeaders.contentType,
                    forHTTPHeaderField: "Content-Type"
                )
                authenticatedRequest.addValue(
                    APIHeaders.accept,
                    forHTTPHeaderField: "Accept"
                )
                
                let task = self.session.dataTask(with: authenticatedRequest) { data, response, error in
                    if let error = error {
                        if retryCount > 0 {
                            // Retry the request
                            self.requestQueue.asyncAfter(deadline: .now() + 0.5) {
                                _ = self.performRequest(request, retryCount: retryCount - 1)
                                    .sink(
                                        receiveCompletion: { completion in
                                            if case .failure = completion {
                                                promise(.failure(error))
                                            }
                                        },
                                        receiveValue: { data in
                                            promise(.success(data))
                                        }
                                    )
                            }
                        } else {
                            promise(.failure(error))
                        }
                        return
                    }
                    
                    guard let httpResponse = response as? HTTPURLResponse,
                          (200...299).contains(httpResponse.statusCode),
                          let responseData = data else {
                        promise(.failure(NetworkError.invalidResponse))
                        return
                    }
                    
                    promise(.success(responseData))
                }
                
                self.pendingTasks.insert(task)
                task.resume()
            }
        }
        .handleEvents(receiveCompletion: { [weak self] _ in
            guard let self = self else { return }
            self.pendingTasks.remove(task)
        })
        .eraseToAnyPublisher()
    }
    
    // MARK: - WebSocket Handling
    
    /// Establishes WebSocket connection for real-time updates
    /// - Parameter endpoint: The WebSocket endpoint path
    public func setupWebSocket(endpoint: String) {
        let wsURL = URL(string: "\(APIConstants.baseURL.replacingOccurrences(of: "https", with: "wss"))/\(APIConstants.apiVersion)/\(endpoint)")!
        webSocketTask = session.webSocketTask(with: wsURL)
        
        setupWebSocketMessageHandler()
        setupWebSocketMonitoring()
        webSocketTask?.resume()
    }
    
    private func setupWebSocketMessageHandler() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let message):
                self.handleWebSocketMessage(message)
                self.setupWebSocketMessageHandler() // Setup next message handler
            case .failure(let error):
                print("WebSocket error: \(error)")
                self.reconnectWebSocket()
            }
        }
    }
    
    private func handleWebSocketMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            // Process text message
            NotificationCenter.default.post(
                name: Notification.Name("WebSocketMessage"),
                object: nil,
                userInfo: ["message": text]
            )
        case .data(let data):
            // Process binary message
            NotificationCenter.default.post(
                name: Notification.Name("WebSocketData"),
                object: nil,
                userInfo: ["data": data]
            )
        @unknown default:
            break
        }
    }
    
    private func setupWebSocketMonitoring() {
        // Send ping every 30 seconds to keep connection alive
        requestQueue.asyncAfter(deadline: .now() + 30) { [weak self] in
            guard let self = self else { return }
            
            self.webSocketTask?.sendPing { error in
                if let error = error {
                    print("WebSocket ping failed: \(error)")
                    self.reconnectWebSocket()
                } else {
                    self.setupWebSocketMonitoring()
                }
            }
        }
    }
    
    private func reconnectWebSocket() {
        webSocketTask?.cancel()
        
        // Attempt to reconnect after 5 seconds
        requestQueue.asyncAfter(deadline: .now() + 5) { [weak self] in
            guard let self = self,
                  let url = self.webSocketTask?.originalRequest?.url else { return }
            
            self.webSocketTask = self.session.webSocketTask(with: url)
            self.setupWebSocketMessageHandler()
            self.setupWebSocketMonitoring()
            self.webSocketTask?.resume()
        }
    }
    
    // MARK: - Offline Queue Management
    
    private func queueOfflineRequest(_ request: URLRequest) {
        requestQueue.async { [weak self] in
            self?.offlineQueue.append(request)
            self?.persistOfflineQueue()
        }
    }
    
    private func persistOfflineQueue() {
        // Persist offline queue to UserDefaults for recovery after app restart
        let requestData = try? JSONSerialization.data(withJSONObject: offlineQueue.map { $0.description }, options: [])
        UserDefaults.standard.set(requestData, forKey: "offlineQueue")
    }
    
    /// Processes queued requests when network becomes available
    public func processOfflineQueue() {
        requestQueue.async { [weak self] in
            guard let self = self else { return }
            
            let queue = self.offlineQueue
            self.offlineQueue.removeAll()
            
            for request in queue {
                _ = self.performRequest(request)
                    .sink(
                        receiveCompletion: { _ in },
                        receiveValue: { _ in }
                    )
            }
            
            self.persistOfflineQueue()
        }
    }
    
    // MARK: - Cleanup
    
    deinit {
        networkMonitor.cancel()
        webSocketTask?.cancel()
        pendingTasks.forEach { $0.cancel() }
    }
}