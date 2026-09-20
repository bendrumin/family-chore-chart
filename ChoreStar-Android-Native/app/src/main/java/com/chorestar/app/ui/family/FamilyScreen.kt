package com.chorestar.app.ui.family

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.components.ChildAvatar

@Composable
fun FamilyScreen(state: DashboardState) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(stringResource(R.string.family_title), style = MaterialTheme.typography.headlineMedium) }
        items(state.children, key = { it.id }) { child ->
            Card(Modifier.fillMaxWidth()) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    ChildAvatar(child, 48.dp)
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(child.name, style = MaterialTheme.typography.titleMedium)
                        val choreCount = state.choresFor(child.id).size
                        val ageText = child.age?.let { stringResource(R.string.family_age, it) }
                        val choresText = pluralStringResource(R.plurals.family_chore_count, choreCount, choreCount)
                        val bits = listOfNotNull(ageText, choresText)
                        Text(bits.joinToString(" · "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        state.profile?.kidLoginCode?.let { code ->
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text(stringResource(R.string.family_kid_login_code), style = MaterialTheme.typography.titleMedium)
                        Text(
                            stringResource(R.string.family_kid_login_hint),
                            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(code.uppercase(), style = MaterialTheme.typography.headlineMedium, fontFamily = FontFamily.Monospace, modifier = Modifier.padding(top = 8.dp))
                    }
                }
            }
        }
    }
}
