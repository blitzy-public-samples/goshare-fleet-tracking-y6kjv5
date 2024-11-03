//
// Delivery.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure minimum iOS deployment target is set to iOS 14.0 or higher
// 2. Configure CoreLocation framework in project settings
// 3. Verify location permissions are properly configured in Info.plist
// 4. Set up CoreData schema for offline storage if not already done

import Foundation  // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Enumeration of possible delivery statuses with Codable support
/// Requirement: Real-time status tracking for deliveries
public enum DeliveryStatus: String, Codable {
    case pending
    case inTransit
    case delivered
    case failed
    case cancelled
}

/// Core data model representing a delivery in the Fleet Tracking System's iOS application
/// Manages delivery details, status, proof of delivery data, and location tracking with offline synchronization support
/// Requirements addressed:
/// - Digital proof of delivery capabilities for mobile applications
/// - Real-time data synchronization between mobile and backend
/// - Support for offline operation in mobile applications
@objc
@objcMembers
public class Delivery: NSObject {
    
    // MARK: - Properties
    
    /// Unique identifier for the delivery
    public let id: String
    
    /// Associated route identifier
    public let routeId: String
    
    /// Customer identifier for the delivery
    public let customerId: String
    
    /// Delivery address
    public let address: String
    
    /// Optional delivery notes
    public var notes: String?
    
    /// Current status of the delivery
    public private(set) var status: DeliveryStatus
    
    /// Scheduled delivery date and time
    public let scheduledDate: Date
    
    /// Actual delivery completion date and time
    public private(set) var actualDeliveryDate: Date?
    
    /// Location where delivery was completed
    public private(set) var deliveryLocation: Location?
    
    /// Proof of delivery data including signature and verification
    public private(set) var proof: DeliveryProof?
    
    /// Estimated duration for the delivery in seconds
    public var estimatedDuration: TimeInterval
    
    /// Indicates if the delivery was created or modified while offline
    public private(set) var isOffline: Bool
    
    /// Indicates if the delivery has been synced with the backend
    public private(set) var isSynced: Bool
    
    /// Timestamp of last modification
    public private(set) var lastModified: Date
    
    // MARK: - Initialization
    
    /// Initializes a new delivery instance with required fields
    /// - Parameters:
    ///   - id: Unique identifier for the delivery
    ///   - routeId: Associated route identifier
    ///   - customerId: Customer identifier
    ///   - address: Delivery address
    ///   - scheduledDate: Scheduled delivery date and time
    public init(id: String, routeId: String, customerId: String, address: String, scheduledDate: Date) {
        // Assign required properties from parameters
        self.id = id
        self.routeId = routeId
        self.customerId = customerId
        self.address = address
        self.scheduledDate = scheduledDate
        
        // Set initial status to pending
        self.status = .pending
        
        // Initialize isOffline and isSynced flags
        self.isOffline = !NetworkManager.shared.isConnected
        self.isSynced = false
        
        // Set lastModified timestamp to current date
        self.lastModified = Date()
        
        // Set estimatedDuration based on route calculation
        // Default to 30 minutes if route calculation is not available
        self.estimatedDuration = 1800
        
        super.init()
    }
    
    // MARK: - Status Management
    
    /// Updates the delivery status and related timestamps
    /// Requirement: Real-time data synchronization between mobile and backend
    /// - Parameter newStatus: New status to be applied
    public func updateStatus(_ newStatus: DeliveryStatus) {
        // Validate status transition is allowed
        guard isValidStatusTransition(from: status, to: newStatus) else {
            return
        }
        
        // Update status property
        status = newStatus
        
        // Set actualDeliveryDate if status is delivered
        if newStatus == .delivered {
            actualDeliveryDate = Date()
        }
        
        // Update lastModified timestamp
        lastModified = Date()
        
        // Set isSynced to false for backend synchronization
        isSynced = false
        isOffline = !NetworkManager.shared.isConnected
    }
    
    /// Validates if the status transition is allowed
    private func isValidStatusTransition(from currentStatus: DeliveryStatus, to newStatus: DeliveryStatus) -> Bool {
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
    
    // MARK: - Proof of Delivery
    
    /// Adds proof of delivery data with location verification
    /// Requirement: Digital proof of delivery capabilities for mobile applications
    /// - Parameter deliveryProof: Proof of delivery data including signature and verification
    /// - Returns: Success status of the operation
    public func addProofOfDelivery(_ deliveryProof: DeliveryProof) -> Bool {
        // Validate delivery proof data completeness
        guard !deliveryProof.recipientName.isEmpty else {
            return false
        }
        
        // Verify proof location is valid using Location.isValid()
        guard deliveryProof.verificationLocation.isValid() else {
            return false
        }
        
        // Verify proof.deliveryId matches this delivery
        guard deliveryProof.deliveryId == self.id else {
            return false
        }
        
        // Assign proof property
        self.proof = deliveryProof
        self.deliveryLocation = deliveryProof.verificationLocation
        
        // Update lastModified timestamp
        self.lastModified = Date()
        
        // Set isSynced to false
        self.isSynced = false
        self.isOffline = !NetworkManager.shared.isConnected
        
        return true
    }
    
    // MARK: - Data Conversion
    
    /// Converts delivery to dictionary format for storage or transmission
    /// Requirement: Real-time data synchronization between mobile and backend
    /// - Returns: Dictionary representation of delivery
    public func toDictionary() -> [String: Any] {
        // Create base dictionary with all properties
        var dictionary: [String: Any] = [
            "id": id,
            "routeId": routeId,
            "customerId": customerId,
            "address": address,
            "status": status.rawValue,
            "scheduledDate": scheduledDate.toISO8601String(),
            "estimatedDuration": estimatedDuration,
            "isOffline": isOffline,
            "isSynced": isSynced,
            "lastModified": lastModified.toISO8601String()
        ]
        
        // Add optional properties if present
        if let notes = notes {
            dictionary["notes"] = notes
        }
        
        if let actualDeliveryDate = actualDeliveryDate {
            dictionary["actualDeliveryDate"] = actualDeliveryDate.toISO8601String()
        }
        
        // Convert location to dictionary using Location.toJSON()
        if let deliveryLocation = deliveryLocation {
            dictionary["deliveryLocation"] = deliveryLocation.toJSON()
        }
        
        // Convert proof to dictionary using DeliveryProof.toDictionary()
        if let proof = proof {
            dictionary["proof"] = proof.toDictionary()
        }
        
        return dictionary
    }
}