package com.chorestar.app.notify

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.chorestar.app.MainActivity
import com.chorestar.app.R

/** The Android stand-in for the iOS routine Live Activity: an ongoing notification with the current step and a countdown. */
object RoutineNotification {
    private const val CHANNEL = "routine_player"
    private const val ID = 2001

    fun show(context: Context, routineName: String, stepTitle: String, stepIndex: Int, total: Int, durationSeconds: Int?) {
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, context.getString(R.string.segment_routines), NotificationManager.IMPORTANCE_LOW).apply { setSound(null, null) })
        }
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) return
        val open = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val b = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_chorestar)
            .setContentTitle(routineName)
            .setContentText(context.getString(R.string.step_n_of_m, stepIndex + 1, total) + " · " + stepTitle)
            .setProgress(total, stepIndex, false)
            .setOngoing(true).setOnlyAlertOnce(true).setSilent(true)
            .setContentIntent(open)
        if (durationSeconds != null && durationSeconds > 0) {
            b.setWhen(System.currentTimeMillis() + durationSeconds * 1000L).setUsesChronometer(true).setChronometerCountDown(true)
        }
        nm.notify(ID, b.build())
    }

    fun clear(context: Context) = context.getSystemService(NotificationManager::class.java).cancel(ID)
}
