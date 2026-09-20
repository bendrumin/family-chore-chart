package com.chorestar.app.data

import com.chorestar.app.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.storage.Storage
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

object SupabaseModule {
    fun client(): SupabaseClient = createSupabaseClient(
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
    ) {
        install(Auth)
        install(Postgrest)
        install(Storage)
    }

    /** For the web app's own endpoints (sign-up, kid login, kid mode). */
    val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
    fun webClient(): HttpClient = HttpClient(Android) {
        install(ContentNegotiation) { json(json) }
    }
}
