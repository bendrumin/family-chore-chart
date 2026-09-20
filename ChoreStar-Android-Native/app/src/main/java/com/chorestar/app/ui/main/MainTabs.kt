package com.chorestar.app.ui.main

import androidx.annotation.StringRes
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
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
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
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.chorestar.app.R
import com.chorestar.app.data.ChoreStarRepository
import com.chorestar.app.ui.DashboardViewModel
import com.chorestar.app.ui.chores.ChoreEditorScreen
import com.chorestar.app.ui.chores.ChoresScreen
import com.chorestar.app.ui.components.LocalAvatarPhotoUrls
import com.chorestar.app.ui.components.UpgradePrompt
import com.chorestar.app.ui.family.ChildDetailScreen
import com.chorestar.app.ui.family.ChildEditorScreen
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

object Routes {
    const val CHILD_NEW = "child/new"
    const val CHILD_EDIT = "child/edit/{childId}"
    const val CHILD_DETAIL = "child/{childId}"
    const val CHORE_NEW = "chore/new?childId={childId}"
    const val CHORE_EDIT = "chore/edit/{choreId}"
    fun childEdit(id: String) = "child/edit/$id"
    fun childDetail(id: String) = "child/$id"
    fun choreNew(childId: String?) = "chore/new" + (childId?.let { "?childId=$it" } ?: "")
    fun choreEdit(id: String) = "chore/edit/$id"
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

    val onTab = backStack?.destination?.route?.let { r -> Tab.entries.any { it.route == r } } ?: true

    CompositionLocalProvider(LocalAvatarPhotoUrls provides state.photoUrls) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbar) },
            bottomBar = {
                if (onTab) NavigationBar {
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
                composable(Tab.Home.route) {
                    HomeScreen(state, onRefresh = vm::refresh, onOpenChores = { nav.navigate(Tab.Chores.route) }, onOpenChild = { nav.navigate(Routes.childDetail(it.id)) })
                }
                composable(Tab.Family.route) {
                    FamilyScreen(state, onAddChild = { nav.navigate(Routes.CHILD_NEW) }, onOpenChild = { nav.navigate(Routes.childDetail(it.id)) }, onEditChild = { nav.navigate(Routes.childEdit(it.id)) })
                }
                composable(Tab.Chores.route) {
                    ChoresScreen(state, onToggleToday = vm::toggleToday, onAddChore = { nav.navigate(Routes.choreNew(null)) }, onEditChore = { nav.navigate(Routes.choreEdit(it.id)) })
                }
                composable(Tab.Stats.route) { StatsScreen(state) }
                composable(Tab.Settings.route) { SettingsScreen(state, email = repository.currentEmail, onSignOut = vm::signOut) }

                composable(Routes.CHILD_NEW) { ChildEditorScreen(vm, child = null, onDone = { nav.popBackStack() }) }
                composable(Routes.CHILD_EDIT, arguments = listOf(navArgument("childId") { type = NavType.StringType })) { entry ->
                    val id = entry.arguments?.getString("childId")
                    ChildEditorScreen(vm, child = state.child(id), onDone = { nav.popBackStack() })
                }
                composable(Routes.CHILD_DETAIL, arguments = listOf(navArgument("childId") { type = NavType.StringType })) { entry ->
                    val id = entry.arguments?.getString("childId") ?: return@composable
                    ChildDetailScreen(
                        vm, childId = id,
                        onBack = { nav.popBackStack() },
                        onEditChild = { nav.navigate(Routes.childEdit(id)) },
                        onAddChore = { nav.navigate(Routes.choreNew(id)) },
                        onEditChore = { nav.navigate(Routes.choreEdit(it.id)) },
                    )
                }
                composable(Routes.CHORE_NEW, arguments = listOf(navArgument("childId") { type = NavType.StringType; nullable = true; defaultValue = null })) { entry ->
                    ChoreEditorScreen(vm, chore = null, preselectedChildId = entry.arguments?.getString("childId"), onDone = { nav.popBackStack() })
                }
                composable(Routes.CHORE_EDIT, arguments = listOf(navArgument("choreId") { type = NavType.StringType })) { entry ->
                    val id = entry.arguments?.getString("choreId")
                    ChoreEditorScreen(vm, chore = state.chore(id), preselectedChildId = null, onDone = { nav.popBackStack() })
                }
            }
        }
    }

    state.upgradePrompt?.let { type ->
        UpgradePrompt(
            type = type,
            currentCount = if (type == com.chorestar.app.ui.components.LimitType.Children) state.children.size else state.chores.size,
            limit = if (type == com.chorestar.app.ui.components.LimitType.Children) state.childLimit else state.choreLimit,
            onSeePlans = { vm.dismissUpgradePrompt(); nav.navigate(Tab.Settings.route) },
            onDismiss = vm::dismissUpgradePrompt,
        )
    }
}
