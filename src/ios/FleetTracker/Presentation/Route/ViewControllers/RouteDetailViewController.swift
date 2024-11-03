//
// RouteDetailViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify CoreLocation usage descriptions are set in Info.plist
// 2. Configure background location updates capability
// 3. Test offline data synchronization scenarios
// 4. Verify proper error handling and user feedback
// 5. Set up proper analytics tracking

import UIKit      // iOS 14.0+
import Combine    // iOS 14.0+

/// View controller responsible for displaying and managing detailed route information
/// with real-time tracking and offline support
/// Requirements addressed:
/// - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
/// - Real-time GPS tracking with 30-second update intervals (1.2 Scope/Core Functionality)
/// - Digital proof of delivery capabilities (1.2 Scope/Core Functionality)
/// - Offline operation support (1.2 Scope/Performance Requirements)
@objc
@objcMembers
public class RouteDetailViewController: UIViewController {
    
    // MARK: - Properties
    
    /// Main view for route details display
    private var routeDetailView: RouteDetailView!
    
    /// Current route being displayed
    private var route: Route?
    
    /// Service for route management
    private let routeService: RouteService
    
    /// Set to store Combine subscriptions
    private var cancellables = Set<AnyCancellable>()
    
    /// Timer for periodic location updates
    private var locationUpdateTimer: Timer?
    
    // MARK: - Initialization
    
    /// Initializes the route detail view controller
    /// - Parameter routeId: Identifier of the route to display
    public init(routeId: String) {
        self.routeService = RouteService.shared
        super.init(nibName: nil, bundle: nil)
        
        // Load route data
        loadRouteData(routeId: routeId)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle Methods
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        configureNavigationBar()
        setupSubscriptions()
        startLocationUpdates()
    }
    
    public override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        // Stop location updates when leaving view
        locationUpdateTimer?.invalidate()
        locationUpdateTimer = nil
    }
    
    // MARK: - UI Setup
    
    /// Sets up the main user interface
    private func setupUI() {
        // Initialize route detail view
        routeDetailView = RouteDetailView(frame: view.bounds)
        routeDetailView.delegate = self
        routeDetailView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(routeDetailView)
        
        // Set up constraints
        NSLayoutConstraint.activate([
            routeDetailView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            routeDetailView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            routeDetailView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            routeDetailView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    /// Configures the navigation bar
    private func configureNavigationBar() {
        title = "Route Details"
        
        // Add sync status indicator for offline mode
        let syncButton = UIBarButtonItem(image: UIImage(systemName: "arrow.triangle.2.circlepath"),
                                       style: .plain,
                                       target: self,
                                       action: #selector(handleSyncTap))
        navigationItem.rightBarButtonItem = syncButton
        
        updateSyncButtonState()
    }
    
    // MARK: - Data Loading
    
    /// Loads route data with offline support
    /// Requirements addressed:
    /// - Offline operation support in mobile applications
    private func loadRouteData(routeId: String) {
        routeService.repository.getRoute(routeId: routeId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] route in
                self?.route = route
                self?.updateUI()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - UI Updates
    
    /// Updates the user interface with current route data
    private func updateUI() {
        guard let route = route else { return }
        
        // Configure route detail view
        routeDetailView.configure(with: route)
        
        // Update navigation bar
        title = "Route #\(route.id)"
        
        // Update offline mode status
        routeDetailView.isOfflineMode = routeService.isOfflineMode
        
        // Update sync button state
        updateSyncButtonState()
    }
    
    /// Updates the sync button appearance based on offline status
    private func updateSyncButtonState() {
        guard let syncButton = navigationItem.rightBarButtonItem else { return }
        
        if routeService.isOfflineMode {
            syncButton.image = UIImage(systemName: "arrow.triangle.2.circlepath.circle")
            syncButton.tintColor = .systemOrange
        } else {
            syncButton.image = UIImage(systemName: "arrow.triangle.2.circlepath")
            syncButton.tintColor = route?.isSynced == true ? .systemGreen : .systemBlue
        }
    }
    
    // MARK: - Location Updates
    
    /// Starts periodic location updates
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    private func startLocationUpdates() {
        // Create timer for 30-second updates
        locationUpdateTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            self?.updateLocation()
        }
        locationUpdateTimer?.tolerance = 5.0 // Allow 5-second tolerance for battery efficiency
        
        // Trigger initial update
        updateLocation()
    }
    
    /// Updates current location and route progress
    private func updateLocation() {
        guard let route = route, route.status == .inProgress else { return }
        
        routeService.updateRouteProgress(routeId: route.id,
                                       deliveryId: route.deliveryIds.first ?? "",
                                       status: .inProgress)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] updatedRoute in
                self?.route = updatedRoute
                self?.updateUI()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Subscription Setup
    
    /// Sets up Combine subscriptions for real-time updates
    private func setupSubscriptions() {
        // Subscribe to route updates
        routeService.routeUpdateSubject
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] updatedRoute in
                self?.route = updatedRoute
                self?.updateUI()
            }
            .store(in: &cancellables)
        
        // Subscribe to offline mode changes
        NotificationCenter.default.publisher(for: .offlineModeChanged)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.handleOfflineModeChange()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Action Handlers
    
    /// Handles sync button tap
    @objc private func handleSyncTap() {
        guard let route = route, !route.isSynced else { return }
        
        // Attempt to sync route data
        routeService.repository.syncRoute(route)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] success in
                if success {
                    self?.updateSyncButtonState()
                }
            }
            .store(in: &cancellables)
    }
    
    /// Handles changes in offline mode
    private func handleOfflineModeChange() {
        routeDetailView.isOfflineMode = routeService.isOfflineMode
        updateSyncButtonState()
        
        // Show offline mode indicator
        let message = routeService.isOfflineMode ? "Offline Mode Active" : "Back Online"
        showToast(message: message)
    }
    
    /// Handles errors with user feedback
    private func handleError(_ error: Error) {
        let alert = UIAlertController(title: "Error",
                                    message: error.localizedDescription,
                                    preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    /// Shows a temporary toast message
    private func showToast(message: String) {
        let toast = UILabel()
        toast.text = message
        toast.textAlignment = .center
        toast.font = .systemFont(ofSize: 14)
        toast.textColor = .white
        toast.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        toast.layer.cornerRadius = 10
        toast.clipsToBounds = true
        toast.translatesAutoresizingMaskIntoConstraints = false
        
        view.addSubview(toast)
        
        NSLayoutConstraint.activate([
            toast.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            toast.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            toast.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.8),
            toast.heightAnchor.constraint(equalToConstant: 40)
        ])
        
        UIView.animate(withDuration: 0.3, delay: 2.0, options: .curveEaseOut) {
            toast.alpha = 0
        } completion: { _ in
            toast.removeFromSuperview()
        }
    }
}

// MARK: - RouteDetailViewDelegate

extension RouteDetailViewController: RouteDetailViewDelegate {
    
    public func didUpdateRouteStatus(_ status: RouteStatus) {
        guard let route = route else { return }
        
        // Handle route status update
        switch status {
        case .inProgress:
            routeService.startRoute(routeId: route.id)
                .receive(on: DispatchQueue.main)
                .sink { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.handleError(error)
                    }
                } receiveValue: { [weak self] success in
                    if success {
                        self?.startLocationUpdates()
                    }
                }
                .store(in: &cancellables)
            
        case .completed:
            routeService.completeRoute(routeId: route.id)
                .receive(on: DispatchQueue.main)
                .sink { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.handleError(error)
                    }
                } receiveValue: { [weak self] success in
                    if success {
                        self?.locationUpdateTimer?.invalidate()
                        self?.locationUpdateTimer = nil
                    }
                }
                .store(in: &cancellables)
            
        default:
            break
        }
    }
    
    public func didTapActionButton(_ currentStatus: RouteStatus) {
        guard let route = route else { return }
        
        // Validate offline mode constraints
        if routeService.isOfflineMode {
            // Store action for later sync
            let actionData = [
                "routeId": route.id,
                "action": currentStatus == .planned ? "start" : "complete",
                "timestamp": Date().timeIntervalSince1970
            ] as [String : Any]
            UserDefaults.standard.set(actionData, forKey: "pendingRouteAction_\(route.id)")
            
            // Show offline indicator
            showToast(message: "Action queued for sync")
            return
        }
        
        // Handle action based on current status
        switch currentStatus {
        case .planned:
            didUpdateRouteStatus(.inProgress)
            
        case .inProgress:
            didUpdateRouteStatus(.completed)
            
        default:
            break
        }
    }
}