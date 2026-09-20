package com.chorestar.app

import android.app.Application
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.data.Prefs
import com.chorestar.app.data.SupabaseModule
import com.chorestar.app.data.ThemePreference
import com.chorestar.app.notify.DailyReminder
import kotlinx.coroutines.flow.MutableStateFlow

/** Owns the one Supabase client, the repository, local prefs and the live theme for the process. */
class ChoreStarApp : Application() {
    lateinit var repository: ChoreStarRepository
        private set
    lateinit var prefs: Prefs
        private set

    /** What family_settings.custom_theme last said; the dashboard updates it on every load. */
    val theme = MutableStateFlow(ThemePreference(false, null, null))

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
        repository = ChoreStarRepository(SupabaseModule.client(), SupabaseModule.webClient())
        DailyReminder.ensureChannel(this)
        DailyReminder.sync(this)
    }
}
