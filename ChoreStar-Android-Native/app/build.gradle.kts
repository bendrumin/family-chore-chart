import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// Public Supabase project config. supabase.properties is gitignored; the iOS
// app ships the same two values in Info.plist, and that file is the fallback
// so a fresh checkout builds without copying anything by hand.
val supabaseProps = Properties().apply {
    val local = rootProject.file("supabase.properties")
    if (local.exists()) local.inputStream().use { load(it) }
}
fun supabaseValue(key: String): String {
    supabaseProps.getProperty(key)?.let { return it }
    val plist = rootProject.file("../ChoreStar-iOS/ChoreStar/Info.plist")
    if (plist.exists()) {
        val text = plist.readText()
        Regex("<key>$key</key>\\s*<string>([^<]+)</string>").find(text)?.groupValues?.get(1)?.let { return it }
    }
    if (key == "WEB_API_BASE") return "https://chorestar.app"
    throw GradleException("$key missing: add it to supabase.properties (see supabase.properties.example)")
}

android {
    namespace = "com.chorestar.app"
    compileSdk = 36

    defaultConfig {
        // Same applicationId as the Capacitor shell, so this build replaces it
        // on a device and, later, on Google Play.
        applicationId = "com.chorestar.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "2.0"

        buildConfigField("String", "SUPABASE_URL", "\"${supabaseValue("SUPABASE_URL")}\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"${supabaseValue("SUPABASE_ANON_KEY")}\"")
        buildConfigField("String", "WEB_API_BASE", "\"${supabaseValue("WEB_API_BASE")}\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    // JDK 21 builds it (the only JDK on the Mac); bytecode targets 17.
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
    buildFeatures { compose = true; buildConfig = true }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

dependencies {
    // Newest line that still compiles against SDK 36: the 2026 AndroidX releases
    // (Compose 1.11+, lifecycle 2.10+) and OkHttp 5 demand compileSdk 37, and
    // the command-line SDK on the Mac has no platform 37 yet.
    val composeBom = platform("androidx.compose:compose-bom:2025.12.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.exifinterface:exifinterface:1.3.7")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.navigation:navigation-compose:2.9.8")

    implementation(platform("io.github.jan-tennert.supabase:bom:3.8.0"))
    implementation("io.github.jan-tennert.supabase:postgrest-kt")
    implementation("io.github.jan-tennert.supabase:auth-kt")
    implementation("io.github.jan-tennert.supabase:storage-kt")
    // The Android engine has no OkHttp dependency; OkHttp 5 needs SDK 37.
    implementation("io.ktor:ktor-client-android:3.5.1")
    implementation("io.ktor:ktor-client-content-negotiation:3.5.1")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.5.1")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.10.0")

    // Coil 3.3 predates the SDK-37 line; 3.6 drags in Compose 1.12 (see docs/ANDROID-NATIVE.md).
    implementation("io.coil-kt.coil3:coil-compose:3.3.0")
    implementation("io.coil-kt.coil3:coil-network-ktor3:3.3.0")

    // Image loading (photo avatars) returns with a Coil that targets Compose 1.10;
    // Coil 3.6 pulls Compose 1.12, which needs SDK 37.
}
