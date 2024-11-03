//
// Date+Extensions.swift
// FleetTracker
//
// Human Tasks:
// 1. Verify Foundation framework is properly linked in the Xcode project
// 2. Ensure minimum iOS deployment target is set to iOS 14.0 or higher

import Foundation  // iOS 14.0+

/// Extension on Date class providing fleet tracking specific date utilities
/// for consistent date handling across the application
extension Date {
    
    // MARK: - ISO8601 Formatting
    
    /// Converts date to ISO8601 formatted string for API communication and data persistence
    /// Requirement: Analytics and reporting - ISO8601 compliance for data consistency
    public func toISO8601String() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)!
        return formatter.string(from: self)
    }
    
    /// Creates date from ISO8601 formatted string received from API or stored data
    /// Requirement: Analytics and reporting - ISO8601 compliance for data consistency
    public static func fromISO8601String(_ dateString: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)!
        return formatter.date(from: dateString)
    }
    
    // MARK: - Tracking Interval Validation
    
    /// Checks if date is within the valid tracking interval from current time
    /// Requirement: Real-time GPS tracking - Support for 30-second update intervals
    public func isWithinTrackingInterval() -> Bool {
        let currentDate = Date()
        let interval = abs(timeIntervalSince(currentDate))
        return interval <= LocationConstants.updateInterval
    }
    
    /// Checks if date is considered stale based on system-defined threshold
    /// Requirement: Offline operation support - Stale data detection
    public func isStale() -> Bool {
        let currentDate = Date()
        let interval = abs(timeIntervalSince(currentDate))
        return interval > LocationConstants.staleLocationThreshold
    }
    
    // MARK: - UI Formatting
    
    /// Formats date for delivery display in the user interface
    /// Requirement: Analytics and reporting - Consistent date formatting for user interface
    public func formattedDeliveryTime() -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        formatter.locale = Locale.current
        formatter.timeZone = TimeZone.current
        return formatter.string(from: self)
    }
}