package com.chorestar.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chorestar.app.R
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.ui.UiText
import com.chorestar.app.ui.uiText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AuthUiState(val busy: Boolean = false, val message: UiText? = null, val isError: Boolean = false)

class AuthViewModel(private val repository: ChoreStarRepository) : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state

    fun clearMessage() = _state.update { it.copy(message = null) }

    fun signIn(email: String, password: String) = run {
        runCatching { repository.signIn(email, password) }
            .onFailure { fail(friendly(it)) }
    }

    fun signUp(email: String, password: String, familyName: String) = run {
        repository.signUp(email, password, familyName).fold(
            onSuccess = {
                // Most projects require email confirmation; a sign-in that fails
                // right after a successful sign-up is the confirmation gate.
                runCatching { repository.signIn(email, password) }.onFailure {
                    _state.update { s -> s.copy(message = uiText(R.string.auth_account_created), isError = false) }
                }
            },
            onFailure = { fail(it.message?.let(UiText::Raw) ?: uiText(R.string.auth_could_not_create)) },
        )
    }

    fun forgotPassword(email: String) = run {
        runCatching { repository.sendPasswordReset(email) }
            .onSuccess { _state.update { it.copy(message = uiText(R.string.auth_reset_sent, email), isError = false) } }
            .onFailure { fail(friendly(it)) }
    }

    private fun run(block: suspend () -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(busy = true, message = null) }
            block()
            _state.update { it.copy(busy = false) }
        }
    }

    private fun fail(message: UiText) = _state.update { it.copy(message = message, isError = true) }

    private fun friendly(t: Throwable): UiText {
        val m = t.message ?: return uiText(R.string.error_generic)
        return when {
            m.contains("Invalid login credentials", true) -> uiText(R.string.auth_wrong_credentials)
            m.contains("Email not confirmed", true) -> uiText(R.string.auth_confirm_email_first)
            m.contains("Unable to resolve host", true) || m.contains("timeout", true) -> uiText(R.string.error_no_connection)
            else -> UiText.Raw(m)
        }
    }
}
