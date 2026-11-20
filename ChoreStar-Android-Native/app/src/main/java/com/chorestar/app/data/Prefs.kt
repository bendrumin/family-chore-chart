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

    var widgetSnapshotJson: String?
        get() = sp.getString("widgetSnapshot", null)
        set(v) = sp.edit().putString("widgetSnapshot", v).apply()

    var whatsNewSeen: String?
        get() = sp.getString("whatsNewSeen", null)
        set(v) = sp.edit().putString("whatsNewSeen", v).apply()

    /** Per account, like iOS's hasSeenParentOnboarding.<uid>: the tour shows once per family, not once per phone. */
    fun onboardingSeen(userId: String): Boolean = sp.getBoolean("onboardingSeen.$userId", false)
    fun markOnboardingSeen(userId: String) = sp.edit().putBoolean("onboardingSeen.$userId", true).apply()

    /** Family challenges whose "you did it together" confetti already played on this device. */
    fun challengeCelebrated(id: String): Boolean = sp.getStringSet("challengesCelebrated", emptySet())?.contains(id) == true
    fun markChallengeCelebrated(id: String) {
        val set = (sp.getStringSet("challengesCelebrated", emptySet()) ?: emptySet()).toMutableSet().apply { add(id) }
        sp.edit().putStringSet("challengesCelebrated", set.toList().takeLast(50).toSet()).apply()
    }

    var kidSessionJson: String?
        get() = sp.getString("kidSession", null)
        set(v) = sp.edit().putString("kidSession", v).apply()

    /** What this device last saw of a kid's Star Pet ("level|stage|star"), so growth is celebrated once (iOS petSeen:<id>). */
    fun petSeen(childId: String): String? = sp.getString("petSeen:${childId.lowercase()}", null)
    fun setPetSeen(childId: String, value: String) = sp.edit().putString("petSeen:${childId.lowercase()}", value).apply()

    /** Not now on the switch-to-yearly card hides it until then (epoch millis). */
    var yearlyUpsellSnoozedUntil: Long
        get() = sp.getLong("yearlyUpsell.snoozedUntil", 0L)
        set(v) = sp.edit().putLong("yearlyUpsell.snoozedUntil", v).apply()
}
