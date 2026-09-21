package com.chorestar.app.notify

import com.chorestar.app.ChoreStarApp
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** Receives FCM data messages (see Push) and token rotations. */
class PushService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        Push.show(this, message.data)
    }

    override fun onNewToken(token: String) {
        val app = applicationContext as ChoreStarApp
        if (app.repository.currentUserId == null) return
        CoroutineScope(Dispatchers.IO).launch { Push.register(app, app.repository, token) }
    }
}
