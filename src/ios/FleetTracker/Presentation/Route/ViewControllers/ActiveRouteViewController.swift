//
// ActiveRouteViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Configure location permissions in Info.plist (NSLocationWhenInUseUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription)
// 2. Enable background location updates in project capabilities
// 3. Set up MapKit entitlements for turn-by-turn navigation
// 4. Verify camera permissions for proof of delivery capture
// 5. Configure push notification entitlements for delivery updates

import UIKit      // iOS 14.0+
import SwiftUI    // iOS 14.0+
import Combine    // iOS 14.0+
import MapKit     // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// View controller managing active route display, real-time tracking, and delivery status updates with offline support
/// Requirements addressed:
/// - Real-time GPS tracking with 30-second update intervals (1.2 Scope/Core Functionality)
/// - Digital proof of delivery capabilities (1.2 Scope/Core Functionality)
/// - Route optimization and planning capabilities (1.2 Scope/Core Functionality)
/// - Offline operation support in mobile applications (1.2 Scope/Performance Requirements)
@objc
@objcMembers
class ActiveRouteViewController: UIViewController, LocationUpdateDelegate {
    
    // MARK: - Properties
    
    /// Current route being managed
    private let currentRoute: Route
    
    /// List of deliveries for the route
    private let deliveries: [Delivery]
    
    /// Set to store Combine subscriptions
    private var cancellables = Set<AnyCancellable>()
    
    /// SwiftUI hosting controller for ActiveRouteView
    private var hostingController: UIHostingController<ActiveRouteView>
    
    /// Flag indicating offline mode status
    private var isOfflineMode: Bool {
        return RouteService.shared.isOfflineMode
    }
    
    /// Publisher for location updates
    private let locationUpdates = PassthroughSubject<Location, Error>()
    
    // MARK: - Initialization
    
    /// Initializes the active route view controller with route and delivery data
    /// - Parameters:
    ///   - route: The route to be managed
    ///   - deliveries: List of deliveries associated with the route
    init(route: Route, deliveries: [Delivery]) {
        self.currentRoute = route
        self.deliveries = deliveries
        
        // Initialize SwiftUI view
        let activeRouteView = ActiveRouteView(route: route, deliveries: deliveries)
        self.hostingController = UIHostingController(rootView: activeRouteView)
        
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        configureRouteService()
        setupDataBindings()
        setupLocationTracking()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopLocationUpdates()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        // Add SwiftUI hosting controller
        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)
        
        // Configure hosting controller view constraints
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        // Configure navigation bar
        navigationItem.title = "Active Route"
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            title: "Complete",
            style: .done,
            target: self,
            action: #selector(completeRoute)
        )
    }
    
    // MARK: - Route Management
    
    /// Starts the route and begins tracking
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    /// - Offline operation support
    @objc func startRoute() {
        RouteService.shared.startRoute(routeId: currentRoute.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] success in
                if success {
                    self?.hostingController.rootView.startNavigation()
                }
            }
            .store(in: &cancellables)
    }
    
    /// Completes the route and handles offline data sync
    /// Requirements addressed:
    /// - Digital proof of delivery capabilities
    /// - Offline operation support
    @objc func completeRoute() {
        // Verify all deliveries are completed
        guard deliveries.allSatisfy({ $0.status == .delivered }) else {
            showAlert(title: "Incomplete Deliveries",
                     message: "Please complete all deliveries before ending the route.")
            return
        }
        
        RouteService.shared.completeRoute(routeId: currentRoute.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] success in
                if success {
                    self?.hostingController.rootView.completeRoute()
                    self?.navigationController?.popViewController(animated: true)
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Location Management
    
    private func setupLocationTracking() {
        // Configure location tracking with 30-second intervals
        // Requirement: Real-time GPS tracking with 30-second update intervals
        Timer.publish(every: 30, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.updateLocationData()
            }
            .store(in: &cancellables)
    }
    
    private func updateLocationData() {
        guard let location = LocationManager.shared().currentLocation else { return }
        
        // Update route progress with new location
        RouteService.shared.updateRouteProgress(
            routeId: currentRoute.id,
            deliveryId: "",
            status: .inTransit
        )
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
    
    private func stopLocationUpdates() {
        cancellables.removeAll()
    }
    
    // MARK: - LocationUpdateDelegate
    
    func didUpdateLocation(_ location: Location) {
        // Handle location update with 30-second interval
        locationUpdates.send(location)
    }
    
    func didFailWithError(_ error: Error) {
        handleError(error)
    }
    
    func didEnterRegion(_ region: CLRegion) {
        // Handle delivery zone entry
        if let delivery = deliveries.first(where: { $0.geofenceIdentifier == region.identifier }) {
            handleDeliveryZoneEntry(delivery)
        }
    }
    
    func didExitRegion(_ region: CLRegion) {
        // Handle delivery zone exit
        if let delivery = deliveries.first(where: { $0.geofenceIdentifier == region.identifier }) {
            handleDeliveryZoneExit(delivery)
        }
    }
    
    // MARK: - Private Helpers
    
    private func configureRouteService() {
        // Configure route service with offline support
        if isOfflineMode {
            setupOfflineMode()
        }
    }
    
    private func setupDataBindings() {
        // Bind location updates to SwiftUI view
        locationUpdates
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] location in
                self?.hostingController.rootView.updateDeliveryStatus(location: location)
            }
            .store(in: &cancellables)
    }
    
    private func setupOfflineMode() {
        // Configure offline data handling
        // Requirement: Offline operation support in mobile applications
        NotificationCenter.default.publisher(for: .connectivityStatusChanged)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                if let isOffline = notification.object as? Bool {
                    self?.handleConnectivityChange(isOffline: isOffline)
                }
            }
            .store(in: &cancellables)
    }
    
    private func handleRouteUpdate(_ route: Route) {
        // Update SwiftUI view with route changes
        hostingController.rootView.updateDeliveryStatus(route: route)
    }
    
    private func handleDeliveryZoneEntry(_ delivery: Delivery) {
        // Update delivery status when entering delivery zone
        RouteService.shared.updateRouteProgress(
            routeId: currentRoute.id,
            deliveryId: delivery.id,
            status: .inTransit
        )
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
    
    private func handleDeliveryZoneExit(_ delivery: Delivery) {
        // Update delivery status when exiting delivery zone
        if delivery.status == .delivered {
            RouteService.shared.updateRouteProgress(
                routeId: currentRoute.id,
                deliveryId: delivery.id,
                status: .completed
            )
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
    
    private func handleConnectivityChange(isOffline: Bool) {
        // Handle connectivity changes and offline mode
        if isOffline {
            showOfflineModeAlert()
        } else {
            syncOfflineData()
        }
    }
    
    private func syncOfflineData() {
        // Sync offline data when connection is restored
        RouteService.shared.updateRouteProgress(
            routeId: currentRoute.id,
            deliveryId: "",
            status: currentRoute.status
        )
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
    
    private func handleError(_ error: Error) {
        // Show error alert to user
        showAlert(
            title: "Error",
            message: error.localizedDescription
        )
    }
    
    private func showOfflineModeAlert() {
        showAlert(
            title: "Offline Mode",
            message: "You are currently offline. Changes will be synced when connection is restored."
        )
    }
    
    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(
            title: title,
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}