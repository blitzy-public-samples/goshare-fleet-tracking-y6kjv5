// React Native version: ^0.72.0
package com.fleettracker;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.util.Log;

import com.fleettracker.modules.LocationModule;
import com.fleettracker.modules.OfflineStorageModule;

/*
HUMAN TASKS:
1. Verify all required permissions are added to AndroidManifest.xml
2. Configure Google Play Services in build.gradle
3. Test permission handling on different Android versions (especially Android 10+)
4. Implement crash reporting service integration
5. Test offline storage behavior with different data scenarios
*/

public class MainActivity extends ReactActivity {
    // Requirement: GPS and sensor integration for accurate location tracking
    private static final int PERMISSION_REQUEST_CODE = 1;
    private static final String TAG = "MainActivity";
    private static final String[] REQUIRED_PERMISSIONS = {
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.WRITE_EXTERNAL_STORAGE
    };

    private LocationModule locationModule;
    private OfflineStorageModule offlineStorageModule;

    /**
     * Default constructor for MainActivity
     */
    public MainActivity() {
        super();
        // Constructor initialization is handled by parent class
    }

    /**
     * Returns the name of the main component registered from JavaScript
     * Requirement: Mobile Applications - React Native driver applications
     */
    @Override
    protected String getMainComponentName() {
        return "FleetTracker";
    }

    /**
     * Creates the React Native activity delegate with new architecture support
     * Requirement: Mobile Applications - React Native driver applications
     */
    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            // Enable new architecture if configured
            DefaultNewArchitectureEntryPoint.getFabricEnabled()
        );
    }

    /**
     * Activity lifecycle method called when activity is created
     * Handles initialization of location tracking and offline storage
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Initialize modules
        try {
            locationModule = new LocationModule(getReactApplicationContext());
            offlineStorageModule = new OfflineStorageModule(getReactApplicationContext());
            
            // Check and request required permissions
            checkAndRequestPermissions();
            
            // Setup error handling
            setupErrorHandling();
            
        } catch (Exception e) {
            Log.e(TAG, "Error initializing modules: " + e.getMessage());
        }
    }

    /**
     * Handles permission request results for location and storage access
     * Requirements: GPS integration and offline storage support
     */
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allPermissionsGranted = true;
            
            // Check if all permissions were granted
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allPermissionsGranted = false;
                    break;
                }
            }
            
            if (allPermissionsGranted) {
                // Initialize location tracking and offline storage when permissions are granted
                initializeServices();
            } else {
                // Handle permission denial
                Log.w(TAG, "Required permissions were not granted");
                // Could show a dialog explaining why permissions are needed
            }
        }
    }

    /**
     * Checks and requests required permissions for location and storage
     */
    private void checkAndRequestPermissions() {
        boolean allPermissionsGranted = true;
        
        for (String permission : REQUIRED_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, permission) 
                != PackageManager.PERMISSION_GRANTED) {
                allPermissionsGranted = false;
                break;
            }
        }
        
        if (!allPermissionsGranted) {
            ActivityCompat.requestPermissions(
                this,
                REQUIRED_PERMISSIONS,
                PERMISSION_REQUEST_CODE
            );
        } else {
            // Initialize services if permissions are already granted
            initializeServices();
        }
    }

    /**
     * Initializes location tracking and offline storage services
     * Requirements: GPS integration and offline operation support
     */
    private void initializeServices() {
        try {
            // Start location tracking with 30-second intervals
            locationModule.startLocationTracking(new com.facebook.react.bridge.Callback() {
                @Override
                public void invoke(Object... args) {
                    Log.d(TAG, "Location tracking initialized successfully");
                }
            });
            
            Log.i(TAG, "Services initialized successfully");
            
        } catch (Exception e) {
            Log.e(TAG, "Error initializing services: " + e.getMessage());
        }
    }

    /**
     * Sets up error handling and crash reporting
     */
    private void setupErrorHandling() {
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Uncaught exception: " + throwable.getMessage());
            // Log the error and handle crash reporting
            // This would typically integrate with a crash reporting service
        });
    }

    /**
     * Cleanup method called when activity is destroyed
     */
    @Override
    protected void onDestroy() {
        try {
            // Stop location tracking when activity is destroyed
            if (locationModule != null) {
                locationModule.stopLocationTracking(new com.facebook.react.bridge.Callback() {
                    @Override
                    public void invoke(Object... args) {
                        Log.d(TAG, "Location tracking stopped successfully");
                    }
                });
            }
        } catch (Exception e) {
            Log.e(TAG, "Error during cleanup: " + e.getMessage());
        }
        super.onDestroy();
    }
}