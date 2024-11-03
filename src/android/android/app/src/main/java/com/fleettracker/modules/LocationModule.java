// React Native version: ^0.72.0
package com.fleettracker.modules;

import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import android.location.Location;
import android.location.LocationManager;
import android.location.LocationListener;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

/*
HUMAN TASKS:
1. Ensure ACCESS_FINE_LOCATION permission is added to AndroidManifest.xml
2. Configure Google Play Services location settings in build.gradle
3. Verify minimum Android API level 21+ in build.gradle
4. Test location permissions on different Android versions
*/

public class LocationModule extends ReactContextBaseJavaModule implements LocationListener {
    private final ReactApplicationContext reactContext;
    private LocationManager locationManager;
    private boolean isTracking = false;
    
    // Requirement 1.2: Real-time GPS tracking with 30-second update intervals
    private static final long UPDATE_INTERVAL = 30000; // 30 seconds in milliseconds
    private static final float MIN_DISTANCE = 10f; // 10 meters minimum distance change
    private static final String LOCATION_EVENT = "onLocationUpdate";
    private static final String ERROR_EVENT = "onLocationError";

    public LocationModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.locationManager = (LocationManager) reactContext.getSystemService(reactContext.LOCATION_SERVICE);
    }

    @Override
    public String getName() {
        return "LocationModule";
    }

    // Requirement: GPS and sensor integration for accurate location tracking
    @ReactMethod
    public void startLocationTracking(Promise promise) {
        try {
            // Check for location permission
            if (reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) 
                != PackageManager.PERMISSION_GRANTED) {
                promise.reject("PERMISSION_DENIED", "Location permission not granted");
                return;
            }

            // Start location updates if not already tracking
            if (!isTracking) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    UPDATE_INTERVAL,
                    MIN_DISTANCE,
                    this
                );
                isTracking = true;
                promise.resolve("Location tracking started");
            } else {
                promise.resolve("Location tracking already active");
            }
        } catch (SecurityException e) {
            promise.reject("SECURITY_EXCEPTION", "Failed to start location tracking: " + e.getMessage());
        } catch (Exception e) {
            promise.reject("ERROR", "Unexpected error starting location tracking: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopLocationTracking(Promise promise) {
        try {
            if (isTracking) {
                locationManager.removeUpdates(this);
                isTracking = false;
                promise.resolve("Location tracking stopped");
            } else {
                promise.resolve("Location tracking already inactive");
            }
        } catch (SecurityException e) {
            promise.reject("SECURITY_EXCEPTION", "Failed to stop location tracking: " + e.getMessage());
        } catch (Exception e) {
            promise.reject("ERROR", "Unexpected error stopping location tracking: " + e.getMessage());
        }
    }

    // Requirement: Real-time GPS tracking with offline support
    @Override
    public void onLocationChanged(Location location) {
        try {
            WritableMap locationData = Arguments.createMap();
            
            // Core location data
            locationData.putDouble("latitude", location.getLatitude());
            locationData.putDouble("longitude", location.getLongitude());
            locationData.putDouble("timestamp", location.getTime());
            
            // Additional accuracy and movement data
            locationData.putDouble("accuracy", location.getAccuracy());
            locationData.putDouble("speed", location.getSpeed());
            locationData.putDouble("bearing", location.getBearing());
            
            // Additional data for offline support
            locationData.putBoolean("hasAltitude", location.hasAltitude());
            if (location.hasAltitude()) {
                locationData.putDouble("altitude", location.getAltitude());
            }
            
            // Emit location update event to React Native
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(LOCATION_EVENT, locationData);
                
        } catch (Exception e) {
            WritableMap errorData = Arguments.createMap();
            errorData.putString("error", e.getMessage());
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(ERROR_EVENT, errorData);
        }
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {
        // Required implementation for LocationListener interface
    }

    @Override
    public void onProviderEnabled(String provider) {
        // Required implementation for LocationListener interface
    }

    @Override
    public void onProviderDisabled(String provider) {
        // Required implementation for LocationListener interface
        WritableMap errorData = Arguments.createMap();
        errorData.putString("error", "Location provider disabled");
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(ERROR_EVENT, errorData);
    }
}