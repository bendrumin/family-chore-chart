package com.chorestar.app.notify

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.chorestar.app.MainActivity
import com.chorestar.app.R
import com.chorestar.app.data.Prefs
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

/**
 * The one local reminder iOS schedules: "ChoreStar ⭐ / Time to check today's
 * chores." at a chosen time each day. Inexact alarms need no special permission;
 * the receiver re-arms itself for the next day and skips vacation days.
 */
object DailyReminder {
    const val CHANNEL = "daily_reminder"
    private const val REQUEST = 1001

    fun ensureChannel(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, context.getString(R.string.daily_reminder), NotificationManager.IMPORTANCE_DEFAULT))
        }
    }

    /** Arms the next firing, or clears it when the reminder is off. */
    fun sync(context: Context, vacationEndsOn: String? = null, vacationStartsOn: String? = null) {
        val prefs = Prefs(context)
        val am = context.getSystemService(AlarmManager::class.java)
        val pi = pendingIntent(context)
        if (!prefs.dailyReminderEnabled) { am.cancel(pi); return }
        val minutes = prefs.dailyReminderMinutes
        var next = LocalDateTime.of(LocalDate.now(), LocalTime.of(minutes / 60, minutes % 60))
        if (!next.isAfter(LocalDateTime.now())) next = next.plusDays(1)
        // Skip days inside the live vacation window, as iOS does.
        val vs = vacationStartsOn?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
        val ve = vacationEndsOn?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
        if (vs != null && ve != null) {
            var guard = 0
            while (!next.toLocalDate().isBefore(vs) && !next.toLocalDate().isAfter(ve) && guard++ < 400) next = next.plusDays(1)
        }
        val at = next.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
    }

    private fun pendingIntent(context: Context): PendingIntent =
        PendingIntent.getBroadcast(context, REQUEST, Intent(context, ReminderReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    fun show(context: Context) {
        ensureChannel(context)
        val open = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_chorestar)
            .setContentTitle(context.getString(R.string.reminder_title))
            .setContentText(context.getString(R.string.reminder_body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        if (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            context.getSystemService(NotificationManager::class.java).notify(REQUEST, n)
        }
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) { DailyReminder.sync(context); return }
        DailyReminder.show(context)
        DailyReminder.sync(context)
    }
}
