//
// OfflineStorage.swift
// FleetTracker
//
// Human Tasks:
// 1. Configure CoreData model schema for Delivery and Route entities
// 2. Set up background fetch capabilities in project settings
// 3. Configure proper error logging and monitoring system
// 4. Set up proper encryption for sensitive offline data
// 5. Verify sync conflict resolution strategy with backend team

import Foundation  // iOS SDK 14.0+
import CoreData   // iOS SDK 14.0+

/// Error types for offline storage operations
/// Requirements addressed:
/// - Offline data handling capabilities for mobile applications
public enum StorageError: Error {
    case saveFailed
    case syncFailed
    case notFound
    case invalidData
}

/// Manages offline data storage and synchronization for deliveries and routes using CoreData persistence
/// Requirements addressed:
/// - Offline data handling capabilities for mobile applications
/// - Real-time data synchronization between mobile and backend
/// - Offline-first architecture requirement for mobile applications
@objc
@objcMembers
public class OfflineStorage: NSObject {
    
    // MARK: - Properties
    
    /// Delegate for handling offline storage events
    public weak var delegate: OfflineStorageDelegate?
    
    /// CoreData persistent container for offline storage
    private let persistentContainer: NSPersistentContainer
    
    /// Queue for handling background synchronization
    private let syncQueue: DispatchQueue
    
    /// Interval between sync attempts in seconds (default: 5 minutes)
    private let syncInterval: TimeInterval = 300
    
    /// Timer for scheduled background sync
    private var syncTimer: Timer?
    
    // MARK: - Initialization
    
    /// Initializes the offline storage manager with a CoreData persistent container
    /// - Parameter container: NSPersistentContainer instance for CoreData storage
    public init(container: NSPersistentContainer) {
        self.persistentContainer = container
        self.syncQueue = DispatchQueue(label: "com.fleettracker.offlineSync",
                                     qos: .utility,
                                     attributes: .concurrent)
        
        super.init()
        
        // Setup background sync timer
        setupSyncTimer()
    }
    
    // MARK: - Public Methods
    
    /// Saves a delivery to offline storage using CoreData
    /// Requirements addressed:
    /// - Offline data handling capabilities for mobile applications
    public func saveDeliveryOffline(_ delivery: Delivery) -> Result<Bool, StorageError> {
        let context = persistentContainer.viewContext
        
        do {
            // Convert delivery to managed object
            let deliveryEntity = NSEntityDescription.entity(forEntityName: "DeliveryEntity",
                                                          in: context)!
            let managedDelivery = NSManagedObject(entity: deliveryEntity,
                                                 insertInto: context)
            
            // Set delivery properties
            managedDelivery.setValue(delivery.id, forKey: "id")
            managedDelivery.setValue(delivery.status.rawValue, forKey: "status")
            managedDelivery.setValue(true, forKey: "isOffline")
            managedDelivery.setValue(false, forKey: "isSynced")
            managedDelivery.setValue(Date(), forKey: "lastModified")
            managedDelivery.setValue(delivery.toDictionary(), forKey: "data")
            
            try context.save()
            
            // Notify delegate
            delegate?.didSaveDeliveryOffline?(delivery)
            
            // Schedule background sync
            scheduleSyncAttempt()
            
            return .success(true)
        } catch {
            NSLog("Failed to save delivery offline: \(error)")
            delegate?.didFailToSaveOffline?(error)
            return .failure(.saveFailed)
        }
    }
    
    /// Saves a route to offline storage using CoreData
    /// Requirements addressed:
    /// - Offline data handling capabilities for mobile applications
    public func saveRouteOffline(_ route: Route) -> Result<Bool, StorageError> {
        let context = persistentContainer.viewContext
        
        do {
            // Convert route to managed object
            let routeEntity = NSEntityDescription.entity(forEntityName: "RouteEntity",
                                                       in: context)!
            let managedRoute = NSManagedObject(entity: routeEntity,
                                             insertInto: context)
            
            // Set route properties
            managedRoute.setValue(route.id, forKey: "id")
            managedRoute.setValue(route.status.rawValue, forKey: "status")
            managedRoute.setValue(true, forKey: "isOffline")
            managedRoute.setValue(false, forKey: "isSynced")
            managedRoute.setValue(Date(), forKey: "lastModified")
            managedRoute.setValue(route.toDictionary(), forKey: "data")
            
            try context.save()
            
            // Notify delegate
            delegate?.didSaveRouteOffline?(route)
            
            // Schedule background sync
            scheduleSyncAttempt()
            
            return .success(true)
        } catch {
            NSLog("Failed to save route offline: \(error)")
            delegate?.didFailToSaveOffline?(error)
            return .failure(.saveFailed)
        }
    }
    
    /// Synchronizes offline data with the server in background
    /// Requirements addressed:
    /// - Real-time data synchronization between mobile and backend
    public func syncOfflineData() -> Result<[String: Any], StorageError> {
        let context = persistentContainer.viewContext
        var syncResults: [String: Any] = [:]
        
        syncQueue.async { [weak self] in
            guard let self = self else { return }
            
            do {
                let startTime = Date()
                var successCount = 0
                var failureCount = 0
                var syncedItems: [[String: Any]] = []
                var failedItems: [[String: Any]] = []
                
                // Fetch unsynced deliveries
                let deliveryFetch = NSFetchRequest<NSManagedObject>(entityName: "DeliveryEntity")
                deliveryFetch.predicate = NSPredicate(format: "isOffline = YES AND isSynced = NO")
                let unsyncedDeliveries = try context.fetch(deliveryFetch)
                
                // Fetch unsynced routes
                let routeFetch = NSFetchRequest<NSManagedObject>(entityName: "RouteEntity")
                routeFetch.predicate = NSPredicate(format: "isOffline = YES AND isSynced = NO")
                let unsyncedRoutes = try context.fetch(routeFetch)
                
                // Sync deliveries
                for delivery in unsyncedDeliveries {
                    if let data = delivery.value(forKey: "data") as? [String: Any],
                       let id = delivery.value(forKey: "id") as? String {
                        // Attempt to sync with server (implementation depends on API client)
                        if syncDeliveryWithServer(id: id, data: data) {
                            delivery.setValue(true, forKey: "isSynced")
                            delivery.setValue(false, forKey: "isOffline")
                            syncedItems.append(["type": "delivery", "id": id])
                            successCount += 1
                        } else {
                            failedItems.append(["type": "delivery", "id": id])
                            failureCount += 1
                        }
                    }
                }
                
                // Sync routes
                for route in unsyncedRoutes {
                    if let data = route.value(forKey: "data") as? [String: Any],
                       let id = route.value(forKey: "id") as? String {
                        // Attempt to sync with server (implementation depends on API client)
                        if syncRouteWithServer(id: id, data: data) {
                            route.setValue(true, forKey: "isSynced")
                            route.setValue(false, forKey: "isOffline")
                            syncedItems.append(["type": "route", "id": id])
                            successCount += 1
                        } else {
                            failedItems.append(["type": "route", "id": id])
                            failureCount += 1
                        }
                    }
                }
                
                try context.save()
                
                let endTime = Date()
                
                // Prepare sync results
                syncResults = [
                    "totalSynced": successCount + failureCount,
                    "successCount": successCount,
                    "failureCount": failureCount,
                    "syncedItems": syncedItems,
                    "failedItems": failedItems,
                    "syncStartTime": startTime,
                    "syncEndTime": endTime,
                    "syncDuration": endTime.timeIntervalSince(startTime)
                ]
                
                // Notify delegate on main thread
                DispatchQueue.main.async {
                    self.delegate?.didSyncOfflineData?(syncResults)
                }
                
            } catch {
                NSLog("Failed to sync offline data: \(error)")
                syncResults = [
                    "error": error.localizedDescription,
                    "timestamp": Date()
                ]
            }
        }
        
        return .success(syncResults)
    }
    
    /// Retrieves a delivery from offline storage
    /// Requirements addressed:
    /// - Offline data handling capabilities for mobile applications
    public func getOfflineDelivery(deliveryId: String) -> Result<Delivery, StorageError> {
        let context = persistentContainer.viewContext
        
        let fetch = NSFetchRequest<NSManagedObject>(entityName: "DeliveryEntity")
        fetch.predicate = NSPredicate(format: "id = %@", deliveryId)
        
        do {
            let results = try context.fetch(fetch)
            
            guard let managedDelivery = results.first,
                  let data = managedDelivery.value(forKey: "data") as? [String: Any] else {
                return .failure(.notFound)
            }
            
            // Convert data back to Delivery object (implementation depends on Delivery initializer)
            guard let delivery = deliveryFromDictionary(data) else {
                return .failure(.invalidData)
            }
            
            return .success(delivery)
        } catch {
            NSLog("Failed to fetch delivery: \(error)")
            return .failure(.notFound)
        }
    }
    
    /// Retrieves a route from offline storage
    /// Requirements addressed:
    /// - Offline data handling capabilities for mobile applications
    public func getOfflineRoute(routeId: String) -> Result<Route, StorageError> {
        let context = persistentContainer.viewContext
        
        let fetch = NSFetchRequest<NSManagedObject>(entityName: "RouteEntity")
        fetch.predicate = NSPredicate(format: "id = %@", routeId)
        
        do {
            let results = try context.fetch(fetch)
            
            guard let managedRoute = results.first,
                  let data = managedRoute.value(forKey: "data") as? [String: Any] else {
                return .failure(.notFound)
            }
            
            // Convert data back to Route object (implementation depends on Route initializer)
            guard let route = routeFromDictionary(data) else {
                return .failure(.invalidData)
            }
            
            return .success(route)
        } catch {
            NSLog("Failed to fetch route: \(error)")
            return .failure(.notFound)
        }
    }
    
    // MARK: - Private Methods
    
    private func setupSyncTimer() {
        syncTimer = Timer.scheduledTimer(withTimeInterval: syncInterval,
                                       repeats: true) { [weak self] _ in
            self?.syncOfflineData()
        }
    }
    
    private func scheduleSyncAttempt() {
        syncQueue.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.syncOfflineData()
        }
    }
    
    private func syncDeliveryWithServer(id: String, data: [String: Any]) -> Bool {
        // Implementation would depend on API client and backend endpoints
        // This is a placeholder that should be implemented based on the app's networking layer
        return false
    }
    
    private func syncRouteWithServer(id: String, data: [String: Any]) -> Bool {
        // Implementation would depend on API client and backend endpoints
        // This is a placeholder that should be implemented based on the app's networking layer
        return false
    }
    
    private func deliveryFromDictionary(_ dictionary: [String: Any]) -> Delivery? {
        // Implementation would depend on Delivery model's initialization from dictionary
        // This is a placeholder that should be implemented based on the app's model layer
        return nil
    }
    
    private func routeFromDictionary(_ dictionary: [String: Any]) -> Route? {
        // Implementation would depend on Route model's initialization from dictionary
        // This is a placeholder that should be implemented based on the app's model layer
        return nil
    }
}