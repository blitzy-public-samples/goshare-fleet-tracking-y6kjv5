//
// LocationConstants.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure CoreLocation framework is properly linked in the Xcode project
// 2. Verify minimum iOS deployment target is set to iOS 14.0 or higher
// 3. Request appropriate location permissions in Info.plist:
//    - NSLocationAlwaysAndWhenInUseUsageDescription
//    - NSLocationWhenInUseUsageDescription
//    - UIBackgroundModes (location)

import Foundation  // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// LocationConstants provides the core configuration values for the Fleet Tracking System's location services.
/// These values are carefully tuned to balance accuracy requirements with battery life considerations.
/// The struct ensures compliance with the system's real-time tracking requirements while supporting geofencing capabilities.
public struct LocationConstants {
    
    // MARK: - Location Update Configuration
    
    /// The interval in seconds between location updates
    /// Requirement 1.2: Real-time GPS tracking with 30-second update intervals
    public static let updateInterval: TimeInterval = 30.0
    
    /// The minimum distance in meters that must be traveled before a location update is triggered
    /// Optimized for battery life while maintaining accurate tracking
    public static let distanceFilter: CLLocationDistance = 10.0
    
    /// The desired accuracy of location updates
    /// Requirement 1.2: Real-time GPS tracking requires highest possible accuracy
    public static let desiredAccuracy: CLLocationAccuracy = kCLLocationAccuracyBest
    
    // MARK: - Geofencing Configuration
    
    /// The minimum allowed radius in meters for a geofence zone
    /// Requirement 1.2: Geofencing and zone management - minimum safe distance for accurate detection
    public static let minimumGeofenceRadius: CLLocationDistance = 100.0
    
    /// The maximum allowed radius in meters for a geofence zone
    /// Requirement 1.2: Geofencing and zone management - maximum practical distance for zone monitoring
    public static let maximumGeofenceRadius: CLLocationDistance = 5000.0
    
    // MARK: - Offline Operation Configuration
    
    /// The interval in seconds for syncing cached location data when returning online
    /// Requirement 1.2: Offline operation support - ensures data consistency when network is restored
    public static let syncInterval: TimeInterval = 60.0
}