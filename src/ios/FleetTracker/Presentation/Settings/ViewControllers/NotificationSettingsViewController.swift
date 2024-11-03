//
// NotificationSettingsViewController.swift
// FleetTracker
//
// Human Tasks:
// 1. Configure push notification certificates in Apple Developer Portal
// 2. Add push notification capability in Xcode project settings
// 3. Configure notification categories and actions in Info.plist
// 4. Set up notification service extension for rich notifications
// 5. Verify background modes are enabled for remote notifications

import UIKit          // iOS 14.0+
import UserNotifications  // iOS 14.0+

/// View controller managing notification settings and permissions for the Fleet Tracking application
/// with support for offline capabilities
/// Requirements addressed:
/// - Two-way communication system between system and users (1.2 Scope/Core Functionality)
/// - Mobile Applications: Part of the iOS driver application (1.1 System Overview/Mobile Applications)
/// - Offline operation support for notification handling (1.2 Scope/Performance Requirements)
@objc class NotificationSettingsViewController: UIViewController {
    
    // MARK: - Properties
    
    private let settingsView: SettingsView = {
        let view = SettingsView(frame: .zero)
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private let notificationManager: NotificationManager
    private let notificationCenter: UNUserNotificationCenter
    private var isNotificationsEnabled: Bool = false
    
    // MARK: - Initialization
    
    init() {
        self.notificationManager = NotificationManager.shared
        self.notificationCenter = UNUserNotificationCenter.current()
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        self.notificationManager = NotificationManager.shared
        self.notificationCenter = UNUserNotificationCenter.current()
        super.init(coder: coder)
    }
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        configureNavigationBar()
        checkNotificationStatus()
        settingsView.delegate = self
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        checkNotificationStatus()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
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
        
        // Setup accessibility
        setupAccessibility()
    }
    
    private func configureNavigationBar() {
        title = "Notification Settings"
        
        // Add refresh button
        let refreshButton = UIBarButtonItem(
            image: UIImage(systemName: "arrow.clockwise"),
            style: .plain,
            target: self,
            action: #selector(refreshSettings)
        )
        navigationItem.rightBarButtonItem = refreshButton
        
        // Add back button if needed
        if navigationController?.viewControllers.first != self {
            let backButton = UIBarButtonItem(
                image: UIImage(systemName: "chevron.left"),
                style: .plain,
                target: self,
                action: #selector(navigateBack)
            )
            navigationItem.leftBarButtonItem = backButton
        }
    }
    
    private func setupAccessibility() {
        view.accessibilityLabel = "Notification Settings Screen"
        view.accessibilityHint = "Configure notification preferences and permissions"
        
        navigationItem.rightBarButtonItem?.accessibilityLabel = "Refresh Settings"
        navigationItem.rightBarButtonItem?.accessibilityHint = "Check current notification status"
    }
    
    // MARK: - Notification Management
    
    /// Checks and updates the current notification permission status
    /// Requirements addressed:
    /// - Two-way communication system between system and users
    private func checkNotificationStatus() {
        settingsView.loadingView.show()
        settingsView.loadingView.updateMessage("Checking notification status...")
        
        notificationCenter.getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                guard let self = self else { return }
                
                let isAuthorized = settings.authorizationStatus == .authorized
                self.isNotificationsEnabled = isAuthorized
                
                // Update UI based on current status
                self.settingsView.updateNotificationSettings(enabled: isAuthorized)
                
                // Handle offline status
                if !isAuthorized && self.notificationManager.isRegisteredForNotifications {
                    self.handleOfflineNotificationStatus()
                }
                
                self.settingsView.loadingView.hide()
            }
        }
    }
    
    /// Handles the notification permission toggle action
    /// - Parameter enabled: Whether notifications should be enabled
    /// Requirements addressed:
    /// - Two-way communication system
    /// - Offline operation support
    private func handleNotificationToggle(enabled: Bool) {
        if enabled {
            settingsView.loadingView.show()
            settingsView.loadingView.updateMessage("Requesting notification permissions...")
            
            notificationManager.registerForNotifications { [weak self] result in
                DispatchQueue.main.async {
                    guard let self = self else { return }
                    
                    switch result {
                    case .success(let granted):
                        self.isNotificationsEnabled = granted
                        self.settingsView.updateNotificationSettings(enabled: granted)
                        
                        // Update accessibility state
                        self.view.accessibilityValue = granted ? "Notifications enabled" : "Notifications disabled"
                        
                    case .failure(let error):
                        // Handle error and offline state
                        self.handleNotificationError(error)
                    }
                    
                    self.settingsView.loadingView.hide()
                }
            }
        } else {
            // Disable notifications
            isNotificationsEnabled = false
            settingsView.updateNotificationSettings(enabled: false)
            
            // Update accessibility state
            view.accessibilityValue = "Notifications disabled"
        }
    }
    
    /// Handles errors during notification operations
    /// - Parameter error: The error that occurred
    private func handleNotificationError(_ error: Error) {
        let alert = UIAlertController(
            title: "Notification Error",
            message: "Failed to update notification settings. The changes will be synced when connectivity is restored.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    /// Handles offline notification status
    private func handleOfflineNotificationStatus() {
        let alert = UIAlertController(
            title: "Offline Mode",
            message: "Notification settings will be synchronized when connection is restored.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    // MARK: - Navigation
    
    @objc private func navigateBack() {
        navigationController?.popViewController(animated: true)
    }
    
    @objc private func refreshSettings() {
        checkNotificationStatus()
    }
}

// MARK: - SettingsViewDelegate

extension NotificationSettingsViewController: SettingsViewDelegate {
    
    func didUpdateLocationServices(_ enabled: Bool) {
        // Not used in notification settings
    }
    
    func didUpdateNotificationSettings(_ enabled: Bool) {
        handleNotificationToggle(enabled: enabled)
    }
}