//
// DeliveryRepository.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify CoreData schema includes Delivery entity with all required attributes
// 2. Configure background fetch capabilities for sync operations
// 3. Set up push notification entitlements for real-time updates
// 4. Test offline storage capacity limits for proof of delivery data

import Foundation  // iOS 14.0+
import Combine    // iOS 14.0+
import CoreData   // iOS 14.0+

/// Repository class that manages delivery data persistence, synchronization, and CRUD operations
/// Requirements addressed:
/// - Digital proof of delivery capabilities (1.2 Scope/Core Functionality)
/// - Offline data handling capabilities (1.2 Scope/Technical Implementation)
/// - Real-time data synchronization (1.2 Scope/Technical Implementation)
public class DeliveryRepository {
    
    // MARK: - Properties
    
    private let coreDataManager: CoreDataManager
    private let networkManager: NetworkManager
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    public init() {
        self.coreDataManager = CoreDataManager.shared
        self.networkManager = NetworkManager.shared
        setupWebSocket()
    }
    
    private func setupWebSocket() {
        networkManager.setupWebSocket(endpoint: "deliveries/updates")
    }
    
    // MARK: - CRUD Operations
    
    /// Creates a new delivery and persists it both locally and remotely
    /// - Parameter delivery: The delivery to be created
    /// - Returns: Publisher that emits created delivery or error
    public func createDelivery(_ delivery: Delivery) -> AnyPublisher<Delivery, Error> {
        return Future<Delivery, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "DeliveryRepository", code: -1)))
                return
            }
            
            // Validate delivery data
            guard !delivery.id.isEmpty else {
                promise(.failure(NSError(domain: "DeliveryRepository", code: -2, userInfo: ["message": "Invalid delivery ID"])))
                return
            }
            
            // Save to local storage first
            guard self.coreDataManager.saveDelivery(delivery) else {
                promise(.failure(NSError(domain: "DeliveryRepository", code: -3, userInfo: ["message": "Failed to save delivery locally"])))
                return
            }
            
            // Attempt to sync with backend if online
            let request = self.createDeliveryRequest(delivery)
            self.networkManager.performRequest(request)
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            // Keep local copy marked as unsynced
                            promise(.success(delivery))
                            print("Failed to sync delivery: \(error)")
                        }
                    },
                    receiveValue: { _ in
                        // Update local copy as synced
                        delivery.isSynced = true
                        _ = self.coreDataManager.saveDelivery(delivery)
                        promise(.success(delivery))
                    }
                )
                .store(in: &self.cancellables)
        }
        .eraseToAnyPublisher()
    }
    
    /// Updates delivery status and synchronizes changes
    /// - Parameters:
    ///   - deliveryId: ID of the delivery to update
    ///   - newStatus: New status to be applied
    /// - Returns: Publisher that emits updated delivery or error
    public func updateDeliveryStatus(_ deliveryId: String, _ newStatus: DeliveryStatus) -> AnyPublisher<Delivery, Error> {
        return Future<Delivery, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "DeliveryRepository", code: -1)))
                return
            }
            
            // Fetch delivery from local storage
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Delivery")
            fetchRequest.predicate = NSPredicate(format: "id == %@", deliveryId)
            
            do {
                let results = try self.coreDataManager.viewContext.fetch(fetchRequest)
                guard let managedDelivery = results.first,
                      let delivery = self.convertToDelivery(managedDelivery) else {
                    promise(.failure(NSError(domain: "DeliveryRepository", code: -4, userInfo: ["message": "Delivery not found"])))
                    return
                }
                
                // Update status
                delivery.updateStatus(newStatus)
                
                // Save locally
                guard self.coreDataManager.saveDelivery(delivery) else {
                    promise(.failure(NSError(domain: "DeliveryRepository", code: -3)))
                    return
                }
                
                // Sync with backend
                let request = self.updateDeliveryStatusRequest(deliveryId, newStatus)
                self.networkManager.performRequest(request)
                    .sink(
                        receiveCompletion: { completion in
                            if case .failure(let error) = completion {
                                print("Failed to sync status update: \(error)")
                            }
                            promise(.success(delivery))
                        },
                        receiveValue: { _ in
                            delivery.isSynced = true
                            _ = self.coreDataManager.saveDelivery(delivery)
                            promise(.success(delivery))
                        }
                    )
                    .store(in: &self.cancellables)
                
            } catch {
                promise(.failure(error))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Adds proof of delivery data and syncs changes
    /// - Parameters:
    ///   - deliveryId: ID of the delivery
    ///   - proof: Proof of delivery data
    /// - Returns: Publisher that emits updated delivery or error
    public func addProofOfDelivery(_ deliveryId: String, _ proof: DeliveryProof) -> AnyPublisher<Delivery, Error> {
        return Future<Delivery, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "DeliveryRepository", code: -1)))
                return
            }
            
            // Fetch delivery
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Delivery")
            fetchRequest.predicate = NSPredicate(format: "id == %@", deliveryId)
            
            do {
                let results = try self.coreDataManager.viewContext.fetch(fetchRequest)
                guard let managedDelivery = results.first,
                      let delivery = self.convertToDelivery(managedDelivery) else {
                    promise(.failure(NSError(domain: "DeliveryRepository", code: -4)))
                    return
                }
                
                // Add proof of delivery
                guard delivery.addProofOfDelivery(proof) else {
                    promise(.failure(NSError(domain: "DeliveryRepository", code: -5, userInfo: ["message": "Invalid proof of delivery"])))
                    return
                }
                
                // Save locally
                guard self.coreDataManager.saveDelivery(delivery) else {
                    promise(.failure(NSError(domain: "DeliveryRepository", code: -3)))
                    return
                }
                
                // Sync with backend
                let request = self.addProofOfDeliveryRequest(deliveryId, proof)
                self.networkManager.performRequest(request)
                    .sink(
                        receiveCompletion: { completion in
                            if case .failure(let error) = completion {
                                print("Failed to sync proof of delivery: \(error)")
                            }
                            promise(.success(delivery))
                        },
                        receiveValue: { _ in
                            delivery.isSynced = true
                            _ = self.coreDataManager.saveDelivery(delivery)
                            promise(.success(delivery))
                        }
                    )
                    .store(in: &self.cancellables)
                
            } catch {
                promise(.failure(error))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Retrieves a delivery by ID
    /// - Parameter deliveryId: ID of the delivery to retrieve
    /// - Returns: Publisher that emits optional delivery or error
    public func getDelivery(_ deliveryId: String) -> AnyPublisher<Delivery?, Error> {
        return Future<Delivery?, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "DeliveryRepository", code: -1)))
                return
            }
            
            // Check local storage first
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Delivery")
            fetchRequest.predicate = NSPredicate(format: "id == %@", deliveryId)
            
            do {
                let results = try self.coreDataManager.viewContext.fetch(fetchRequest)
                if let managedDelivery = results.first,
                   let delivery = self.convertToDelivery(managedDelivery) {
                    promise(.success(delivery))
                    return
                }
                
                // If not found locally, fetch from backend
                let request = self.getDeliveryRequest(deliveryId)
                self.networkManager.performRequest(request)
                    .sink(
                        receiveCompletion: { completion in
                            if case .failure(let error) = completion {
                                promise(.failure(error))
                            }
                        },
                        receiveValue: { data in
                            if let delivery = self.parseDeliveryResponse(data) {
                                _ = self.coreDataManager.saveDelivery(delivery)
                                promise(.success(delivery))
                            } else {
                                promise(.success(nil))
                            }
                        }
                    )
                    .store(in: &self.cancellables)
                
            } catch {
                promise(.failure(error))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Retrieves all deliveries for a specific route
    /// - Parameter routeId: ID of the route
    /// - Returns: Publisher that emits array of deliveries or error
    public func getDeliveriesForRoute(_ routeId: String) -> AnyPublisher<[Delivery], Error> {
        return Future<[Delivery], Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "DeliveryRepository", code: -1)))
                return
            }
            
            // Fetch from local storage
            let fetchRequest: NSFetchRequest<NSManagedObject> = NSFetchRequest(entityName: "Delivery")
            fetchRequest.predicate = NSPredicate(format: "routeId == %@", routeId)
            
            do {
                let results = try self.coreDataManager.viewContext.fetch(fetchRequest)
                let localDeliveries = results.compactMap { self.convertToDelivery($0) }
                
                // Sync with backend if online
                let request = self.getRouteDeliveriesRequest(routeId)
                self.networkManager.performRequest(request)
                    .sink(
                        receiveCompletion: { completion in
                            if case .failure(_) = completion {
                                // Return local data if sync fails
                                promise(.success(localDeliveries))
                            }
                        },
                        receiveValue: { data in
                            if let remoteDeliveries = self.parseDeliveriesResponse(data) {
                                // Merge remote and local data
                                let mergedDeliveries = self.mergeDeliveries(local: localDeliveries, remote: remoteDeliveries)
                                // Save merged data locally
                                mergedDeliveries.forEach { _ = self.coreDataManager.saveDelivery($0) }
                                promise(.success(mergedDeliveries))
                            } else {
                                promise(.success(localDeliveries))
                            }
                        }
                    )
                    .store(in: &self.cancellables)
                
            } catch {
                promise(.failure(error))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Synchronizes unsynced delivery data with backend
    /// - Returns: Publisher that emits sync success status or error
    public func syncUnsynced() -> AnyPublisher<Bool, Error> {
        return Future<Bool, Error> { [weak self] promise in
            guard let self = self else {
                promise(.failure(NSError(domain: "DeliveryRepository", code: -1)))
                return
            }
            
            // Fetch unsynced data
            let unsyncedData = self.coreDataManager.fetchUnsyncedData()
            guard let unsyncedDeliveries = unsyncedData["deliveries"] as? [[String: Any]] else {
                promise(.success(true))
                return
            }
            
            var syncedIds: [String] = []
            let syncGroup = DispatchGroup()
            
            // Sync each unsynced delivery
            for deliveryDict in unsyncedDeliveries {
                syncGroup.enter()
                
                guard let deliveryId = deliveryDict["id"] as? String else {
                    syncGroup.leave()
                    continue
                }
                
                let request = self.syncDeliveryRequest(deliveryDict)
                self.networkManager.performRequest(request)
                    .sink(
                        receiveCompletion: { completion in
                            if case .failure(let error) = completion {
                                print("Failed to sync delivery \(deliveryId): \(error)")
                            }
                            syncGroup.leave()
                        },
                        receiveValue: { _ in
                            syncedIds.append(deliveryId)
                            syncGroup.leave()
                        }
                    )
                    .store(in: &self.cancellables)
            }
            
            syncGroup.notify(queue: .main) {
                // Clear synced data from local storage
                self.coreDataManager.clearSyncedData(syncedIds)
                promise(.success(true))
            }
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Helper Methods
    
    private func createDeliveryRequest(_ delivery: Delivery) -> URLRequest {
        var request = URLRequest(url: URL(string: "\(APIConstants.baseURL)/deliveries")!)
        request.httpMethod = "POST"
        request.httpBody = try? JSONSerialization.data(withJSONObject: delivery.toDictionary())
        return request
    }
    
    private func updateDeliveryStatusRequest(_ deliveryId: String, _ status: DeliveryStatus) -> URLRequest {
        var request = URLRequest(url: URL(string: "\(APIConstants.baseURL)/deliveries/\(deliveryId)/status")!)
        request.httpMethod = "PUT"
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["status": status.rawValue])
        return request
    }
    
    private func addProofOfDeliveryRequest(_ deliveryId: String, _ proof: DeliveryProof) -> URLRequest {
        var request = URLRequest(url: URL(string: "\(APIConstants.baseURL)/deliveries/\(deliveryId)/proof")!)
        request.httpMethod = "POST"
        request.httpBody = try? JSONSerialization.data(withJSONObject: proof.toDictionary())
        return request
    }
    
    private func getDeliveryRequest(_ deliveryId: String) -> URLRequest {
        return URLRequest(url: URL(string: "\(APIConstants.baseURL)/deliveries/\(deliveryId)")!)
    }
    
    private func getRouteDeliveriesRequest(_ routeId: String) -> URLRequest {
        return URLRequest(url: URL(string: "\(APIConstants.baseURL)/routes/\(routeId)/deliveries")!)
    }
    
    private func syncDeliveryRequest(_ deliveryDict: [String: Any]) -> URLRequest {
        var request = URLRequest(url: URL(string: "\(APIConstants.baseURL)/deliveries/sync")!)
        request.httpMethod = "POST"
        request.httpBody = try? JSONSerialization.data(withJSONObject: deliveryDict)
        return request
    }
    
    private func convertToDelivery(_ managedObject: NSManagedObject) -> Delivery? {
        guard let id = managedObject.value(forKey: "id") as? String,
              let routeId = managedObject.value(forKey: "routeId") as? String,
              let customerId = managedObject.value(forKey: "customerId") as? String,
              let address = managedObject.value(forKey: "address") as? String,
              let scheduledDate = managedObject.value(forKey: "scheduledDate") as? Date else {
            return nil
        }
        
        let delivery = Delivery(
            id: id,
            routeId: routeId,
            customerId: customerId,
            address: address,
            scheduledDate: scheduledDate
        )
        
        // Set additional properties if available
        if let status = managedObject.value(forKey: "status") as? String {
            delivery.updateStatus(DeliveryStatus(rawValue: status) ?? .pending)
        }
        
        if let proof = managedObject.value(forKey: "proof") as? [String: Any] {
            // Convert proof dictionary to DeliveryProof object
            // and add to delivery using addProofOfDelivery
        }
        
        return delivery
    }
    
    private func parseDeliveryResponse(_ data: Data) -> Delivery? {
        guard let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let id = dict["id"] as? String,
              let routeId = dict["routeId"] as? String,
              let customerId = dict["customerId"] as? String,
              let address = dict["address"] as? String,
              let scheduledDateString = dict["scheduledDate"] as? String,
              let scheduledDate = ISO8601DateFormatter().date(from: scheduledDateString) else {
            return nil
        }
        
        return Delivery(
            id: id,
            routeId: routeId,
            customerId: customerId,
            address: address,
            scheduledDate: scheduledDate
        )
    }
    
    private func parseDeliveriesResponse(_ data: Data) -> [Delivery]? {
        guard let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return nil
        }
        return array.compactMap { dict in
            guard let id = dict["id"] as? String,
                  let routeId = dict["routeId"] as? String,
                  let customerId = dict["customerId"] as? String,
                  let address = dict["address"] as? String,
                  let scheduledDateString = dict["scheduledDate"] as? String,
                  let scheduledDate = ISO8601DateFormatter().date(from: scheduledDateString) else {
                return nil
            }
            
            return Delivery(
                id: id,
                routeId: routeId,
                customerId: customerId,
                address: address,
                scheduledDate: scheduledDate
            )
        }
    }
    
    private func mergeDeliveries(local: [Delivery], remote: [Delivery]) -> [Delivery] {
        var merged = [String: Delivery]()
        
        // Add local deliveries
        local.forEach { merged[$0.id] = $0 }
        
        // Update or add remote deliveries
        remote.forEach { delivery in
            if let existing = merged[delivery.id] {
                // Keep local version if it's newer
                if existing.lastModified > delivery.lastModified {
                    merged[delivery.id] = existing
                } else {
                    merged[delivery.id] = delivery
                }
            } else {
                merged[delivery.id] = delivery
            }
        }
        
        return Array(merged.values)
    }
}