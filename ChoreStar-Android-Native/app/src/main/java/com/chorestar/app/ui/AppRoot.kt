package com.chorestar.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.chorestar.app.ChoreStarApp
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.data.KidSession
import com.chorestar.app.data.SupabaseModule
import com.chorestar.app.data.ThemePreference
import com.chorestar.app.R
import com.chorestar.app.ui.auth.AuthScreen
import com.chorestar.app.ui.auth.ResetPasswordScreen
import com.chorestar.app.ui.kid.ChildMainScreen
import com.chorestar.app.ui.kid.KidBackend
import com.chorestar.app.ui.kid.KidLoginScreen
import com.chorestar.app.ui.kid.KidViewModel
import com.chorestar.app.ui.main.MainTabs
import io.github.jan.supabase.auth.status.SessionStatus

/**
 * A standalone kid session (family code + PIN, no parent signed in) wins over
 * everything, like iOS's kid_mode_session. Otherwise: signed in → the five tabs,
 * else the sign-in screen with its "I'm a Kid!" door.
 */
@Composable
fun AppRoot(repository: ChoreStarRepository) {
    val app = LocalContext.current.applicationContext as ChoreStarApp
    val status by repository.sessionStatus.collectAsStateWithLifecycle()
    var kidSession by remember {
        mutableStateOf(app.prefs.kidSessionJson?.let { runCatching { SupabaseModule.json.decodeFromString(KidSession.serializer(), it) }.getOrNull() }?.takeIf { !it.isExpired })
    }
    var kidLogin by remember { mutableStateOf(false) }
    val pendingLink by app.pendingLink.collectAsStateWithLifecycle()
    val recovery by app.passwordRecovery.collectAsStateWithLifecycle()
    var authNotice by remember { mutableStateOf<UiText?>(null) }
    androidx.compose.runtime.LaunchedEffect(pendingLink, status) {
        val link = pendingLink ?: return@LaunchedEffect
        val signedIn = status is SessionStatus.Authenticated
        if (com.chorestar.app.BuildConfig.DEBUG) android.util.Log.d("Links", "AppRoot sees $link status=${status::class.simpleName}")
        when {
            link.startsWith("/kid-login") -> { if (kidSession == null) kidLogin = true; app.pendingLink.value = null }
            status is SessionStatus.Initializing -> Unit
            // Confirmation done at Supabase before the redirect; the link only needs a sign-in now.
            link.startsWith("/auth/callback") -> { if (!signedIn) authNotice = uiText(R.string.email_confirmed); app.pendingLink.value = null }
            // A reset link requested on the web carries a code only that browser can exchange.
            link.startsWith("/reset-password") && !signedIn -> { authNotice = uiText(R.string.reset_link_web); app.pendingLink.value = null }
            // Stays queued through sign-in; MainTabs shows the invite once there is an account.
            link.startsWith("/family/accept/") && !signedIn -> authNotice = uiText(R.string.invite_sign_in_first)
            signedIn -> Unit // MainTabs consumes what is left
            else -> app.pendingLink.value = null
        }
    }

    // Play cancels a subscription the app never acknowledged, so every signed-in
    // start re-verifies what Play is still holding for this account.
    androidx.compose.runtime.LaunchedEffect(status) {
        if (status is SessionStatus.Authenticated) app.billing.syncPurchases()
    }

    fun endKidSession() { kidSession = null; app.prefs.kidSessionJson = null; app.theme.value = ThemePreference(false, null, null) }

    kidSession?.let { session ->
        val vm: KidViewModel = viewModel(key = "kid-${session.childId}", factory = viewModelFactory {
            initializer {
                KidViewModel(KidBackend.Standalone(session), repository, repository.kid, parentState = { null },
                    onParentToggle = { _, _ -> }, onParentRoutineDone = { _, _, _ -> }, onTheme = { app.theme.value = it }, onSignOut = { endKidSession() })
            }
        })
        ChildMainScreen(vm)
        return
    }
    if (kidLogin) {
        KidLoginScreen(repository.kid, initialCode = app.prefs.lastFamilyCode, onBack = { kidLogin = false }, onSuccess = { s ->
            app.prefs.kidSessionJson = SupabaseModule.json.encodeToString(KidSession.serializer(), s)
            kidSession = s; kidLogin = false
        })
        return
    }
    when (status) {
        is SessionStatus.Authenticated ->
            if (recovery) ResetPasswordScreen(repository, onDone = { app.passwordRecovery.value = false })
            else MainTabs(repository)
        is SessionStatus.Initializing -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        else -> AuthScreen(repository, onKidLogin = { kidLogin = true }, notice = authNotice)
    }
}
