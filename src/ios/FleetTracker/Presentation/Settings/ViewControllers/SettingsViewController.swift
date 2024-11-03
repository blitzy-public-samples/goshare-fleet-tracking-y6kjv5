//
// SettingsViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify location services permissions are properly configured in Info.plist:
//    - NSLocationAlwaysAndWhenInUseUsageDescription
//    - NSLocationWhenInUseUsageDescription
//    - UIBackgroundModes (location)
// 2. Test notification permissions on physical devices
// 3. Validate offline mode functionality
// 4. Review accessibility labels and VoiceOver support
// 5. Test background location updates with 30-second intervals

import UIKit          // iOS 14.0+
import CoreLocation   // iOS 14.0+
import UserNotifications  // iOS 14.0+

/// View controller managing the settings interface of the Fleet Tracking iOS application,
/// handling location services with 30-second update intervals, notifications, and general
/// application settings with offline support
/// Requirements addressed:
/// - Mobile Applications: Native iOS driver applications with offline-first architecture and GPS integration
/// - System Configuration: Multi-platform support and configuration management
/// - Performance Requirements: Offline operation support and efficient resource utilization
/// - Real-time GPS tracking: Real-time GPS tracking with 30-second update intervals
@objcMembers public class SettingsViewController: UIViewController {
    
    // MARK: - Properties
    
    private let settingsView: SettingsView = {
        let view = SettingsView(frame: .zero)
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let locationManager: LocationManager
    private let notificationManager: NotificationManager
    
    public private(set) var isLocationEnabled: Bool = false
    public private(set) var isNotificationsEnabled: Bool = false
    
    // MARK: - Initialization
    
    public override init(nibName nibNameOrNil: String?, bundle nibBundleOrNil: Bundle?) {
        self.locationManager = LocationManager.shared()
        self.notificationManager = NotificationManager.shared
        
        super.init(nibName: nibNameOrNil, bundle: nibBundleOrNil)
    }
    
    required init?(coder: NSCoder) {
        self.locationManager = LocationManager.shared()
        self.notificationManager = NotificationManager.shared
        
        super.init(coder: coder)
    }
    
    // MARK: - Lifecycle Methods
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        
        setupNavigationBar()
        setupView()
        loadCurrentSettings()
        
        // Check offline mode status
        if locationManager.isOfflineMode {
            handleOfflineMode()
        }
    }
    
    // MARK: - Setup Methods
    
    private func setupNavigationBar() {
        title = "Settings"
        navigationController?.navigationBar.prefersLargeTitles = true
        
        // Add back button if needed
        if navigationController?.viewControllers.first != self {
            let backButton = UIBarButtonItem(
                image: UIImage(systemName: "chevron.left"),
                style: .plain,
                target: self,
                action: #selector(handleBackButton)
            )
            navigationItem.leftBarButtonItem = backButton
        }
    }
    
    private func setupView() {
        view.backgroundColor = .systemBackground
        
        // Add settings view
        view.addSubview(settingsView)
        
        // Setup constraints
        NSLayoutConstraint.activate([
            settingsView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            settingsView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            settingsView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            settingsView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        // Configure delegate
        settingsView.delegate = self
    }
    
    // MARK: - Settings Management
    
    /// Loads and displays current settings state including offline mode
    /// Requirements addressed:
    /// - Performance Requirements: Offline operation support
    private func loadCurrentSettings() {
        // Check location authorization status
        let locationStatus = CLLocationManager().authorizationStatus
        isLocationEnabled = locationStatus == .authorizedAlways || locationStatus == .authorizedWhenInUse
        
        // Check notification authorization status
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                self?.isNotificationsEnabled = settings.authorizationStatus == .authorized
                self?.settingsView.updateNotificationSettings(enabled: self?.isNotificationsEnabled ?? false)
            }
        }
        
        // Update location services UI
        settingsView.updateLocationServices(enabled: isLocationEnabled)
        
        // Configure location tracking if enabled
        if isLocationEnabled {
            configureLocationTracking()
        }
    }
    
    /// Configures location tracking with 30-second update intervals
    /// Requirements addressed:
    /// - Real-time GPS tracking: Real-time GPS tracking with 30-second update intervals
    private func configureLocationTracking() {
        guard let vehicleId = UserDefaults.standard.string(forKey: "currentVehicleId") else {
            return
        }
        
        locationManager.startTracking(vehicleId: vehicleId)
    }
    
    /// Handles offline mode state and UI updates
    /// Requirements addressed:
    /// - Performance Requirements: Offline operation support
    private func handleOfflineMode() {
        // Update UI to show offline mode
        let offlineAlert = UIAlertController(
            title: "Offline Mode",
            message: "The app is currently in offline mode. Some features may be limited.",
            preferredStyle: .alert
        )
        
        offlineAlert.addAction(UIAlertAction(title: "OK", style: .default))
        present(offlineAlert, animated: true)
        
        // Sync offline notifications if available
        notificationManager.syncOfflineNotifications()
    }
    
    // MARK: - Action Handlers
    
    @objc private func handleBackButton() {
        navigationController?.popViewController(animated: true)
    }
}

// MARK: - SettingsViewDelegate

extension SettingsViewController: SettingsViewDelegate {
    
    /// Handles location services updates with offline support
    /// Requirements addressed:
    /// - Real-time GPS tracking: Real-time GPS tracking with 30-second update intervals
    /// - Performance Requirements: Offline operation support
    public func didUpdateLocationServices(_ enabled: Bool) {
        isLocationEnabled = enabled
        
        if enabled {
            configureLocationTracking()
        } else {
            locationManager.stopTracking()
        }
        
        // Persist setting
        UserDefaults.standard.set(enabled, forKey: "locationServicesEnabled")
    }
    
    /// Handles notification settings updates with offline support
    /// Requirements addressed:
    /// - Performance Requirements: Offline operation support
    public func didUpdateNotificationSettings(_ enabled: Bool) {
        isNotificationsEnabled = enabled
        
        if enabled {
            notificationManager.registerForNotifications { [weak self] result in
                switch result {
                case .success(let granted):
                    self?.isNotificationsEnabled = granted
                    DispatchQueue.main.async {
                        self?.settingsView.updateNotificationSettings(enabled: granted)
                    }
                case .failure(let error):
                    DispatchQueue.main.async {
                        self?.handleNotificationError(error)
                    }
                }
            }
        }
        
        // Persist setting
        UserDefaults.standard.set(enabled, forKey: "notificationsEnabled")
    }
    
    // MARK: - Error Handling
    
    private func handleNotificationError(_ error: Error) {
        let errorAlert = UIAlertController(
            title: "Notification Error",
            message: "Failed to configure notifications: \(error.localizedDescription)",
            preferredStyle: .alert
        )
        
        errorAlert.addAction(UIAlertAction(title: "OK", style: .default))
        present(errorAlert, animated: true)
    }
}