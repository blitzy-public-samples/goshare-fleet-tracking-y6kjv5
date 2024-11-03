//
// RouteDetailView.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure MapKit and CoreLocation frameworks are properly linked in Xcode project
// 2. Verify minimum iOS deployment target is set to iOS 14.0 or higher
// 3. Configure location usage descriptions in Info.plist
// 4. Add required UI assets to Assets.xcassets
// 5. Set up IBDesignable preview in Interface Builder if needed
// 6. Configure offline data storage settings

import UIKit      // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// Protocol for handling route detail view events with offline support
@objc public protocol RouteDetailViewDelegate: AnyObject {
    /// Called when route status changes
    /// - Parameter status: Updated route status
    func didUpdateRouteStatus(_ status: RouteStatus)
    
    /// Called when main action button is tapped
    /// - Parameter currentStatus: Current route status
    func didTapActionButton(_ currentStatus: RouteStatus)
}

/// Custom view that displays detailed route information and controls with offline support
/// Requirements addressed:
/// - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
/// - Route optimization and planning (1.2 Scope/Core Functionality)
/// - Real-time data synchronization (1.2 Scope/Technical Implementation)
/// - Offline operation support (1.2 Scope/Performance Requirements)
@IBDesignable
public class RouteDetailView: UIView {
    
    // MARK: - Properties
    
    /// Current route being displayed
    private var route: Route?
    
    /// Map view for route visualization
    private(set) lazy var mapView: MapView = {
        let map = MapView(frame: .zero)
        map.translatesAutoresizingMaskIntoConstraints = false
        return map
    }()
    
    /// Stack view for route information
    private lazy var infoStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        stack.distribution = .fill
        stack.alignment = .fill
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    /// Label displaying route status
    private lazy var statusLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 16, weight: .medium)
        label.textAlignment = .left
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    /// Label displaying delivery progress
    private lazy var progressLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 14)
        label.textAlignment = .left
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    /// Main action button for route control
    private lazy var actionButton: UIButton = {
        let button = UIButton(type: .system)
        button.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        button.layer.cornerRadius = 8
        button.clipsToBounds = true
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(handleActionButtonTap), for: .touchUpInside)
        return button
    }()
    
    /// Table view for deliveries list
    private lazy var deliveriesTableView: UITableView = {
        let table = UITableView()
        table.register(UITableViewCell.self, forCellReuseIdentifier: "DeliveryCell")
        table.translatesAutoresizingMaskIntoConstraints = false
        return table
    }()
    
    /// Delegate for handling view events
    public weak var delegate: RouteDetailViewDelegate?
    
    /// Flag indicating if offline mode is active
    public var isOfflineMode: Bool {
        get { return mapView.isOfflineMode }
        set {
            updateOfflineModeUI(newValue)
        }
    }
    
    // MARK: - Initialization
    
    /// Initializes the route detail view with offline support
    /// - Parameter frame: Initial frame for the view
    override public init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    // MARK: - UI Setup
    
    /// Sets up the view hierarchy and constraints
    private func setupUI() {
        // Add subviews
        addSubview(mapView)
        addSubview(infoStackView)
        
        infoStackView.addArrangedSubview(statusLabel)
        infoStackView.addArrangedSubview(progressLabel)
        infoStackView.addArrangedSubview(actionButton)
        
        addSubview(deliveriesTableView)
        
        // Configure map view
        mapView.layer.cornerRadius = 8
        mapView.clipsToBounds = true
        
        // Configure table view
        deliveriesTableView.delegate = self
        deliveriesTableView.dataSource = self
        
        // Set up constraints
        NSLayoutConstraint.activate([
            // Map view constraints
            mapView.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            mapView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            mapView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            mapView.heightAnchor.constraint(equalTo: heightAnchor, multiplier: 0.4),
            
            // Info stack view constraints
            infoStackView.topAnchor.constraint(equalTo: mapView.bottomAnchor, constant: 16),
            infoStackView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            infoStackView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            
            // Action button constraints
            actionButton.heightAnchor.constraint(equalToConstant: 44),
            
            // Deliveries table view constraints
            deliveriesTableView.topAnchor.constraint(equalTo: infoStackView.bottomAnchor, constant: 16),
            deliveriesTableView.leadingAnchor.constraint(equalTo: leadingAnchor),
            deliveriesTableView.trailingAnchor.constraint(equalTo: trailingAnchor),
            deliveriesTableView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
        
        // Set initial state
        updateOfflineModeUI(false)
    }
    
    // MARK: - Public Methods
    
    /// Configures the view with route data and handles offline state
    /// - Parameter route: Route to display
    public func configure(with route: Route) {
        self.route = route
        
        // Update status display
        updateRouteStatus(route.status)
        
        // Update progress display
        updateDeliveryProgress(route.completedDeliveries, route.totalDeliveries)
        
        // Configure map with route
        mapView.displayRoute(route)
        
        // Update offline mode indicator
        isOfflineMode = route.isOffline
        
        // Reload deliveries table
        deliveriesTableView.reloadData()
    }
    
    /// Updates the display of route status with offline handling
    /// - Parameter status: New route status
    public func updateRouteStatus(_ status: RouteStatus) {
        // Update status label text and style
        statusLabel.text = "Status: \(status.rawValue.capitalized)"
        
        switch status {
        case .planned:
            statusLabel.textColor = .systemBlue
            actionButton.setTitle("Start Route", for: .normal)
            actionButton.backgroundColor = .systemBlue
            actionButton.setTitleColor(.white, for: .normal)
            
        case .inProgress:
            statusLabel.textColor = .systemGreen
            actionButton.setTitle("Complete Route", for: .normal)
            actionButton.backgroundColor = .systemGreen
            actionButton.setTitleColor(.white, for: .normal)
            
        case .completed:
            statusLabel.textColor = .systemGray
            actionButton.setTitle("Route Completed", for: .normal)
            actionButton.backgroundColor = .systemGray
            actionButton.setTitleColor(.white, for: .normal)
            actionButton.isEnabled = false
            
        case .cancelled:
            statusLabel.textColor = .systemRed
            actionButton.setTitle("Route Cancelled", for: .normal)
            actionButton.backgroundColor = .systemRed
            actionButton.setTitleColor(.white, for: .normal)
            actionButton.isEnabled = false
        }
        
        // Handle offline mode constraints
        if isOfflineMode {
            actionButton.alpha = 0.7
            let offlineIndicator = " (Offline)"
            statusLabel.text?.append(offlineIndicator)
        } else {
            actionButton.alpha = 1.0
        }
        
        // Notify delegate of status change
        delegate?.didUpdateRouteStatus(status)
    }
    
    /// Updates the delivery progress display with offline sync status
    /// - Parameters:
    ///   - completed: Number of completed deliveries
    ///   - total: Total number of deliveries
    public func updateDeliveryProgress(_ completed: Int, _ total: Int) {
        // Calculate progress percentage
        let percentage = Float(completed) / Float(total) * 100
        
        // Update progress label
        progressLabel.text = String(format: "Progress: %d of %d deliveries (%.1f%%)", completed, total, percentage)
        
        // Update progress visualization (if needed)
        // This could be a custom progress view implementation
        
        // Add offline sync indicator if needed
        if isOfflineMode {
            progressLabel.text?.append(" (Pending Sync)")
        }
        
        // Check for route completion
        if completed == total {
            route?.completeRoute()
        }
    }
    
    // MARK: - Private Methods
    
    /// Handles taps on the main action button with offline mode validation
    @objc private func handleActionButtonTap() {
        guard let route = route else { return }
        
        // Validate offline mode constraints
        if isOfflineMode {
            // Store action for later sync
            let actionData = [
                "routeId": route.id,
                "action": route.status == .planned ? "start" : "complete",
                "timestamp": Date().timeIntervalSince1970
            ] as [String : Any]
            UserDefaults.standard.set(actionData, forKey: "pendingRouteAction_\(route.id)")
        }
        
        // Perform appropriate action based on status
        switch route.status {
        case .planned:
            if route.startRoute() {
                updateRouteStatus(.inProgress)
            }
            
        case .inProgress:
            if route.completeRoute() {
                updateRouteStatus(.completed)
            }
            
        default:
            break
        }
        
        // Notify delegate of action
        delegate?.didTapActionButton(route.status)
    }
    
    /// Updates UI elements for offline mode
    /// - Parameter isOffline: New offline mode state
    private func updateOfflineModeUI(_ isOffline: Bool) {
        // Update UI elements with offline state
        let alpha: CGFloat = isOffline ? 0.7 : 1.0
        mapView.alpha = alpha
        deliveriesTableView.alpha = alpha
        
        // Add offline mode indicator to status
        if let currentText = statusLabel.text, isOffline {
            if !currentText.contains("(Offline)") {
                statusLabel.text?.append(" (Offline)")
            }
        }
        
        // Update action button state
        actionButton.alpha = alpha
        if isOffline {
            actionButton.setTitle(actionButton.title(for: .normal)?.appending(" (Offline)"), for: .normal)
        }
    }
}

// MARK: - UITableViewDelegate & UITableViewDataSource

extension RouteDetailView: UITableViewDelegate, UITableViewDataSource {
    
    public func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return route?.deliveryIds.count ?? 0
    }
    
    public func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "DeliveryCell", for: indexPath)
        
        if let deliveryId = route?.deliveryIds[indexPath.row] {
            // Configure cell with delivery information
            cell.textLabel?.text = "Delivery #\(deliveryId)"
            
            // Add offline indicator if needed
            if isOfflineMode {
                cell.textLabel?.text?.append(" (Offline)")
                cell.alpha = 0.7
            } else {
                cell.alpha = 1.0
            }
        }
        
        return cell
    }
    
    public func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        // Handle delivery selection
        if let deliveryId = route?.deliveryIds[indexPath.row] {
            // Implement delivery selection handling
            print("Selected delivery: \(deliveryId)")
        }
    }
}