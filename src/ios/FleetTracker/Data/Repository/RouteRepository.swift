//
// RouteRepository.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify CoreData schema includes Route entity with all required attributes
// 2. Configure background fetch capabilities for sync operations
// 3. Set up proper error logging and monitoring system
// 4. Test sync conflict resolution scenarios
// 5. Verify offline data encryption settings

import Foundation  // iOS 14.0+
import CoreData   // iOS 14.0+
import Combine    // iOS 14.0+

/// Repository class that manages route data persistence, retrieval, and synchronization
/// Requirements addressed:
/// - Route optimization and planning capabilities for delivery fleet
/// - Offline data handling capabilities in mobile applications
/// - Real-time data synchronization between mobile and backend
/// - 30-second maximum data latency
@objc
@objcMembers
public class RouteRepository: NSObject {
    
    // MARK: - Properties
    
    /// Shared singleton instance
    public static let shared = RouteRepository()
    
    /// Core Data manager reference
    private let coreDataManager: CoreDataManager
    
    /// Sync service reference
    private let syncService: SyncService
    
    /// View context for database operations
    private let viewContext: NSManagedObjectContext
    
    /// Set to store active Combine subscriptions
    private var cancellables: Set<AnyCancellable>
    
    // MARK: - Initialization
    
    private override init() {
        self.coreDataManager = CoreDataManager.shared
        self.syncService = SyncService.shared
        self.viewContext = CoreDataManager.shared.viewContext
        self.cancellables = Set<AnyCancellable>()
        
        super.init()
        
        // Setup real-time sync observers
        setupSyncObservers()
    }
    
    // MARK: - Public Methods
    
    /// Saves or updates a route in local storage and triggers sync
    /// Requirements addressed:
    /// - Offline data handling capabilities
    /// - Real-time data synchronization
    public func saveRoute(_ route: Route) -> AnyPublisher<Bool, Error> {
        return Future<Bool, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "com.fleettracker.route",
                                      code: -1,
                                      userInfo: [NSLocalizedDescriptionKey: "Repository instance is nil"])))
                return
            }
            
            // Validate route data
            guard route.id.isEmpty == false else {
                promise(.failure(NSError(domain: "com.fleettracker.route",
                                      code: -2,
                                      userInfo: [NSLocalizedDescriptionKey: "Invalid route ID"])))
                return
            }
            
            // Convert route to dictionary format
            let routeDict = route.toDictionary()
            
            // Save to Core Data
            let success = self.coreDataManager.saveRoute(route)
            
            if success {
                // Update offline and sync flags
                route.isOffline = !NetworkManager.shared.isConnected
                route.isSynced = false
                
                // Trigger sync if network available
                if NetworkManager.shared.isConnected {
                    self.syncService.startSync()
                }
                
                promise(.success(true))
            } else {
                promise(.failure(NSError(domain: "com.fleettracker.route",
                                      code: -3,
                                      userInfo: [NSLocalizedDescriptionKey: "Failed to save route"])))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Retrieves a route by ID from local storage
    /// Requirements addressed:
    /// - Offline data handling capabilities
    public func getRoute(routeId: String) -> AnyPublisher<Route?, Error> {
        return Future<Route?, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "com.fleettracker.route",
                                      code: -1,
                                      userInfo: [NSLocalizedDescriptionKey: "Repository instance is nil"])))
                return
            }
            
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Route")
            fetchRequest.predicate = NSPredicate(format: "id == %@", routeId)
            
            do {
                let results = try self.viewContext.fetch(fetchRequest)
                if let routeObject = results.first {
                    // Convert managed object to Route model
                    let routeDict = routeObject.dictionaryWithValues(forKeys: Array(routeObject.entity.attributesByName.keys))
                    // Implementation would create Route from dictionary
                    // This is a placeholder that should be implemented based on the Route model
                    promise(.success(nil))
                } else {
                    promise(.success(nil))
                }
            } catch {
                promise(.failure(error))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Retrieves all active routes from local storage
    /// Requirements addressed:
    /// - Route optimization and planning capabilities
    public func getActiveRoutes() -> AnyPublisher<[Route], Error> {
        return Future<[Route], Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "com.fleettracker.route",
                                      code: -1,
                                      userInfo: [NSLocalizedDescriptionKey: "Repository instance is nil"])))
                return
            }
            
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Route")
            fetchRequest.predicate = NSPredicate(format: "status == %@", RouteStatus.inProgress.rawValue)
            
            do {
                let results = try self.viewContext.fetch(fetchRequest)
                let routes: [Route] = results.compactMap { routeObject in
                    let routeDict = routeObject.dictionaryWithValues(forKeys: Array(routeObject.entity.attributesByName.keys))
                    // Implementation would create Route from dictionary
                    // This is a placeholder that should be implemented based on the Route model
                    return nil
                }
                promise(.success(routes))
            } catch {
                promise(.failure(error))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Updates route status and triggers sync
    /// Requirements addressed:
    /// - Real-time data synchronization
    /// - 30-second maximum data latency
    public func updateRouteStatus(routeId: String, status: RouteStatus) -> AnyPublisher<Bool, Error> {
        return Future<Bool, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "com.fleettracker.route",
                                      code: -1,
                                      userInfo: [NSLocalizedDescriptionKey: "Repository instance is nil"])))
                return
            }
            
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Route")
            fetchRequest.predicate = NSPredicate(format: "id == %@", routeId)
            
            do {
                let results = try self.viewContext.fetch(fetchRequest)
                if let routeObject = results.first {
                    // Update status
                    routeObject.setValue(status.rawValue, forKey: "status")
                    routeObject.setValue(false, forKey: "isSynced")
                    routeObject.setValue(Date(), forKey: "lastModified")
                    
                    // Save changes
                    try self.viewContext.save()
                    
                    // Trigger sync if network available
                    if NetworkManager.shared.isConnected {
                        self.syncService.startSync()
                    }
                    
                    promise(.success(true))
                } else {
                    promise(.failure(NSError(domain: "com.fleettracker.route",
                                          code: -2,
                                          userInfo: [NSLocalizedDescriptionKey: "Route not found"])))
                }
            } catch {
                promise(.failure(error))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Deletes a route from local storage and triggers sync
    /// Requirements addressed:
    /// - Offline data handling capabilities
    /// - Real-time data synchronization
    public func deleteRoute(routeId: String) -> AnyPublisher<Bool, Error> {
        return Future<Bool, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "com.fleettracker.route",
                                      code: -1,
                                      userInfo: [NSLocalizedDescriptionKey: "Repository instance is nil"])))
                return
            }
            
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Route")
            fetchRequest.predicate = NSPredicate(format: "id == %@", routeId)
            
            do {
                let results = try self.viewContext.fetch(fetchRequest)
                if let routeObject = results.first {
                    // Mark for deletion in sync queue
                    routeObject.setValue(true, forKey: "isDeleted")
                    routeObject.setValue(false, forKey: "isSynced")
                    routeObject.setValue(Date(), forKey: "lastModified")
                    
                    // Delete from context
                    self.viewContext.delete(routeObject)
                    
                    // Save changes
                    try self.viewContext.save()
                    
                    // Trigger sync if network available
                    if NetworkManager.shared.isConnected {
                        self.syncService.startSync()
                    }
                    
                    promise(.success(true))
                } else {
                    promise(.failure(NSError(domain: "com.fleettracker.route",
                                          code: -2,
                                          userInfo: [NSLocalizedDescriptionKey: "Route not found"])))
                }
            } catch {
                promise(.failure(error))
            }
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Private Methods
    
    /// Sets up observers for sync-related notifications
    private func setupSyncObservers() {
        // Observe sync completion
        NotificationCenter.default.publisher(for: NSNotification.Name("DataSyncCompleted"))
            .sink { [weak self] _ in
                self?.handleSyncCompletion()
            }
            .store(in: &cancellables)
        
        // Observe route data updates
        NotificationCenter.default.publisher(for: NSNotification.Name("RouteDataUpdated"))
            .sink { [weak self] _ in
                self?.handleRouteDataUpdate()
            }
            .store(in: &cancellables)
    }
    
    /// Handles sync completion events
    private func handleSyncCompletion() {
        // Refresh view context
        viewContext.refreshAllObjects()
        
        // Post notification for UI update
        NotificationCenter.default.post(name: NSNotification.Name("RouteRepositoryDataUpdated"), object: nil)
    }
    
    /// Handles route data update events
    private func handleRouteDataUpdate() {
        // Refresh view context
        viewContext.refreshAllObjects()
        
        // Post notification for UI update
        NotificationCenter.default.post(name: NSNotification.Name("RouteRepositoryDataUpdated"), object: nil)
    }
}