package com.chorestar.app.notify

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.chorestar.app.BuildConfig
import com.chorestar.app.ChoreStarApp
import com.chorestar.app.MainActivity
import com.chorestar.app.R
import com.chorestar.app.data.ChoreStarRepository
import com.google.android.gms.tasks.Task
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Activity alerts over Firebase Cloud Messaging: the Android half of what iOS
 * gets over APNs ("Bayla finished Morning Routine!", "Needs your OK"...).
 *
 * The server (chorestar-nextjs/lib/push) reads device_push_tokens and sends a
 * data-only message per Android row; [PushService] turns it into the
 * notification below, with an Approve action for a pending chore.
 *
 * Firebase only initialises when app/google-services.json was present at
 * build time; without it every entry point here is a quiet no-op.
 */
object Push {
    const val CHANNEL = "activity"
    private const val TYPE_CHORE_APPROVAL = "chore_approval"

    fun available(context: Context): Boolean = FirebaseApp.getApps(context).isNotEmpty()

    fun ensureChannel(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, context.getString(R.string.activity_alerts), NotificationManager.IMPORTANCE_HIGH))
        }
    }

    /** After sign-in (and whenever FCM rotates the token): put this device's token on the parent's row. */
    suspend fun register(context: Context, repository: ChoreStarRepository, token: String? = null) {
        if (!available(context)) return
        runCatching {
            val t = token ?: FirebaseMessaging.getInstance().token.await()
            repository.registerPushToken(t, if (BuildConfig.DEBUG) "development" else "production")
        }
    }

    /** Before sign-out: drop the row and the token, so the next account on this phone starts clean. */
    suspend fun unregister(context: Context, repository: ChoreStarRepository) {
        if (!available(context)) return
        runCatching {
            val t = FirebaseMessaging.getInstance().token.await()
            repository.removePushToken(t)
            FirebaseMessaging.getInstance().deleteToken().await()
        }
    }

    /**
     * Shows one alert from the message's data. Tapping opens the dashboard (the
     * tray lists what needs a parent); a chore waiting for approval also gets
     * an Approve button, like the iOS CHORE_APPROVAL category.
     */
    fun show(context: Context, data: Map<String, String>) {
        val title = data["title"] ?: context.getString(R.string.app_name)
        val body = data["body"] ?: return
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        ensureChannel(context)
        val type = data["type"] ?: "activity"
        val completionId = data["completionId"]
        val id = completionId?.hashCode() ?: (System.currentTimeMillis() and 0x7fffffff).toInt()

        val link = Uri.Builder().scheme("https").authority("chorestar.app").path("/dashboard")
            .appendQueryParameter("push", type)
            .apply { data["childId"]?.let { appendQueryParameter("childId", it) } }
            .build()
        val open = PendingIntent.getActivity(context, id, Intent(Intent.ACTION_VIEW, link, context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val b = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_chorestar)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .setContentIntent(open)
        if (type == TYPE_CHORE_APPROVAL && completionId != null) {
            val approve = PendingIntent.getBroadcast(context, id,
                Intent(context, ApproveReceiver::class.java).putExtra(ApproveReceiver.EXTRA_COMPLETION, completionId).putExtra(ApproveReceiver.EXTRA_NOTIFICATION, id),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            b.addAction(0, context.getString(R.string.approve), approve)
        }
        context.getSystemService(NotificationManager::class.java).notify(id, b.build())
    }

    suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { cont ->
        addOnCompleteListener { task ->
            val e = task.exception
            if (e != null) cont.resumeWithException(e)
            else if (task.isCanceled) cont.cancel()
            else cont.resume(task.result)
        }
    }
}

/** The Approve button on a "Needs your OK" alert: approves the completion without opening the app. */
class ApproveReceiver : BroadcastReceiver() {
    companion object {
        const val EXTRA_COMPLETION = "completionId"
        const val EXTRA_NOTIFICATION = "notificationId"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val completionId = intent.getStringExtra(EXTRA_COMPLETION) ?: return
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION, 0)
        val app = context.applicationContext as ChoreStarApp
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // The session restores asynchronously when the process was cold-started by the tap.
                runCatching { withTimeout(8_000) { app.repository.sessionStatus.first { it !is SessionStatus.Initializing } } }
                app.repository.reviewCompletion(completionId, approve = true)
                context.getSystemService(NotificationManager::class.java).cancel(notificationId)
            } catch (_: Exception) {
                // Leave the alert up: the parent can still approve from the tray.
            } finally {
                pending.finish()
            }
        }
    }
}
