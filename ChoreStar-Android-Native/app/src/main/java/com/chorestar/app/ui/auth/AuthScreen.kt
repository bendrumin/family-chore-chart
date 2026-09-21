package com.chorestar.app.ui.auth

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.chorestar.app.R
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.ui.UiText
import com.chorestar.app.ui.asString

@Composable
fun AuthScreen(repository: ChoreStarRepository, onKidLogin: () -> Unit = {}, notice: UiText? = null) {
    val vm: AuthViewModel = viewModel(factory = viewModelFactory { initializer { AuthViewModel(repository) } })
    val state by vm.state.collectAsStateWithLifecycle()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var familyName by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf(AuthMode.SignIn) }

    Column(
        Modifier.fillMaxSize().safeDrawingPadding().verticalScroll(rememberScrollState()).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("⭐", style = MaterialTheme.typography.displayMedium)
        Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineLarge)
        Text(
            stringResource(R.string.tagline),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))

        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            AuthMode.entries.forEachIndexed { i, m ->
                SegmentedButton(
                    selected = mode == m,
                    onClick = { mode = m; vm.clearMessage() },
                    shape = SegmentedButtonDefaults.itemShape(i, AuthMode.entries.size),
                ) { Text(stringResource(m.label)) }
            }
        }
        Spacer(Modifier.height(16.dp))

        if (mode == AuthMode.SignUp) {
            OutlinedTextField(
                value = familyName, onValueChange = { familyName = it },
                label = { Text(stringResource(R.string.auth_family_name)) }, singleLine = true, modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
        }
        OutlinedTextField(
            value = email, onValueChange = { email = it },
            label = { Text(stringResource(R.string.auth_email)) }, singleLine = true, modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password, onValueChange = { password = it },
            label = { Text(stringResource(R.string.auth_password)) }, singleLine = true, modifier = Modifier.fillMaxWidth(),
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        )
        Spacer(Modifier.height(20.dp))

        Button(
            onClick = {
                if (mode == AuthMode.SignIn) vm.signIn(email, password) else vm.signUp(email, password, familyName)
            },
            enabled = !state.busy && email.isNotBlank() && password.isNotBlank() && (mode == AuthMode.SignIn || familyName.isNotBlank()),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            if (state.busy) CircularProgressIndicator(Modifier.height(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
            else Text(stringResource(if (mode == AuthMode.SignIn) R.string.auth_sign_in else R.string.auth_create_family))
        }

        if (mode == AuthMode.SignIn) {
            TextButton(onClick = { vm.forgotPassword(email) }, enabled = email.isNotBlank() && !state.busy) {
                Text(stringResource(R.string.auth_forgot_password))
            }
        }

        Spacer(Modifier.height(16.dp))
        androidx.compose.material3.OutlinedButton(onClick = onKidLogin, modifier = Modifier.fillMaxWidth().height(52.dp)) {
            Text("🧒 " + stringResource(R.string.im_a_kid))
        }

        (state.message ?: notice)?.let {
            Spacer(Modifier.height(8.dp))
            Text(
                it.asString(),
                color = if (state.message != null && state.isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

enum class AuthMode(@StringRes val label: Int) { SignIn(R.string.auth_sign_in), SignUp(R.string.auth_create_account) }
