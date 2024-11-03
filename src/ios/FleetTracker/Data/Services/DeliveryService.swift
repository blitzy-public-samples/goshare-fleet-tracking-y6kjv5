//
// DeliveryService.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure minimum iOS deployment target is set to iOS 14.0 or higher
// 2. Configure CoreLocation framework in project settings
// 3. Set up push notification entitlements for real-time updates
// 4. Verify CoreData schema includes Delivery entity with all required attributes

import Foundation  // iOS 14.0+
import Combine    // iOS 14.0+

/// Service class implementing delivery management operations with offline support
/// Requirements addressed:
/// - Digital proof of delivery capabilities (1.2 Scope/Core Functionality)
/// - Offline data handling capabilities (1.2 Scope/Technical Implementation)
/// - Real-time data synchronization (1.2 Scope/Technical Implementation)
@objc
public class DeliveryService: NSObject, DeliveryManagementDelegate {
    
    // MARK: - Properties
    
    private let repository: DeliveryRepository
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    /// Initializes the delivery service with required dependencies
    /// - Parameter repository: Repository instance for data operations
    public init(repository: DeliveryRepository) {
        self.repository = repository
        super.init()
        setupNotificationObservers()
    }
    
    private func setupNotificationObservers() {
        // Observe connectivity changes for sync operations
        NotificationCenter.default.publisher(for: .connectivityStatusChanged)
            .sink { [weak self] _ in
                guard let self = self else { return }
                if NetworkManager.shared.isConnected {
                    self.syncOfflineDeliveries()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - DeliveryManagementDelegate Implementation
    
    /// Updates the status of a delivery with offline support
    /// Requirement: Real-time data synchronization between mobile and backend
    /// - Parameters:
    ///   - deliveryId: Unique identifier of the delivery to update
    ///   - status: New status to be applied to the delivery
    /// - Returns: Result indicating success or failure with error details
    @objc
    public func updateDeliveryStatus(deliveryId: String, status: DeliveryStatus) -> Result<Void, Error> {
        // Validate delivery ID and status
        guard isValidDeliveryId(deliveryId) else {
            return .failure(DeliveryManagementError.invalidDeliveryId)
        }
        
        // Create publisher for status update
        let publisher = repository.updateDeliveryStatus(deliveryId, status)
            .map { _ in () }
            .mapError { $0 }
        
        // Convert publisher to synchronous result
        var result: Result<Void, Error>?
        let semaphore = DispatchSemaphore(value: 0)
        
        publisher
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        result = .failure(error)
                    }
                    semaphore.signal()
                },
                receiveValue: {
                    result = .success(())
                }
            )
            .store(in: &cancellables)
        
        _ = semaphore.wait(timeout: .now() + 30)
        return result ?? .failure(DeliveryManagementError.serverError)
    }
    
    /// Submits proof of delivery with signature and photos
    /// Requirement: Digital proof of delivery capabilities for mobile applications
    /// - Parameters:
    ///   - deliveryId: Unique identifier of the delivery
    ///   - signature: Digital signature data captured from recipient
    ///   - photos: Array of photo evidence data
    ///   - recipientName: Name of the person who received the delivery
    ///   - notes: Optional additional notes about the delivery
    /// - Returns: Result indicating success or failure with error details
    @objc
    public func submitProofOfDelivery(deliveryId: String,
                                     signature: Data,
                                     photos: [Data],
                                     recipientName: String,
                                     notes: String?) -> Result<Void, Error> {
        // Validate proof of delivery data
        guard isValidProofOfDelivery(signature: signature, photos: photos, recipientName: recipientName) else {
            return .failure(DeliveryManagementError.invalidProofData)
        }
        
        // Create proof of delivery object
        let proof = DeliveryProof(
            deliveryId: deliveryId,
            signature: signature,
            photos: photos,
            recipientName: recipientName,
            notes: notes,
            timestamp: Date(),
            verificationLocation: LocationManager.shared.currentLocation
        )
        
        // Submit through repository
        let publisher = repository.addProofOfDelivery(deliveryId, proof)
            .map { _ in () }
            .mapError { $0 }
        
        // Convert publisher to synchronous result
        var result: Result<Void, Error>?
        let semaphore = DispatchSemaphore(value: 0)
        
        publisher
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        result = .failure(error)
                    }
                    semaphore.signal()
                },
                receiveValue: {
                    result = .success(())
                }
            )
            .store(in: &cancellables)
        
        _ = semaphore.wait(timeout: .now() + 30)
        return result ?? .failure(DeliveryManagementError.serverError)
    }
    
    /// Fetches deliveries with offline support
    /// Requirement: Offline data handling capabilities with local persistence
    /// - Parameter includeCompleted: Flag to include completed deliveries
    /// - Returns: Result containing array of deliveries or error details
    @objc
    public func fetchDeliveries(includeCompleted: Bool) -> Result<[Delivery], Error> {
        // Get current route ID from user session
        guard let routeId = UserSessionManager.shared.currentRouteId else {
            return .failure(DeliveryManagementError.invalidDeliveryId)
        }
        
        // Create publisher for fetching deliveries
        let publisher = repository.getDeliveriesForRoute(routeId)
            .map { deliveries in
                // Filter based on completion status if needed
                if !includeCompleted {
                    return deliveries.filter { $0.status != .delivered && $0.status != .cancelled }
                }
                return deliveries
            }
            .mapError { $0 }
        
        // Convert publisher to synchronous result
        var result: Result<[Delivery], Error>?
        let semaphore = DispatchSemaphore(value: 0)
        
        publisher
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        result = .failure(error)
                    }
                    semaphore.signal()
                },
                receiveValue: { deliveries in
                    result = .success(deliveries)
                }
            )
            .store(in: &cancellables)
        
        _ = semaphore.wait(timeout: .now() + 30)
        return result ?? .failure(DeliveryManagementError.serverError)
    }
    
    /// Synchronizes offline delivery data with the server
    /// Requirement: Real-time data synchronization between mobile and backend
    /// - Returns: Result containing number of synchronized items or error details
    @objc
    public func syncOfflineDeliveries() -> Result<Int, Error> {
        // Verify network connectivity
        guard NetworkManager.shared.isConnected else {
            return .success(0) // Skip sync when offline
        }
        
        // Create publisher for sync operation
        let publisher = repository.syncUnsynced()
            .map { success -> Int in
                guard success else {
                    throw DeliveryManagementError.syncError
                }
                return 1 // Return sync count
            }
            .mapError { $0 }
        
        // Convert publisher to synchronous result
        var result: Result<Int, Error>?
        let semaphore = DispatchSemaphore(value: 0)
        
        publisher
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        result = .failure(error)
                    }
                    semaphore.signal()
                },
                receiveValue: { syncCount in
                    result = .success(syncCount)
                }
            )
            .store(in: &cancellables)
        
        _ = semaphore.wait(timeout: .now() + 30)
        return result ?? .failure(DeliveryManagementError.syncError)
    }
    
    // MARK: - Private Helpers
    
    private func handleSyncError(_ error: Error) {
        // Log sync error
        print("Sync error: \(error.localizedDescription)")
        
        // Notify observers of sync failure
        NotificationCenter.default.post(
            name: .deliverySyncFailed,
            object: nil,
            userInfo: ["error": error]
        )
        
        // Schedule retry if appropriate
        if NetworkManager.shared.isConnected {
            DispatchQueue.global().asyncAfter(deadline: .now() + 60) { [weak self] in
                self?.syncOfflineDeliveries()
            }
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let deliverySyncFailed = Notification.Name("deliverySyncFailed")
}