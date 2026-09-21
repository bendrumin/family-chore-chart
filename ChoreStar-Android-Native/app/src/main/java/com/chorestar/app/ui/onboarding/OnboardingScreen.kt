package com.chorestar.app.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.chorestar.app.R
import com.chorestar.app.data.Money
import com.chorestar.app.ui.DashboardState
import com.chorestar.app.ui.DashboardViewModel
import kotlinx.coroutines.launch
import java.util.TimeZone

private const val PAGES = 5
private const val REWARDS_PAGE = 2

/**
 * The parent's first-run tour, the five pages iOS shows a brand-new family:
 * welcome, kids, rewards (which is saved when the page is left), chores &
 * routines, and kid mode. Ends on the Family tab with the child editor open,
 * or wherever the parent was if they prefer to explore.
 */
@Composable
fun OnboardingScreen(vm: DashboardViewModel, state: DashboardState, onFinish: (goToFamily: Boolean) -> Unit) {
    val pager = rememberPagerState { PAGES }
    val scope = rememberCoroutineScope()
    val currency = state.currency
    var rewardMode by remember { mutableStateOf(state.settings?.rewardMode?.takeIf { it == "per_chore" } ?: "flat") }
    var dailyText by remember { mutableStateOf(Money.plain(state.settings?.dailyRewardCents?.takeIf { it > 0 } ?: 100, currency)) }

    fun saveRewards() {
        val cents = Money.parseCents(dailyText) ?: 100
        scope.launch {
            vm.saveRewards(rewardMode, cents, state.settings?.weeklyBonusCents ?: 0, currency ?: "USD", state.settings?.timezone ?: TimeZone.getDefault().id)
        }
    }
    fun advance() {
        if (pager.currentPage == REWARDS_PAGE) saveRewards()
        if (pager.currentPage < PAGES - 1) scope.launch { pager.animateScrollToPage(pager.currentPage + 1) } else onFinish(true)
    }

    val last = pager.currentPage == PAGES - 1
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).safeDrawingPadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = { onFinish(false) }) { Text(stringResource(R.string.skip_label)) }
        }
        HorizontalPager(pager, Modifier.weight(1f)) { page ->
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                when (page) {
                    0 -> TourPage("⭐", R.string.onb_welcome_title, stringResource(R.string.onb_welcome_sub), listOf("✅" to R.string.onb_welcome_1, "✨" to R.string.onb_welcome_2, "💰" to R.string.onb_welcome_3))
                    1 -> TourPage("👨‍👩‍👧‍👦", R.string.onb_kids_title, stringResource(R.string.onb_kids_sub), listOf("👤" to R.string.onb_kids_1, "📷" to R.string.onb_kids_2, "🔒" to R.string.onb_kids_3))
                    REWARDS_PAGE -> RewardsPage(currency, rewardMode, { rewardMode = it }, dailyText, { dailyText = it })
                    3 -> TourPage("🧹", R.string.onb_chores_title, stringResource(R.string.onb_chores_sub), listOf("📋" to R.string.onb_chores_1, "✨" to R.string.onb_chores_2, "💡" to R.string.onb_chores_3))
                    else -> TourPage("🚀", R.string.onb_kid_title,
                        state.profile?.kidLoginCode?.let { stringResource(R.string.onb_kid_sub_code, it.uppercase()) } ?: stringResource(R.string.onb_kid_sub),
                        listOf("🔢" to R.string.onb_kid_1, "👆" to R.string.onb_kid_2, "⚙️" to R.string.onb_kid_3))
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.Center) {
            repeat(PAGES) { i ->
                Box(Modifier.padding(4.dp).size(if (i == pager.currentPage) 10.dp else 8.dp).clip(CircleShape)
                    .background(if (i == pager.currentPage) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant))
            }
        }
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Button(onClick = { advance() }, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Text(stringResource(if (last) R.string.onb_add_first_child else R.string.next_label))
            }
            TextButton(onClick = { onFinish(false) }, enabled = last, modifier = Modifier.height(44.dp)) {
                if (last) Text(stringResource(R.string.onb_explore))
            }
        }
    }
}

@Composable
private fun TourPage(emoji: String, title: Int, subtitle: String, bullets: List<Pair<String, Int>>) {
    Text(emoji, style = MaterialTheme.typography.displayLarge)
    Spacer(Modifier.height(16.dp))
    Text(stringResource(title), style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
    Spacer(Modifier.height(6.dp))
    Text(subtitle, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
    Spacer(Modifier.height(28.dp))
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        bullets.forEach { (icon, res) ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(icon, style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.width(14.dp))
                Text(stringResource(res), style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}

@Composable
private fun RewardsPage(currency: String?, mode: String, onMode: (String) -> Unit, dailyText: String, onDaily: (String) -> Unit) {
    Text("💰", style = MaterialTheme.typography.displayLarge)
    Spacer(Modifier.height(16.dp))
    Text(stringResource(R.string.onb_rewards_title), style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
    Spacer(Modifier.height(6.dp))
    Text(stringResource(R.string.onb_rewards_sub), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
    Spacer(Modifier.height(24.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = mode == "flat", onClick = { onMode("flat") }, label = { Text(stringResource(R.string.onb_mode_flat)) })
        FilterChip(selected = mode == "per_chore", onClick = { onMode("per_chore") }, label = { Text(stringResource(R.string.settings_per_chore)) })
    }
    Spacer(Modifier.height(16.dp))
    if (mode == "flat") {
        Text(stringResource(R.string.onb_flat_help), style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(dailyText, onDaily, singleLine = true, modifier = Modifier.width(140.dp), prefix = { Text(Money.symbol(currency)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            Spacer(Modifier.width(10.dp))
            Text(stringResource(R.string.onb_per_day), style = MaterialTheme.typography.bodyLarge)
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(50, 100, 200, 500).forEach { c -> AssistChip(onClick = { onDaily(Money.plain(c, currency)) }, label = { Text(Money.format(c, currency)) }) }
        }
    } else {
        Text(stringResource(R.string.onb_per_chore_help), style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
    }
    Spacer(Modifier.height(16.dp))
    Text(stringResource(R.string.onb_change_anytime), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
}
