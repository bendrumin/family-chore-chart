package com.chorestar.app.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Device-local preferences, the ones iOS keeps in UserDefaults rather than in the
 * family's settings row: dark mode, sound effects, the daily reminder.
 */
class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("chorestar", Context.MODE_PRIVATE)

    enum class DarkMode { Light, Dark, System }

    private val _darkMode = MutableStateFlow(DarkMode.valueOf(sp.getString("darkMode", "System") ?: "System"))
    val darkMode: StateFlow<DarkMode> = _darkMode
    fun setDarkMode(m: DarkMode) { sp.edit().putString("darkMode", m.name).apply(); _darkMode.value = m }

    var soundEnabled: Boolean
        get() = sp.getBoolean("soundEnabled", true)
        set(v) = sp.edit().putBoolean("soundEnabled", v).apply()

    var dailyReminderEnabled: Boolean
        get() = sp.getBoolean("dailyReminderEnabled", false)
        set(v) = sp.edit().putBoolean("dailyReminderEnabled", v).apply()

    /** Minutes after midnight; 17:00 by default, like iOS. */
    var dailyReminderMinutes: Int
        get() = sp.getInt("dailyReminderMinutes", 17 * 60)
        set(v) = sp.edit().putInt("dailyReminderMinutes", v).apply()

    var gettingStartedHidden: Boolean
        get() = sp.getBoolean("gettingStartedHidden", false)
        set(v) = sp.edit().putBoolean("gettingStartedHidden", v).apply()

    var lastFamilyCode: String?
        get() = sp.getString("lastFamilyCode", null)
        set(v) = sp.edit().putString("lastFamilyCode", v).apply()

    var kidSessionJson: String?
        get() = sp.getString("kidSession", null)
        set(v) = sp.edit().putString("kidSession", v).apply()
}
