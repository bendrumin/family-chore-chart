package com.chorestar.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.chorestar.app.ui.AppRoot
import com.chorestar.app.ui.theme.ChoreStarTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val repository = (application as ChoreStarApp).repository
        setContent {
            ChoreStarTheme {
                AppRoot(repository)
            }
        }
    }
}
