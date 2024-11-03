//
// DeliveryDetailViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure minimum iOS deployment target is set to iOS 14.0 or higher
// 2. Configure camera and photo library permissions in Info.plist
// 3. Set up push notification entitlements for real-time updates
// 4. Verify CoreData schema includes Delivery entity
// 5. Test offline mode functionality with airplane mode enabled

import UIKit      // iOS 14.0+
import Combine    // iOS 14.0+

/// View controller managing the delivery detail screen with real-time status updates,
/// location tracking, and proof of delivery capture functionality
/// Requirements addressed:
/// - Digital proof of delivery capabilities (1.2 Scope/Core Functionality)
/// - Real-time data synchronization (1.2 Scope/Technical Implementation)
/// - Support for offline operation (1.2 Scope/Performance Requirements)
@objc
class DeliveryDetailViewController: UIViewController {
    
    // MARK: - Properties
    
    private let delivery: Delivery
    private let deliveryService: DeliveryService
    private var detailView: DeliveryDetailView!
    private var cancellables = Set<AnyCancellable>()
    private var isOfflineMode: Bool {
        didSet {
            updateOfflineState()
        }
    }
    
    // MARK: - Initialization
    
    /// Initializes the view controller with a delivery and service
    /// - Parameters:
    ///   - delivery: The delivery to display
    ///   - deliveryService: Service for managing delivery operations
    init(delivery: Delivery, deliveryService: DeliveryService) {
        self.delivery = delivery
        self.deliveryService = deliveryService
        self.isOfflineMode = !NetworkManager.shared.isConnected
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupDetailView()
        configureNavigationItems()
        setupDeliveryObservers()
        setupNetworkObservers()
        setupAccessibility()
    }
    
    // MARK: - Setup Methods
    
    private func setupDetailView() {
        // Initialize detail view with current delivery
        detailView = DeliveryDetailView(
            frame: view.bounds,
            delivery: delivery,
            isOffline: isOfflineMode
        )
        
        // Add to view hierarchy
        view.addSubview(detailView)
        
        // Configure constraints
        detailView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            detailView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            detailView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            detailView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            detailView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        // Configure action handlers
        detailView.updateDeliveryStatus = { [weak self] newStatus in
            self?.handleDeliveryStatusUpdate(newStatus)
        }
        
        detailView.showProofOfDeliveryCapture = { [weak self] in
            self?.handleProofOfDeliveryCapture()
        }
    }
    
    private func configureNavigationItems() {
        // Set navigation title
        title = "Delivery Details"
        
        // Add sync button if offline data exists
        if !delivery.isSynced {
            let syncButton = UIBarButtonItem(
                image: UIImage(systemName: "arrow.triangle.2.circlepath"),
                style: .plain,
                target: self,
                action: #selector(handleManualSync)
            )
            navigationItem.rightBarButtonItem = syncButton
        }
    }
    
    private func setupDeliveryObservers() {
        // Observe delivery status changes
        NotificationCenter.default.publisher(for: .deliveryStatusUpdated)
            .compactMap { $0.object as? Delivery }
            .filter { $0.id == self.delivery.id }
            .sink { [weak self] updatedDelivery in
                self?.handleDeliveryUpdate(updatedDelivery)
            }
            .store(in: &cancellables)
    }
    
    private func setupNetworkObservers() {
        // Monitor network connectivity changes
        NotificationCenter.default.publisher(for: .connectivityStatusChanged)
            .sink { [weak self] _ in
                self?.isOfflineMode = !NetworkManager.shared.isConnected
                if NetworkManager.shared.isConnected {
                    self?.syncOfflineData()
                }
            }
            .store(in: &cancellables)
    }
    
    private func setupAccessibility() {
        // Configure accessibility for navigation items
        navigationItem.rightBarButtonItem?.accessibilityLabel = "Sync offline data"
        navigationItem.rightBarButtonItem?.accessibilityHint = "Double tap to synchronize offline delivery updates"
    }
    
    // MARK: - Status Management
    
    /// Handles delivery status updates with offline support
    /// Requirement: Real-time data synchronization between mobile and backend
    private func handleDeliveryStatusUpdate(_ newStatus: DeliveryStatus) {
        // Validate status transition
        guard delivery.status != newStatus else {
            showError("Delivery is already in \(newStatus.rawValue) status")
            return
        }
        
        // Update status through service
        let result = deliveryService.updateDeliveryStatus(
            deliveryId: delivery.id,
            status: newStatus
        )
        
        switch result {
        case .success:
            // Update UI
            detailView.updateDeliveryStatus(newStatus)
            
            // Show success feedback
            showSuccess("Status updated to \(newStatus.rawValue)")
            
            // Trigger sync if offline
            if isOfflineMode {
                queueOfflineSync()
            }
            
        case .failure(let error):
            showError(error.localizedDescription)
        }
    }
    
    /// Handles proof of delivery capture and submission
    /// Requirement: Digital proof of delivery capabilities
    private func handleProofOfDeliveryCapture() {
        // Create and configure proof of delivery controller
        let proofController = ProofOfDeliveryViewController(delivery: delivery)
        proofController.delegate = self
        
        // Present modally
        let navigationController = UINavigationController(rootViewController: proofController)
        present(navigationController, animated: true)
    }
    
    // MARK: - Offline Support
    
    private func updateOfflineState() {
        // Update UI for offline mode
        detailView.isOfflineMode = isOfflineMode
        
        // Show offline indicator
        if isOfflineMode {
            showOfflineIndicator()
        }
        
        // Update navigation items
        updateNavigationItems()
    }
    
    private func queueOfflineSync() {
        // Add to sync queue
        OfflineStorage.shared.queueForSync(delivery)
        
        // Update UI to show pending sync
        updateNavigationItems()
    }
    
    @objc private func handleManualSync() {
        guard NetworkManager.shared.isConnected else {
            showError("Cannot sync while offline")
            return
        }
        
        syncOfflineData()
    }
    
    private func syncOfflineData() {
        // Attempt to sync offline data
        let result = deliveryService.syncOfflineDeliveries()
        
        switch result {
        case .success(let count):
            if count > 0 {
                showSuccess("Synchronized \(count) updates")
                updateNavigationItems()
            }
        case .failure(let error):
            showError("Sync failed: \(error.localizedDescription)")
        }
    }
    
    // MARK: - UI Updates
    
    private func handleDeliveryUpdate(_ updatedDelivery: Delivery) {
        // Update UI with new delivery data
        detailView.delivery = updatedDelivery
        
        // Update navigation items if sync status changed
        if updatedDelivery.isSynced != delivery.isSynced {
            updateNavigationItems()
        }
    }
    
    private func updateNavigationItems() {
        // Show/hide sync button based on offline data
        navigationItem.rightBarButtonItem?.isEnabled = !isOfflineMode && !delivery.isSynced
    }
    
    private func showOfflineIndicator() {
        let indicator = UILabel()
        indicator.text = "Offline Mode"
        indicator.textColor = .systemRed
        indicator.font = .preferredFont(forTextStyle: .caption1)
        navigationItem.titleView = indicator
    }
    
    // MARK: - Helper Methods
    
    private func showSuccess(_ message: String) {
        let banner = NotificationBanner(title: "Success", subtitle: message, style: .success)
        banner.show()
        
        // Post accessibility announcement
        UIAccessibility.post(notification: .announcement, argument: message)
    }
    
    private func showError(_ message: String) {
        let banner = NotificationBanner(title: "Error", subtitle: message, style: .danger)
        banner.show()
        
        // Post accessibility announcement
        UIAccessibility.post(notification: .announcement, argument: message)
    }
}

// MARK: - ProofOfDeliveryDelegate

extension DeliveryDetailViewController: ProofOfDeliveryDelegate {
    
    func proofOfDeliveryController(_ controller: ProofOfDeliveryViewController,
                                  didCaptureSignature signature: Data,
                                  photos: [Data],
                                  recipientName: String,
                                  notes: String?) {
        // Submit proof of delivery
        let result = deliveryService.submitProofOfDelivery(
            deliveryId: delivery.id,
            signature: signature,
            photos: photos,
            recipientName: recipientName,
            notes: notes
        )
        
        switch result {
        case .success:
            // Update delivery status
            handleDeliveryStatusUpdate(.delivered)
            
            // Dismiss proof capture controller
            controller.dismiss(animated: true)
            
            // Show success message
            showSuccess("Proof of delivery submitted successfully")
            
            // Queue for sync if offline
            if isOfflineMode {
                queueOfflineSync()
            }
            
        case .failure(let error):
            showError(error.localizedDescription)
        }
    }
    
    func proofOfDeliveryControllerDidCancel(_ controller: ProofOfDeliveryViewController) {
        controller.dismiss(animated: true)
    }
}

// MARK: - Notification Names

private extension Notification.Name {
    static let deliveryStatusUpdated = Notification.Name("deliveryStatusUpdated")
    static let connectivityStatusChanged = Notification.Name("connectivityStatusChanged")
}