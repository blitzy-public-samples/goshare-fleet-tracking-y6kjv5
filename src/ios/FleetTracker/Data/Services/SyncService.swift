//
// SyncService.swift
// FleetTracker
//
// HUMAN TASKS:
// 1. Verify WebSocket endpoint configuration matches backend settings
// 2. Configure background fetch capabilities in project settings
// 3. Set up proper error logging and monitoring system
// 4. Test sync conflict resolution with backend team
// 5. Verify offline data encryption settings

import Foundation // iOS 14.0+
import Combine   // iOS 14.0+

/// Service class responsible for managing data synchronization between the iOS application and backend servers
/// Requirements addressed:
/// - Real-time data synchronization between mobile and backend (1.2 Scope/Technical Implementation)
/// - Offline-first architecture with data synchronization capabilities (1.2 Scope/Technical Implementation)
/// - 30-second maximum data latency (1.2 Scope/Performance Requirements)
@objc
@objcMembers
public class SyncService: NSObject {
    
    // MARK: - Properties
    
    /// Network manager instance for handling API communication
    private let networkManager: NetworkManager
    
    /// Offline storage manager for handling local data persistence
    private let offlineStorage: OfflineStorage
    
    /// Sync interval in seconds (30 seconds to meet latency requirement)
    private let syncInterval: TimeInterval = 30.0
    
    /// Set of active Combine subscriptions
    private var cancellables: Set<AnyCancellable>
    
    /// Timer for periodic sync operations
    private var syncTimer: Timer?
    
    // MARK: - Initialization
    
    /// Initializes the sync service with required dependencies
    /// - Parameter offlineStorage: OfflineStorage instance for managing offline data
    public init(offlineStorage: OfflineStorage) {
        self.networkManager = NetworkManager.shared
        self.offlineStorage = offlineStorage
        self.cancellables = Set<AnyCancellable>()
        
        super.init()
        
        // Configure offline storage delegate
        self.offlineStorage.delegate = self
    }
    
    // MARK: - Public Methods
    
    /// Starts the synchronization process with both real-time and periodic sync
    /// Requirements addressed:
    /// - Real-time data synchronization
    /// - 30-second maximum data latency
    public func startSync() {
        // Setup WebSocket for real-time updates
        networkManager.setupWebSocket(endpoint: "sync")
        
        // Start periodic sync timer
        syncTimer = Timer.scheduledTimer(withTimeInterval: syncInterval, 
                                       repeats: true) { [weak self] _ in
            self?.performPeriodicSync()
        }
        
        // Perform initial sync
        offlineStorage.syncOfflineData()
        
        // Subscribe to WebSocket messages
        setupWebSocketSubscriptions()
    }
    
    /// Stops all synchronization processes and cleans up resources
    public func stopSync() {
        // Cancel WebSocket connection
        NotificationCenter.default.removeObserver(self)
        
        // Invalidate sync timer
        syncTimer?.invalidate()
        syncTimer = nil
        
        // Cancel all subscriptions
        cancellables.forEach { $0.cancel() }
        cancellables.removeAll()
    }
    
    /// Synchronizes a specific delivery with the backend
    /// - Parameter delivery: Delivery object to synchronize
    /// - Returns: Publisher indicating sync success or failure
    public func syncDelivery(_ delivery: Delivery) -> AnyPublisher<Bool, Error> {
        // Validate delivery data
        guard delivery.id.isEmpty == false else {
            return Fail(error: NSError(domain: "com.fleettracker.sync",
                                     code: -1,
                                     userInfo: [NSLocalizedDescriptionKey: "Invalid delivery ID"]))
                .eraseToAnyPublisher()
        }
        
        // Convert delivery to dictionary format
        let deliveryData = delivery.toDictionary()
        
        // Create sync request
        var request = URLRequest(url: URL(string: "\(APIConstants.baseURL)/deliveries/\(delivery.id)")!)
        request.httpMethod = "PUT"
        request.httpBody = try? JSONSerialization.data(withJSONObject: deliveryData)
        
        return networkManager.performRequest(request)
            .tryMap { data -> Bool in
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                guard let success = json?["success"] as? Bool, success else {
                    throw NSError(domain: "com.fleettracker.sync",
                                code: -2,
                                userInfo: [NSLocalizedDescriptionKey: "Sync failed"])
                }
                return true
            }
            .catch { error -> AnyPublisher<Bool, Error> in
                // Save to offline storage if sync fails
                _ = self.offlineStorage.saveDeliveryOffline(delivery)
                return Fail(error: error).eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Private Methods
    
    /// Performs periodic synchronization of offline data
    private func performPeriodicSync() {
        _ = offlineStorage.syncOfflineData()
            .map { result in
                if let syncedCount = result["successCount"] as? Int {
                    NSLog("Synced \(syncedCount) items successfully")
                }
                return result
            }
    }
    
    /// Sets up subscriptions for WebSocket messages
    private func setupWebSocketSubscriptions() {
        // Subscribe to WebSocket messages
        NotificationCenter.default.publisher(for: Notification.Name("WebSocketMessage"))
            .sink { [weak self] notification in
                guard let messageData = notification.userInfo?["message"] as? String else { return }
                self?.handleWebSocketMessage(Data(messageData.utf8))
            }
            .store(in: &cancellables)
        
        // Subscribe to WebSocket data
        NotificationCenter.default.publisher(for: Notification.Name("WebSocketData"))
            .sink { [weak self] notification in
                guard let data = notification.userInfo?["data"] as? Data else { return }
                self?.handleWebSocketMessage(data)
            }
            .store(in: &cancellables)
    }
    
    /// Processes incoming WebSocket messages for real-time updates
    /// - Parameter messageData: Raw message data from WebSocket
    private func handleWebSocketMessage(_ messageData: Data) {
        do {
            // Decode message data
            let json = try JSONSerialization.jsonObject(with: messageData) as? [String: Any]
            guard let messageType = json?["type"] as? String else { return }
            
            switch messageType {
            case "delivery_update":
                if let deliveryData = json?["data"] as? [String: Any],
                   let deliveryId = deliveryData["id"] as? String {
                    handleDeliveryUpdate(deliveryId: deliveryId, data: deliveryData)
                }
                
            case "route_update":
                if let routeData = json?["data"] as? [String: Any],
                   let routeId = routeData["id"] as? String {
                    handleRouteUpdate(routeId: routeId, data: routeData)
                }
                
            case "sync_request":
                performPeriodicSync()
                
            default:
                NSLog("Unknown message type: \(messageType)")
            }
        } catch {
            NSLog("Failed to process WebSocket message: \(error)")
        }
    }
    
    /// Handles delivery updates received through WebSocket
    private func handleDeliveryUpdate(deliveryId: String, data: [String: Any]) {
        // Update offline storage
        if let delivery = createDeliveryFromData(data) {
            _ = offlineStorage.saveDeliveryOffline(delivery)
        }
    }
    
    /// Handles route updates received through WebSocket
    private func handleRouteUpdate(routeId: String, data: [String: Any]) {
        // Update offline storage
        if let route = createRouteFromData(data) {
            _ = offlineStorage.saveRouteOffline(route)
        }
    }
    
    /// Creates a Delivery object from dictionary data
    private func createDeliveryFromData(_ data: [String: Any]) -> Delivery? {
        guard let id = data["id"] as? String,
              let routeId = data["routeId"] as? String,
              let customerId = data["customerId"] as? String,
              let address = data["address"] as? String,
              let scheduledDateString = data["scheduledDate"] as? String,
              let scheduledDate = ISO8601DateFormatter().date(from: scheduledDateString) else {
            return nil
        }
        
        return Delivery(id: id,
                       routeId: routeId,
                       customerId: customerId,
                       address: address,
                       scheduledDate: scheduledDate)
    }
    
    /// Creates a Route object from dictionary data
    private func createRouteFromData(_ data: [String: Any]) -> Route? {
        // Implementation depends on Route model structure
        return nil
    }
}

// MARK: - OfflineStorageDelegate

extension SyncService: OfflineStorageDelegate {
    
    public func didSaveDeliveryOffline(_ delivery: Delivery) {
        // Schedule sync attempt for the saved delivery
        _ = syncDelivery(delivery)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { _ in }
            )
            .store(in: &cancellables)
    }
    
    public func didSaveRouteOffline(_ route: Route) {
        // Handle route offline storage
        performPeriodicSync()
    }
    
    public func didSyncOfflineData(_ results: [String: Any]) {
        // Log sync results
        if let successCount = results["successCount"] as? Int,
           let failureCount = results["failureCount"] as? Int {
            NSLog("Sync completed - Success: \(successCount), Failures: \(failureCount)")
        }
    }
    
    public func didFailToSaveOffline(_ error: Error) {
        NSLog("Failed to save offline data: \(error)")
    }
}