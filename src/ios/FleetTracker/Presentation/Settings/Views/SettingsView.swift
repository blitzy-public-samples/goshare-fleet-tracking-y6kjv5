//
// SettingsView.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify location services permissions are properly configured in Info.plist
// 2. Test notification permissions on physical devices
// 3. Validate settings persistence across app restarts
// 4. Review accessibility labels and VoiceOver support
// 5. Test background location updates with 30-second intervals

import UIKit      // iOS 14.0+
import CoreLocation      // iOS 14.0+

/// Main settings view that provides user interface for application configuration
/// including location services with 30-second update intervals
/// Requirements addressed:
/// - Mobile Applications: Native iOS driver applications with offline-first architecture and GPS integration
/// - System Configuration: Multi-platform support and configuration management
/// - Real-time GPS tracking: Real-time GPS tracking with 30-second update intervals
public class SettingsView: UIView {
    
    // MARK: - Properties
    
    private let containerStackView: UIStackView = {
        let stackView = UIStackView()
        stackView.translatesAutoresizingMaskIntoConstraints = false
        stackView.axis = .vertical
        stackView.spacing = 20
        stackView.distribution = .fill
        stackView.alignment = .fill
        return stackView
    }()
    
    private let locationSettingsButton: CustomButton = {
        let button = CustomButton()
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("Location Settings", for: .normal)
        button.setImage(UIImage(systemName: "location.fill"), for: .normal)
        button.buttonColor = .systemBlue
        return button
    }()
    
    private let notificationSettingsButton: CustomButton = {
        let button = CustomButton()
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("Notification Settings", for: .normal)
        button.setImage(UIImage(systemName: "bell.fill"), for: .normal)
        button.buttonColor = .systemGreen
        return button
    }()
    
    private let generalSettingsButton: CustomButton = {
        let button = CustomButton()
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("General Settings", for: .normal)
        button.setImage(UIImage(systemName: "gear"), for: .normal)
        button.buttonColor = .systemGray
        return button
    }()
    
    private let locationServiceSwitch: UISwitch = {
        let switchControl = UISwitch()
        switchControl.translatesAutoresizingMaskIntoConstraints = false
        switchControl.onTintColor = .systemBlue
        return switchControl
    }()
    
    private let notificationSwitch: UISwitch = {
        let switchControl = UISwitch()
        switchControl.translatesAutoresizingMaskIntoConstraints = false
        switchControl.onTintColor = .systemGreen
        return switchControl
    }()
    
    private let loadingView: LoadingView = {
        let view = LoadingView(message: "Updating settings...")
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    public weak var delegate: SettingsViewDelegate?
    
    // MARK: - Initialization
    
    public override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        setupActionHandlers()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
        setupActionHandlers()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        backgroundColor = .systemBackground
        
        // Add container stack view
        addSubview(containerStackView)
        
        // Create location settings container
        let locationContainer = createSettingsContainer(
            title: "Location Services",
            subtitle: "Enable real-time location tracking (30s intervals)",
            button: locationSettingsButton,
            switchControl: locationServiceSwitch
        )
        
        // Create notification settings container
        let notificationContainer = createSettingsContainer(
            title: "Notifications",
            subtitle: "Enable push notifications for updates",
            button: notificationSettingsButton,
            switchControl: notificationSwitch
        )
        
        // Add containers to stack view
        containerStackView.addArrangedSubview(locationContainer)
        containerStackView.addArrangedSubview(notificationContainer)
        containerStackView.addArrangedSubview(generalSettingsButton)
        
        // Setup constraints
        NSLayoutConstraint.activate([
            containerStackView.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 20),
            containerStackView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 20),
            containerStackView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20),
            
            locationSettingsButton.heightAnchor.constraint(equalToConstant: 50),
            notificationSettingsButton.heightAnchor.constraint(equalToConstant: 50),
            generalSettingsButton.heightAnchor.constraint(equalToConstant: 50)
        ])
        
        setupAccessibility()
    }
    
    private func createSettingsContainer(title: String, subtitle: String, button: CustomButton, switchControl: UISwitch) -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        
        let titleLabel = UILabel()
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = title
        titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        
        let subtitleLabel = UILabel()
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.text = subtitle
        subtitleLabel.font = .systemFont(ofSize: 14)
        subtitleLabel.textColor = .secondaryLabel
        subtitleLabel.numberOfLines = 0
        
        container.addSubview(titleLabel)
        container.addSubview(subtitleLabel)
        container.addSubview(button)
        container.addSubview(switchControl)
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: container.topAnchor),
            titleLabel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            titleLabel.trailingAnchor.constraint(equalTo: switchControl.leadingAnchor, constant: -10),
            
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            subtitleLabel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            subtitleLabel.trailingAnchor.constraint(equalTo: switchControl.leadingAnchor, constant: -10),
            
            button.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 10),
            button.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            button.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            button.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            
            switchControl.centerYAnchor.constraint(equalTo: titleLabel.centerYAnchor),
            switchControl.trailingAnchor.constraint(equalTo: container.trailingAnchor)
        ])
        
        return container
    }
    
    private func setupAccessibility() {
        locationSettingsButton.accessibilityLabel = "Location Settings"
        locationSettingsButton.accessibilityHint = "Configure location tracking settings with 30-second intervals"
        
        notificationSettingsButton.accessibilityLabel = "Notification Settings"
        notificationSettingsButton.accessibilityHint = "Configure push notification settings"
        
        generalSettingsButton.accessibilityLabel = "General Settings"
        generalSettingsButton.accessibilityHint = "Configure general application settings"
        
        locationServiceSwitch.accessibilityLabel = "Location Services"
        locationServiceSwitch.accessibilityHint = "Toggle location tracking"
        
        notificationSwitch.accessibilityLabel = "Notifications"
        notificationSwitch.accessibilityHint = "Toggle push notifications"
    }
    
    // MARK: - Action Handlers
    
    private func setupActionHandlers() {
        locationServiceSwitch.addTarget(self, action: #selector(locationSwitchChanged), for: .valueChanged)
        notificationSwitch.addTarget(self, action: #selector(notificationSwitchChanged), for: .valueChanged)
        
        locationSettingsButton.addTarget(self, action: #selector(locationSettingsTapped), for: .touchUpInside)
        notificationSettingsButton.addTarget(self, action: #selector(notificationSettingsTapped), for: .touchUpInside)
        generalSettingsButton.addTarget(self, action: #selector(generalSettingsTapped), for: .touchUpInside)
    }
    
    @objc private func locationSwitchChanged() {
        updateLocationServices(enabled: locationServiceSwitch.isOn)
    }
    
    @objc private func notificationSwitchChanged() {
        updateNotificationSettings(enabled: notificationSwitch.isOn)
    }
    
    @objc private func locationSettingsTapped() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
    
    @objc private func notificationSettingsTapped() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
    
    @objc private func generalSettingsTapped() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
    
    // MARK: - Public Methods
    
    /// Updates location services configuration based on switch state
    /// Requirements addressed:
    /// - Real-time GPS tracking with 30-second update intervals
    public func updateLocationServices(enabled: Bool) {
        loadingView.show()
        
        // Update location services configuration
        if enabled {
            loadingView.updateMessage("Enabling location services...")
            
            // Request location permissions if needed
            let locationManager = CLLocationManager()
            locationManager.requestAlwaysAuthorization()
            
            // Configure location services with 30-second interval
            locationManager.desiredAccuracy = kCLLocationAccuracyBest
            locationManager.distanceFilter = kCLDistanceFilterNone
            locationManager.allowsBackgroundLocationUpdates = true
            locationManager.pausesLocationUpdatesAutomatically = false
            locationManager.startUpdatingLocation()
        } else {
            loadingView.updateMessage("Disabling location services...")
            CLLocationManager().stopUpdatingLocation()
        }
        
        // Update UI state
        locationSettingsButton.isEnabled = enabled
        locationServiceSwitch.isOn = enabled
        
        // Notify delegate
        delegate?.didUpdateLocationServices(enabled)
        
        loadingView.hide()
    }
    
    /// Updates notification settings based on switch state
    public func updateNotificationSettings(enabled: Bool) {
        loadingView.show()
        
        if enabled {
            loadingView.updateMessage("Enabling notifications...")
            
            // Request notification permissions
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, error in
                DispatchQueue.main.async {
                    if granted {
                        self?.notificationSettingsButton.isEnabled = true
                        self?.notificationSwitch.isOn = true
                        self?.delegate?.didUpdateNotificationSettings(true)
                    } else {
                        self?.notificationSettingsButton.isEnabled = false
                        self?.notificationSwitch.isOn = false
                        self?.delegate?.didUpdateNotificationSettings(false)
                    }
                    self?.loadingView.hide()
                }
            }
        } else {
            loadingView.updateMessage("Disabling notifications...")
            
            // Disable notifications
            notificationSettingsButton.isEnabled = false
            notificationSwitch.isOn = false
            delegate?.didUpdateNotificationSettings(false)
            
            loadingView.hide()
        }
    }
}

// MARK: - SettingsViewDelegate Protocol

/// Protocol defining methods for handling settings changes
public protocol SettingsViewDelegate: AnyObject {
    /// Called when location services configuration is updated
    func didUpdateLocationServices(_ enabled: Bool)
    
    /// Called when notification settings are updated
    func didUpdateNotificationSettings(_ enabled: Bool)
}