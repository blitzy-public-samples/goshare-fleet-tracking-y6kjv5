//
// Route.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure CoreLocation framework is properly linked in Xcode project
// 2. Verify minimum iOS deployment target is set to iOS 14.0 or higher
// 3. Configure NotificationCenter observers in implementing view controllers
// 4. Set up CoreData schema for offline storage if not already done

import Foundation  // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Enumeration representing the status of a delivery route
/// Requirement: Route optimization and planning capabilities for delivery fleet
public enum RouteStatus: String, Codable {
    case planned
    case inProgress
    case completed
    case cancelled
}

/// Core data model representing a delivery route with optimization, real-time tracking capabilities,
/// and offline synchronization support
/// Requirements addressed:
/// - Route optimization and planning capabilities for delivery fleet
/// - Real-time data synchronization between mobile and backend
/// - Support for offline operation in mobile applications
@objc
@objcMembers
public class Route: NSObject {
    
    // MARK: - Properties
    
    /// Unique identifier for the route
    public let id: String
    
    /// Associated vehicle identifier
    public let vehicleId: String
    
    /// Optional assigned driver identifier
    public var driverId: String?
    
    /// Current status of the route
    public private(set) var status: RouteStatus
    
    /// Scheduled date for the route
    public let scheduledDate: Date
    
    /// Actual start time of route execution
    public private(set) var startTime: Date?
    
    /// Actual completion time of route
    public private(set) var endTime: Date?
    
    /// Array of delivery identifiers in sequence
    public private(set) var deliveryIds: [String]
    
    /// Ordered array of route waypoints
    public private(set) var waypoints: [Location]
    
    /// Estimated total distance in kilometers
    public private(set) var estimatedDistance: Double
    
    /// Estimated duration in seconds
    public private(set) var estimatedDuration: TimeInterval
    
    /// Number of completed deliveries
    public private(set) var completedDeliveries: Int
    
    /// Total number of deliveries in route
    public let totalDeliveries: Int
    
    /// Indicates if route has been optimized
    public private(set) var isOptimized: Bool
    
    /// Indicates if route was created/modified while offline
    public private(set) var isOffline: Bool
    
    /// Indicates if route has been synced with backend
    public private(set) var isSynced: Bool
    
    /// Timestamp of last modification
    public private(set) var lastModified: Date
    
    // MARK: - Initialization
    
    /// Initializes a new route instance with required properties
    public init(id: String, vehicleId: String, scheduledDate: Date, deliveryIds: [String]) {
        // Assign required properties from parameters
        self.id = id
        self.vehicleId = vehicleId
        self.scheduledDate = scheduledDate
        self.deliveryIds = deliveryIds
        
        // Set initial status to planned
        self.status = .planned
        
        // Initialize delivery tracking counters
        self.completedDeliveries = 0
        self.totalDeliveries = deliveryIds.count
        
        // Set default optimization status to false
        self.isOptimized = false
        
        // Initialize offline and sync flags
        self.isOffline = !NetworkManager.shared.isConnected
        self.isSynced = false
        
        // Set lastModified timestamp to current date
        self.lastModified = Date()
        
        // Initialize route metrics
        self.estimatedDistance = 0.0
        self.estimatedDuration = 0.0
        self.waypoints = []
        
        super.init()
    }
    
    // MARK: - Route Management
    
    /// Starts the route execution and updates tracking status
    /// Requirement: Real-time data synchronization between mobile and backend
    public func startRoute() -> Bool {
        // Validate route status is planned
        guard status == .planned else {
            NSLog("Cannot start route \(id) with status \(status)")
            return false
        }
        
        // Verify vehicle exists and is available
        guard let vehicle = getVehicle(), vehicle.status == .available else {
            NSLog("Vehicle \(vehicleId) is not available for route \(id)")
            return false
        }
        
        // Update status to inProgress
        status = .inProgress
        startTime = Date()
        lastModified = Date()
        isSynced = false
        
        // Post notification for route start
        NotificationCenter.default.post(
            name: NSNotification.Name("RouteStarted"),
            object: self,
            userInfo: ["routeId": id]
        )
        
        return true
    }
    
    /// Marks the route as completed after validating all deliveries
    /// Requirement: Route optimization and planning capabilities for delivery fleet
    public func completeRoute() -> Bool {
        // Validate all deliveries are completed
        guard completedDeliveries == totalDeliveries else {
            NSLog("Cannot complete route \(id) with pending deliveries")
            return false
        }
        
        // Verify route status is inProgress
        guard status == .inProgress else {
            NSLog("Cannot complete route \(id) with status \(status)")
            return false
        }
        
        // Update status to completed
        status = .completed
        endTime = Date()
        lastModified = Date()
        isSynced = false
        
        // Post notification for route completion
        NotificationCenter.default.post(
            name: NSNotification.Name("RouteCompleted"),
            object: self,
            userInfo: ["routeId": id]
        )
        
        return true
    }
    
    /// Updates route waypoints and recalculates route metrics
    /// Requirement: Route optimization and planning capabilities for delivery fleet
    public func updateWaypoints(_ newWaypoints: [Location]) {
        // Validate each location using Location.isValid()
        let validWaypoints = newWaypoints.filter { $0.isValid() }
        guard validWaypoints.count == newWaypoints.count else {
            NSLog("Invalid waypoints detected for route \(id)")
            return
        }
        
        // Update waypoints array with validated locations
        waypoints = validWaypoints
        
        // Recalculate estimated distance using coordinates
        estimatedDistance = calculateRouteDistance()
        
        // Recalculate estimated duration based on distance
        estimatedDuration = calculateRouteDuration()
        
        // Update lastModified timestamp
        lastModified = Date()
        isSynced = false
        
        // Post notification for waypoints update
        NotificationCenter.default.post(
            name: NSNotification.Name("RouteWaypointsUpdated"),
            object: self,
            userInfo: ["routeId": id]
        )
    }
    
    /// Updates delivery completion progress and route status
    /// Requirement: Real-time data synchronization between mobile and backend
    public func updateDeliveryProgress(deliveryId: String, status: DeliveryStatus) {
        // Verify deliveryId exists in deliveryIds array
        guard deliveryIds.contains(deliveryId) else {
            NSLog("Delivery \(deliveryId) not found in route \(id)")
            return
        }
        
        // Update delivery completion counter if status is delivered
        if status == .delivered {
            completedDeliveries += 1
        }
        
        // Check if all deliveries are completed
        if completedDeliveries == totalDeliveries {
            _ = completeRoute()
        }
        
        // Update lastModified timestamp
        lastModified = Date()
        isSynced = false
        
        // Post notification for delivery progress update
        NotificationCenter.default.post(
            name: NSNotification.Name("RouteDeliveryProgressUpdated"),
            object: self,
            userInfo: [
                "routeId": id,
                "deliveryId": deliveryId,
                "status": status
            ]
        )
    }
    
    // MARK: - Data Conversion
    
    /// Converts route to dictionary format for storage or transmission
    /// Requirement: Real-time data synchronization between mobile and backend
    public func toDictionary() -> [String: Any] {
        // Create base dictionary with all properties
        var dict: [String: Any] = [
            "id": id,
            "vehicleId": vehicleId,
            "status": status.rawValue,
            "scheduledDate": scheduledDate.toISO8601String(),
            "deliveryIds": deliveryIds,
            "completedDeliveries": completedDeliveries,
            "totalDeliveries": totalDeliveries,
            "estimatedDistance": estimatedDistance,
            "estimatedDuration": estimatedDuration,
            "isOptimized": isOptimized,
            "isOffline": isOffline,
            "isSynced": isSynced,
            "lastModified": lastModified.toISO8601String()
        ]
        
        // Convert dates to ISO8601 format
        if let startTime = startTime {
            dict["startTime"] = startTime.toISO8601String()
        }
        
        if let endTime = endTime {
            dict["endTime"] = endTime.toISO8601String()
        }
        
        // Convert waypoints to JSON array using Location.toJSON()
        dict["waypoints"] = waypoints.map { $0.toJSON() }
        
        // Include optional driver ID if assigned
        if let driverId = driverId {
            dict["driverId"] = driverId
        }
        
        return dict
    }
    
    // MARK: - Private Helpers
    
    /// Retrieves associated vehicle instance
    private func getVehicle() -> Vehicle? {
        // Implementation would retrieve vehicle from data store
        // This is a placeholder that should be implemented based on the app's data layer
        return nil
    }
    
    /// Calculates total route distance based on waypoints
    private func calculateRouteDistance() -> Double {
        guard waypoints.count > 1 else { return 0.0 }
        
        var totalDistance = 0.0
        for i in 0..<waypoints.count-1 {
            let start = waypoints[i].coordinate
            let end = waypoints[i+1].coordinate
            
            let startLocation = CLLocation(latitude: start.latitude, longitude: start.longitude)
            let endLocation = CLLocation(latitude: end.latitude, longitude: end.longitude)
            
            totalDistance += startLocation.distance(from: endLocation) / 1000.0 // Convert to kilometers
        }
        
        return totalDistance
    }
    
    /// Calculates estimated route duration based on distance and average speed
    private func calculateRouteDuration() -> TimeInterval {
        // Assuming average speed of 40 km/h for urban delivery routes
        let averageSpeedKmH = 40.0
        let averageSpeedKmS = averageSpeedKmH / 3600.0
        
        // Add 5 minutes (300 seconds) buffer per delivery for stops
        let deliveryBuffer = TimeInterval(totalDeliveries * 300)
        
        return (estimatedDistance / averageSpeedKmS) + deliveryBuffer
    }
}