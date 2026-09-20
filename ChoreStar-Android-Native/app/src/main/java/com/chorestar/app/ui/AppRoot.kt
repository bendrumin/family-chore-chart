package com.chorestar.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.ui.auth.AuthScreen
import com.chorestar.app.ui.main.MainTabs
import io.github.jan.supabase.auth.status.SessionStatus

/** Signed in → the five tabs. Otherwise the sign-in screen. */
@Composable
fun AppRoot(repository: ChoreStarRepository) {
    val status by repository.sessionStatus.collectAsStateWithLifecycle()
    when (status) {
        is SessionStatus.Authenticated -> MainTabs(repository)
        is SessionStatus.Initializing -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        else -> AuthScreen(repository)
    }
}
