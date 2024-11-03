// React Native version: 0.72.0
package com.fleettracker.modules;

import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.content.ContentValues;
import android.database.Cursor;
import android.content.Context;
import android.util.Log;

/*
HUMAN TASKS:
1. Verify SQLite database permissions in AndroidManifest.xml
2. Configure database backup strategy
3. Test database migration scenarios
4. Monitor database size and implement cleanup strategy if needed
5. Implement data recovery procedures for corruption scenarios
*/

public class OfflineStorageModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private SQLiteDatabase database;
    private static final String TAG = "OfflineStorageModule";

    // Database configuration
    private static final String DATABASE_NAME = "fleet_tracker.db";
    private static final int DATABASE_VERSION = 1;
    private static final int MAX_QUEUE_SIZE = 1000;

    // Table names
    private static final String TABLE_DELIVERIES = "deliveries";
    private static final String TABLE_LOCATIONS = "locations";

    // Common columns
    private static final String COLUMN_ID = "id";
    private static final String COLUMN_TIMESTAMP = "timestamp";
    private static final String COLUMN_SYNC_STATUS = "sync_status";

    // Location specific columns
    private static final String COLUMN_LATITUDE = "latitude";
    private static final String COLUMN_LONGITUDE = "longitude";
    private static final String COLUMN_ACCURACY = "accuracy";

    // Delivery specific columns
    private static final String COLUMN_DATA = "data";

    public OfflineStorageModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        initializeDatabase();
        setupLocationListener();
    }

    @Override
    public String getName() {
        return "OfflineStorage";
    }

    // Requirement: Offline-first architecture implementation
    private void initializeDatabase() {
        try {
            DatabaseHelper dbHelper = new DatabaseHelper(reactContext);
            database = dbHelper.getWritableDatabase();
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize database: " + e.getMessage());
        }
    }

    // Requirement: Support for offline operation and data persistence
    private void setupLocationListener() {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .addListener("onLocationUpdate", locationData -> {
                try {
                    if (locationData instanceof ReadableMap) {
                        ReadableMap location = (ReadableMap) locationData;
                        storeLocationData(location, new Promise() {
                            @Override
                            public void resolve(Object value) {
                                Log.d(TAG, "Location stored successfully");
                            }

                            @Override
                            public void reject(String code, String message) {
                                Log.e(TAG, "Failed to store location: " + message);
                            }

                            @Override
                            public void reject(String code, Throwable throwable) {
                                Log.e(TAG, "Failed to store location", throwable);
                            }
                        });
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error processing location update: " + e.getMessage());
                }
            });
    }

    // Requirement: Digital proof of delivery with offline support
    @ReactMethod
    public void storeDeliveryData(ReadableMap deliveryData, Promise promise) {
        try {
            if (!deliveryData.hasKey("id")) {
                promise.reject("INVALID_DATA", "Delivery data must contain an ID");
                return;
            }

            database.beginTransaction();
            try {
                ContentValues values = new ContentValues();
                values.put(COLUMN_ID, deliveryData.getString("id"));
                values.put(COLUMN_DATA, deliveryData.toString());
                values.put(COLUMN_TIMESTAMP, System.currentTimeMillis());
                values.put(COLUMN_SYNC_STATUS, "pending");

                long result = database.insertWithOnConflict(
                    TABLE_DELIVERIES,
                    null,
                    values,
                    SQLiteDatabase.CONFLICT_REPLACE
                );

                if (result != -1) {
                    database.setTransactionSuccessful();
                    promise.resolve(deliveryData.getString("id"));
                } else {
                    promise.reject("DB_ERROR", "Failed to store delivery data");
                }
            } finally {
                database.endTransaction();
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Error storing delivery data: " + e.getMessage());
        }
    }

    @ReactMethod
    public void storeLocationData(ReadableMap locationData, Promise promise) {
        try {
            if (!locationData.hasKey("latitude") || !locationData.hasKey("longitude")) {
                promise.reject("INVALID_DATA", "Location data must contain latitude and longitude");
                return;
            }

            // Check queue size and remove oldest records if needed
            Cursor cursor = database.query(TABLE_LOCATIONS, new String[]{"COUNT(*)"}, 
                COLUMN_SYNC_STATUS + "=?", new String[]{"pending"}, null, null, null);
            if (cursor.moveToFirst() && cursor.getInt(0) >= MAX_QUEUE_SIZE) {
                database.delete(TABLE_LOCATIONS, 
                    COLUMN_SYNC_STATUS + "=? ORDER BY " + COLUMN_TIMESTAMP + " ASC LIMIT 1", 
                    new String[]{"pending"});
            }
            cursor.close();

            ContentValues values = new ContentValues();
            values.put(COLUMN_LATITUDE, locationData.getDouble("latitude"));
            values.put(COLUMN_LONGITUDE, locationData.getDouble("longitude"));
            values.put(COLUMN_ACCURACY, locationData.hasKey("accuracy") ? 
                locationData.getDouble("accuracy") : 0);
            values.put(COLUMN_TIMESTAMP, System.currentTimeMillis());
            values.put(COLUMN_SYNC_STATUS, "pending");

            long id = database.insert(TABLE_LOCATIONS, null, values);
            if (id != -1) {
                promise.resolve(id);
            } else {
                promise.reject("DB_ERROR", "Failed to store location data");
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Error storing location data: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getOfflineData(String dataType, Promise promise) {
        try {
            String table = dataType.equals("deliveries") ? TABLE_DELIVERIES : TABLE_LOCATIONS;
            Cursor cursor = database.query(
                table,
                null,
                COLUMN_SYNC_STATUS + "=?",
                new String[]{"pending"},
                null,
                null,
                COLUMN_TIMESTAMP + " ASC"
            );

            WritableArray results = Arguments.createArray();
            while (cursor.moveToNext()) {
                WritableMap item = Arguments.createMap();
                if (dataType.equals("deliveries")) {
                    item.putString("id", cursor.getString(cursor.getColumnIndex(COLUMN_ID)));
                    item.putString("data", cursor.getString(cursor.getColumnIndex(COLUMN_DATA)));
                } else {
                    item.putDouble("latitude", cursor.getDouble(cursor.getColumnIndex(COLUMN_LATITUDE)));
                    item.putDouble("longitude", cursor.getDouble(cursor.getColumnIndex(COLUMN_LONGITUDE)));
                    item.putDouble("accuracy", cursor.getDouble(cursor.getColumnIndex(COLUMN_ACCURACY)));
                }
                item.putDouble("timestamp", cursor.getLong(cursor.getColumnIndex(COLUMN_TIMESTAMP)));
                results.pushMap(item);
            }
            cursor.close();
            promise.resolve(results);
        } catch (Exception e) {
            promise.reject("ERROR", "Error retrieving offline data: " + e.getMessage());
        }
    }

    @ReactMethod
    public void clearSyncedData(ReadableArray syncedIds, String dataType, Promise promise) {
        try {
            if (syncedIds.size() == 0) {
                promise.reject("INVALID_DATA", "No IDs provided for clearing");
                return;
            }

            String table = dataType.equals("deliveries") ? TABLE_DELIVERIES : TABLE_LOCATIONS;
            StringBuilder whereClause = new StringBuilder(COLUMN_ID + " IN (");
            String[] whereArgs = new String[syncedIds.size()];
            
            for (int i = 0; i < syncedIds.size(); i++) {
                whereClause.append(i == 0 ? "?" : ",?");
                whereArgs[i] = syncedIds.getString(i);
            }
            whereClause.append(")");

            database.beginTransaction();
            try {
                int deleted = database.delete(table, whereClause.toString(), whereArgs);
                database.setTransactionSuccessful();
                promise.resolve(deleted);
            } finally {
                database.endTransaction();
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Error clearing synced data: " + e.getMessage());
        }
    }

    private class DatabaseHelper extends SQLiteOpenHelper {
        DatabaseHelper(Context context) {
            super(context, DATABASE_NAME, null, DATABASE_VERSION);
        }

        @Override
        public void onCreate(SQLiteDatabase db) {
            // Create deliveries table
            db.execSQL("CREATE TABLE " + TABLE_DELIVERIES + " (" +
                COLUMN_ID + " TEXT PRIMARY KEY, " +
                COLUMN_DATA + " TEXT NOT NULL, " +
                COLUMN_TIMESTAMP + " INTEGER NOT NULL, " +
                COLUMN_SYNC_STATUS + " TEXT NOT NULL)");

            // Create locations table
            db.execSQL("CREATE TABLE " + TABLE_LOCATIONS + " (" +
                COLUMN_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                COLUMN_LATITUDE + " REAL NOT NULL, " +
                COLUMN_LONGITUDE + " REAL NOT NULL, " +
                COLUMN_ACCURACY + " REAL, " +
                COLUMN_TIMESTAMP + " INTEGER NOT NULL, " +
                COLUMN_SYNC_STATUS + " TEXT NOT NULL)");

            // Create indexes
            db.execSQL("CREATE INDEX idx_deliveries_sync ON " + TABLE_DELIVERIES + 
                "(" + COLUMN_SYNC_STATUS + ")");
            db.execSQL("CREATE INDEX idx_locations_sync ON " + TABLE_LOCATIONS + 
                "(" + COLUMN_SYNC_STATUS + ")");
            db.execSQL("CREATE INDEX idx_deliveries_timestamp ON " + TABLE_DELIVERIES + 
                "(" + COLUMN_TIMESTAMP + ")");
            db.execSQL("CREATE INDEX idx_locations_timestamp ON " + TABLE_LOCATIONS + 
                "(" + COLUMN_TIMESTAMP + ")");
        }

        @Override
        public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
            // Handle database schema upgrades here
            Log.w(TAG, "Upgrading database from version " + oldVersion + " to " + newVersion);
        }
    }
}