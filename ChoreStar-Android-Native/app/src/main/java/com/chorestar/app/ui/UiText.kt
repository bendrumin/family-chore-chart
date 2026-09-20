package com.chorestar.app.ui

import android.content.Context
import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource

/**
 * A message a view model wants shown, resolved to words only when it reaches a
 * screen. View models never hold a Context, so they cannot pick the locale; the
 * screen can. Raw text is for server messages we pass through unchanged.
 */
sealed interface UiText {
    data class Res(@StringRes val id: Int, val args: List<Any> = emptyList()) : UiText
    data class Raw(val value: String) : UiText

    fun resolve(context: Context): String = when (this) {
        is Res -> context.getString(id, *args.toTypedArray())
        is Raw -> value
    }
}

fun uiText(@StringRes id: Int, vararg args: Any): UiText = UiText.Res(id, args.toList())

@Composable
fun UiText.asString(): String = when (this) {
    is UiText.Res -> stringResource(id, *args.toTypedArray())
    is UiText.Raw -> value
}
