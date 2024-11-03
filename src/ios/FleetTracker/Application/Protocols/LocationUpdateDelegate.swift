//
// LocationUpdateDelegate.swift
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

/// Protocol defining methods for handling location updates, errors, and geofencing events
/// with 30-second update intervals in the Fleet Tracking System
/// Requirement 1.2: Real-time GPS tracking with 30-second update intervals
@objc public protocol LocationUpdateDelegate: AnyObject {
    
    /// Called when a new location update is received, validated, and within the 30-second interval
    /// - Parameter location: The validated Location object containing coordinate, speed, heading, and accuracy data
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Performance Requirements: 30-second maximum data latency
    @objc func didUpdateLocation(_ location: Location)
    
    /// Called when a location update fails or validation fails
    /// - Parameter error: The error that occurred during location update or validation
    @objc func didFailWithError(_ error: Error)
    
    /// Called when device enters a monitored geofence region
    /// - Parameter region: The CLRegion that was entered
    /// Requirement: Geofencing and zone management capabilities
    @objc optional func didEnterRegion(_ region: CLRegion)
    
    /// Called when device exits a monitored geofence region
    /// - Parameter region: The CLRegion that was exited
    /// Requirement: Geofencing and zone management capabilities
    @objc optional func didExitRegion(_ region: CLRegion)
}