//
// DashboardViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Configure proper location permissions in Info.plist
// 2. Verify background mode capabilities are enabled for location updates
// 3. Test offline mode functionality with airplane mode
// 4. Review memory management with large vehicle fleets
// 5. Validate analytics data accuracy in dashboard

import UIKit      // iOS 14.0+
import Combine    // iOS 14.0+

/// Main dashboard view controller managing the fleet tracking dashboard interface
/// Requirements addressed:
/// - Interactive fleet management dashboard with real-time data visualization
/// - Real-time GPS tracking with 30-second update intervals
/// - Analytics and reporting capabilities
/// - Offline operation support
@objc
@objcMembers
class DashboardViewController: UIViewController {
    
    // MARK: - Properties
    
    /// Main dashboard view instance
    private var dashboardView: DashboardView!
    
    /// Location service for tracking updates
    private let locationService: LocationService
    
    /// Set of cancellables for Combine subscriptions
    private var cancellables = Set<AnyCancellable>()
    
    /// Timer for periodic dashboard refresh
    private var refreshTimer: Timer?
    
    /// Flag indicating offline mode status
    private var isOfflineMode: Bool = false {
        didSet {
            dashboardView.isOfflineMode = isOfflineMode
        }
    }
    
    // MARK: - Initialization
    
    /// Initializes the dashboard view controller
    /// - Parameter locationService: Service for handling location updates
    init(locationService: LocationService = LocationService(repository: LocationRepository())) {
        self.locationService = locationService
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        self.locationService = LocationService(repository: LocationRepository())
        super.init(coder: coder)
    }
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Setup dashboard view
        setupDashboardView()
        
        // Configure location tracking
        setupLocationTracking()
        
        // Setup data bindings
        setupDataBindings()
        
        // Start periodic refresh
        startPeriodicRefresh()
        
        // Configure offline mode handling
        setupOfflineHandling()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Start location tracking
        locationService.startTracking(vehicleId: "dashboard")
        
        // Refresh dashboard data
        dashboardView.refreshDashboard()
        
        // Check offline mode
        checkOfflineMode()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        // Stop location tracking
        locationService.stopTracking()
        
        // Invalidate refresh timer
        refreshTimer?.invalidate()
        refreshTimer = nil
        
        // Perform final sync if needed
        if !isOfflineMode {
            dashboardView.refreshDashboard()
        }
    }
    
    // MARK: - Setup Methods
    
    /// Sets up the main dashboard view
    /// Requirements addressed:
    /// - Interactive fleet management dashboard
    private func setupDashboardView() {
        // Initialize dashboard view
        dashboardView = DashboardView(frame: view.bounds)
        dashboardView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(dashboardView)
        
        // Setup constraints
        NSLayoutConstraint.activate([
            dashboardView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            dashboardView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            dashboardView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            dashboardView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        // Configure initial state
        dashboardView.isOfflineMode = isOfflineMode
    }
    
    /// Configures location tracking service
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    private func setupLocationTracking() {
        // Configure location service
        locationService.startTracking(vehicleId: "dashboard")
    }
    
    /// Sets up reactive data bindings for real-time updates
    /// Requirements addressed:
    /// - Real-time data visualization
    /// - Analytics and reporting capabilities
    private func setupDataBindings() {
        // Observe location updates
        NotificationCenter.default.publisher(for: .locationDidUpdate)
            .sink { [weak self] notification in
                guard let location = notification.object as? CLLocation else { return }
                self?.handleLocationUpdate(location)
            }
            .store(in: &cancellables)
        
        // Observe vehicle status updates
        NotificationCenter.default.publisher(for: .vehicleStatusDidUpdate)
            .sink { [weak self] notification in
                guard let vehicles = notification.object as? [Vehicle] else { return }
                self?.dashboardView.updateVehicleLocations(vehicles)
            }
            .store(in: &cancellables)
        
        // Observe analytics data updates
        NotificationCenter.default.publisher(for: .analyticsDataDidUpdate)
            .sink { [weak self] _ in
                self?.dashboardView.refreshDashboard()
            }
            .store(in: &cancellables)
    }
    
    /// Starts periodic dashboard refresh timer
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    private func startPeriodicRefresh() {
        // Create timer for 30-second refresh intervals
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 30.0,
                                          repeats: true) { [weak self] _ in
            self?.dashboardView.refreshDashboard()
        }
        refreshTimer?.tolerance = 5.0 // Allow 5-second tolerance for battery optimization
    }
    
    /// Configures offline mode handling
    /// Requirements addressed:
    /// - Offline operation support
    private func setupOfflineHandling() {
        // Observe network reachability changes
        NotificationCenter.default.publisher(for: .connectivityStatusDidChange)
            .sink { [weak self] notification in
                if let isOffline = notification.object as? Bool {
                    self?.handleOfflineModeChange(isOffline)
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Event Handlers
    
    /// Handles location updates from the service
    /// - Parameter location: Updated location
    private func handleLocationUpdate(_ location: CLLocation) {
        // Update dashboard with new location
        dashboardView.updateVehicleLocations([])  // Pass actual vehicles array
    }
    
    /// Handles changes in offline mode status
    /// - Parameter isOffline: New offline mode status
    private func handleOfflineModeChange(_ isOffline: Bool) {
        isOfflineMode = isOffline
        dashboardView.refreshDashboard()
    }
    
    /// Checks current offline mode status
    private func checkOfflineMode() {
        // Check network reachability
        if let networkManager = NetworkManager.shared {
            isOfflineMode = !networkManager.isReachable
        }
    }
    
    // MARK: - Memory Management
    
    deinit {
        // Clean up resources
        refreshTimer?.invalidate()
        cancellables.removeAll()
        locationService.stopTracking()
    }
}

// MARK: - LocationUpdateDelegate

extension DashboardViewController: LocationUpdateDelegate {
    
    func didUpdateLocation(_ location: CLLocation) {
        // Handle location updates
        handleLocationUpdate(location)
    }
    
    func didFailWithError(_ error: Error) {
        // Handle location update failures
        print("Location update failed: \(error.localizedDescription)")
        
        // Check if error is related to offline mode
        if (error as NSError).domain == kCLErrorDomain {
            isOfflineMode = true
        }
    }
}

// MARK: - Notification Names

private extension Notification.Name {
    static let locationDidUpdate = Notification.Name("locationDidUpdate")
    static let vehicleStatusDidUpdate = Notification.Name("vehicleStatusDidUpdate")
    static let analyticsDataDidUpdate = Notification.Name("analyticsDataDidUpdate")
    static let connectivityStatusDidChange = Notification.Name("connectivityStatusDidChange")
}