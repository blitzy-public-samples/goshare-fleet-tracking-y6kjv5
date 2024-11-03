//
// DeliveryManagementDelegate.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure minimum iOS deployment target is set to iOS 14.0 or higher
// 2. Configure CoreLocation framework in project settings
// 3. Verify location permissions are properly configured in Info.plist
// 4. Set up CoreData schema for offline storage if not already done

import Foundation  // iOS 14.0+

/// Protocol defining the contract for delivery management operations in the iOS Fleet Tracking application
/// Requirements addressed:
/// - Digital proof of delivery capabilities for mobile applications
/// - Support for offline operation in mobile applications
/// - Two-way communication system between drivers and dispatchers
/// - Real-time data synchronization between mobile and backend
@objc
public protocol DeliveryManagementDelegate {
    
    /// Updates the status of a delivery with offline support
    /// Requirements addressed:
    /// - Real-time data synchronization between mobile and backend
    /// - Support for offline operation in mobile applications
    /// - Parameters:
    ///   - deliveryId: Unique identifier of the delivery to update
    ///   - status: New status to be applied to the delivery
    /// - Returns: Result indicating success or failure with error details
    @objc
    func updateDeliveryStatus(deliveryId: String, status: DeliveryStatus) -> Result<Void, Error>
    
    /// Submits proof of delivery including signature, photos, and location verification
    /// Requirements addressed:
    /// - Digital proof of delivery capabilities for mobile applications
    /// - Real-time data synchronization between mobile and backend
    /// - Parameters:
    ///   - deliveryId: Unique identifier of the delivery
    ///   - signature: Digital signature data captured from recipient
    ///   - photos: Array of photo evidence data
    ///   - recipientName: Name of the person who received the delivery
    ///   - notes: Optional additional notes about the delivery
    /// - Returns: Result indicating success or failure with error details
    @objc
    func submitProofOfDelivery(deliveryId: String, 
                              signature: Data, 
                              photos: [Data], 
                              recipientName: String, 
                              notes: String?) -> Result<Void, Error>
    
    /// Fetches deliveries for the current driver with offline support
    /// Requirements addressed:
    /// - Support for offline operation in mobile applications
    /// - Two-way communication system between drivers and dispatchers
    /// - Parameter includeCompleted: Flag to include completed deliveries in the result
    /// - Returns: Result containing array of deliveries or error details
    @objc
    func fetchDeliveries(includeCompleted: Bool) -> Result<[Delivery], Error>
    
    /// Synchronizes offline delivery updates and proof of delivery data with the server
    /// Requirements addressed:
    /// - Real-time data synchronization between mobile and backend
    /// - Support for offline operation in mobile applications
    /// - Returns: Result containing number of synchronized items or error details
    @objc
    func syncOfflineDeliveries() -> Result<Int, Error>
}

/// Extension providing default implementation for error handling
public extension DeliveryManagementDelegate {
    
    /// Validates delivery ID format
    /// - Parameter deliveryId: ID to validate
    /// - Returns: True if valid, false otherwise
    func isValidDeliveryId(_ deliveryId: String) -> Bool {
        return !deliveryId.isEmpty && deliveryId.count >= 6
    }
    
    /// Validates proof of delivery data completeness
    /// - Parameters:
    ///   - signature: Signature data to validate
    ///   - photos: Photo array to validate
    ///   - recipientName: Recipient name to validate
    /// - Returns: True if valid, false otherwise
    func isValidProofOfDelivery(signature: Data, 
                               photos: [Data], 
                               recipientName: String) -> Bool {
        guard !signature.isEmpty else { return false }
        guard !photos.isEmpty else { return false }
        guard !recipientName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        return true
    }
    
    /// Validates delivery status transition
    /// - Parameters:
    ///   - currentStatus: Current status of the delivery
    ///   - newStatus: Proposed new status
    /// - Returns: True if transition is valid, false otherwise
    func isValidStatusTransition(from currentStatus: DeliveryStatus, 
                               to newStatus: DeliveryStatus) -> Bool {
        switch (currentStatus, newStatus) {
        case (.pending, .inTransit),
             (.inTransit, .delivered),
             (.inTransit, .failed),
             (.pending, .cancelled),
             (.inTransit, .cancelled):
            return true
        default:
            return false
        }
    }
}

/// Enumeration of possible delivery management errors
public enum DeliveryManagementError: Error {
    case invalidDeliveryId
    case invalidProofData
    case invalidStatusTransition
    case networkError
    case serverError
    case storageError
    case syncError
    case notFound
    
    var localizedDescription: String {
        switch self {
        case .invalidDeliveryId:
            return "Invalid delivery identifier provided"
        case .invalidProofData:
            return "Invalid or incomplete proof of delivery data"
        case .invalidStatusTransition:
            return "Invalid delivery status transition"
        case .networkError:
            return "Network communication error"
        case .serverError:
            return "Server processing error"
        case .storageError:
            return "Local storage error"
        case .syncError:
            return "Synchronization error"
        case .notFound:
            return "Delivery not found"
        }
    }
}