import Foundation

/// Which chores a Home Screen widget row may check off, and what a tick does.
/// Pure so it can be unit tested; `SupabaseManager.completeChoreFromWidget`
/// feeds it live state.
///
/// A widget tick is a PARENT's tick: it lands approved, and a kid's pending
/// tick under it is an approval. Only chores due today can be ticked, and
/// nothing is due on a vacation day.
enum WidgetTicks {

    enum Decision: Equatable {
        /// Insert an approved completion for today.
        case complete
        /// Approve the kid's waiting tick with this completion id.
        case approve(completionId: UUID)
        case alreadyDone
        case notDueToday
        case onVacation
        /// Not one of the family's active chores (deleted, or stale data).
        case unknownChore
        /// A kid is signed in on this device; a kid must not approve for a parent.
        case kidSessionActive
        case signedOut
    }

    /// - Parameters:
    ///   - chores: the family's active chores.
    ///   - todayIndex: 0 = Sunday .. 6 = Saturday.
    ///   - done: ids of chores with an approved completion today.
    ///   - pending: chore id -> completion id of kid ticks waiting today.
    static func decision(
        choreId: UUID,
        chores: [Chore],
        todayIndex: Int,
        onVacationToday: Bool,
        done: Set<UUID>,
        pending: [UUID: UUID],
        kidSessionActive: Bool
    ) -> Decision {
        if kidSessionActive { return .kidSessionActive }
        guard let chore = chores.first(where: { $0.id == choreId }) else { return .unknownChore }
        if onVacationToday { return .onVacation }
        guard chore.isDue(on: todayIndex) else { return .notDueToday }
        if let completionId = pending[choreId] { return .approve(completionId: completionId) }
        if done.contains(choreId) { return .alreadyDone }
        return .complete
    }

    /// Today's remaining rows for one child: due and not yet approved, in the
    /// order given. A pending chore stays on the list, flagged, since it does
    /// not count until a parent OKs it.
    static func remainingItems(due: [Chore], done: Set<UUID>, pending: Set<UUID>) -> [WidgetSnapshot.ChoreItem] {
        due.filter { !done.contains($0.id) }.map { chore in
            WidgetSnapshot.ChoreItem(
                id: chore.id,
                name: chore.name,
                emoji: emoji(from: chore.icon),
                isPending: pending.contains(chore.id) ? true : nil
            )
        }
    }

    /// The icon when it is an emoji (same test as `AdaptiveIcon`); nil for SF
    /// Symbol names and bundled icon art, which the widget cannot draw.
    static func emoji(from icon: String?) -> String? {
        guard let icon, let first = icon.unicodeScalars.first,
              first.properties.isEmoji, !first.isASCII else { return nil }
        return icon
    }
}

/// App-target half of `CompleteChoreIntent`: the intent runs in this process,
/// where the parent's Supabase session lives.
enum WidgetTickPerformer {
    static func perform(choreId: UUID) async {
        await SupabaseManager.shared.completeChoreFromWidget(choreId: choreId)
    }
}

extension SupabaseManager {

    /// Checks off `choreId` for today on behalf of the signed-in parent, from
    /// a widget tap. May run in a background launch with nothing loaded yet.
    ///
    /// The widget updates optimistically first, then the write goes through
    /// the same `toggleChoreCompletion` / `approveCompletion` paths the app
    /// uses, and the real snapshot is republished. Anything refused (kid
    /// session, signed out, not due, vacation) puts the widget back.
    @discardableResult
    func completeChoreFromWidget(choreId: UUID) async -> WidgetTicks.Decision {
        let shown = WidgetSnapshot.load()

        if await MainActor.run(body: { hasKidSessionOnDevice }) {
            republishDisplayOnly(shown)
            return .kidSessionActive
        }

        if let shown, shown.allowsTicks(), let optimistic = shown.markingDone(choreId: choreId) {
            optimistic.publish()
        }

        if !(await MainActor.run(body: { isAuthenticated })) {
            await checkAuthStatus()
        }
        guard await MainActor.run(body: { isAuthenticated }) else {
            republishDisplayOnly(shown)
            return .signedOut
        }

        // A background launch has nothing in memory, and a warm app may be
        // stale (a kid ticked on their own device, a co-parent edited chores).
        // Decide against fresh rows so a tick never deletes a completion.
        let knowsChore = await MainActor.run(body: { initialDataLoaded && chores.contains { $0.id == choreId } })
        if knowsChore {
            await loadFamilySettings()
            await loadCurrentDayCompletions()
        } else {
            await loadRemoteData()
        }

        let (decision, chore): (WidgetTicks.Decision, Chore?) = await MainActor.run {
            let today = todayIndex
            let done = Set(choreCompletions.filter { Calendar.current.isDateInToday($0.value) }.keys)
            var pending: [UUID: UUID] = [:]
            for p in pendingCompletions where p.dayOfWeek == today { pending[p.choreId] = p.id }
            let decision = WidgetTicks.decision(
                choreId: choreId,
                chores: chores,
                todayIndex: today,
                onVacationToday: isVacationDay(Date()),
                done: done,
                pending: pending,
                kidSessionActive: hasKidSessionOnDevice
            )
            return (decision, chores.first { $0.id == choreId })
        }

        switch decision {
        case .complete:
            if let chore {
                _ = await toggleChoreCompletion(chore, forDay: todayIndex)
            }
        case .approve(let completionId):
            await approveCompletion(id: completionId)
        default:
            break
        }

        await MainActor.run {
            // A failed load leaves nothing to publish; keep what was showing
            // rather than blank the widget.
            if children.isEmpty, let shown {
                shown.publish()
            } else {
                publishWidgetSnapshot()
            }
        }
        return decision
    }

    private func republishDisplayOnly(_ snapshot: WidgetSnapshot?) {
        guard var snapshot else { return }
        snapshot.canTick = false
        snapshot.publish()
    }
}
