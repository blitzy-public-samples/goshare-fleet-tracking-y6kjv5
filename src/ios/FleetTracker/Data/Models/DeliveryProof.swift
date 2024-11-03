//
// DeliveryProof.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure minimum iOS deployment target is set to iOS 14.0 or higher
// 2. Configure camera and photo library usage descriptions in Info.plist:
//    - NSCameraUsageDescription
//    - NSPhotoLibraryUsageDescription
// 3. Configure location usage permissions as required by Location.swift

import Foundation  // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Enumeration defining the types of proof that can be collected for a delivery
/// Requirement: Digital proof of delivery capabilities
public enum ProofType: String, Codable {
    case signature
    case photo
    case barcode
}

/// Model class for managing proof of delivery data including signatures, photos and location verification
/// Requirement: Digital proof of delivery capabilities for mobile applications
@objc
@objcMembers
public class DeliveryProof: NSObject {
    
    // MARK: - Properties
    
    /// Unique identifier for the proof record
    public let id: String
    
    /// Associated delivery identifier
    public let deliveryId: String
    
    /// Type of proof collected
    public let type: ProofType
    
    /// Digital signature data if applicable
    public private(set) var signature: Data?
    
    /// Collection of photo evidence
    public private(set) var photos: [Data]
    
    /// Barcode data if applicable
    public private(set) var barcode: String?
    
    /// Name of the person who received the delivery
    public let recipientName: String
    
    /// Location where the proof was collected
    public let verificationLocation: Location
    
    /// Timestamp when the proof was recorded or last updated
    public private(set) var timestamp: Date
    
    /// Indicates if the proof was collected while offline
    /// Requirement: Support for offline operation in mobile applications
    public let isOffline: Bool
    
    /// Indicates if the proof has been synced with the server
    public private(set) var isSynced: Bool
    
    // MARK: - Initialization
    
    /// Initializes a new delivery proof instance
    /// - Parameters:
    ///   - deliveryId: Associated delivery identifier
    ///   - type: Type of proof being collected
    ///   - recipientName: Name of the person receiving the delivery
    ///   - verificationLocation: Location where proof is being collected
    public init(deliveryId: String, type: ProofType, recipientName: String, verificationLocation: Location) {
        // Generate unique identifier
        self.id = UUID().uuidString
        
        // Set required properties
        self.deliveryId = deliveryId
        self.type = type
        self.recipientName = recipientName
        self.verificationLocation = verificationLocation
        
        // Initialize collections
        self.photos = []
        
        // Set timestamp to current date
        self.timestamp = Date()
        
        // Set offline status based on network reachability
        self.isOffline = !NetworkManager.shared.isConnected
        
        // Initialize sync status
        self.isSynced = false
        
        super.init()
    }
    
    // MARK: - Proof Management Methods
    
    /// Adds signature data to the proof
    /// - Parameter signatureData: Digital signature captured from the user
    public func addSignature(_ signatureData: Data) {
        guard !signatureData.isEmpty else {
            return
        }
        
        self.signature = signatureData
        self.isSynced = false
        self.timestamp = Date()
    }
    
    /// Adds a photo to the proof collection
    /// - Parameter photoData: Photo data captured or selected
    public func addPhoto(_ photoData: Data) {
        guard !photoData.isEmpty else {
            return
        }
        
        self.photos.append(photoData)
        self.isSynced = false
        self.timestamp = Date()
    }
    
    /// Adds barcode data to the proof
    /// - Parameter barcodeData: Scanned barcode data
    public func addBarcode(_ barcodeData: String) {
        guard !barcodeData.isEmpty else {
            return
        }
        
        self.barcode = barcodeData
        self.isSynced = false
        self.timestamp = Date()
    }
    
    // MARK: - Data Conversion
    
    /// Converts proof to dictionary format for storage or transmission
    /// - Returns: Dictionary representation of the proof
    public func toDictionary() -> [String: Any] {
        var dictionary: [String: Any] = [
            "id": id,
            "deliveryId": deliveryId,
            "type": type.rawValue,
            "recipientName": recipientName,
            "verificationLocation": verificationLocation.toJSON(),
            "timestamp": timestamp.toISO8601String(),
            "isOffline": isOffline,
            "isSynced": isSynced
        ]
        
        // Add optional signature data if present
        if let signature = signature {
            dictionary["signature"] = signature.base64EncodedString()
        }
        
        // Convert photos to base64 strings
        if !photos.isEmpty {
            dictionary["photos"] = photos.map { $0.base64EncodedString() }
        }
        
        // Add barcode if present
        if let barcode = barcode {
            dictionary["barcode"] = barcode
        }
        
        return dictionary
    }
}