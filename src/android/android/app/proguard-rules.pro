# Human Tasks:
# 1. Ensure React Native version matches 0.70.x in build.gradle
# 2. Verify Google Maps SDK version matches 1.x in build.gradle
# 3. Confirm SQLite version matches 6.x in build.gradle
# 4. Review rules after any major dependency updates

# Global Attributes
# Requirement: Security Architecture - Implementation of security measures including code obfuscation and optimization
-keepattributes Signature,*Annotation*,SourceFile,LineNumberTable,Exceptions,InnerClasses

# Optimization Settings
# Requirement: Security Architecture - Code optimization while maintaining app stability
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-dontpreverify
-verbose

# React Native Core Rules
# Requirement: Mobile Applications - React Native driver applications with offline-first architecture
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep React Native Modules
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }
-keep class * extends com.facebook.react.bridge.JSIModule { *; }

# React Native Bridge
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}

# React Native JSI
-keepclassmembers class * implements com.facebook.react.bridge.JSIModule {
    public *;
}

# Google Maps Rules
# Requirement: Mobile Applications - GPS integration for location tracking
-keep class com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.location.** { *; }
-keep class com.google.maps.android.** { *; }
-dontwarn com.google.android.gms.maps.**
-dontwarn com.google.android.gms.location.**

# React Native Maps Specific Rules
-keep class com.airbnb.android.react.maps.** { *; }
-dontwarn com.airbnb.android.react.maps.**

# SQLite Rules
# Requirement: Mobile Applications - Offline-first architecture with local data storage
-keep class org.sqlite.** { *; }
-keep class org.sqlite.database.** { *; }
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }

# React Native SQLite Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-keep class com.facebook.react.modules.storage.** { *; }
-keep class android.database.** { *; }

# Networking Rules
# Requirement: Mobile Applications - Real-time communication and data sync
-keepclassmembers class com.facebook.react.modules.network.NetworkingModule {
    public *;
}

# OkHttp Rules
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Retrofit Rules (if used for API communication)
-keepattributes Signature
-keepattributes Exceptions
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# WebSocket Rules
-keep class okhttp3.internal.ws.** { *; }
-keep class com.facebook.react.modules.websocket.** { *; }

# Custom Native Modules
# Requirement: Mobile Applications - Integration with device capabilities
-keep class com.fleettracker.modules.** { *; }
-keep class com.fleettracker.MainActivity { *; }
-keep class com.fleettracker.MainApplication { *; }

# Crash Reporting (if used)
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
-keep class com.google.firebase.crashlytics.** { *; }

# Java 8 Support
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Native Methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep View Constructors
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# Serializable/Parcelable
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Remove Logging
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}