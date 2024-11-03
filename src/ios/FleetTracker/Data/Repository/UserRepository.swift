//
// UserRepository.swift
// FleetTracker
//
// HUMAN TASKS:
// 1. Verify Core Data schema includes User entity with required attributes
// 2. Configure proper keychain access groups for token storage
// 3. Test token synchronization behavior across different network conditions
// 4. Verify offline data merge strategy aligns with business requirements

import Foundation // iOS 14.0+
import CoreData   // iOS 14.0+
import Combine    // iOS 14.0+

/// Repository class that manages user data persistence, caching, and synchronization
/// between local storage and remote backend using OAuth 2.0 + OIDC with JWT tokens
/// Requirements addressed:
/// - Authentication and Authorization (8.1.1)
/// - Offline Operation Support (1.2)
/// - Security Protocols (8.3.1)
public final class UserRepository {
    
    // MARK: - Properties
    
    /// Shared singleton instance
    public static let shared = UserRepository()
    
    /// Core Data managed object context
    private let context: NSManagedObjectContext
    
    /// Subject for publishing user updates
    private let userUpdateSubject = PassthroughSubject<User, Error>()
    
    /// Set of cancellable subscriptions
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    private init() {
        self.context = CoreDataManager.shared.viewContext
        
        // Observe changes to current user
        AuthService.shared.currentUser
            .sink { [weak self] user in
                if let user = user {
                    self?.saveUser(user)
                        .sink(
                            receiveCompletion: { _ in },
                            receiveValue: { _ in }
                        )
                        .store(in: &self!.cancellables)
                }
            }
            .store(in: &cancellables)
        
        // Configure automatic merging of changes from background context
        NotificationCenter.default.publisher(for: .NSManagedObjectContextDidSave)
            .sink { [weak self] notification in
                guard let self = self,
                      let notificationContext = notification.object as? NSManagedObjectContext,
                      notificationContext != self.context else {
                    return
                }
                self.context.perform {
                    self.context.mergeChanges(fromContextDidSave: notification)
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - User Management
    
    /// Saves or updates user data in local storage with secure token handling
    /// Implements requirement: Authentication and Authorization (8.1.1)
    /// - Parameter user: User object to save
    /// - Returns: Publisher that emits saved user or error
    public func saveUser(_ user: User) -> AnyPublisher<User, Error> {
        return Future<User, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "UserRepository", code: -1)))
                return
            }
            
            self.context.perform {
                do {
                    // Fetch existing user or create new one
                    let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "User")
                    fetchRequest.predicate = NSPredicate(format: "id == %@", user.id)
                    
                    let results = try self.context.fetch(fetchRequest)
                    let managedUser = results.first ?? NSEntityDescription.insertNewObject(forEntityName: "User", into: self.context)
                    
                    // Update managed object properties
                    managedUser.setValue(user.id, forKey: "id")
                    managedUser.setValue(user.email, forKey: "email")
                    managedUser.setValue(user.firstName, forKey: "firstName")
                    managedUser.setValue(user.lastName, forKey: "lastName")
                    managedUser.setValue(user.phoneNumber, forKey: "phoneNumber")
                    managedUser.setValue(user.role, forKey: "role")
                    managedUser.setValue(Date(), forKey: "updatedAt")
                    
                    // Save context
                    try self.context.save()
                    
                    // Notify observers
                    self.userUpdateSubject.send(user)
                    promise(.success(user))
                } catch {
                    promise(.failure(error))
                }
            }
        }
        .receive(on: DispatchQueue.main)
        .eraseToAnyPublisher()
    }
    
    /// Retrieves current user from local storage with token validation
    /// Implements requirements: Offline Operation Support (1.2)
    /// - Returns: Publisher that emits current user or nil
    public func getCurrentUser() -> AnyPublisher<User?, Never> {
        // First check AuthService for cached user
        if let currentUser = AuthService.shared.currentUser.value {
            return Just(currentUser).eraseToAnyPublisher()
        }
        
        return Future<User?, Never> { [weak self] promise in
            guard let self = self else {
                promise(.success(nil))
                return
            }
            
            self.context.perform {
                let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "User")
                
                do {
                    let results = try self.context.fetch(fetchRequest)
                    guard let managedUser = results.first,
                          let id = managedUser.value(forKey: "id") as? String,
                          let email = managedUser.value(forKey: "email") as? String,
                          let firstName = managedUser.value(forKey: "firstName") as? String,
                          let lastName = managedUser.value(forKey: "lastName") as? String,
                          let role = managedUser.value(forKey: "role") as? String else {
                        promise(.success(nil))
                        return
                    }
                    
                    let user = User(id: id, email: email, firstName: firstName, lastName: lastName, role: role)
                    user.phoneNumber = managedUser.value(forKey: "phoneNumber") as? String
                    
                    // Validate OAuth tokens
                    if user.loadTokens(), user.isTokenValid() {
                        promise(.success(user))
                    } else {
                        promise(.success(nil))
                    }
                } catch {
                    promise(.success(nil))
                }
            }
        }
        .receive(on: DispatchQueue.main)
        .eraseToAnyPublisher()
    }
    
    /// Updates user profile information with offline support
    /// Implements requirements: Offline Operation Support (1.2)
    /// - Parameters:
    ///   - firstName: User's first name
    ///   - lastName: User's last name
    ///   - phoneNumber: Optional phone number
    /// - Returns: Publisher that emits updated user or error
    public func updateUserProfile(firstName: String, lastName: String, phoneNumber: String?) -> AnyPublisher<User, Error> {
        return getCurrentUser()
            .compactMap { $0 }
            .setFailureType(to: Error.self)
            .flatMap { [weak self] user -> AnyPublisher<User, Error> in
                guard let self = self else {
                    return Fail(error: NSError(domain: "UserRepository", code: -1)).eraseToAnyPublisher()
                }
                
                let updatedUser = User(id: user.id, email: user.email, firstName: firstName, lastName: lastName, role: user.role)
                updatedUser.phoneNumber = phoneNumber
                
                // Load existing tokens into updated user
                _ = user.loadTokens()
                
                return self.saveUser(updatedUser)
            }
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    /// Removes user data from local storage with secure token cleanup
    /// Implements requirements: Security Protocols (8.3.1)
    /// - Parameter userId: ID of user to delete
    /// - Returns: Publisher that completes when deletion is successful
    public func deleteUser(userId: String) -> AnyPublisher<Void, Error> {
        return Future<Void, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "UserRepository", code: -1)))
                return
            }
            
            self.context.perform {
                let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "User")
                fetchRequest.predicate = NSPredicate(format: "id == %@", userId)
                
                do {
                    let results = try self.context.fetch(fetchRequest)
                    if let user = results.first {
                        // Clear OAuth tokens securely
                        if let id = user.value(forKey: "id") as? String,
                           let email = user.value(forKey: "email") as? String,
                           let firstName = user.value(forKey: "firstName") as? String,
                           let lastName = user.value(forKey: "lastName") as? String,
                           let role = user.value(forKey: "role") as? String {
                            let userObj = User(id: id, email: email, firstName: firstName, lastName: lastName, role: role)
                            userObj.clearTokens()
                        }
                        
                        // Delete user from Core Data
                        self.context.delete(user)
                        try self.context.save()
                        
                        promise(.success(()))
                    } else {
                        promise(.success(()))
                    }
                } catch {
                    promise(.failure(error))
                }
            }
        }
        .receive(on: DispatchQueue.main)
        .eraseToAnyPublisher()
    }
    
    /// Synchronizes local user data with remote backend using OAuth authentication
    /// Implements requirements: Offline Operation Support (1.2)
    /// - Returns: Publisher that completes when sync is successful
    public func syncUserData() -> AnyPublisher<Void, Error> {
        return getCurrentUser()
            .compactMap { $0 }
            .setFailureType(to: Error.self)
            .flatMap { user -> AnyPublisher<Void, Error> in
                // Validate current OAuth token
                guard user.loadTokens(), user.isTokenValid() else {
                    return Fail(error: NSError(domain: "UserRepository", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid token"])).eraseToAnyPublisher()
                }
                
                // Create sync request
                var request = URLRequest(url: URL(string: "\(APIConstants.baseURL)/\(APIConstants.apiVersion)/users/sync")!)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                
                return NetworkManager.shared.performRequest(request)
                    .tryMap { _ in () }
                    .receive(on: DispatchQueue.main)
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Cleanup
    
    deinit {
        cancellables.removeAll()
    }
}