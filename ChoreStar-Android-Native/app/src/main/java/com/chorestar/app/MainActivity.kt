package com.chorestar.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chorestar.app.data.Prefs
import com.chorestar.app.ui.AppRoot
import com.chorestar.app.ui.theme.ChoreStarTheme

class MainActivity : ComponentActivity() {
    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        intent.data?.path?.let { (application as ChoreStarApp).pendingLink.value = it }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val app = application as ChoreStarApp
        intent?.data?.path?.let { app.pendingLink.value = it }
        setContent {
            val darkMode by app.prefs.darkMode.collectAsStateWithLifecycle()
            val theme by app.theme.collectAsStateWithLifecycle()
            val dark = when (darkMode) { Prefs.DarkMode.Light -> false; Prefs.DarkMode.Dark -> true; Prefs.DarkMode.System -> isSystemInDarkTheme() }
            ChoreStarTheme(darkTheme = dark, preference = theme) {
                AppRoot(app.repository)
            }
        }
    }
}
