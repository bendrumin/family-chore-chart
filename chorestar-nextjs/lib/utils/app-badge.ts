/**
 * The installed web app's icon badge (Badging API): the web's at-a-glance
 * stand-in for the iOS Home Screen widget. Shows how many of the family's
 * chores are still due today.
 *
 * Supported in installed PWAs on Chromium desktop/Android and in Safari home
 * screen web apps; everywhere else every call here is a no-op.
 */

type BadgeNavigator = Pick<Navigator, 'setAppBadge' | 'clearAppBadge'>

/**
 * Chores still due today, or null while the numbers are loading (the badge is
 * left alone rather than flashed to zero). A kid's tick waiting for approval
 * is not done, so it still counts.
 */
export function badgeCountForToday(snapshot: { familyDone: number; familyTotal: number; loading: boolean }): number | null {
  if (snapshot.loading) return null
  return Math.max(0, snapshot.familyTotal - snapshot.familyDone)
}

function badgeNavigator(): BadgeNavigator | null {
  if (typeof navigator === 'undefined') return null
  if (typeof navigator.setAppBadge !== 'function' || typeof navigator.clearAppBadge !== 'function') return null
  return navigator
}

/** Sets the badge to `count`, clearing it at zero. */
export async function syncAppBadge(count: number, nav: BadgeNavigator | null = badgeNavigator()): Promise<void> {
  if (!nav) return
  try {
    if (count > 0) await nav.setAppBadge(count)
    else await nav.clearAppBadge()
  } catch {
    // Not installed, or badging permission denied: nothing to show.
  }
}

export async function clearAppBadge(nav: BadgeNavigator | null = badgeNavigator()): Promise<void> {
  if (!nav) return
  try {
    await nav.clearAppBadge()
  } catch {
    // Same as above.
  }
}
