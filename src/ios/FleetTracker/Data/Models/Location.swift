//
// Location.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure CoreLocation framework is properly linked in Xcode project
// 2. Verify minimum iOS deployment target is set to iOS 14.0 or higher
// 3. Configure location usage descriptions in Info.plist:
//    - NSLocationAlwaysAndWhenInUseUsageDescription
//    - NSLocationWhenInUseUsageDescription
//    - UIBackgroundModes (location)

import Foundation  // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Core model representing a location data point in the Fleet Tracking System
/// Handles real-time GPS tracking, geofencing, and offline data synchronization
public struct Location: Codable {
    
    // MARK: - Properties
    
    /// Unique identifier for the location data point
    public let id: String
    
    /// Geographic coordinates of the location
    public let coordinate: CLLocationCoordinate2D
    
    /// Current speed in meters per second
    public let speed: CLLocationSpeed
    
    /// Current heading in degrees (0-359.9)
    public let heading: CLLocationDirection
    
    /// Accuracy of the location measurement in meters
    public let accuracy: CLLocationAccuracy
    
    /// Timestamp when the location was recorded
    public let timestamp: Date
    
    /// Associated vehicle identifier
    public let vehicleId: String
    
    /// Indicates whether the location has been synced with the server
    /// Requirement 1.2: Offline operation support
    public var isSynced: Bool
    
    // MARK: - Initialization
    
    /// Initializes a new Location instance from CLLocation
    /// - Parameters:
    ///   - location: Core Location data point
    ///   - vehicleId: Associated vehicle identifier
    public init(location: CLLocation, vehicleId: String) {
        self.id = UUID().uuidString
        self.coordinate = location.coordinate
        self.speed = location.speed
        self.heading = location.course
        self.accuracy = location.horizontalAccuracy
        self.timestamp = location.timestamp
        self.vehicleId = vehicleId
        self.isSynced = false
    }
    
    // MARK: - Validation
    
    /// Validates the location data point based on accuracy and staleness
    /// Requirement 1.2: Real-time GPS tracking with accuracy requirements
    public func isValid() -> Bool {
        // Verify accuracy meets threshold
        guard accuracy <= LocationConstants.desiredAccuracy else {
            return false
        }
        
        // Verify coordinates are within valid ranges
        guard coordinate.latitude >= -90.0 && coordinate.latitude <= 90.0 &&
              coordinate.longitude >= -180.0 && coordinate.longitude <= 180.0 else {
            return false
        }
        
        // Check if timestamp is within tracking interval
        guard timestamp.isWithinTrackingInterval() else {
            return false
        }
        
        // Verify timestamp is not stale
        guard !timestamp.isStale() else {
            return false
        }
        
        return true
    }
    
    // MARK: - JSON Conversion
    
    /// Converts location to JSON format for API communication
    /// Requirement 1.2: Real-time GPS tracking data transmission
    public func toJSON() -> [String: Any] {
        return [
            "id": id,
            "coordinate": [
                "latitude": coordinate.latitude,
                "longitude": coordinate.longitude
            ],
            "speed": speed,
            "heading": heading,
            "accuracy": accuracy,
            "timestamp": timestamp.toISO8601String(),
            "vehicleId": vehicleId,
            "isSynced": isSynced
        ]
    }
    
    // MARK: - Codable Implementation
    
    private enum CodingKeys: String, CodingKey {
        case id, speed, heading, accuracy, timestamp, vehicleId, isSynced
        case coordinate
        case latitude, longitude
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(speed, forKey: .speed)
        try container.encode(heading, forKey: .heading)
        try container.encode(accuracy, forKey: .accuracy)
        try container.encode(timestamp.toISO8601String(), forKey: .timestamp)
        try container.encode(vehicleId, forKey: .vehicleId)
        try container.encode(isSynced, forKey: .isSynced)
        
        // Encode coordinate as nested container
        var coordinateContainer = container.nestedContainer(keyedBy: CodingKeys.self, forKey: .coordinate)
        try coordinateContainer.encode(coordinate.latitude, forKey: .latitude)
        try coordinateContainer.encode(coordinate.longitude, forKey: .longitude)
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        speed = try container.decode(CLLocationSpeed.self, forKey: .speed)
        heading = try container.decode(CLLocationDirection.self, forKey: .heading)
        accuracy = try container.decode(CLLocationAccuracy.self, forKey: .accuracy)
        
        // Decode timestamp from ISO8601 string
        let timestampString = try container.decode(String.self, forKey: .timestamp)
        guard let decodedTimestamp = Date.fromISO8601String(timestampString) else {
            throw DecodingError.dataCorruptedError(forKey: .timestamp,
                  in: container,
                  debugDescription: "Invalid ISO8601 date format")
        }
        timestamp = decodedTimestamp
        
        vehicleId = try container.decode(String.self, forKey: .vehicleId)
        isSynced = try container.decode(Bool.self, forKey: .isSynced)
        
        // Decode coordinate from nested container
        let coordinateContainer = try container.nestedContainer(keyedBy: CodingKeys.self, forKey: .coordinate)
        let latitude = try coordinateContainer.decode(Double.self, forKey: .latitude)
        let longitude = try coordinateContainer.decode(Double.self, forKey: .longitude)
        coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}