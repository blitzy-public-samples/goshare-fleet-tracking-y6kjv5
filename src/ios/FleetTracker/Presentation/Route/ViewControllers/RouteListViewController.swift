//
// RouteListViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify UIKit and Combine frameworks are properly linked in project
// 2. Test offline mode behavior with airplane mode enabled
// 3. Verify 30-second update interval performance on target devices
// 4. Test route list filtering functionality
// 5. Verify route action handling in both online and offline modes

import UIKit      // iOS 14.0+
import Combine    // iOS 14.0+

/// View controller managing the display and interaction of delivery routes with real-time updates
/// and offline support capabilities
/// Requirements addressed:
/// - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
/// - Real-time data synchronization with 30-second intervals (1.2 Scope/Technical Implementation)
/// - Offline operation support (1.2 Scope/Performance Requirements)
@objc
@objcMembers
public class RouteListViewController: UIViewController {
    
    // MARK: - Properties
    
    /// Main view for displaying route list
    private var routeListView: RouteListView!
    
    /// Service for managing route operations
    private let routeService: RouteService
    
    /// Set to store Combine subscriptions
    private var cancellables = Set<AnyCancellable>()
    
    /// Current offline mode status
    private var isOfflineMode: Bool {
        didSet {
            updateNavigationItems()
        }
    }
    
    // MARK: - Initialization
    
    public override init(nibName nibNameOrNil: String?, bundle nibBundleOrNil: Bundle?) {
        // Initialize properties
        self.routeService = RouteService.shared
        self.isOfflineMode = routeService.isOfflineMode
        
        super.init(nibName: nibNameOrNil, bundle: nibBundleOrNil)
        
        // Configure view controller
        self.title = "Routes"
        setupNavigationItems()
    }
    
    required init?(coder: NSCoder) {
        // Initialize properties
        self.routeService = RouteService.shared
        self.isOfflineMode = routeService.isOfflineMode
        
        super.init(coder: coder)
        
        // Configure view controller
        self.title = "Routes"
        setupNavigationItems()
    }
    
    // MARK: - Lifecycle Methods
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        
        // Setup route list view
        setupRouteListView()
        
        // Configure navigation bar
        configureNavigationBar()
        
        // Setup Combine bindings for real-time updates
        setupBindings()
        
        // Load initial route data
        refreshRoutes()
    }
    
    public override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Refresh routes when view appears
        refreshRoutes()
        
        // Update navigation items based on offline mode
        updateNavigationItems()
    }
    
    // MARK: - UI Setup
    
    /// Sets up the route list view with offline support
    private func setupRouteListView() {
        // Create and configure route list view
        routeListView = RouteListView(frame: view.bounds)
        routeListView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(routeListView)
        
        // Apply constraints
        NSLayoutConstraint.activate([
            routeListView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            routeListView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            routeListView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            routeListView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    /// Configures navigation bar appearance
    private func configureNavigationBar() {
        navigationController?.navigationBar.prefersLargeTitles = true
        navigationItem.largeTitleDisplayMode = .always
    }
    
    /// Sets up navigation bar items
    private func setupNavigationItems() {
        // Create refresh button
        let refreshButton = UIBarButtonItem(
            image: UIImage(systemName: "arrow.clockwise"),
            style: .plain,
            target: self,
            action: #selector(refreshButtonTapped)
        )
        
        // Create filter button
        let filterButton = UIBarButtonItem(
            image: UIImage(systemName: "line.horizontal.3.decrease.circle"),
            style: .plain,
            target: self,
            action: #selector(filterButtonTapped)
        )
        
        // Set navigation items
        navigationItem.rightBarButtonItems = [refreshButton, filterButton]
    }
    
    /// Updates navigation items based on offline mode
    private func updateNavigationItems() {
        // Update navigation bar tint color based on offline mode
        navigationController?.navigationBar.tintColor = isOfflineMode ? .systemOrange : .systemBlue
        
        // Update title view with offline indicator if needed
        if isOfflineMode {
            let offlineLabel = UILabel()
            offlineLabel.text = "Offline Mode"
            offlineLabel.font = .systemFont(ofSize: 12, weight: .medium)
            offlineLabel.textColor = .systemOrange
            navigationItem.titleView = offlineLabel
        } else {
            navigationItem.titleView = nil
        }
    }
    
    // MARK: - Data Binding
    
    /// Sets up reactive bindings for route updates with 30-second intervals
    private func setupBindings() {
        // Subscribe to route service updates
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
        
        // Monitor offline mode changes
        routeService.$isOfflineMode
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isOffline in
                self?.isOfflineMode = isOffline
            }
            .store(in: &cancellables)
        
        // Set up 30-second refresh timer for real-time updates
        Timer.publish(every: 30, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.refreshRoutes()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Route Management
    
    /// Handles selection of a route from the list
    /// Requirements addressed:
    /// - Interactive fleet management dashboard
    /// - Offline operation support
    public func handleRouteSelection(_ route: Route) {
        // Check if route is accessible in current mode
        guard route.isOffline || !isOfflineMode else {
            showOfflineAlert(message: "This route is not available offline")
            return
        }
        
        // Handle route selection based on status
        switch route.status {
        case .planned:
            if !isOfflineMode {
                showStartRouteConfirmation(route)
            }
        case .inProgress:
            showRouteDetails(route)
        case .completed:
            showRouteDetails(route)
        case .cancelled:
            showRouteDetails(route)
        }
    }
    
    /// Handles route actions like start or complete
    /// Requirements addressed:
    /// - Real-time data synchronization
    /// - Offline operation support
    public func handleRouteAction(_ route: Route, action: RouteStatus) {
        // Validate action in current mode
        guard !isOfflineMode || route.isOffline else {
            showOfflineAlert(message: "Cannot perform this action in offline mode")
            return
        }
        
        switch action {
        case .inProgress:
            startRoute(route)
        case .completed:
            completeRoute(route)
        default:
            break
        }
    }
    
    // MARK: - Actions
    
    /// Handles refresh button tap
    @objc private func refreshButtonTapped() {
        refreshRoutes()
    }
    
    /// Handles filter button tap
    @objc private func filterButtonTapped() {
        routeListView.filterRoutes()
    }
    
    /// Refreshes route list data
    private func refreshRoutes() {
        routeListView.refreshRoutes()
    }
    
    /// Shows route details view controller
    private func showRouteDetails(_ route: Route) {
        // Implementation would push route detail view controller
        // This is a placeholder that should be implemented
    }
    
    /// Shows confirmation dialog for starting route
    private func showStartRouteConfirmation(_ route: Route) {
        let alert = UIAlertController(
            title: "Start Route",
            message: "Are you sure you want to start this route?",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Start", style: .default) { [weak self] _ in
            self?.startRoute(route)
        })
        
        present(alert, animated: true)
    }
    
    /// Starts a route
    private func startRoute(_ route: Route) {
        routeService.startRoute(routeId: route.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] success in
                if success {
                    self?.refreshRoutes()
                }
            }
            .store(in: &cancellables)
    }
    
    /// Completes a route
    private func completeRoute(_ route: Route) {
        routeService.completeRoute(routeId: route.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] success in
                if success {
                    self?.refreshRoutes()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Helper Methods
    
    /// Handles route updates from service
    private func handleRouteUpdate(_ route: Route) {
        routeListView.refreshRoutes()
    }
    
    /// Shows offline mode alert
    private func showOfflineAlert(message: String) {
        let alert = UIAlertController(
            title: "Offline Mode",
            message: message,
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    /// Handles and displays errors
    private func handleError(_ error: Error) {
        let alert = UIAlertController(
            title: "Error",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}