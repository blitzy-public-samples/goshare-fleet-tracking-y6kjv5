//
// DeliveryAnnotationView.swift
// FleetTracker
//
// Human Tasks:
// 1. Ensure MapKit framework is properly linked in the project
// 2. Verify that all required assets (status icons) are added to Assets.xcassets
// 3. Test annotation view performance with large number of annotations
// 4. Validate accessibility labels for VoiceOver support

import UIKit      // iOS 14.0+
import MapKit     // iOS 14.0+

/// Custom map annotation view for displaying delivery locations with status indicators
/// Requirements addressed:
/// - Real-time GPS tracking with 30-second update intervals
/// - Interactive mapping and visualization of delivery locations
@IBDesignable
class DeliveryAnnotationView: MKAnnotationView {
    
    // MARK: - Properties
    
    /// Reference to the delivery being displayed
    public var delivery: Delivery? {
        didSet {
            if let delivery = delivery {
                configure(delivery: delivery)
            }
        }
    }
    
    /// Status icon view for visual status indication
    private let statusIconView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        return imageView
    }()
    
    /// Label displaying delivery status text
    private let statusLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 12, weight: .medium)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    /// Container view for styling and layout
    private let containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .white
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    /// Size of the annotation view
    private let annotationSize: CGFloat = 80
    
    /// Selection state of the annotation
    public override var isSelected: Bool {
        didSet {
            UIView.animate(withDuration: 0.2) { [weak self] in
                self?.containerView.transform = self?.isSelected == true ?
                    CGAffineTransform(scaleX: 1.1, y: 1.1) :
                    .identity
            }
        }
    }
    
    // MARK: - Initialization
    
    /// Initializes the annotation view with a reuse identifier
    /// - Parameter reuseIdentifier: Optional reuse identifier for view recycling
    override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
        super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
        setupViews()
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        setupViews()
    }
    
    // MARK: - View Setup
    
    /// Configures the initial view hierarchy and layout
    private func setupViews() {
        // Configure frame and interaction
        frame = CGRect(x: 0, y: 0, width: annotationSize, height: annotationSize)
        centerOffset = CGPoint(x: 0, y: -annotationSize/2)
        canShowCallout = true
        
        // Add container view
        addSubview(containerView)
        containerView.roundCorners(radius: 8, corners: .allCorners)
        containerView.addShadow(radius: 4, opacity: 0.2, offset: 2, color: .black)
        
        // Add status icon view
        containerView.addSubview(statusIconView)
        
        // Add status label
        containerView.addSubview(statusLabel)
        
        // Setup constraints
        NSLayoutConstraint.activate([
            containerView.topAnchor.constraint(equalTo: topAnchor),
            containerView.leadingAnchor.constraint(equalTo: leadingAnchor),
            containerView.trailingAnchor.constraint(equalTo: trailingAnchor),
            containerView.bottomAnchor.constraint(equalTo: bottomAnchor),
            
            statusIconView.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            statusIconView.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 12),
            statusIconView.widthAnchor.constraint(equalToConstant: 24),
            statusIconView.heightAnchor.constraint(equalToConstant: 24),
            
            statusLabel.topAnchor.constraint(equalTo: statusIconView.bottomAnchor, constant: 4),
            statusLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 4),
            statusLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -4),
            statusLabel.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -8)
        ])
    }
    
    // MARK: - Configuration
    
    /// Configures the annotation view with delivery data
    /// - Parameter delivery: The delivery to display
    public func configure(delivery: Delivery) {
        self.delivery = delivery
        updateStatusDisplay()
    }
    
    /// Updates the visual elements based on delivery status
    private func updateStatusDisplay() {
        guard let delivery = delivery else { return }
        
        // Configure status icon and colors based on delivery status
        let (iconName, backgroundColor, textColor) = statusConfiguration(for: delivery.status)
        
        // Update UI with fade animation
        UIView.animate(withDuration: 0.2) { [weak self] in
            guard let self = self else { return }
            
            // Update status icon
            self.statusIconView.image = UIImage(named: iconName)
            
            // Update container styling
            self.containerView.backgroundColor = backgroundColor
            
            // Update status label
            self.statusLabel.text = localizedStatus(for: delivery.status)
            self.statusLabel.textColor = textColor
        }
        
        // Update accessibility
        let accessibilityLabel = "Delivery \(delivery.id) - \(localizedStatus(for: delivery.status))"
        self.accessibilityLabel = accessibilityLabel
        self.accessibilityHint = "Double tap to show delivery details"
    }
    
    /// Returns the configuration for a given delivery status
    /// - Parameter status: The delivery status
    /// - Returns: Tuple containing icon name, background color, and text color
    private func statusConfiguration(for status: DeliveryStatus) -> (String, UIColor, UIColor) {
        switch status {
        case .pending:
            return ("icon_pending", .white, .darkGray)
        case .inTransit:
            return ("icon_in_transit", UIColor(red: 0.95, green: 0.95, blue: 1.0, alpha: 1.0), .systemBlue)
        case .delivered:
            return ("icon_delivered", UIColor(red: 0.9, green: 1.0, blue: 0.9, alpha: 1.0), .systemGreen)
        case .failed:
            return ("icon_failed", UIColor(red: 1.0, green: 0.9, blue: 0.9, alpha: 1.0), .systemRed)
        case .cancelled:
            return ("icon_cancelled", UIColor(red: 0.95, green: 0.95, blue: 0.95, alpha: 1.0), .darkGray)
        }
    }
    
    /// Returns localized status text for a given delivery status
    /// - Parameter status: The delivery status
    /// - Returns: Localized status string
    private func localizedStatus(for status: DeliveryStatus) -> String {
        switch status {
        case .pending:
            return NSLocalizedString("Pending", comment: "Delivery status - pending")
        case .inTransit:
            return NSLocalizedString("In Transit", comment: "Delivery status - in transit")
        case .delivered:
            return NSLocalizedString("Delivered", comment: "Delivery status - delivered")
        case .failed:
            return NSLocalizedString("Failed", comment: "Delivery status - failed")
        case .cancelled:
            return NSLocalizedString("Cancelled", comment: "Delivery status - cancelled")
        }
    }
    
    // MARK: - Layout
    
    override func prepareForReuse() {
        super.prepareForReuse()
        delivery = nil
        statusIconView.image = nil
        statusLabel.text = nil
        isSelected = false
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        // Ensure corner radius is maintained after layout
        containerView.roundCorners(radius: 8, corners: .allCorners)
    }
}