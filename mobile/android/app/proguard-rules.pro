# ─────────────────────────────────────────────────────────────────────────────
# Dinasari — ProGuard / R8 rules
# ─────────────────────────────────────────────────────────────────────────────

# ── React Native ──────────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ── Expo modules ──────────────────────────────────────────────────────────────
-keep class expo.modules.** { *; }
-keep class host.exp.exponent.** { *; }
-keep class expo.** { *; }

# ── Reanimated ────────────────────────────────────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# ── Sentry crash reporting ────────────────────────────────────────────────────
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# ── Google Maps / Play Services ───────────────────────────────────────────────
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.maps.** { *; }
-keep class com.airbnb.android.react.maps.** { *; }

# ── OkHttp / Retrofit (used by axios under the hood) ─────────────────────────
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# ── Socket.IO ─────────────────────────────────────────────────────────────────
-keep class io.socket.** { *; }
-dontwarn io.socket.**

# ── Kotlin ───────────────────────────────────────────────────────────────────
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings { <fields>; }

# ── Android & Security ────────────────────────────────────────────────────────
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
-keepattributes Signature
-keepattributes Exceptions

# ── JSC / Hermes ─────────────────────────────────────────────────────────────
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ── Expo Kotlin Missing Classes ──
-dontwarn expo.modules.kotlin.types.AnyTypeCache
-dontwarn expo.modules.kotlin.types.descriptors.RawTypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorKt
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorOfKt
-dontwarn expo.modules.kotlin.types.**
-dontwarn expo.modules.kotlin.**

