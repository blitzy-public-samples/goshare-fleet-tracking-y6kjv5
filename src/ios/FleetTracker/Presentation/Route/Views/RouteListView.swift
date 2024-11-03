//
// RouteListView.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify UIKit and Combine frameworks are properly linked
// 2. Configure table view cell registration in Interface Builder if using storyboards
// 3. Test offline mode behavior with airplane mode enabled
// 4. Verify 30-second update interval performance on target devices
// 5. Test pull-to-refresh functionality with network transitions

import UIKit      // iOS 14.0+
import Combine    // iOS 14.0+

/// A UIView subclass that displays a list of delivery routes with real-time updates,
/// filtering, and offline support capabilities
/// Requirements addressed:
/// - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
/// - Real-time data synchronization with 30-second intervals (1.2 Scope/Technical Implementation)
/// - Offline operation support (1.2 Scope/Performance Requirements)
public class RouteListView: UIView {
    
    // MARK: - Properties
    
    private let tableView: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.translatesAutoresizingMaskIntoConstraints = false
        table.rowHeight = UITableView.automaticDimension
        table.estimatedRowHeight = 120
        table.separatorStyle = .singleLine
        table.backgroundColor = .systemBackground
        return table
    }()
    
    private let filterControl: UISegmentedControl = {
        let items = ["All", "Planned", "In Progress", "Completed"]
        let control = UISegmentedControl(items: items)
        control.translatesAutoresizingMaskIntoConstraints = false
        control.selectedSegmentIndex = 0
        return control
    }()
    
    private let loadingView: LoadingView = {
        let view = LoadingView(message: "Loading routes...")
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let refreshControl: UIRefreshControl = {
        let control = UIRefreshControl()
        control.tintColor = .systemBlue
        return control
    }()
    
    private let offlineIndicator: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = .systemYellow
        view.isHidden = true
        
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "Offline Mode"
        label.textColor = .black
        label.font = .systemFont(ofSize: 12, weight: .medium)
        view.addSubview(label)
        
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        
        return view
    }()
    
    private var routes: [Route] = []
    private var filteredRoutes: [Route] = []
    private var cancellables = Set<AnyCancellable>()
    private var isOfflineMode: Bool = false {
        didSet {
            offlineIndicator.isHidden = !isOfflineMode
        }
    }
    
    // MARK: - Initialization
    
    /// Initializes the route list view with frame and sets up UI components
    public override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        setupBindings()
        refreshRoutes()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
        setupBindings()
        refreshRoutes()
    }
    
    // MARK: - UI Setup
    
    /// Sets up the view's layout and appearance with offline mode indicator
    private func setupUI() {
        // Add subviews
        addSubview(filterControl)
        addSubview(tableView)
        addSubview(offlineIndicator)
        
        // Configure table view
        tableView.delegate = self
        tableView.dataSource = self
        tableView.refreshControl = refreshControl
        tableView.register(RouteCell.self, forCellReuseIdentifier: "RouteCell")
        
        // Configure actions
        filterControl.addTarget(self, action: #selector(filterValueChanged), for: .valueChanged)
        refreshControl.addTarget(self, action: #selector(refreshControlTriggered), for: .valueChanged)
        
        // Apply constraints
        NSLayoutConstraint.activate([
            // Filter control constraints
            filterControl.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            filterControl.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            filterControl.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            
            // Table view constraints
            tableView.topAnchor.constraint(equalTo: filterControl.bottomAnchor, constant: 8),
            tableView.leadingAnchor.constraint(equalTo: leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: bottomAnchor),
            
            // Offline indicator constraints
            offlineIndicator.topAnchor.constraint(equalTo: topAnchor),
            offlineIndicator.leadingAnchor.constraint(equalTo: leadingAnchor),
            offlineIndicator.trailingAnchor.constraint(equalTo: trailingAnchor),
            offlineIndicator.heightAnchor.constraint(equalToConstant: 24)
        ])
    }
    
    // MARK: - Data Binding
    
    /// Sets up Combine publishers for route updates with 30-second intervals
    private func setupBindings() {
        // Subscribe to route service updates
        RouteService.shared.routeUpdateSubject
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                switch completion {
                case .failure(let error):
                    print("Route update error: \(error.localizedDescription)")
                    self?.handleError(error)
                case .finished:
                    break
                }
            } receiveValue: { [weak self] route in
                self?.handleRouteUpdate(route)
            }
            .store(in: &cancellables)
        
        // Monitor offline mode changes
        RouteService.shared.$isOfflineMode
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isOffline in
                self?.isOfflineMode = isOffline
            }
            .store(in: &cancellables)
        
        // Set up 30-second refresh timer
        Timer.publish(every: 30, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.refreshRoutes()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Route Management
    
    /// Refreshes the route list data with offline handling
    @objc public func refreshRoutes() {
        loadingView.show()
        
        // Check if offline mode is active
        if RouteService.shared.isOfflineMode {
            loadingView.updateMessage("Loading cached routes...")
        }
        
        // Fetch routes from service
        fetchRoutes()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.refreshControl.endRefreshing()
                self?.loadingView.hide()
                
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] routes in
                self?.routes = routes
                self?.filterRoutes(status: nil)
            }
            .store(in: &cancellables)
    }
    
    /// Filters routes based on selected segment with offline support
    private func filterRoutes(status: RouteStatus?) {
        // Apply filter based on segment and offline mode
        filteredRoutes = routes.filter { route in
            if let status = status {
                return route.status == status
            }
            return true
        }
        
        // Sort routes by scheduled date
        filteredRoutes.sort { $0.scheduledDate > $1.scheduledDate }
        
        // Reload table view with animation
        tableView.reloadSections(IndexSet(integer: 0), with: .automatic)
    }
    
    /// Handles individual route updates from service
    private func handleRouteUpdate(_ route: Route) {
        // Update route in local array
        if let index = routes.firstIndex(where: { $0.id == route.id }) {
            routes[index] = route
            filterRoutes(status: nil)
        }
    }
    
    // MARK: - Actions
    
    /// Handles filter control value changes
    @objc private func filterValueChanged(_ sender: UISegmentedControl) {
        let status: RouteStatus?
        switch sender.selectedSegmentIndex {
        case 1:
            status = .planned
        case 2:
            status = .inProgress
        case 3:
            status = .completed
        default:
            status = nil
        }
        filterRoutes(status: status)
    }
    
    /// Handles pull-to-refresh action
    @objc private func refreshControlTriggered() {
        refreshRoutes()
    }
    
    // MARK: - Helper Methods
    
    /// Fetches routes from service with offline support
    private func fetchRoutes() -> AnyPublisher<[Route], Error> {
        // Implementation would fetch routes from RouteService
        // This is a placeholder that should return a proper publisher
        return Just([])
            .setFailureType(to: Error.self)
            .eraseToAnyPublisher()
    }
    
    /// Handles and displays errors
    private func handleError(_ error: Error) {
        // Show error alert or indicator
        print("Error: \(error.localizedDescription)")
    }
}

// MARK: - UITableViewDataSource

extension RouteListView: UITableViewDataSource {
    public func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredRoutes.count
    }
    
    public func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "RouteCell", for: indexPath) as! RouteCell
        let route = filteredRoutes[indexPath.row]
        cell.configure(with: route, isOffline: isOfflineMode)
        return cell
    }
}

// MARK: - UITableViewDelegate

extension RouteListView: UITableViewDelegate {
    public func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let route = filteredRoutes[indexPath.row]
        
        // Handle route selection based on status and offline mode
        if route.status == .planned && !isOfflineMode {
            startRoute(route)
        } else if route.status == .inProgress {
            showRouteDetails(route)
        }
    }
}

// MARK: - RouteCell

/// Custom table view cell for displaying route information
private class RouteCell: UITableViewCell {
    // Cell implementation would go here
    // This is a placeholder that should be implemented
    func configure(with route: Route, isOffline: Bool) {
        // Configure cell with route data
    }
}