//
// CoreDataManager.swift
// FleetTracker
//
// Human Tasks:
// 1. Create FleetTracker.xcdatamodeld file in Xcode if not already present
// 2. Add Core Data entities for Delivery, Route, and Vehicle with matching attributes
// 3. Enable Core Data support in project settings
// 4. Configure background fetch capabilities in project capabilities
// 5. Set up iCloud entitlements if cloud sync is required

import CoreData  // iOS 14.0+
import Foundation  // iOS 14.0+

/// Core Data manager class responsible for handling local data persistence, offline storage,
/// and synchronization for the Fleet Tracking System's iOS application
/// Requirements addressed:
/// - Offline data handling capabilities
/// - Real-time data synchronization between mobile and backend
/// - Cross-platform compatibility with offline operation support
@objc
@objcMembers
public class CoreDataManager: NSObject {
    
    // MARK: - Singleton Instance
    
    /// Shared singleton instance of CoreDataManager
    public static let shared = CoreDataManager()
    
    // MARK: - Properties
    
    /// Core Data persistent container
    private let persistentContainer: NSPersistentContainer
    
    /// Main view context for UI operations
    public var viewContext: NSManagedObjectContext {
        return persistentContainer.viewContext
    }
    
    /// Background context for async operations
    private lazy var backgroundContext: NSManagedObjectContext = {
        let context = persistentContainer.newBackgroundContext()
        context.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        return context
    }()
    
    /// Flag indicating if sync operation is in progress
    private(set) var isSyncInProgress: Bool = false
    
    // MARK: - Initialization
    
    private override init() {
        // Initialize persistent container with model name
        persistentContainer = NSPersistentContainer(name: "FleetTracker")
        
        super.init()
        
        // Load persistent stores
        persistentContainer.loadPersistentStores { [weak self] (description, error) in
            if let error = error {
                NSLog("Failed to load Core Data stack: \(error)")
                fatalError("Failed to load Core Data stack: \(error)")
            }
            
            // Configure automatic merging of changes
            self?.persistentContainer.viewContext.automaticallyMergesChangesFromParent = true
            self?.persistentContainer.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        }
    }
    
    // MARK: - Delivery Management
    
    /// Saves or updates a delivery in Core Data
    /// Requirement: Offline data handling capabilities
    /// - Parameter delivery: Delivery object to save
    /// - Returns: Success status of the operation
    public func saveDelivery(_ delivery: Delivery) -> Bool {
        let context = backgroundContext
        
        context.performAndWait {
            // Fetch existing delivery or create new one
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Delivery")
            fetchRequest.predicate = NSPredicate(format: "id == %@", delivery.id)
            
            do {
                let results = try context.fetch(fetchRequest)
                let managedDelivery = results.first ?? NSEntityDescription.insertNewObject(forEntityName: "Delivery", into: context)
                
                // Convert delivery to dictionary
                let deliveryDict = delivery.toDictionary()
                
                // Update managed object properties
                for (key, value) in deliveryDict {
                    managedDelivery.setValue(value, forKey: key)
                }
                
                // Save context
                try context.save()
                
                // Post notification for UI update
                DispatchQueue.main.async {
                    NotificationCenter.default.post(name: NSNotification.Name("DeliveryDataUpdated"), object: nil)
                }
            } catch {
                NSLog("Failed to save delivery: \(error)")
                return
            }
        }
        
        return true
    }
    
    // MARK: - Route Management
    
    /// Saves or updates a route in Core Data
    /// Requirement: Offline data handling capabilities
    /// - Parameter route: Route object to save
    /// - Returns: Success status of the operation
    public func saveRoute(_ route: Route) -> Bool {
        let context = backgroundContext
        
        context.performAndWait {
            // Fetch existing route or create new one
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Route")
            fetchRequest.predicate = NSPredicate(format: "id == %@", route.id)
            
            do {
                let results = try context.fetch(fetchRequest)
                let managedRoute = results.first ?? NSEntityDescription.insertNewObject(forEntityName: "Route", into: context)
                
                // Convert route to dictionary
                let routeDict = route.toDictionary()
                
                // Update managed object properties
                for (key, value) in routeDict {
                    managedRoute.setValue(value, forKey: key)
                }
                
                // Save context
                try context.save()
                
                // Post notification for UI update
                DispatchQueue.main.async {
                    NotificationCenter.default.post(name: NSNotification.Name("RouteDataUpdated"), object: nil)
                }
            } catch {
                NSLog("Failed to save route: \(error)")
                return
            }
        }
        
        return true
    }
    
    // MARK: - Vehicle Management
    
    /// Saves or updates a vehicle in Core Data
    /// Requirement: Offline data handling capabilities
    /// - Parameter vehicle: Vehicle object to save
    /// - Returns: Success status of the operation
    public func saveVehicle(_ vehicle: Vehicle) -> Bool {
        let context = backgroundContext
        
        context.performAndWait {
            // Fetch existing vehicle or create new one
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Vehicle")
            fetchRequest.predicate = NSPredicate(format: "id == %@", vehicle.id)
            
            do {
                let results = try context.fetch(fetchRequest)
                let managedVehicle = results.first ?? NSEntityDescription.insertNewObject(forEntityName: "Vehicle", into: context)
                
                // Convert vehicle to dictionary
                let vehicleDict = vehicle.toDictionary()
                
                // Update managed object properties
                for (key, value) in vehicleDict {
                    managedVehicle.setValue(value, forKey: key)
                }
                
                // Save context
                try context.save()
                
                // Post notification for UI update
                DispatchQueue.main.async {
                    NotificationCenter.default.post(name: NSNotification.Name("VehicleDataUpdated"), object: nil)
                }
            } catch {
                NSLog("Failed to save vehicle: \(error)")
                return
            }
        }
        
        return true
    }
    
    // MARK: - Sync Management
    
    /// Retrieves all unsynced data for synchronization
    /// Requirement: Real-time data synchronization between mobile and backend
    /// - Returns: Dictionary of unsynced entities
    public func fetchUnsyncedData() -> [String: Any] {
        guard !isSyncInProgress else {
            return [:]
        }
        
        isSyncInProgress = true
        var unsyncedData: [String: Any] = [:]
        let context = backgroundContext
        
        context.performAndWait {
            // Fetch unsynced deliveries
            let deliveryFetch: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Delivery")
            deliveryFetch.predicate = NSPredicate(format: "isSynced == NO")
            
            // Fetch unsynced routes
            let routeFetch: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Route")
            routeFetch.predicate = NSPredicate(format: "isSynced == NO")
            
            // Fetch unsynced vehicles
            let vehicleFetch: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Vehicle")
            vehicleFetch.predicate = NSPredicate(format: "isSynced == NO")
            
            do {
                let deliveries = try context.fetch(deliveryFetch)
                let routes = try context.fetch(routeFetch)
                let vehicles = try context.fetch(vehicleFetch)
                
                unsyncedData["deliveries"] = deliveries.map { $0.dictionaryWithValues(forKeys: Array($0.entity.attributesByName.keys)) }
                unsyncedData["routes"] = routes.map { $0.dictionaryWithValues(forKeys: Array($0.entity.attributesByName.keys)) }
                unsyncedData["vehicles"] = vehicles.map { $0.dictionaryWithValues(forKeys: Array($0.entity.attributesByName.keys)) }
            } catch {
                NSLog("Failed to fetch unsynced data: \(error)")
            }
        }
        
        return unsyncedData
    }
    
    /// Removes synced data from local storage
    /// Requirement: Offline data handling capabilities
    /// - Parameter syncedIds: Array of synced entity IDs
    public func clearSyncedData(_ syncedIds: [String]) {
        let context = backgroundContext
        
        context.performAndWait {
            // Create batch delete request for each entity type
            let entities = ["Delivery", "Route", "Vehicle"]
            
            for entity in entities {
                let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: entity)
                fetchRequest.predicate = NSPredicate(format: "id IN %@ AND isSynced == YES", syncedIds)
                
                do {
                    let results = try context.fetch(fetchRequest)
                    results.forEach { context.delete($0) }
                } catch {
                    NSLog("Failed to clear synced \(entity) data: \(error)")
                }
            }
            
            // Save context changes
            do {
                try context.save()
            } catch {
                NSLog("Failed to save context after clearing synced data: \(error)")
            }
        }
        
        // Reset sync flag
        isSyncInProgress = false
        
        // Post notification for UI update
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: NSNotification.Name("DataSyncCompleted"), object: nil)
        }
    }
}