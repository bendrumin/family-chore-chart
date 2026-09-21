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
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.chorestar.app.ChoreStarApp
import com.chorestar.app.notify.Push
import com.chorestar.app.R
import com.chorestar.app.ui.achievements.AchievementUnlockedDialog
import com.chorestar.app.ui.achievements.AchievementsScreen
import com.chorestar.app.ui.routines.RoutineBuilderScreen
import com.chorestar.app.ui.routines.RoutinePlayerScreen
import com.chorestar.app.ui.routines.StarterRoutinesScreen
import com.chorestar.app.ui.settings.DeleteAccountScreen
import com.chorestar.app.ui.settings.FamilySharingScreen
import com.chorestar.app.ui.settings.PaywallScreen
import com.chorestar.app.ui.settings.WhatsNewScreen
import com.chorestar.app.ui.settings.Changelog
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import com.chorestar.app.ui.settings.RewardStoreScreen
import com.chorestar.app.ui.settings.RewardsSettingsScreen
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
import com.chorestar.app.ui.kid.ChildAuthScreen
import com.chorestar.app.ui.kid.ChildMainScreen
import com.chorestar.app.ui.kid.KidBackend
import com.chorestar.app.ui.kid.KidViewModel
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
    const val SETTINGS_REWARDS = "settings/rewards"
    const val SETTINGS_SHARING = "settings/sharing"
    const val SETTINGS_STORE = "settings/store"
    const val SETTINGS_DELETE = "settings/delete"
    const val PAYWALL = "paywall"
    const val KID_AUTH = "kid/auth"
    const val WHATS_NEW = "whatsnew"
    const val ROUTINE_NEW = "routine/new?childId={childId}"
    const val ROUTINE_EDIT = "routine/edit/{routineId}"
    const val ROUTINES_STARTER = "routines/starter"
    const val ROUTINE_PLAY = "routine/play/{routineId}"
    const val ACHIEVEMENTS = "achievements/{childId}"
    fun routineNew(childId: String?) = "routine/new" + (childId?.let { "?childId=$it" } ?: "")
    fun routineEdit(id: String) = "routine/edit/$id"
    fun routinePlay(id: String) = "routine/play/$id"
    fun achievements(childId: String) = "achievements/$childId"
}

@Composable
fun MainTabs(repository: ChoreStarRepository) {
    val app = LocalContext.current.applicationContext as ChoreStarApp
    val vm: DashboardViewModel = viewModel(factory = viewModelFactory { initializer {
        DashboardViewModel(repository, onTheme = { app.theme.value = it }, onSnapshot = { snap ->
            app.prefs.widgetSnapshotJson = com.chorestar.app.data.SupabaseModule.json.encodeToString(com.chorestar.app.widget.WidgetSnapshot.serializer(), snap)
            kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Default).launch { com.chorestar.app.widget.TodayWidget.refresh(app) }
        }, onBeforeSignOut = { Push.unregister(app, repository) })
    } })
    // Activity alerts: ask once for the notification permission, then register this phone's FCM token.
    // (The same grant lets the kid-mode routine player post its ongoing notification.)
    val askNotifications = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33 && app.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        Push.register(app, repository)
    }
    var showWhatsNew by remember { mutableStateOf(app.prefs.whatsNewSeen != null && app.prefs.whatsNewSeen != Changelog.LATEST) }
    LaunchedEffect(Unit) { if (app.prefs.whatsNewSeen == null) app.prefs.whatsNewSeen = Changelog.LATEST }
    val state by vm.state.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current

    LaunchedEffect(state.error) {
        state.error?.let { snackbar.showSnackbar(it.resolve(context)); vm.clearError() }
    }

    val onTab = backStack?.destination?.route?.let { r -> Tab.entries.any { it.route == r } } ?: true

    // A tapped activity alert (or the /dashboard App Link) lands on Home, where the tray shows what needs a parent.
    val pendingLink by app.pendingLink.collectAsStateWithLifecycle()
    var inviteCode by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(pendingLink) {
        val link = pendingLink ?: return@LaunchedEffect
        if (com.chorestar.app.BuildConfig.DEBUG) android.util.Log.d("Links", "MainTabs sees $link")
        if (link.startsWith("/dashboard")) {
            app.pendingLink.value = null
            if (state.kidModeChildId == null) nav.navigate(Tab.Home.route) { popUpTo(nav.graph.findStartDestination().id) { saveState = true }; launchSingleTop = true; restoreState = true }
            vm.refresh()
        } else if (link.startsWith("/family/accept/")) {
            inviteCode = link.removePrefix("/family/accept/").substringBefore('?').trim('/').takeIf { it.isNotBlank() }
            app.pendingLink.value = null
        } else if (link.startsWith("/reset-password")) {
            // Signed in already: the web's reset link cannot be used here, but Settings can change the password.
            app.pendingLink.value = null
            snackbar.showSnackbar(context.getString(R.string.reset_link_signed_in))
        } else if (!link.startsWith("/kid-login")) app.pendingLink.value = null
    }
    inviteCode?.let { code ->
        InviteDialog(code, repository, onClose = { inviteCode = null }, onJoined = { name ->
            inviteCode = null
            vm.refresh()
            kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch { snackbar.showSnackbar(context.getString(R.string.invite_joined, name)) }
        })
    }

    // Kid mode on this phone replaces the whole parent UI until the kid signs out.
    state.kidModeChildId?.let { childId ->
        val kidVm: KidViewModel = viewModel(key = "kidmode-$childId", factory = viewModelFactory {
            initializer {
                KidViewModel(KidBackend.OnParentDevice(childId), repository, repository.kid, parentState = { vm.state.value },
                    onParentToggle = { chore, on -> vm.kidToggle(chore, on) }, onParentRoutineDone = { r, done, secs -> vm.completeRoutine(r, childId, done, secs) },
                    onTheme = {}, onSignOut = { vm.exitKidMode() })
            }
        })
        LaunchedEffect(state.completions, state.completedRoutineIds, state.achievements) { kidVm.syncFromParent() }
        CompositionLocalProvider(LocalAvatarPhotoUrls provides state.photoUrls) { ChildMainScreen(kidVm) }
        return
    }

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
                    HomeScreen(vm, state, onOpenChores = { nav.navigate(Tab.Chores.route) }, onOpenChild = { nav.navigate(Routes.childDetail(it.id)) }, onOpenFamily = { nav.navigate(Tab.Family.route) },
                        onKidMode = { nav.navigate(Routes.KID_AUTH) })
                }
                composable(Tab.Family.route) {
                    FamilyScreen(state, onAddChild = { nav.navigate(Routes.CHILD_NEW) }, onOpenChild = { nav.navigate(Routes.childDetail(it.id)) }, onEditChild = { nav.navigate(Routes.childEdit(it.id)) })
                }
                composable(Tab.Chores.route) {
                    ChoresScreen(
                        vm, state, onToggleToday = vm::toggleToday, onAddChore = { nav.navigate(Routes.choreNew(null)) }, onEditChore = { nav.navigate(Routes.choreEdit(it.id)) },
                        onBuildRoutine = { nav.navigate(Routes.routineNew(null)) }, onStarterRoutines = { nav.navigate(Routes.ROUTINES_STARTER) }, onEditRoutine = { nav.navigate(Routes.routineEdit(it.id)) },
                    )
                }
                composable(Tab.Stats.route) { StatsScreen(state) }
                composable(Tab.Settings.route) {
                    SettingsScreen(vm, state, email = repository.currentEmail, onSignOut = vm::signOut, onNavigate = { nav.navigate(it) })
                }
                composable(Routes.SETTINGS_REWARDS) { RewardsSettingsScreen(vm, state, onBack = { nav.popBackStack() }) }
                composable(Routes.SETTINGS_SHARING) { FamilySharingScreen(vm, state, onBack = { nav.popBackStack() }, onPaywall = { nav.navigate(Routes.PAYWALL) }) }
                composable(Routes.SETTINGS_STORE) { RewardStoreScreen(vm, state, onBack = { nav.popBackStack() }) }
                composable(Routes.SETTINGS_DELETE) { DeleteAccountScreen(vm, state, onBack = { nav.popBackStack() }) }
                composable(Routes.PAYWALL) { PaywallScreen(vm, state, onBack = { nav.popBackStack() }) }
                composable(Routes.WHATS_NEW) { WhatsNewScreen(onBack = { nav.popBackStack() }) }
                composable(Routes.KID_AUTH) {
                    ChildAuthScreen(state, repository.kid, onBack = { nav.popBackStack() }, onAuthenticated = { c -> nav.popBackStack(); vm.enterKidMode(c.id) })
                }

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
                        onAchievements = { nav.navigate(Routes.achievements(id)) },
                    )
                }
                composable(Routes.ROUTINE_NEW, arguments = listOf(navArgument("childId") { type = NavType.StringType; nullable = true; defaultValue = null })) { entry ->
                    RoutineBuilderScreen(vm, state, routine = null, preselectedChildId = entry.arguments?.getString("childId"), onDone = { nav.popBackStack() })
                }
                composable(Routes.ROUTINE_EDIT, arguments = listOf(navArgument("routineId") { type = NavType.StringType })) { entry ->
                    val r = state.routines.firstOrNull { it.id == entry.arguments?.getString("routineId") }
                    RoutineBuilderScreen(vm, state, routine = r, preselectedChildId = null, onDone = { nav.popBackStack() })
                }
                composable(Routes.ROUTINES_STARTER) { StarterRoutinesScreen(vm, state, onDone = { nav.popBackStack() }) }
                composable(Routes.ROUTINE_PLAY, arguments = listOf(navArgument("routineId") { type = NavType.StringType })) { entry ->
                    val r = state.routines.firstOrNull { it.id == entry.arguments?.getString("routineId") } ?: return@composable
                    RoutinePlayerScreen(r, childName = state.child(r.childId)?.name ?: "", currency = state.currency,
                        onComplete = { done, secs -> vm.completeRoutine(r, r.childId, done, secs) }, onClose = { nav.popBackStack() })
                }
                composable(Routes.ACHIEVEMENTS, arguments = listOf(navArgument("childId") { type = NavType.StringType })) { entry ->
                    val id = entry.arguments?.getString("childId") ?: return@composable
                    AchievementsScreen(childName = state.child(id)?.name ?: "", progress = state.achievementProgress(id), onBack = { nav.popBackStack() })
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

    AchievementUnlockedDialog(state.unlocked, onDismiss = vm::clearUnlocked)

    if (showWhatsNew) {
        val latest = Changelog.entries.first()
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showWhatsNew = false; app.prefs.whatsNewSeen = Changelog.LATEST },
            title = { Text("✨ " + latest.title) },
            text = { androidx.compose.foundation.layout.Column { latest.features.forEach { f -> Text("${f.icon} ${f.title}", style = androidx.compose.material3.MaterialTheme.typography.titleSmall); Text(f.description, style = androidx.compose.material3.MaterialTheme.typography.bodySmall) } } },
            confirmButton = { androidx.compose.material3.TextButton(onClick = { showWhatsNew = false; app.prefs.whatsNewSeen = Changelog.LATEST; nav.navigate(Routes.WHATS_NEW) }) { Text(stringResource(R.string.whats_new)) } },
            dismissButton = { androidx.compose.material3.TextButton(onClick = { showWhatsNew = false; app.prefs.whatsNewSeen = Changelog.LATEST }) { Text(stringResource(R.string.ok_label)) } },
        )
    }

    state.upgradePrompt?.let { type ->
        UpgradePrompt(
            type = type,
            currentCount = if (type == com.chorestar.app.ui.components.LimitType.Children) state.children.size else state.chores.size,
            limit = if (type == com.chorestar.app.ui.components.LimitType.Children) state.childLimit else state.choreLimit,
            onSeePlans = { vm.dismissUpgradePrompt(); nav.navigate(Routes.PAYWALL) },
            onDismiss = vm::dismissUpgradePrompt,
        )
    }
}

/** "Join the Smith family?" for an emailed co-parent invite link; accepts through the web API. */
@Composable
private fun InviteDialog(code: String, repository: ChoreStarRepository, onClose: () -> Unit, onJoined: (String) -> Unit) {
    var info by remember(code) { mutableStateOf<ChoreStarRepository.InviteInfo?>(null) }
    var loading by remember(code) { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    LaunchedEffect(code) {
        info = repository.inviteInfo(code)
        loading = false
        error = when {
            info == null -> context.getString(R.string.invite_invalid)
            info!!.expired -> context.getString(R.string.invite_invalid)
            info!!.status != "pending" -> context.getString(R.string.invite_used)
            else -> null
        }
    }
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onClose,
        title = { Text(if (loading || info == null) stringResource(R.string.invite_co_parent) else stringResource(R.string.invite_title, info!!.familyName)) },
        text = {
            if (loading) androidx.compose.material3.CircularProgressIndicator()
            else Text(error ?: stringResource(R.string.invite_body))
        },
        confirmButton = {
            if (!loading && error == null) androidx.compose.material3.TextButton(enabled = !busy, onClick = {
                busy = true
                scope.launch {
                    repository.acceptInvite(code)
                        .onSuccess { onJoined(info?.familyName ?: "") }
                        .onFailure { e ->
                            val m = e.message ?: ""
                            error = when {
                                m.contains("different email", true) -> context.getString(R.string.invite_wrong_email)
                                m.contains("own family", true) -> context.getString(R.string.join_own_family)
                                m.contains("expired", true) || m.contains("not found", true) -> context.getString(R.string.invite_invalid)
                                m.contains("already", true) -> context.getString(R.string.invite_used)
                                else -> m
                            }
                            busy = false
                        }
                }
            }) { Text(stringResource(R.string.invite_join)) }
        },
        dismissButton = { androidx.compose.material3.TextButton(onClick = onClose) { Text(stringResource(if (error == null) R.string.cancel else R.string.ok_label)) } },
    )
}
