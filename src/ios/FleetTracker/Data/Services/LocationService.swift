//
// LocationService.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure CoreLocation framework is properly linked in Xcode project
// 2. Configure background fetch capabilities for offline sync
// 3. Set up proper error logging and monitoring
// 4. Verify sync conflict resolution strategy with backend team
// 5. Configure proper network reachability monitoring

import Foundation  // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Core service class managing location tracking, data persistence, and synchronization
/// with 30-second update intervals and offline support
@objc
@objcMembers
public class LocationService: NSObject {
    
    // MARK: - Properties
    
    /// Location manager instance for tracking
    private let locationManager: LocationManager
    
    /// Repository for location data persistence
    private let repository: LocationRepository
    
    /// Background queue for async operations
    private let backgroundQueue: DispatchQueue
    
    /// Timer for periodic sync operations
    private var syncTimer: Timer?
    
    /// Flag indicating if sync is in progress
    private var isSyncInProgress: Bool = false
    
    /// Currently tracked vehicle identifier
    private var currentVehicleId: String?
    
    /// Currently tracked driver identifier
    private var currentDriverId: String?
    
    // MARK: - Initialization
    
    /// Initializes the location service with required dependencies
    /// - Parameter repository: Repository for location data persistence
    public init(repository: LocationRepository) {
        self.repository = repository
        self.locationManager = LocationManager.shared()
        self.backgroundQueue = DispatchQueue(label: "com.fleettracker.location.service",
                                           qos: .utility,
                                           attributes: .concurrent)
        super.init()
        
        // Configure location manager delegate
        locationManager.delegate = self
    }
    
    // MARK: - Location Tracking
    
    /// Starts location tracking for a vehicle with 30-second updates
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Performance Requirements: 30-second maximum data latency
    /// - Parameters:
    ///   - vehicleId: Vehicle identifier to track
    ///   - driverId: Optional driver identifier
    public func startTracking(vehicleId: String, driverId: String? = nil) {
        // Store tracking identifiers
        currentVehicleId = vehicleId
        currentDriverId = driverId
        
        // Start location tracking
        locationManager.startTracking(vehicleId: vehicleId, driverId: driverId)
        
        // Initialize sync timer for 30-second intervals
        syncTimer?.invalidate()
        syncTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            self?.syncLocations()
        }
        
        // Perform initial sync
        syncLocations()
    }
    
    /// Stops location tracking and performs final sync
    /// Requirements addressed:
    /// - Real-time data synchronization between mobile and backend
    public func stopTracking() {
        // Stop location updates
        locationManager.stopTracking()
        
        // Invalidate sync timer
        syncTimer?.invalidate()
        syncTimer = nil
        
        // Perform final sync
        syncLocations()
        
        // Clear tracking identifiers
        currentVehicleId = nil
        currentDriverId = nil
    }
    
    // MARK: - Location Processing
    
    /// Processes new location updates with validation
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Offline data handling capabilities
    /// - Parameter location: New location update
    private func handleLocationUpdate(_ location: CLLocation) {
        guard let vehicleId = currentVehicleId else { return }
        
        // Create location model
        let locationModel = Location(location: location, vehicleId: vehicleId)
        
        // Validate location data
        guard locationModel.isValid() else {
            NSLog("Invalid location data received")
            return
        }
        
        // Save to repository
        backgroundQueue.async { [weak self] in
            guard let self = self else { return }
            
            if self.repository.saveLocation(locationModel) {
                // Trigger sync if online
                if !self.locationManager.isOfflineMode {
                    self.syncLocations()
                }
            }
        }
    }
    
    // MARK: - Data Synchronization
    
    /// Synchronizes stored locations with server
    /// Requirements addressed:
    /// - Real-time data synchronization between mobile and backend
    /// - Offline data handling capabilities
    private func syncLocations() {
        // Check if sync already in progress
        guard !isSyncInProgress else { return }
        
        // Set sync flag
        isSyncInProgress = true
        
        backgroundQueue.async { [weak self] in
            guard let self = self else { return }
            
            // Check network connectivity
            if !self.locationManager.isOfflineMode {
                // Trigger repository sync
                self.repository.syncUnsyncedLocations()
                
                // Clear synced locations after successful sync
                self.repository.clearSyncedLocations([])
            }
            
            // Reset sync flag
            self.isSyncInProgress = false
        }
    }
}

// MARK: - LocationUpdateDelegate

extension LocationService: LocationUpdateDelegate {
    
    public func didUpdateLocation(_ location: CLLocation) {
        handleLocationUpdate(location)
    }
    
    public func didFailWithError(_ error: Error) {
        NSLog("Location update failed: \(error.localizedDescription)")
        
        // Handle offline mode transition if needed
        if (error as NSError).domain == kCLErrorDomain {
            // Continue tracking but cache data
        }
    }
    
    public func didEnterRegion(_ region: CLRegion) {
        // Handle geofence entry events
        NSLog("Entered region: \(region.identifier)")
    }
    
    public func didExitRegion(_ region: CLRegion) {
        // Handle geofence exit events
        NSLog("Exited region: \(region.identifier)")
    }
}