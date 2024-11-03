//
// NotificationManager.swift
// FleetTracker
//
// Human Tasks:
// 1. Configure push notification certificates in Apple Developer Portal
// 2. Add push notification capability in Xcode project settings
// 3. Configure notification categories and actions in Info.plist
// 4. Set up notification service extension for rich notifications
// 5. Verify background modes are enabled for remote notifications

import Foundation      // iOS 14.0+
import UserNotifications  // iOS 14.0+
import CoreLocation   // iOS 14.0+

/// Manages local and push notifications for the Fleet Tracking System with support for
/// delivery updates, location alerts, and offline notification queuing
/// Requirements addressed:
/// - Two-way communication system between system and users
/// - Real-time data synchronization for notification delivery
/// - Offline operation support for notification queuing
/// - Real-time GPS tracking with 30-second update intervals
@objc public class NotificationManager: NSObject {
    
    // MARK: - Properties
    
    /// Shared instance for singleton access
    @objc public static let shared = NotificationManager()
    
    /// User notification center instance
    private let notificationCenter: UNUserNotificationCenter
    
    /// Cache for storing offline notifications
    private let offlineNotificationCache: NSCache<NSString, UNNotificationRequest>
    
    /// Flag indicating if device is registered for notifications
    private(set) var isRegisteredForNotifications: Bool = false
    
    /// Delegate for handling location-based notifications
    public weak var locationDelegate: LocationUpdateDelegate?
    
    /// Delegate for handling offline storage operations
    public weak var offlineDelegate: OfflineStorageDelegate?
    
    /// Counter for retry attempts
    private var retryCount: Int = 0
    
    /// Interval for syncing offline notifications
    private var syncInterval: TimeInterval
    
    // MARK: - Initialization
    
    private override init() {
        self.notificationCenter = UNUserNotificationCenter.current()
        self.offlineNotificationCache = NSCache<NSString, UNNotificationRequest>()
        self.syncInterval = AppConstants.offlineSyncInterval
        
        super.init()
        
        // Configure cache limits
        self.offlineNotificationCache.countLimit = 1000
        self.offlineNotificationCache.totalCostLimit = 50 * 1024 * 1024 // 50MB
        
        // Start offline sync timer
        self.startOfflineSyncTimer()
    }
    
    // MARK: - Public Methods
    
    /// Registers the device for push notifications
    /// - Parameter completion: Callback with registration result
    /// Requirement: Two-way communication system
    @objc public func registerForNotifications(completion: @escaping (Result<Bool, Error>) -> Void) {
        let options: UNAuthorizationOptions = [.alert, .sound, .badge]
        
        notificationCenter.requestAuthorization(options: options) { [weak self] granted, error in
            guard let self = self else { return }
            
            if let error = error {
                completion(.failure(error))
                return
            }
            
            self.isRegisteredForNotifications = granted
            
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                completion(.success(true))
            } else {
                completion(.success(false))
            }
        }
    }
    
    /// Schedules a notification for delivery updates with offline support
    /// - Parameters:
    ///   - deliveryId: Unique identifier for the delivery
    ///   - message: Notification message
    ///   - scheduledTime: Time to deliver the notification
    /// Requirements addressed:
    /// - Real-time data synchronization
    /// - Offline operation support
    @objc public func scheduleDeliveryNotification(deliveryId: String, message: String, scheduledTime: Date) {
        let content = UNMutableNotificationContent()
        content.title = "Delivery Update"
        content.body = message
        content.sound = .default
        content.userInfo = ["deliveryId": deliveryId]
        
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: scheduledTime)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        
        let request = UNNotificationRequest(identifier: "delivery_\(deliveryId)", content: content, trigger: trigger)
        
        notificationCenter.add(request) { [weak self] error in
            guard let self = self else { return }
            
            if let error = error {
                // Cache notification for offline handling
                self.offlineNotificationCache.setObject(request, forKey: request.identifier as NSString)
                self.offlineDelegate?.didFailToSaveOffline(error)
            }
        }
    }
    
    /// Schedules a notification for geofence events with 30-second update interval
    /// - Parameters:
    ///   - region: The geofence region
    ///   - message: Notification message
    /// Requirement: Real-time GPS tracking with 30-second update intervals
    @objc public func scheduleGeofenceNotification(region: CLRegion, message: String) {
        let content = UNMutableNotificationContent()
        content.title = "Location Alert"
        content.body = message
        content.sound = .default
        content.userInfo = ["regionId": region.identifier]
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 30, repeats: true)
        let request = UNNotificationRequest(identifier: "geofence_\(region.identifier)", content: content, trigger: trigger)
        
        notificationCenter.add(request) { [weak self] error in
            if let error = error {
                self?.locationDelegate?.didFailWithError(error)
            } else {
                if region.state == .inside {
                    self?.locationDelegate?.didEnterRegion?(region)
                } else {
                    self?.locationDelegate?.didExitRegion?(region)
                }
            }
        }
    }
    
    /// Synchronizes cached offline notifications
    /// Requirement: Offline operation support
    @objc public func syncOfflineNotifications() {
        guard !offlineNotificationCache.isEmpty() else { return }
        
        let cachedRequests = getAllCachedRequests()
        var syncResults: [String: Any] = [
            SyncResultKeys.totalSynced: cachedRequests.count,
            SyncResultKeys.syncStartTime: Date()
        ]
        
        var successCount = 0
        var failureCount = 0
        
        let group = DispatchGroup()
        
        for request in cachedRequests {
            group.enter()
            
            notificationCenter.add(request) { error in
                if let error = error {
                    failureCount += 1
                    if self.retryCount < AppConstants.maxRetryAttempts {
                        // Keep in cache for retry
                        self.retryCount += 1
                    } else {
                        // Remove after max retries
                        self.offlineNotificationCache.removeObject(forKey: request.identifier as NSString)
                    }
                } else {
                    successCount += 1
                    self.offlineNotificationCache.removeObject(forKey: request.identifier as NSString)
                }
                group.leave()
            }
        }
        
        group.notify(queue: .main) { [weak self] in
            guard let self = self else { return }
            
            syncResults[SyncResultKeys.successCount] = successCount
            syncResults[SyncResultKeys.failureCount] = failureCount
            syncResults[SyncResultKeys.syncEndTime] = Date()
            
            self.offlineDelegate?.didSyncOfflineData(syncResults)
            
            // Schedule next sync if needed
            if failureCount > 0 && self.retryCount < AppConstants.maxRetryAttempts {
                self.scheduleNextSync()
            }
        }
    }
    
    // MARK: - Private Methods
    
    private func startOfflineSyncTimer() {
        Timer.scheduledTimer(withTimeInterval: syncInterval, repeats: true) { [weak self] _ in
            self?.syncOfflineNotifications()
        }
    }
    
    private func scheduleNextSync() {
        let nextInterval = syncInterval * Double(retryCount + 1)
        Timer.scheduledTimer(withTimeInterval: nextInterval, repeats: false) { [weak self] _ in
            self?.syncOfflineNotifications()
        }
    }
    
    private func getAllCachedRequests() -> [UNNotificationRequest] {
        var requests: [UNNotificationRequest] = []
        let enumerator = offlineNotificationCache.enumerator()
        
        while let request = enumerator?.nextObject() as? UNNotificationRequest {
            requests.append(request)
        }
        
        return requests
    }
}

// MARK: - NotificationManagerDelegate Protocol

/// Protocol for handling notification events and failures
@objc public protocol NotificationManagerDelegate: AnyObject {
    
    /// Called when a notification is received
    /// - Parameter notification: The received notification
    @objc func didReceiveNotification(_ notification: UNNotification)
    
    /// Called when notification scheduling fails
    /// - Parameter error: The error that occurred
    @objc optional func didFailToScheduleNotification(_ error: Error)
}