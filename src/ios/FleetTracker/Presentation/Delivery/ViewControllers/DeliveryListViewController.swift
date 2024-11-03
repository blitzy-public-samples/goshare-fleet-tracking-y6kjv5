//
// DeliveryListViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify push notification entitlements are configured for real-time updates
// 2. Test offline mode behavior with airplane mode and network transitions
// 3. Verify accessibility labels are properly localized
// 4. Test VoiceOver navigation through delivery list items

import UIKit      // iOS 14.0+
import Combine    // iOS 14.0+

/// View controller managing the delivery list screen with real-time updates and offline support
/// Requirements addressed:
/// - Mobile Applications with offline-first architecture (1.1 System Overview)
/// - Real-time data synchronization between mobile and backend (1.2 Scope/Technical Implementation)
/// - Support for offline operation in mobile applications (1.2 Scope/Performance Requirements)
@objc
public class DeliveryListViewController: UIViewController {
    
    // MARK: - Properties
    
    private let deliveryListView: DeliveryListView
    private let deliveryService: DeliveryService
    private var cancellables = Set<AnyCancellable>()
    private var deliveries: [Delivery] = []
    
    // MARK: - Initialization
    
    /// Initializes the delivery list view controller with required dependencies
    /// - Parameter deliveryService: Service for managing delivery operations
    public init(deliveryService: DeliveryService) {
        self.deliveryService = deliveryService
        self.deliveryListView = DeliveryListView(frame: .zero)
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle Methods
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupBindings()
        loadDeliveries()
        setupNotifications()
    }
    
    public override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Refresh data when view appears
        loadDeliveries()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        // Configure navigation item
        title = "Deliveries"
        navigationItem.largeTitleDisplayMode = .always
        
        // Add sync button to navigation bar
        let syncButton = UIBarButtonItem(
            image: UIImage(systemName: "arrow.triangle.2.circlepath"),
            style: .plain,
            target: self,
            action: #selector(syncOfflineData)
        )
        syncButton.accessibilityLabel = "Sync Offline Data"
        navigationItem.rightBarButtonItem = syncButton
        
        // Configure deliveryListView
        view.addSubview(deliveryListView)
        deliveryListView.translatesAutoresizingMaskIntoConstraints = false
        
        // Apply constraints
        NSLayoutConstraint.activate([
            deliveryListView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            deliveryListView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            deliveryListView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            deliveryListView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    private func setupBindings() {
        // Observe delivery selection
        NotificationCenter.default.publisher(for: .deliverySelected)
            .sink { [weak self] notification in
                guard let delivery = notification.object as? Delivery else { return }
                self?.handleDeliverySelection(delivery)
            }
            .store(in: &cancellables)
        
        // Observe refresh requests
        NotificationCenter.default.publisher(for: .deliveryListRefreshRequested)
            .sink { [weak self] _ in
                self?.handleRefresh()
            }
            .store(in: &cancellables)
    }
    
    private func setupNotifications() {
        // Observe connectivity changes
        NotificationCenter.default.publisher(for: .connectivityStatusChanged)
            .sink { [weak self] notification in
                if let isConnected = notification.object as? Bool {
                    self?.handleConnectivityChange(isConnected)
                }
            }
            .store(in: &cancellables)
        
        // Observe background/foreground transitions
        NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)
            .sink { [weak self] _ in
                self?.loadDeliveries()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Data Loading
    
    /// Loads delivery data with offline support
    /// Requirement: Support for offline operation in mobile applications
    public func loadDeliveries() {
        deliveryListView.showLoading()
        
        // Fetch deliveries using service
        switch deliveryService.fetchDeliveries(includeCompleted: false) {
        case .success(let fetchedDeliveries):
            self.deliveries = fetchedDeliveries
            deliveryListView.updateDeliveries(fetchedDeliveries)
            deliveryListView.hideLoading()
            
        case .failure(let error):
            deliveryListView.hideLoading()
            handleError(error)
        }
    }
    
    /// Synchronizes offline delivery data with the server
    /// Requirement: Real-time data synchronization between mobile and backend
    @objc public func syncOfflineData() {
        deliveryListView.showLoading()
        
        switch deliveryService.syncOfflineDeliveries() {
        case .success(let syncCount):
            if syncCount > 0 {
                deliveryListView.showError("Synchronized \(syncCount) deliveries")
                loadDeliveries() // Reload after successful sync
            }
            deliveryListView.hideLoading()
            
        case .failure(let error):
            deliveryListView.hideLoading()
            handleError(error)
        }
    }
    
    // MARK: - Event Handlers
    
    private func handleDeliverySelection(_ delivery: Delivery) {
        // Navigate to delivery detail screen
        let detailViewController = DeliveryDetailViewController(
            delivery: delivery,
            deliveryService: deliveryService
        )
        navigationController?.pushViewController(detailViewController, animated: true)
    }
    
    private func handleRefresh() {
        // Attempt to sync offline data first
        switch deliveryService.syncOfflineDeliveries() {
        case .success(_):
            loadDeliveries()
            
        case .failure(let error):
            handleError(error)
        }
    }
    
    private func handleConnectivityChange(_ isConnected: Bool) {
        if isConnected {
            // Attempt to sync when connection is restored
            syncOfflineData()
        }
        
        // Update UI for connectivity state
        deliveryListView.showError(
            isConnected ? "Back Online" : "Offline Mode - Changes will sync when connected"
        )
    }
    
    private func handleError(_ error: Error) {
        // Show appropriate error message based on error type
        let errorMessage: String
        
        switch error {
        case let networkError as NetworkError:
            errorMessage = "Network Error: \(networkError.localizedDescription)"
            
        case let syncError as DeliveryManagementError:
            errorMessage = "Sync Error: \(syncError.localizedDescription)"
            
        default:
            errorMessage = "An unexpected error occurred"
        }
        
        deliveryListView.showError(errorMessage)
    }
}

// MARK: - Notification Names

private extension Notification.Name {
    static let deliverySelected = Notification.Name("deliverySelected")
    static let deliveryListRefreshRequested = Notification.Name("deliveryListRefreshRequested")
    static let connectivityStatusChanged = Notification.Name("connectivityStatusChanged")
}