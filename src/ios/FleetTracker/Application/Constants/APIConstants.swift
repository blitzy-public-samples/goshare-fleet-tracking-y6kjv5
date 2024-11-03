//
// APIConstants.swift
// FleetTracker
//
// HUMAN TASKS:
// 1. Update baseURL value for each environment (development, staging, production)
// 2. Verify API version matches backend service version
// 3. Configure SSL certificate pinning if required
// 4. Update timeout values based on network performance testing

import Foundation // iOS 14.0+

/// Static structure containing all API-related constants for the Fleet Tracking System
/// Addresses requirements from Section 1.2 Scope/Integration Capabilities
public struct APIConstants {
    // MARK: - Base Configuration
    
    /// Base URL for the Fleet Tracking API
    /// Required for RESTful API communication with backend microservices
    public static let baseURL: String = "https://api.fleettracker.com"
    
    /// API version string for endpoint versioning
    /// Ensures compatibility with backend microservices
    public static let apiVersion: String = "v1"
    
    /// Default timeout interval for API requests in seconds
    /// Implements requirement for sub-second response times from Section 1.2 Performance Requirements
    public static let defaultTimeout: TimeInterval = 0.8
    
    /// Private initializer to prevent instantiation
    private init() {}
}

/// Nested structure containing API endpoint paths for different services
/// Implements requirement for RESTful API endpoints from Section 1.2 Integration Capabilities
public struct APIEndpoints {
    /// Authentication endpoint path
    public static let auth: String = "/auth"
    
    /// Location tracking endpoint path
    public static let location: String = "/location"
    
    /// Fleet management endpoint path
    public static let fleet: String = "/fleet"
    
    /// Route management endpoint path
    public static let route: String = "/route"
    
    /// Delivery management endpoint path
    public static let delivery: String = "/delivery"
    
    /// Analytics endpoint path
    public static let analytics: String = "/analytics"
    
    /// Private initializer to prevent instantiation
    private init() {}
}

/// Nested structure containing API header constants for secure communication
/// Implements requirement for security and encryption protocols from Section 1.2 Technical Implementation
public struct APIHeaders {
    /// Content type header for API requests
    public static let contentType: String = "application/json"
    
    /// Accept header for API responses
    public static let accept: String = "application/json"
    
    /// Authorization header key for secure API requests
    public static let authorization: String = "Authorization"
    
    /// Device identifier header for tracking and security
    public static let deviceId: String = "X-Device-ID"
    
    /// Private initializer to prevent instantiation
    private init() {}
}

/// Nested structure containing common API parameter keys for requests
/// Supports RESTful API communication requirements from Section 1.2 Integration Capabilities
public struct APIParameters {
    /// Latitude parameter key for location updates
    public static let latitude: String = "lat"
    
    /// Longitude parameter key for location updates
    public static let longitude: String = "lng"
    
    /// Timestamp parameter key for event tracking
    public static let timestamp: String = "timestamp"
    
    /// Vehicle identifier parameter key
    public static let vehicleId: String = "vehicleId"
    
    /// Route identifier parameter key
    public static let routeId: String = "routeId"
    
    /// Delivery identifier parameter key
    public static let deliveryId: String = "deliveryId"
    
    /// Private initializer to prevent instantiation
    private init() {}
}