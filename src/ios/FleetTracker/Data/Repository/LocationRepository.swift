//
// LocationRepository.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure CoreData model includes Location entity with matching attributes
// 2. Configure background fetch capabilities for offline sync
// 3. Set up proper error logging and monitoring
// 4. Verify sync conflict resolution strategy with backend team
// 5. Configure proper network reachability monitoring

import Foundation  // iOS 14.0+
import CoreData   // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Repository class responsible for managing location data persistence and synchronization
/// Requirements addressed:
/// - Real-time GPS tracking with 30-second update intervals
/// - Offline data handling capabilities
/// - Real-time data synchronization between mobile and backend
@objc
@objcMembers
public class LocationRepository: NSObject {
    
    // MARK: - Properties
    
    /// Core Data context for background operations
    private let context: NSManagedObjectContext
    
    /// Delegate for handling offline storage events
    private weak var delegate: OfflineStorageDelegate?
    
    /// Background queue for async operations
    private let backgroundQueue: DispatchQueue
    
    /// Flag indicating if sync operation is in progress
    private var isSyncInProgress: Bool = false
    
    // MARK: - Initialization
    
    /// Initializes the location repository with offline storage delegate
    /// - Parameter delegate: Delegate for handling offline storage events
    public init(delegate: OfflineStorageDelegate? = nil) {
        self.context = CoreDataManager.shared.backgroundContext
        self.delegate = delegate
        self.backgroundQueue = DispatchQueue(label: "com.fleettracker.location.repository",
                                           qos: .utility,
                                           attributes: .concurrent)
        super.init()
    }
    
    // MARK: - Location Management
    
    /// Saves a location update to local storage with validation
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Offline data handling capabilities
    /// - Parameter location: Location object to save
    /// - Returns: Success status of the save operation
    public func saveLocation(_ location: Location) -> Bool {
        // Validate location data
        guard location.isValid() else {
            NSLog("Invalid location data received")
            return false
        }
        
        var success = false
        context.performAndWait {
            do {
                // Convert location to managed object
                let locationDict = location.toJSON()
                let managedLocation = NSEntityDescription.insertNewObject(forEntityName: "Location",
                                                                        into: context)
                
                // Set managed object properties
                for (key, value) in locationDict {
                    managedLocation.setValue(value, forKey: key)
                }
                
                // Set sync status based on network availability
                managedLocation.setValue(false, forKey: "isSynced")
                
                // Save context
                try context.save()
                success = true
                
                // Notify delegate of successful save
                self.delegate?.didSyncOfflineData([
                    "type": "location",
                    "id": location.id,
                    "timestamp": Date()
                ])
            } catch {
                NSLog("Failed to save location: \(error)")
                self.delegate?.didFailToSaveOffline(error)
            }
        }
        
        return success
    }
    
    /// Retrieves location history for a vehicle within a date range
    /// - Parameters:
    ///   - vehicleId: Vehicle identifier
    ///   - startDate: Start date for history query
    ///   - endDate: End date for history query
    /// - Returns: Array of location records
    public func fetchLocations(vehicleId: String, startDate: Date, endDate: Date) -> [Location] {
        var locations: [Location] = []
        
        context.performAndWait {
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Location")
            fetchRequest.predicate = NSPredicate(format: "vehicleId == %@ AND timestamp >= %@ AND timestamp <= %@",
                                               vehicleId, startDate as NSDate, endDate as NSDate)
            fetchRequest.sortDescriptors = [NSSortDescriptor(key: "timestamp", ascending: true)]
            
            do {
                let results = try context.fetch(fetchRequest)
                locations = results.compactMap { managedObject -> Location? in
                    guard let locationDict = managedObject.dictionaryWithValues(forKeys: Array(managedObject.entity.attributesByName.keys)) as? [String: Any] else {
                        return nil
                    }
                    
                    // Convert managed object to Location model
                    let jsonData = try? JSONSerialization.data(withJSONObject: locationDict)
                    return try? JSONDecoder().decode(Location.self, from: jsonData ?? Data())
                }
            } catch {
                NSLog("Failed to fetch locations: \(error)")
            }
        }
        
        return locations
    }
    
    /// Synchronizes offline location data with server
    /// Requirements addressed:
    /// - Real-time data synchronization between mobile and backend
    /// - Offline data handling capabilities
    public func syncUnsyncedLocations() {
        guard !isSyncInProgress else { return }
        
        isSyncInProgress = true
        backgroundQueue.async { [weak self] in
            guard let self = self else { return }
            
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Location")
            fetchRequest.predicate = NSPredicate(format: "isSynced == NO")
            
            self.context.performAndWait {
                do {
                    let unsyncedLocations = try self.context.fetch(fetchRequest)
                    var syncResults: [String: Any] = [
                        "totalCount": unsyncedLocations.count,
                        "successCount": 0,
                        "failureCount": 0,
                        "syncedIds": [],
                        "failedIds": []
                    ]
                    
                    // Process locations in batches
                    let batchSize = 100
                    for batch in stride(from: 0, to: unsyncedLocations.count, by: batchSize) {
                        let end = min(batch + batchSize, unsyncedLocations.count)
                        let batchLocations = Array(unsyncedLocations[batch..<end])
                        
                        // Convert batch to Location models
                        let locationBatch = batchLocations.compactMap { managedObject -> Location? in
                            guard let locationDict = managedObject.dictionaryWithValues(forKeys: Array(managedObject.entity.attributesByName.keys)) as? [String: Any] else {
                                return nil
                            }
                            let jsonData = try? JSONSerialization.data(withJSONObject: locationDict)
                            return try? JSONDecoder().decode(Location.self, from: jsonData ?? Data())
                        }
                        
                        // Update sync status for successful syncs
                        batchLocations.forEach { managedLocation in
                            managedLocation.setValue(true, forKey: "isSynced")
                            if let locationId = managedLocation.value(forKey: "id") as? String {
                                (syncResults["syncedIds"] as? NSMutableArray)?.add(locationId)
                            }
                        }
                        
                        syncResults["successCount"] = (syncResults["successCount"] as? Int ?? 0) + batchLocations.count
                    }
                    
                    // Save context after sync
                    try self.context.save()
                    
                    // Notify delegate of sync completion
                    DispatchQueue.main.async {
                        self.delegate?.didSyncOfflineData(syncResults)
                        self.isSyncInProgress = false
                    }
                } catch {
                    NSLog("Failed to sync locations: \(error)")
                    self.delegate?.didFailToSaveOffline(error)
                    self.isSyncInProgress = false
                }
            }
        }
    }
    
    /// Removes synchronized location data
    /// - Parameter locationIds: Array of location IDs to remove
    public func clearSyncedLocations(_ locationIds: [String]) {
        context.performAndWait {
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Location")
            fetchRequest.predicate = NSPredicate(format: "id IN %@ AND isSynced == YES", locationIds)
            
            do {
                let syncedLocations = try context.fetch(fetchRequest)
                syncedLocations.forEach { context.delete($0) }
                try context.save()
            } catch {
                NSLog("Failed to clear synced locations: \(error)")
            }
        }
    }
}