package com.chorestar.app

import android.app.Application
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.data.PlayBilling
import com.chorestar.app.data.Prefs
import com.chorestar.app.data.SupabaseModule
import com.chorestar.app.data.ThemePreference
import com.chorestar.app.notify.DailyReminder
import com.chorestar.app.notify.Push
import kotlinx.coroutines.flow.MutableStateFlow

/** Owns the one Supabase client, the repository, local prefs and the live theme for the process. */
class ChoreStarApp : Application() {
    lateinit var repository: ChoreStarRepository
        private set
    lateinit var prefs: Prefs
        private set

    /** What family_settings.custom_theme last said; the dashboard updates it on every load. */
    val theme = MutableStateFlow(ThemePreference(false, null, null))

    /** A chorestar.app path (+query) the app was opened with (App Link, shortcut, tapped alert), consumed by AppRoot / MainTabs. */
    val pendingLink = MutableStateFlow<String?>(null)

    /** True after a password-reset link signed the user in: AppRoot shows the new-password screen first. */
    val passwordRecovery = MutableStateFlow(false)

    /**
     * Every link the activity is opened with comes through here. Auth links
     * carrying a session in their fragment are imported straight away; the
     * others are queued for whichever screen can act on them.
     */
    fun handleLink(intent: android.content.Intent?) {
        val uri = intent?.data ?: return
        val path = uri.path ?: return
        val query = uri.query?.let { "?$it" } ?: ""
        val isAuthLink = path.startsWith("/reset-password") || path.startsWith("/auth/callback")
        if (isAuthLink && uri.fragment?.contains("access_token=") == true) {
            repository.handleAuthLink(intent,
                onSession = { if (path.startsWith("/reset-password")) passwordRecovery.value = true },
                onError = { pendingLink.value = path + "?failed" })
            return
        }
        // A reset or confirmation link without tokens was requested on the web (PKCE
        // code, which only that browser can exchange): the screens explain.
        if (BuildConfig.DEBUG) android.util.Log.d("Links", "queued $path$query")
        pendingLink.value = path + query
    }

    val billing: PlayBilling by lazy {
        PlayBilling(this) { token, productId -> repository.verifyPlayPurchase(token, productId) }
    }

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
        repository = ChoreStarRepository(SupabaseModule.client(), SupabaseModule.webClient())
        DailyReminder.ensureChannel(this)
        Push.ensureChannel(this)
        DailyReminder.sync(this)
    }
}
