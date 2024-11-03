//
// LocationSettingsViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify Info.plist contains required location usage descriptions:
//    - NSLocationAlwaysAndWhenInUseUsageDescription
//    - NSLocationWhenInUseUsageDescription
// 2. Enable background location updates in project capabilities
// 3. Test location permission flows on physical devices
// 4. Verify offline mode indicator visibility in different network conditions

import UIKit      // iOS 14.0+
import CoreLocation  // iOS 14.0+

/// View controller for managing location tracking settings and permissions
/// Addresses requirements:
/// - Real-time GPS tracking with 30-second update intervals
/// - Performance Requirements: 30-second maximum data latency
/// - Offline operation support
@objcMembers
class LocationSettingsViewController: UIViewController {
    
    // MARK: - UI Components
    
    private let locationPermissionButton: CustomButton = {
        let button = CustomButton()
        button.translatesAutoresizingMaskIntoConstraints = false
        button.buttonColor = .systemBlue
        button.setTitle("Request Location Permission", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 16, weight: .medium)
        return button
    }()
    
    private let backgroundTrackingButton: CustomButton = {
        let button = CustomButton()
        button.translatesAutoresizingMaskIntoConstraints = false
        button.buttonColor = .systemGreen
        button.setTitle("Enable Background Tracking", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 16, weight: .medium)
        return button
    }()
    
    private let trackingEnabledSwitch: UISwitch = {
        let toggle = UISwitch()
        toggle.translatesAutoresizingMaskIntoConstraints = false
        toggle.onTintColor = .systemBlue
        return toggle
    }()
    
    private let updateIntervalLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 16)
        label.textColor = .label
        label.text = "Update Interval: \(Int(LocationConstants.updateInterval))s"
        return label
    }()
    
    private let accuracyLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 16)
        label.textColor = .label
        label.text = "Location Accuracy: Best"
        return label
    }()
    
    private let offlineModeLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 16)
        label.textColor = .systemOrange
        label.text = "Offline Mode: Disabled"
        return label
    }()
    
    // MARK: - Properties
    
    private var isTrackingEnabled: Bool = false {
        didSet {
            updateTrackingState()
        }
    }
    
    private let locationManager = LocationManager.shared()
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        configureActions()
        updateLocationPermissionStatus()
        
        // Register for location authorization notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAuthorizationChange),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "Location Settings"
        
        // Add UI components
        view.addSubview(locationPermissionButton)
        view.addSubview(backgroundTrackingButton)
        view.addSubview(trackingEnabledSwitch)
        view.addSubview(updateIntervalLabel)
        view.addSubview(accuracyLabel)
        view.addSubview(offlineModeLabel)
        
        // Configure constraints
        NSLayoutConstraint.activate([
            locationPermissionButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            locationPermissionButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            locationPermissionButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            locationPermissionButton.heightAnchor.constraint(equalToConstant: 44),
            
            backgroundTrackingButton.topAnchor.constraint(equalTo: locationPermissionButton.bottomAnchor, constant: 20),
            backgroundTrackingButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            backgroundTrackingButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            backgroundTrackingButton.heightAnchor.constraint(equalToConstant: 44),
            
            trackingEnabledSwitch.topAnchor.constraint(equalTo: backgroundTrackingButton.bottomAnchor, constant: 30),
            trackingEnabledSwitch.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            
            updateIntervalLabel.centerYAnchor.constraint(equalTo: trackingEnabledSwitch.centerYAnchor),
            updateIntervalLabel.leadingAnchor.constraint(equalTo: trackingEnabledSwitch.trailingAnchor, constant: 20),
            updateIntervalLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            
            accuracyLabel.topAnchor.constraint(equalTo: updateIntervalLabel.bottomAnchor, constant: 20),
            accuracyLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            accuracyLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            
            offlineModeLabel.topAnchor.constraint(equalTo: accuracyLabel.bottomAnchor, constant: 20),
            offlineModeLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            offlineModeLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20)
        ])
    }
    
    private func configureActions() {
        locationPermissionButton.addTarget(
            self,
            action: #selector(handleLocationPermissionRequest),
            for: .touchUpInside
        )
        
        backgroundTrackingButton.addTarget(
            self,
            action: #selector(handleBackgroundTrackingRequest),
            for: .touchUpInside
        )
        
        trackingEnabledSwitch.addTarget(
            self,
            action: #selector(handleTrackingToggle),
            for: .valueChanged
        )
    }
    
    // MARK: - Location Permission Handling
    
    private func updateLocationPermissionStatus() {
        let status = CLLocationManager().authorizationStatus
        
        switch status {
        case .authorizedAlways:
            locationPermissionButton.setTitle("Location Access: Always", for: .normal)
            locationPermissionButton.buttonColor = .systemGreen
            locationPermissionButton.isEnabled = false
            backgroundTrackingButton.isEnabled = true
            trackingEnabledSwitch.isEnabled = true
            
        case .authorizedWhenInUse:
            locationPermissionButton.setTitle("Request Always Access", for: .normal)
            locationPermissionButton.buttonColor = .systemBlue
            locationPermissionButton.isEnabled = true
            backgroundTrackingButton.isEnabled = false
            trackingEnabledSwitch.isEnabled = true
            
        case .denied, .restricted:
            locationPermissionButton.setTitle("Location Access Denied", for: .normal)
            locationPermissionButton.buttonColor = .systemRed
            locationPermissionButton.isEnabled = true
            backgroundTrackingButton.isEnabled = false
            trackingEnabledSwitch.isEnabled = false
            isTrackingEnabled = false
            
        case .notDetermined:
            locationPermissionButton.setTitle("Request Location Access", for: .normal)
            locationPermissionButton.buttonColor = .systemBlue
            locationPermissionButton.isEnabled = true
            backgroundTrackingButton.isEnabled = false
            trackingEnabledSwitch.isEnabled = false
            
        @unknown default:
            break
        }
        
        // Update offline mode status
        updateOfflineModeStatus()
    }
    
    @objc private func handleLocationPermissionRequest() {
        let status = CLLocationManager().authorizationStatus
        
        switch status {
        case .notDetermined:
            CLLocationManager().requestAlwaysAuthorization()
            
        case .authorizedWhenInUse:
            CLLocationManager().requestAlwaysAuthorization()
            
        case .denied, .restricted:
            // Show settings alert
            let alert = UIAlertController(
                title: "Location Access Required",
                message: "Please enable location access in Settings to use location tracking features.",
                preferredStyle: .alert
            )
            
            alert.addAction(UIAlertAction(title: "Settings", style: .default) { _ in
                if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(settingsURL)
                }
            })
            
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            
            present(alert, animated: true)
            
        default:
            break
        }
    }
    
    @objc private func handleBackgroundTrackingRequest() {
        // Request background capability if needed
        if CLLocationManager().authorizationStatus == .authorizedAlways {
            // Enable background updates
            locationManager.startTracking(vehicleId: "current_vehicle")
            backgroundTrackingButton.setTitle("Background Tracking Enabled", for: .normal)
            backgroundTrackingButton.isEnabled = false
        }
    }
    
    @objc private func handleTrackingToggle(_ sender: UISwitch) {
        isTrackingEnabled = sender.isOn
    }
    
    private func updateTrackingState() {
        if isTrackingEnabled {
            // Start location tracking with 30-second intervals
            locationManager.startTracking(vehicleId: "current_vehicle")
            
            // Show confirmation of update interval
            let alert = UIAlertController(
                title: "Location Tracking Enabled",
                message: "Location updates will occur every \(Int(LocationConstants.updateInterval)) seconds",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            present(alert, animated: true)
            
        } else {
            locationManager.stopTracking()
        }
        
        // Update UI state
        backgroundTrackingButton.isEnabled = isTrackingEnabled
        updateOfflineModeStatus()
    }
    
    // MARK: - Offline Mode Handling
    
    private func updateOfflineModeStatus() {
        if locationManager.isOfflineMode {
            offlineModeLabel.text = "Offline Mode: Enabled (Data will sync when online)"
            offlineModeLabel.textColor = .systemOrange
        } else {
            offlineModeLabel.text = "Offline Mode: Disabled"
            offlineModeLabel.textColor = .label
        }
    }
    
    // MARK: - Notification Handling
    
    @objc private func handleAuthorizationChange() {
        updateLocationPermissionStatus()
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationSettingsViewController: CLLocationManagerDelegate {
    
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        updateLocationPermissionStatus()
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Handle location errors
        let alert = UIAlertController(
            title: "Location Error",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
        
        // Update offline mode status if needed
        updateOfflineModeStatus()
    }
}