//
// AuthService.swift
// FleetTracker
//
// HUMAN TASKS:
// 1. Configure OAuth 2.0 client credentials in environment configuration
// 2. Set up proper keychain access groups if using multiple extensions
// 3. Verify token refresh timing aligns with backend token expiration policy
// 4. Configure SSL certificate pinning for authentication endpoints
// 5. Test token refresh flow across different network conditions

import Foundation // iOS 14.0+
import Combine   // iOS 14.0+

/// Service class responsible for handling user authentication, token management, and session handling
/// Implements requirements:
/// - Authentication and Authorization (8.1.1 Authentication Methods)
/// - Security Protocols (8.3.1 Network Security)
/// - Offline Operation Support (1.2 Scope/Performance Requirements)
public final class AuthService {
    
    // MARK: - Properties
    
    /// Singleton instance
    public static let shared = AuthService()
    
    /// Current authenticated user publisher
    public let currentUser = CurrentValueSubject<User?, Never>(nil)
    
    /// Set of cancellable subscriptions
    private var cancellables = Set<AnyCancellable>()
    
    /// Timer for automatic token refresh
    private var refreshTimer: Timer?
    
    // MARK: - Constants
    
    private enum AuthError: Error {
        case invalidCredentials
        case tokenRefreshFailed
        case networkError
        case invalidResponse
    }
    
    // MARK: - Initialization
    
    private init() {
        setupTokenRefreshTimer()
    }
    
    // MARK: - Authentication
    
    /// Authenticates user with email and password using OAuth 2.0 + OIDC
    /// - Parameters:
    ///   - email: User's email address
    ///   - password: User's password
    /// - Returns: Publisher that emits authenticated user or error
    public func login(email: String, password: String) -> AnyPublisher<User, Error> {
        // Create OAuth 2.0 login request
        var request = URLRequest(url: URL(string: "\(APIConstants.baseURL)/\(APIConstants.apiVersion)\(APIEndpoints.auth)/login")!)
        request.httpMethod = "POST"
        request.setValue(APIHeaders.contentType, forHTTPHeaderField: "Content-Type")
        
        let credentials = ["email": email, "password": password]
        request.httpBody = try? JSONSerialization.data(withJSONObject: credentials)
        
        return NetworkManager.shared.performRequest(request)
            .tryMap { data -> User in
                guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let userData = json["user"] as? [String: Any],
                      let tokens = json["tokens"] as? [String: Any],
                      let id = userData["id"] as? String,
                      let email = userData["email"] as? String,
                      let firstName = userData["firstName"] as? String,
                      let lastName = userData["lastName"] as? String,
                      let role = userData["role"] as? String,
                      let accessToken = tokens["accessToken"] as? String,
                      let refreshToken = tokens["refreshToken"] as? String,
                      let expiresIn = tokens["expiresIn"] as? TimeInterval else {
                    throw AuthError.invalidResponse
                }
                
                let user = User(id: id, email: email, firstName: firstName, lastName: lastName, role: role)
                let expirationDate = Date().addingTimeInterval(expiresIn)
                
                // Securely save tokens using AES-256 encryption
                guard user.saveTokens(accessToken: accessToken, refreshToken: refreshToken, expirationDate: expirationDate) else {
                    throw AuthError.invalidCredentials
                }
                
                self.currentUser.send(user)
                return user
            }
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    /// Logs out current user and securely clears session
    /// - Returns: Publisher that completes when logout is successful
    public func logout() -> AnyPublisher<Void, Error> {
        guard let user = currentUser.value else {
            return Just(()).setFailureType(to: Error.self).eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: URL(string: "\(APIConstants.baseURL)/\(APIConstants.apiVersion)\(APIEndpoints.auth)/logout")!)
        request.httpMethod = "POST"
        
        return NetworkManager.shared.performRequest(request)
            .tryMap { _ in
                user.clearTokens()
                self.currentUser.send(nil)
                self.refreshTimer?.invalidate()
                self.refreshTimer = nil
            }
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    /// Refreshes OAuth 2.0 authentication token when expired
    /// - Returns: Publisher that completes when token refresh is successful
    private func refreshToken() -> AnyPublisher<Void, Error> {
        guard let user = currentUser.value,
              user.loadTokens() else {
            return Fail(error: AuthError.tokenRefreshFailed).eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: URL(string: "\(APIConstants.baseURL)/\(APIConstants.apiVersion)\(APIEndpoints.auth)/refresh")!)
        request.httpMethod = "POST"
        request.setValue(APIHeaders.contentType, forHTTPHeaderField: "Content-Type")
        
        return NetworkManager.shared.performRequest(request)
            .tryMap { data -> Void in
                guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let tokens = json["tokens"] as? [String: Any],
                      let accessToken = tokens["accessToken"] as? String,
                      let refreshToken = tokens["refreshToken"] as? String,
                      let expiresIn = tokens["expiresIn"] as? TimeInterval else {
                    throw AuthError.invalidResponse
                }
                
                let expirationDate = Date().addingTimeInterval(expiresIn)
                guard user.saveTokens(accessToken: accessToken, refreshToken: refreshToken, expirationDate: expirationDate) else {
                    throw AuthError.tokenRefreshFailed
                }
            }
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    /// Checks current authentication state and refreshes if needed
    /// - Returns: Publisher that emits authentication state
    public func checkAuthState() -> AnyPublisher<Bool, Never> {
        guard let user = currentUser.value else {
            return Just(false).eraseToAnyPublisher()
        }
        
        // Load tokens and check validity
        guard user.loadTokens() else {
            currentUser.send(nil)
            return Just(false).eraseToAnyPublisher()
        }
        
        if user.isTokenValid() {
            return Just(true).eraseToAnyPublisher()
        }
        
        // Attempt token refresh if expired
        return refreshToken()
            .map { _ in true }
            .catch { _ in Just(false) }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Token Refresh Timer
    
    private func setupTokenRefreshTimer() {
        // Refresh token 5 minutes before expiration
        let refreshInterval: TimeInterval = 300 // 5 minutes
        
        refreshTimer = Timer.scheduledTimer(withTimeInterval: refreshInterval, repeats: true) { [weak self] _ in
            guard let self = self,
                  let user = self.currentUser.value,
                  user.loadTokens(),
                  !user.isTokenValid() else {
                return
            }
            
            _ = self.refreshToken()
                .sink(
                    receiveCompletion: { _ in },
                    receiveValue: { _ in }
                )
                .store(in: &self.cancellables)
        }
    }
    
    // MARK: - Cleanup
    
    deinit {
        refreshTimer?.invalidate()
        cancellables.removeAll()
    }
}