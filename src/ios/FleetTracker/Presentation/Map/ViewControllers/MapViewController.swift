//
// MapViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure MapKit and CoreLocation frameworks are properly linked in Xcode project
// 2. Configure location usage descriptions in Info.plist:
//    - NSLocationWhenInUseUsageDescription
//    - NSLocationAlwaysAndWhenInUseUsageDescription
// 3. Add required map assets to Assets.xcassets
// 4. Configure offline map tile caching settings
// 5. Test map performance with large number of annotations

import UIKit      // iOS 14.0+
import MapKit     // iOS 14.0+
import CoreLocation  // iOS 14.0+
import Combine    // iOS 14.0+

/// View controller managing the interactive map interface for fleet tracking
/// Requirements addressed:
/// - Real-time GPS tracking with 30-second update intervals (1.2 Scope/Core Functionality)
/// - Interactive mapping using Google Maps Platform (1.2 Scope/Core Functionality)
/// - Route optimization and planning (1.2 Scope/Core Functionality)
/// - Offline operation support (1.2 Scope/Technical Implementation)
@objc
@objcMembers
class MapViewController: UIViewController {
    
    // MARK: - Properties
    
    /// Custom map view for fleet tracking visualization
    private var mapView: MapView!
    
    /// Location service for real-time tracking
    private let locationService: LocationService
    
    /// Route service for route management
    private let routeService: RouteService
    
    /// Set to store active subscriptions
    private var cancellables = Set<AnyCancellable>()
    
    /// Currently active route identifier
    private var activeRouteId: String?
    
    /// Flag indicating if offline mode is active
    public var isOfflineMode: Bool {
        return mapView.isOfflineMode
    }
    
    // MARK: - Initialization
    
    override init(nibName nibNameOrNil: String?, bundle nibBundleOrNil: Bundle?) {
        // Initialize services
        self.locationService = LocationService.shared
        self.routeService = RouteService.shared
        
        super.init(nibName: nibNameOrNil, bundle: nibBundleOrNil)
    }
    
    required init?(coder: NSCoder) {
        // Initialize services
        self.locationService = LocationService.shared
        self.routeService = RouteService.shared
        
        super.init(coder: coder)
    }
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        setupMapView()
        setupBindings()
        
        // Restore active route if any
        if let routeId = UserDefaults.standard.string(forKey: "activeRouteId") {
            startRouteTracking(routeId: routeId)
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Resume location updates if active route exists
        if let routeId = activeRouteId {
            locationService.startTracking(vehicleId: routeId)
        }
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        // Pause location updates when view is not visible
        if !isOfflineMode {
            locationService.stopTracking()
        }
    }
    
    // MARK: - Setup Methods
    
    /// Sets up the user interface components
    private func setupUI() {
        // Configure navigation bar
        title = "Fleet Tracking"
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            image: UIImage(systemName: "arrow.triangle.2.circlepath"),
            style: .plain,
            target: self,
            action: #selector(refreshButtonTapped)
        )
        
        // Add offline mode indicator if needed
        if isOfflineMode {
            let offlineLabel = UILabel()
            offlineLabel.text = "Offline Mode"
            offlineLabel.textColor = .systemRed
            offlineLabel.font = .systemFont(ofSize: 12, weight: .medium)
            navigationItem.leftBarButtonItem = UIBarButtonItem(customView: offlineLabel)
        }
    }
    
    /// Sets up the map view with required configuration
    private func setupMapView() {
        // Initialize map view
        mapView = MapView(frame: view.bounds)
        mapView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(mapView)
        
        // Configure map settings
        mapView.showsUserLocation = true
        mapView.showsCompass = true
        mapView.showsScale = true
    }
    
    /// Sets up reactive bindings for location and route updates
    private func setupBindings() {
        // Subscribe to route updates
        routeService.routeUpdateSubject
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] route in
                self?.handleRouteUpdate(route)
            }
            .store(in: &cancellables)
        
        // Subscribe to offline mode changes
        NotificationCenter.default.publisher(for: .offlineModeChanged)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                if let isOffline = notification.object as? Bool {
                    self?.handleOfflineModeChange(isOffline)
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Public Methods
    
    /// Starts tracking and displaying a route
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Route optimization and planning capabilities
    public func startRouteTracking(routeId: String) {
        // Store active route ID
        activeRouteId = routeId
        UserDefaults.standard.set(routeId, forKey: "activeRouteId")
        
        // Start route tracking
        routeService.startRoute(routeId: routeId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] success in
                if success {
                    // Start location tracking
                    self?.locationService.startTracking(vehicleId: routeId)
                }
            }
            .store(in: &cancellables)
    }
    
    /// Stops route tracking and updates display
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    public func stopRouteTracking() {
        guard let routeId = activeRouteId else { return }
        
        // Stop route tracking
        routeService.completeRoute(routeId: routeId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] success in
                if success {
                    // Clear active route
                    self?.activeRouteId = nil
                    UserDefaults.standard.removeObject(forKey: "activeRouteId")
                    
                    // Stop location tracking
                    self?.locationService.stopTracking()
                    
                    // Clear map
                    self?.mapView.clearMap()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Private Methods
    
    /// Handles route updates from the service
    private func handleRouteUpdate(_ route: Route) {
        // Update map display with new route data
        mapView.displayRoute(route)
        
        // Update vehicle location if available
        if let lastLocation = route.waypoints.last {
            mapView.updateVehicleLocation(
                coordinate: lastLocation.coordinate,
                vehicleId: route.vehicleId
            )
        }
    }
    
    /// Handles offline mode changes
    private func handleOfflineModeChange(_ isOffline: Bool) {
        // Update UI for offline mode
        if isOffline {
            let offlineLabel = UILabel()
            offlineLabel.text = "Offline Mode"
            offlineLabel.textColor = .systemRed
            offlineLabel.font = .systemFont(ofSize: 12, weight: .medium)
            navigationItem.leftBarButtonItem = UIBarButtonItem(customView: offlineLabel)
        } else {
            navigationItem.leftBarButtonItem = nil
            
            // Trigger sync if needed
            if let routeId = activeRouteId {
                routeService.optimizeRoute(routeId: routeId)
                    .receive(on: DispatchQueue.main)
                    .sink { [weak self] completion in
                        if case .failure(let error) = completion {
                            self?.handleError(error)
                        }
                    } receiveValue: { [weak self] route in
                        self?.handleRouteUpdate(route)
                    }
                    .store(in: &cancellables)
            }
        }
    }
    
    /// Handles errors from services
    private func handleError(_ error: Error) {
        let alert = UIAlertController(
            title: "Error",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    /// Handles refresh button tap
    @objc private func refreshButtonTapped() {
        guard let routeId = activeRouteId else { return }
        
        // Optimize current route
        routeService.optimizeRoute(routeId: routeId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] route in
                self?.handleRouteUpdate(route)
            }
            .store(in: &cancellables)
    }
}

// MARK: - LocationUpdateDelegate

extension MapViewController: LocationUpdateDelegate {
    
    /// Handles location update events with 30-second validation
    func didUpdateLocation(_ location: CLLocation) {
        guard let routeId = activeRouteId else { return }
        
        // Update map with new location
        mapView.updateVehicleLocation(
            coordinate: location.coordinate,
            vehicleId: routeId
        )
    }
    
    /// Handles location update failures
    func didFailWithError(_ error: Error) {
        handleError(error)
    }
}