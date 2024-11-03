//
// DeliveryDetailView.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify MapKit framework is properly linked in project settings
// 2. Configure camera usage permissions in Info.plist for proof of delivery
// 3. Test offline mode functionality with airplane mode enabled
// 4. Verify accessibility labels are properly localized
// 5. Test VoiceOver navigation through all UI elements

import UIKit      // iOS 14.0+
import MapKit     // iOS 14.0+

/// A UIView subclass that displays detailed information about a delivery with status management,
/// location tracking, and proof of delivery capabilities.
/// Requirements addressed:
/// - Digital proof of delivery capabilities for mobile applications (1.2 Scope/Core Functionality)
/// - Real-time data synchronization between mobile and backend (1.2 Scope/Technical Implementation)
/// - Support for offline operation in mobile applications (1.2 Scope/Performance Requirements)
@IBDesignable
class DeliveryDetailView: UIView {
    
    // MARK: - Public Properties
    
    /// The delivery being displayed
    public var delivery: Delivery {
        didSet {
            updateUI()
        }
    }
    
    /// Indicates if the view is operating in offline mode
    public var isOfflineMode: Bool {
        didSet {
            updateOfflineState()
        }
    }
    
    // MARK: - Private Properties
    
    private let contentStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 16
        stack.alignment = .fill
        stack.distribution = .fill
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private let statusLabel: UILabel = {
        let label = UILabel()
        label.font = .preferredFont(forTextStyle: .headline)
        label.adjustsFontForContentSizeCategory = true
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let addressLabel: UILabel = {
        let label = UILabel()
        label.font = .preferredFont(forTextStyle: .body)
        label.numberOfLines = 0
        label.adjustsFontForContentSizeCategory = true
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let customerLabel: UILabel = {
        let label = UILabel()
        label.font = .preferredFont(forTextStyle: .body)
        label.adjustsFontForContentSizeCategory = true
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let locationMapView: MKMapView = {
        let mapView = MKMapView()
        mapView.layer.cornerRadius = 8
        mapView.clipsToBounds = true
        mapView.translatesAutoresizingMaskIntoConstraints = false
        return mapView
    }()
    
    private let completeButton: CustomButton = {
        let button = CustomButton()
        button.buttonColor = .systemGreen
        button.setTitle("Complete Delivery", for: .normal)
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    private let captureProofButton: CustomButton = {
        let button = CustomButton()
        button.buttonColor = .systemBlue
        button.setTitle("Capture Proof of Delivery", for: .normal)
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    private let errorView: ErrorView = {
        let view = ErrorView()
        view.isHidden = true
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    // MARK: - Initialization
    
    init(frame: CGRect, delivery: Delivery, isOffline: Bool) {
        self.delivery = delivery
        self.isOfflineMode = isOffline
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Setup
    
    private func setupUI() {
        // Add and configure main stack view
        addSubview(contentStack)
        
        // Add components to stack
        contentStack.addArrangedSubview(statusLabel)
        contentStack.addArrangedSubview(addressLabel)
        contentStack.addArrangedSubview(customerLabel)
        contentStack.addArrangedSubview(locationMapView)
        contentStack.addArrangedSubview(completeButton)
        contentStack.addArrangedSubview(captureProofButton)
        
        // Add error view
        addSubview(errorView)
        
        // Configure constraints
        NSLayoutConstraint.activate([
            contentStack.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            contentStack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -16),
            
            locationMapView.heightAnchor.constraint(equalToConstant: 200),
            
            errorView.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            errorView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            errorView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16)
        ])
        
        // Configure button actions
        completeButton.addTarget(self, action: #selector(handleCompleteDelivery), for: .touchUpInside)
        captureProofButton.addTarget(self, action: #selector(handleCaptureProof), for: .touchUpInside)
        
        // Setup initial UI state
        updateUI()
        setupAccessibility()
    }
    
    private func setupAccessibility() {
        // Configure accessibility for status
        statusLabel.isAccessibilityElement = true
        statusLabel.accessibilityTraits = .updatesFrequently
        statusLabel.accessibilityLabel = "Delivery Status"
        
        // Configure accessibility for address
        addressLabel.isAccessibilityElement = true
        addressLabel.accessibilityLabel = "Delivery Address"
        
        // Configure accessibility for customer
        customerLabel.isAccessibilityElement = true
        customerLabel.accessibilityLabel = "Customer Information"
        
        // Configure accessibility for map
        locationMapView.isAccessibilityElement = true
        locationMapView.accessibilityLabel = "Delivery Location Map"
        
        // Configure accessibility for buttons
        completeButton.accessibilityLabel = "Complete Delivery"
        captureProofButton.accessibilityLabel = "Capture Proof of Delivery"
    }
    
    // MARK: - UI Updates
    
    private func updateUI() {
        // Update status display
        statusLabel.text = "Status: \(delivery.status.rawValue.capitalized)"
        statusLabel.textColor = getStatusColor(for: delivery.status)
        
        // Update address and customer info
        addressLabel.text = "Address: \(delivery.address)"
        customerLabel.text = "Customer ID: \(delivery.customerId)"
        
        // Update map if location is available
        if let location = delivery.deliveryLocation {
            let coordinate = CLLocationCoordinate2D(
                latitude: location.latitude,
                longitude: location.longitude
            )
            let region = MKCoordinateRegion(
                center: coordinate,
                latitudinalMeters: 1000,
                longitudinalMeters: 1000
            )
            locationMapView.setRegion(region, animated: true)
            
            // Add annotation for delivery location
            let annotation = MKPointAnnotation()
            annotation.coordinate = coordinate
            annotation.title = "Delivery Location"
            locationMapView.removeAnnotations(locationMapView.annotations)
            locationMapView.addAnnotation(annotation)
        }
        
        // Update button states based on delivery status
        updateButtonStates()
        
        // Update accessibility values
        updateAccessibilityValues()
    }
    
    private func updateButtonStates() {
        // Enable/disable complete button based on status
        completeButton.isEnabled = delivery.status == .inTransit && !isOfflineMode
        
        // Enable/disable proof capture button based on status and existing proof
        captureProofButton.isEnabled = delivery.status == .inTransit && delivery.proof == nil
        
        // Update button appearance for offline mode
        completeButton.buttonColor = isOfflineMode ? .systemGray : .systemGreen
        captureProofButton.buttonColor = isOfflineMode ? .systemGray : .systemBlue
    }
    
    private func updateOfflineState() {
        // Update UI elements for offline mode
        let offlineIndicator = isOfflineMode ? " (Offline)" : ""
        completeButton.setTitle("Complete Delivery\(offlineIndicator)", for: .normal)
        captureProofButton.setTitle("Capture Proof of Delivery\(offlineIndicator)", for: .normal)
        
        // Update button states
        updateButtonStates()
        
        // Show offline mode indicator if needed
        if isOfflineMode {
            errorView.show(message: "Operating in offline mode. Some features may be limited.", duration: 3.0)
        }
    }
    
    private func updateAccessibilityValues() {
        statusLabel.accessibilityValue = delivery.status.rawValue.capitalized
        addressLabel.accessibilityValue = delivery.address
        customerLabel.accessibilityValue = delivery.customerId
        
        // Update button accessibility states
        completeButton.accessibilityHint = isOfflineMode ? "Not available in offline mode" : "Marks the delivery as complete"
        captureProofButton.accessibilityHint = delivery.proof != nil ? "Proof of delivery already captured" : "Captures signature and photo proof"
    }
    
    // MARK: - Action Handlers
    
    @objc private func handleCompleteDelivery() {
        // Requirement: Real-time data synchronization between mobile and backend
        guard !isOfflineMode else {
            handleError("Cannot complete delivery in offline mode")
            return
        }
        
        // Attempt to update delivery status
        updateDeliveryStatus(.delivered)
    }
    
    @objc private func handleCaptureProof() {
        // Requirement: Digital proof of delivery capabilities
        showProofOfDeliveryCapture()
    }
    
    // MARK: - Public Methods
    
    /// Updates the delivery status with error handling and offline support
    /// - Parameter newStatus: The new status to set
    public func updateDeliveryStatus(_ newStatus: DeliveryStatus) {
        // Validate status transition
        guard delivery.status != newStatus else {
            handleError("Delivery is already in \(newStatus.rawValue) status")
            return
        }
        
        // Update status with offline support
        delivery.updateStatus(newStatus)
        
        // Update UI
        updateUI()
        
        // Show success message
        errorView.show(message: "Delivery status updated to \(newStatus.rawValue)", duration: 2.0)
        
        // Post accessibility notification
        UIAccessibility.post(notification: .announcement, argument: "Delivery status updated to \(newStatus.rawValue)")
    }
    
    /// Presents the proof of delivery capture interface
    public func showProofOfDeliveryCapture() {
        // Validate current status allows proof capture
        guard delivery.status == .inTransit else {
            handleError("Proof of delivery can only be captured for in-transit deliveries")
            return
        }
        
        // Validate no existing proof
        guard delivery.proof == nil else {
            handleError("Proof of delivery has already been captured")
            return
        }
        
        // Notify delegate to handle proof capture
        // Note: Actual implementation would be handled by the view controller
        UIAccessibility.post(notification: .announcement, argument: "Opening proof of delivery capture")
    }
    
    // MARK: - Helper Methods
    
    private func getStatusColor(for status: DeliveryStatus) -> UIColor {
        switch status {
        case .pending:
            return .systemYellow
        case .inTransit:
            return .systemBlue
        case .delivered:
            return .systemGreen
        case .failed:
            return .systemRed
        case .cancelled:
            return .systemGray
        }
    }
    
    private func handleError(_ message: String) {
        errorView.show(message: message)
        
        // Post accessibility notification for error
        UIAccessibility.post(notification: .announcement, argument: message)
    }
    
    // MARK: - Layout
    
    override func layoutSubviews() {
        super.layoutSubviews()
        
        // Update shadow paths for better performance
        completeButton.layer.shadowPath = UIBezierPath(roundedRect: completeButton.bounds, cornerRadius: completeButton.layer.cornerRadius).cgPath
        captureProofButton.layer.shadowPath = UIBezierPath(roundedRect: captureProofButton.bounds, cornerRadius: captureProofButton.layer.cornerRadius).cgPath
    }
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        
        // Update colors for dark mode changes
        updateUI()
    }
}