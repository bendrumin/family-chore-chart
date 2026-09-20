package com.chorestar.app.ui.main

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.annotation.StringRes
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.chorestar.app.R
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.chores.ChoresScreen
import com.chorestar.app.ui.family.FamilyScreen
import com.chorestar.app.ui.home.HomeScreen
import com.chorestar.app.ui.settings.SettingsScreen
import com.chorestar.app.ui.stats.StatsScreen

/** The five tabs the iOS app has, in the same order. */
enum class Tab(val route: String, @StringRes val label: Int, val icon: ImageVector) {
    Home("home", R.string.tab_home, Icons.Filled.Home),
    Family("family", R.string.tab_family, Icons.Filled.People),
    Chores("chores", R.string.tab_chores, Icons.Filled.Checklist),
    Stats("stats", R.string.tab_stats, Icons.Filled.BarChart),
    Settings("settings", R.string.tab_settings, Icons.Filled.Settings),
}

@Composable
fun MainTabs(repository: ChoreStarRepository) {
    val vm: DashboardViewModel = viewModel(factory = viewModelFactory { initializer { DashboardViewModel(repository) } })
    val state by vm.state.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(state.error) {
        state.error?.let { snackbar.showSnackbar(it.resolve(context)); vm.clearError() }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { tab ->
                    val selected = backStack?.destination?.hierarchy?.any { it.route == tab.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            nav.navigate(tab.route) {
                                popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(stringResource(tab.label)) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(nav, startDestination = Tab.Home.route, modifier = Modifier.padding(padding)) {
            composable(Tab.Home.route) { HomeScreen(state, onRefresh = vm::refresh, onOpenChores = { nav.navigate(Tab.Chores.route) }) }
            composable(Tab.Family.route) { FamilyScreen(state) }
            composable(Tab.Chores.route) { ChoresScreen(state, onToggleToday = vm::toggleToday) }
            composable(Tab.Stats.route) { StatsScreen(state) }
            composable(Tab.Settings.route) { SettingsScreen(state, email = repository.currentEmail, onSignOut = vm::signOut) }
        }
    }
}
