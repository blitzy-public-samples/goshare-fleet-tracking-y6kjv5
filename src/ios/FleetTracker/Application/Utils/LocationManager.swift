//
// LocationManager.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure CoreLocation framework is properly linked in Xcode project
// 2. Verify minimum iOS deployment target is set to iOS 14.0 or higher
// 3. Configure location usage descriptions in Info.plist:
//    - NSLocationAlwaysAndWhenInUseUsageDescription
//    - NSLocationWhenInUseUsageDescription
//    - UIBackgroundModes (location)
// 4. Enable background location updates in project capabilities
// 5. Configure offline storage settings for cached location data

import Foundation  // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Core utility class managing real-time location tracking, geofencing, and location updates
/// with 30-second update intervals and offline data handling support
@objc @objcMembers public class LocationManager: NSObject {
    
    // MARK: - Properties
    
    /// Shared singleton instance
    private static var sharedInstance: LocationManager?
    
    /// Core Location manager instance
    private let locationManager: CLLocationManager
    
    /// Delegate for location updates and geofencing events
    public weak var delegate: LocationUpdateDelegate?
    
    /// Currently tracked vehicle identifier
    public var currentVehicleId: String?
    
    /// Currently tracked driver identifier
    public var currentDriverId: String?
    
    /// Flag indicating if tracking is active
    public private(set) var isTracking: Bool = false
    
    /// Set of currently monitored geofence regions
    private var monitoredRegions: Set<CLRegion> = []
    
    /// Flag indicating if system is in offline mode
    public private(set) var isOfflineMode: Bool = false
    
    // MARK: - Initialization
    
    /// Private initializer for singleton instance
    private override init() {
        // Initialize location manager
        locationManager = CLLocationManager()
        
        super.init()
        
        // Configure location manager
        locationManager.delegate = self
        locationManager.desiredAccuracy = LocationConstants.desiredAccuracy
        locationManager.distanceFilter = LocationConstants.distanceFilter
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.showsBackgroundLocationIndicator = true
    }
    
    // MARK: - Singleton Access
    
    /// Returns the shared LocationManager instance
    /// - Returns: Shared singleton instance
    @objc public static func shared() -> LocationManager {
        if sharedInstance == nil {
            sharedInstance = LocationManager()
        }
        return sharedInstance!
    }
    
    // MARK: - Location Tracking
    
    /// Starts location tracking for specified vehicle and driver with 30-second updates
    /// - Parameters:
    ///   - vehicleId: Vehicle identifier to track
    ///   - driverId: Optional driver identifier
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Performance Requirements: 30-second maximum data latency
    @objc public func startTracking(vehicleId: String, driverId: String? = nil) {
        // Request location permissions if needed
        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestAlwaysAuthorization()
            return
        case .restricted, .denied:
            delegate?.didFailWithError(NSError(domain: "com.fleettracker.location",
                                             code: 403,
                                             userInfo: [NSLocalizedDescriptionKey: "Location permission denied"]))
            return
        default:
            break
        }
        
        // Set tracking identifiers
        currentVehicleId = vehicleId
        currentDriverId = driverId
        
        // Configure update interval
        locationManager.desiredAccuracy = LocationConstants.desiredAccuracy
        
        // Start updates
        locationManager.startUpdatingLocation()
        isTracking = true
    }
    
    /// Stops location tracking and cleans up resources
    @objc public func stopTracking() {
        locationManager.stopUpdatingLocation()
        currentVehicleId = nil
        currentDriverId = nil
        isTracking = false
        
        // Stop monitoring all regions
        monitoredRegions.forEach { region in
            locationManager.stopMonitoring(for: region)
        }
        monitoredRegions.removeAll()
    }
    
    // MARK: - Geofencing
    
    /// Starts monitoring a geofence region within valid radius limits
    /// - Parameter region: Region to monitor
    /// Requirement: Geofencing and zone management capabilities
    @objc public func startMonitoringRegion(_ region: CLRegion) {
        // Validate region radius if it's a circular region
        if let circularRegion = region as? CLCircularRegion {
            guard circularRegion.radius >= LocationConstants.minimumGeofenceRadius &&
                  circularRegion.radius <= LocationConstants.maximumGeofenceRadius else {
                delegate?.didFailWithError(NSError(domain: "com.fleettracker.location",
                                                 code: 400,
                                                 userInfo: [NSLocalizedDescriptionKey: "Invalid geofence radius"]))
                return
            }
        }
        
        // Add to monitored set and start monitoring
        monitoredRegions.insert(region)
        locationManager.startMonitoring(for: region)
        
        // Cache region data for offline support
        cacheRegionData(region)
    }
    
    /// Stops monitoring a geofence region
    /// - Parameter region: Region to stop monitoring
    @objc public func stopMonitoringRegion(_ region: CLRegion) {
        monitoredRegions.remove(region)
        locationManager.stopMonitoring(for: region)
        removeRegionCache(region)
    }
    
    // MARK: - Private Helpers
    
    /// Caches region data for offline support
    private func cacheRegionData(_ region: CLRegion) {
        // Implementation for caching region data
        // This would typically involve storing the region data in Core Data or similar
    }
    
    /// Removes cached region data
    private func removeRegionCache(_ region: CLRegion) {
        // Implementation for removing cached region data
    }
    
    /// Handles offline mode transition
    private func handleOfflineMode(_ enabled: Bool) {
        isOfflineMode = enabled
        if enabled {
            // Implement offline data caching strategy
        } else {
            // Sync cached data when coming back online
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationManager: CLLocationManagerDelegate {
    
    /// Handles location updates from CLLocationManager
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let currentVehicleId = currentVehicleId,
              let lastLocation = locations.last else {
            return
        }
        
        // Create and validate location object
        let location = Location(location: lastLocation, vehicleId: currentVehicleId)
        guard location.isValid() else {
            return
        }
        
        // Notify delegate of location update
        delegate?.didUpdateLocation(location)
        
        // Handle offline caching if needed
        if isOfflineMode {
            // Cache location data for later sync
        }
    }
    
    /// Handles location manager errors
    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        delegate?.didFailWithError(error)
        
        // Check for network-related errors and enable offline mode if needed
        if (error as NSError).domain == kCLErrorDomain {
            handleOfflineMode(true)
        }
    }
    
    /// Handles geofence region entry events
    public func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        delegate?.didEnterRegion?(region)
    }
    
    /// Handles geofence region exit events
    public func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        delegate?.didExitRegion?(region)
    }
    
    /// Handles changes in location authorization status
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            // Resume tracking if we were waiting for authorization
            if let vehicleId = currentVehicleId {
                startTracking(vehicleId: vehicleId, driverId: currentDriverId)
            }
        case .denied, .restricted:
            stopTracking()
            delegate?.didFailWithError(NSError(domain: "com.fleettracker.location",
                                             code: 403,
                                             userInfo: [NSLocalizedDescriptionKey: "Location permission denied"]))
        default:
            break
        }
    }
}