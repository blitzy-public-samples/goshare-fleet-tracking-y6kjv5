//
// DeliveryListView.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify accessibility labels are properly localized
// 2. Test VoiceOver functionality with delivery list items
// 3. Ensure offline mode indicator is visible in all color schemes
// 4. Test pull-to-refresh behavior with network transitions

import UIKit      // iOS 14.0+

/// A custom UIView that displays a filterable, sortable list of deliveries with real-time updates
/// and offline support capabilities.
/// Requirements addressed:
/// - Mobile Applications with offline-first architecture
/// - Digital proof of delivery capabilities
/// - Real-time data synchronization between mobile and backend
/// - Support for offline operation in mobile applications
@IBDesignable
public class DeliveryListView: UIView {
    
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
    
    private let statusFilter: UISegmentedControl = {
        let items = ["All", "Pending", "In Transit", "Delivered"]
        let control = UISegmentedControl(items: items)
        control.translatesAutoresizingMaskIntoConstraints = false
        control.selectedSegmentIndex = 0
        return control
    }()
    
    private let searchBar: UISearchBar = {
        let search = UISearchBar()
        search.translatesAutoresizingMaskIntoConstraints = false
        search.placeholder = "Search deliveries..."
        search.searchBarStyle = .minimal
        return search
    }()
    
    private let loadingView: LoadingView = {
        let loading = LoadingView(message: "Loading deliveries...")
        loading.translatesAutoresizingMaskIntoConstraints = false
        return loading
    }()
    
    private let errorView: ErrorView = {
        let error = ErrorView()
        error.translatesAutoresizingMaskIntoConstraints = false
        error.isHidden = true
        return error
    }()
    
    private let refreshControl = UIRefreshControl()
    
    private let offlineIndicator: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = .systemYellow
        view.isHidden = true
        view.layer.cornerRadius = 4
        
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "Offline Mode"
        label.font = .systemFont(ofSize: 12, weight: .medium)
        label.textColor = .black
        
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 8),
            label.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -8)
        ])
        
        return view
    }()
    
    private var deliveries: [Delivery] = []
    private var filteredDeliveries: [Delivery] = []
    public private(set) var isOfflineMode: Bool = false {
        didSet {
            offlineIndicator.isHidden = !isOfflineMode
        }
    }
    
    // MARK: - Initialization
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        setupNotifications()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
        setupNotifications()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        // Add subviews
        addSubview(statusFilter)
        addSubview(searchBar)
        addSubview(tableView)
        addSubview(offlineIndicator)
        
        // Configure table view
        tableView.delegate = self
        tableView.dataSource = self
        tableView.refreshControl = refreshControl
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "DeliveryCell")
        
        // Configure search bar
        searchBar.delegate = self
        
        // Configure status filter
        statusFilter.addTarget(self, action: #selector(statusFilterChanged), for: .valueChanged)
        
        // Configure refresh control
        refreshControl.addTarget(self, action: #selector(refreshData), for: .valueChanged)
        
        // Apply constraints
        NSLayoutConstraint.activate([
            // Status filter constraints
            statusFilter.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 8),
            statusFilter.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            statusFilter.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            
            // Search bar constraints
            searchBar.topAnchor.constraint(equalTo: statusFilter.bottomAnchor, constant: 8),
            searchBar.leadingAnchor.constraint(equalTo: leadingAnchor),
            searchBar.trailingAnchor.constraint(equalTo: trailingAnchor),
            
            // Table view constraints
            tableView.topAnchor.constraint(equalTo: searchBar.bottomAnchor),
            tableView.leadingAnchor.constraint(equalTo: leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: bottomAnchor),
            
            // Offline indicator constraints
            offlineIndicator.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 4),
            offlineIndicator.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            offlineIndicator.heightAnchor.constraint(equalToConstant: 24)
        ])
        
        // Configure accessibility
        setupAccessibility()
    }
    
    private func setupAccessibility() {
        statusFilter.accessibilityLabel = "Delivery Status Filter"
        statusFilter.accessibilityHint = "Select to filter deliveries by status"
        
        searchBar.accessibilityLabel = "Search Deliveries"
        searchBar.accessibilityHint = "Enter text to search deliveries"
        
        tableView.accessibilityLabel = "Deliveries List"
        
        offlineIndicator.isAccessibilityElement = true
        offlineIndicator.accessibilityLabel = "Offline Mode Indicator"
        offlineIndicator.accessibilityTraits = .updatesFrequently
    }
    
    private func setupNotifications() {
        NotificationCenter.default.addObserver(self,
                                             selector: #selector(handleConnectivityChange(_:)),
                                             name: .connectivityStatusChanged,
                                             object: nil)
    }
    
    // MARK: - Public Methods
    
    /// Updates the delivery list with new data while maintaining offline state
    /// - Parameter newDeliveries: Array of updated delivery objects
    public func updateDeliveries(_ newDeliveries: [Delivery]) {
        deliveries = newDeliveries
        filterDeliveries()
        tableView.reloadData()
        
        // Update empty state if needed
        updateEmptyState()
    }
    
    /// Shows the loading view with animation
    public func showLoading() {
        loadingView.show()
        tableView.isUserInteractionEnabled = false
    }
    
    /// Hides the loading view with animation
    public func hideLoading() {
        loadingView.hide()
        tableView.isUserInteractionEnabled = true
    }
    
    /// Shows an error message with optional auto-hide
    /// - Parameter message: Error message to display
    public func showError(_ message: String) {
        errorView.show(message: message)
    }
    
    // MARK: - Private Methods
    
    private func filterDeliveries() {
        var filtered = deliveries
        
        // Apply status filter
        if statusFilter.selectedSegmentIndex > 0 {
            let status = DeliveryStatus.allCases[statusFilter.selectedSegmentIndex - 1]
            filtered = filtered.filter { $0.status == status }
        }
        
        // Apply search text filter
        if let searchText = searchBar.text, !searchText.isEmpty {
            filtered = filtered.filter { delivery in
                delivery.id.localizedCaseInsensitiveContains(searchText) ||
                delivery.address.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        // Sort by scheduled date
        filtered.sort { $0.scheduledDate < $1.scheduledDate }
        
        filteredDeliveries = filtered
        tableView.reloadData()
    }
    
    private func updateEmptyState() {
        if filteredDeliveries.isEmpty {
            let emptyLabel = UILabel()
            emptyLabel.text = "No deliveries found"
            emptyLabel.textAlignment = .center
            emptyLabel.textColor = .secondaryLabel
            tableView.backgroundView = emptyLabel
        } else {
            tableView.backgroundView = nil
        }
    }
    
    @objc private func statusFilterChanged() {
        filterDeliveries()
    }
    
    @objc private func refreshData() {
        // Notify delegate of refresh request
        NotificationCenter.default.post(name: .deliveryListRefreshRequested,
                                      object: nil)
    }
    
    @objc private func handleConnectivityChange(_ notification: Notification) {
        if let isConnected = notification.object as? Bool {
            isOfflineMode = !isConnected
            
            // Update UI for connectivity state
            if isConnected {
                showError("Back Online")
            } else {
                showError("Offline Mode - Changes will sync when connected")
            }
        }
    }
}

// MARK: - UITableViewDataSource

extension DeliveryListView: UITableViewDataSource {
    public func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredDeliveries.count
    }
    
    public func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "DeliveryCell", for: indexPath)
        let delivery = filteredDeliveries[indexPath.row]
        
        // Configure cell
        var content = cell.defaultContentConfiguration()
        content.text = "Delivery #\(delivery.id)"
        content.secondaryText = """
            Status: \(delivery.status.rawValue)
            Address: \(delivery.address)
            Scheduled: \(delivery.scheduledDate.formatted())
            """
        
        // Add offline indicator if needed
        if delivery.isOffline {
            content.secondaryTextProperties.color = .systemYellow
        }
        
        cell.contentConfiguration = content
        cell.accessoryType = .disclosureIndicator
        
        return cell
    }
}

// MARK: - UITableViewDelegate

extension DeliveryListView: UITableViewDelegate {
    public func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let delivery = filteredDeliveries[indexPath.row]
        
        // Notify of delivery selection
        NotificationCenter.default.post(name: .deliverySelected,
                                      object: delivery)
    }
}

// MARK: - UISearchBarDelegate

extension DeliveryListView: UISearchBarDelegate {
    public func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        filterDeliveries()
    }
    
    public func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }
}

// MARK: - Notification Names

private extension Notification.Name {
    static let deliveryListRefreshRequested = Notification.Name("deliveryListRefreshRequested")
    static let deliverySelected = Notification.Name("deliverySelected")
    static let connectivityStatusChanged = Notification.Name("connectivityStatusChanged")
}