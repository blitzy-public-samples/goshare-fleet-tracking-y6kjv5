//
// Vehicle.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure CoreLocation framework is properly linked in Xcode project
// 2. Verify minimum iOS deployment target is set to iOS 14.0 or higher
// 3. Configure NotificationCenter observers in the implementing view controllers
// 4. Add VehicleStatusChangeNotification to NotificationConstants.swift

import Foundation  // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Enumeration representing the operational status of a vehicle
/// Requirement: Fleet management - Interactive fleet management dashboard
public enum VehicleStatus: String, Codable {
    case available
    case inUse
    case maintenance
    case outOfService
}

/// Core data model representing a vehicle in the Fleet Tracking System
/// Requirement: Real-time GPS tracking with 30-second update intervals
@objc
@objcMembers
public class Vehicle: NSObject {
    
    // MARK: - Properties
    
    /// Unique identifier for the vehicle
    public let id: String
    
    /// Vehicle registration/license plate number
    public let registrationNumber: String
    
    /// Vehicle model name/number
    public let model: String
    
    /// Vehicle manufacturer
    public let make: String
    
    /// Vehicle manufacturing year
    public let year: Int
    
    /// Current operational status
    public private(set) var status: VehicleStatus
    
    /// Current location of the vehicle
    /// Requirement: Real-time GPS tracking with 30-second update intervals
    public private(set) var currentLocation: Location?
    
    /// ID of the currently assigned driver
    public private(set) var assignedDriverId: String?
    
    /// Current fuel level percentage (0-100)
    public private(set) var fuelLevel: Double
    
    /// Current odometer reading in kilometers
    public private(set) var odometer: Int
    
    /// Date of last maintenance service
    public let lastMaintenanceDate: Date
    
    /// Timestamp of last data update
    public private(set) var lastUpdated: Date
    
    /// Indicates if the vehicle is operating in offline mode
    /// Requirement: Offline operation - Offline data handling capabilities
    public private(set) var isOffline: Bool
    
    /// Indicates if the vehicle data is synced with the server
    public private(set) var isSynced: Bool
    
    // MARK: - Initialization
    
    /// Initializes a new vehicle instance with required properties
    public init(id: String, registrationNumber: String, model: String, make: String, year: Int) {
        self.id = id
        self.registrationNumber = registrationNumber
        self.model = model
        self.make = make
        self.year = year
        
        // Initialize with default values
        self.status = .available
        self.currentLocation = nil
        self.assignedDriverId = nil
        self.fuelLevel = 100.0
        self.odometer = 0
        self.lastMaintenanceDate = Date()
        self.lastUpdated = Date()
        self.isOffline = false
        self.isSynced = false
        
        super.init()
    }
    
    // MARK: - Location Management
    
    /// Updates the vehicle's current location and validates tracking data
    /// Requirement: Real-time GPS tracking with 30-second update intervals
    public func updateLocation(_ newLocation: Location) {
        // Validate location data
        guard newLocation.isValid() else {
            NSLog("Invalid location data received for vehicle \(id)")
            return
        }
        
        // Verify location belongs to this vehicle
        guard newLocation.vehicleId == id else {
            NSLog("Location vehicleId mismatch: expected \(id), got \(newLocation.vehicleId)")
            return
        }
        
        // Update location and timestamps
        currentLocation = newLocation
        lastUpdated = Date()
        isSynced = false
        
        // Post notification for location update
        NotificationCenter.default.post(
            name: NSNotification.Name("VehicleLocationUpdated"),
            object: self,
            userInfo: ["location": newLocation]
        )
    }
    
    // MARK: - Driver Assignment
    
    /// Assigns a driver to the vehicle and updates status
    /// Requirement: Fleet management - Interactive fleet management dashboard
    public func assignDriver(_ driverId: String) -> Bool {
        // Verify vehicle is available for assignment
        guard status == .available else {
            NSLog("Cannot assign driver to vehicle \(id) with status \(status)")
            return false
        }
        
        // Update assignment and status
        assignedDriverId = driverId
        status = .inUse
        lastUpdated = Date()
        isSynced = false
        
        // Post notification for driver assignment
        NotificationCenter.default.post(
            name: NSNotification.Name("VehicleDriverAssigned"),
            object: self,
            userInfo: ["driverId": driverId]
        )
        
        return true
    }
    
    // MARK: - Status Management
    
    /// Updates the vehicle's operational status with validation
    /// Requirement: Fleet management - Interactive fleet management dashboard
    public func updateStatus(_ newStatus: VehicleStatus) {
        // Validate status transition
        let isValidTransition = validateStatusTransition(from: status, to: newStatus)
        guard isValidTransition else {
            NSLog("Invalid status transition from \(status) to \(newStatus)")
            return
        }
        
        // Update status and timestamps
        status = newStatus
        lastUpdated = Date()
        isSynced = false
        
        // Clear driver assignment if vehicle becomes unavailable
        if newStatus != .inUse {
            assignedDriverId = nil
        }
        
        // Post notification for status change
        NotificationCenter.default.post(
            name: NSNotification.Name("VehicleStatusChanged"),
            object: self,
            userInfo: ["status": newStatus]
        )
    }
    
    // MARK: - Data Conversion
    
    /// Converts vehicle to dictionary format for storage or transmission
    /// Requirement: Offline operation - Offline data handling capabilities
    public func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "id": id,
            "registrationNumber": registrationNumber,
            "model": model,
            "make": make,
            "year": year,
            "status": status.rawValue,
            "fuelLevel": fuelLevel,
            "odometer": odometer,
            "lastMaintenanceDate": lastMaintenanceDate.toISO8601String(),
            "lastUpdated": lastUpdated.toISO8601String(),
            "isOffline": isOffline,
            "isSynced": isSynced
        ]
        
        // Add optional properties if available
        if let location = currentLocation {
            dict["currentLocation"] = location.toJSON()
        }
        
        if let driverId = assignedDriverId {
            dict["assignedDriverId"] = driverId
        }
        
        return dict
    }
    
    // MARK: - Private Helpers
    
    /// Validates if a status transition is allowed based on business rules
    private func validateStatusTransition(from currentStatus: VehicleStatus, to newStatus: VehicleStatus) -> Bool {
        switch (currentStatus, newStatus) {
        case (.available, .inUse),
             (.available, .maintenance),
             (.available, .outOfService),
             (.inUse, .available),
             (.inUse, .maintenance),
             (.inUse, .outOfService),
             (.maintenance, .available),
             (.maintenance, .outOfService),
             (.outOfService, .maintenance),
             (.outOfService, .available):
            return true
        default:
            return false
        }
    }
}