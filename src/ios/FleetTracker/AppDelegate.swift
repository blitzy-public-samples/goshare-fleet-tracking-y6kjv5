//
// AppDelegate.swift
// FleetTracker
//
// Human Tasks:
// 1. Configure push notification certificates in Apple Developer Portal
// 2. Add push notification capability in Xcode project settings
// 3. Configure background fetch and location updates in Capabilities
// 4. Add required location usage descriptions in Info.plist:
//    - NSLocationAlwaysAndWhenInUseUsageDescription
//    - NSLocationWhenInUseUsageDescription
// 5. Configure background modes in Info.plist:
//    - location
//    - fetch
//    - remote-notification

import UIKit                // iOS 14.0+
import UserNotifications    // iOS 14.0+
import BackgroundTasks      // iOS 14.0+

/// Main application delegate implementing core application lifecycle and initialization
/// with support for offline operation and 30-second location updates
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    // MARK: - Properties
    
    /// Main application window
    var window: UIWindow?
    
    // Background task identifiers
    private let locationUpdateTaskId = "com.fleettracker.location.update"
    private let notificationSyncTaskId = "com.fleettracker.notification.sync"
    
    // MARK: - Application Lifecycle
    
    /// Called when application launches, initializes core services with offline support
    /// Requirements addressed:
    /// - Mobile Applications: iOS driver application with offline-first architecture
    /// - Real-time GPS tracking: Initialize location services with 30-second updates
    /// - Two-way communication system: Setup push notifications with offline support
    /// - Offline operation support: Configure background tasks and data handling
    func application(_ application: UIApplication, 
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Initialize location services with 30-second update interval
        let locationManager = LocationManager.shared()
        locationManager.startTracking(vehicleId: UIDevice.current.identifierForVendor?.uuidString ?? "")
        
        // Setup notification handling with offline support
        NotificationManager.shared.registerForNotifications { result in
            switch result {
            case .success:
                print("Successfully registered for notifications")
            case .failure(let error):
                print("Failed to register for notifications: \(error.localizedDescription)")
            }
        }
        
        // Register background tasks for offline operation
        registerBackgroundTasks()
        
        return true
    }
    
    /// Configure UI scenes for the application
    func application(_ application: UIApplication,
                    configurationForConnecting connectingSceneSession: UISceneSession,
                    options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        
        let configuration = UISceneConfiguration(name: "Default Configuration",
                                               sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
    
    /// Handle successful push notification registration
    /// Requirement: Two-way communication system with offline support
    func application(_ application: UIApplication,
                    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Convert token to string
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        
        // Store token for push notifications
        UserDefaults.standard.set(token, forKey: "DeviceToken")
        
        // Update NotificationManager with token
        NotificationManager.shared.syncOfflineNotifications()
    }
    
    /// Handle failed push notification registration
    func application(_ application: UIApplication,
                    didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error.localizedDescription)")
        
        // Update NotificationManager error state
        if LocationManager.shared().isOfflineMode {
            NotificationManager.shared.syncOfflineNotifications()
        }
    }
    
    /// Handle application entering background state with offline support
    /// Requirements addressed:
    /// - Offline operation support: Configure background tasks
    /// - Real-time GPS tracking: Ensure location tracking continues
    func applicationDidEnterBackground(_ application: UIApplication) {
        // Schedule background tasks for location updates
        scheduleLocationUpdateTask()
        
        // Save application state
        saveApplicationState()
        
        // Prepare for offline operation
        if !LocationManager.shared().isOfflineMode {
            LocationManager.shared().startTracking(
                vehicleId: UIDevice.current.identifierForVendor?.uuidString ?? ""
            )
        }
        
        // Ensure location tracking continues in background
        let backgroundTask = application.beginBackgroundTask {
            application.endBackgroundTask(UIBackgroundTaskIdentifier.invalid)
        }
        
        // Schedule notification sync tasks
        scheduleNotificationSyncTask()
        
        if backgroundTask != .invalid {
            application.endBackgroundTask(backgroundTask)
        }
    }
    
    // MARK: - Private Methods
    
    /// Register background tasks for offline operation
    private func registerBackgroundTasks() {
        // Register location update task
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: locationUpdateTaskId,
            using: nil
        ) { task in
            self.handleLocationUpdateTask(task as! BGProcessingTask)
        }
        
        // Register notification sync task
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: notificationSyncTaskId,
            using: nil
        ) { task in
            self.handleNotificationSyncTask(task as! BGProcessingTask)
        }
    }
    
    /// Schedule background location update task
    private func scheduleLocationUpdateTask() {
        let request = BGProcessingTaskRequest(identifier: locationUpdateTaskId)
        request.requiresNetworkConnectivity = false
        request.requiresExternalPower = false
        
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("Failed to schedule location update task: \(error.localizedDescription)")
        }
    }
    
    /// Schedule notification sync task
    private func scheduleNotificationSyncTask() {
        let request = BGProcessingTaskRequest(identifier: notificationSyncTaskId)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false
        
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("Failed to schedule notification sync task: \(error.localizedDescription)")
        }
    }
    
    /// Handle background location update task
    private func handleLocationUpdateTask(_ task: BGProcessingTask) {
        // Create task expiration handler
        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }
        
        // Perform location update
        let locationManager = LocationManager.shared()
        if locationManager.isTracking {
            locationManager.startTracking(
                vehicleId: UIDevice.current.identifierForVendor?.uuidString ?? ""
            )
        }
        
        // Schedule next update
        scheduleLocationUpdateTask()
        
        // Mark task as completed
        task.setTaskCompleted(success: true)
    }
    
    /// Handle notification sync task
    private func handleNotificationSyncTask(_ task: BGProcessingTask) {
        // Create task expiration handler
        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }
        
        // Sync notifications
        NotificationManager.shared.syncOfflineNotifications()
        
        // Schedule next sync
        scheduleNotificationSyncTask()
        
        // Mark task as completed
        task.setTaskCompleted(success: true)
    }
    
    /// Save application state for offline support
    private func saveApplicationState() {
        // Save current tracking state
        UserDefaults.standard.set(LocationManager.shared().isTracking, forKey: "IsTracking")
        UserDefaults.standard.set(LocationManager.shared().isOfflineMode, forKey: "IsOfflineMode")
        
        // Synchronize user defaults
        UserDefaults.standard.synchronize()
    }
}