import SwiftUI

struct WeekCalendarView: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager
    @State private var showConfetti = false
    @State private var showAchievementAlert = false
    @State private var earnedAchievements: [Achievement] = []
    @State private var viewMode: ViewMode = .daily
    // Bulk completion ("Mark Today Done" / "Mark Week So Far Done")
    @State private var bulkPlan: SupabaseManager.BulkCompletePlan?
    @State private var bulkTodayOnly = false
    @State private var showBulkConfirm = false
    @State private var showAllCaughtUp = false
    @State private var bulkBusy = false
    // The week the grid shows, keyed the way chore_completions.week_start is.
    // Starts on (and for kid sessions stays on) the current week.
    @State private var viewedWeekStart: String = RewardMath.weekStartString()
    @Environment(\.horizontalSizeClass) var horizontalSizeClass

    enum ViewMode {
        case daily, grid
    }

    private let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    private let fullDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    private var childChores: [Chore] {
        manager.chores.filter { $0.childId == child.id }
    }

    private var currentDayOfWeek: Int {
        Calendar.current.component(.weekday, from: Date()) - 1
    }

    private var currentWeekStart: String {
        RewardMath.weekStartString()
    }

    private var isViewingCurrentWeek: Bool {
        viewedWeekStart == currentWeekStart
    }

    /// Kids keep the today-focused view: no week navigation in a standalone
    /// kid session or kid mode on the parent's device.
    private var isKidSession: Bool {
        manager.kidModeSession != nil || manager.isChildSession
    }

    /// "This week", or "Week of Sep 6" ("Week of Dec 28, 2025" across a year
    /// boundary), matching the web navigator's label.
    private var weekLabel: String {
        if isViewingCurrentWeek { return "This week" }
        guard let start = RewardMath.date(weekStart: viewedWeekStart, dayIndex: 0) else {
            return "Week of \(viewedWeekStart)"
        }
        let calendar = Calendar.current
        let sameYear = calendar.component(.year, from: start) == calendar.component(.year, from: Date())
        let style: Date.FormatStyle = sameYear
            ? .dateTime.month(.abbreviated).day()
            : .dateTime.month(.abbreviated).day().year()
        return "Week of \(start.formatted(style))"
    }

    private func goToWeek(offset: Int) {
        let target = RewardMath.weekStart(viewedWeekStart, offsetBy: offset)
        // Never past the current week. Keys are yyyy-MM-dd, so string order
        // is date order.
        viewedWeekStart = min(target, currentWeekStart)
    }

    // Responsive sizing based on device
    private var choreColumnWidth: CGFloat {
        horizontalSizeClass == .regular ? 200 : 140
    }

    private var cellSize: CGFloat {
        horizontalSizeClass == .regular ? 60 : 50
    }

    /// Summary numbers for the VIEWED week; same rules as the current week.
    private var weekCompletionStats: RewardMath.WeekStats {
        manager.weekStats(for: child.id, weekStart: viewedWeekStart)
    }

    private func isDayPerfect(_ dayIndex: Int) -> Bool {
        weekCompletionStats.perfectDays[dayIndex]
    }

    private func dayEarnings(_ dayIndex: Int) -> Double {
        Double(weekCompletionStats.dayEarningsCents[dayIndex]) / 100.0
    }

    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(spacing: 20) {
                    // Header: one compact line. The nav bar already says
                    // "Week View" and the child pills sit above, so the old
                    // title + "tap any cell" hint stacked three headers
                    // before any content.
                    Text("\(child.name)'s Week")
                        .font(.display(22, weight: .bold))
                        .foregroundColor(.choreStarTextPrimary)
                        .padding(.top, 8)
                
                // View Mode Picker
                Picker("View Mode", selection: $viewMode) {
                    Text("Daily List").tag(ViewMode.daily)
                    Text("Week View").tag(ViewMode.grid)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)

                // Week navigation (parents only; kids keep today's view).
                // Back is unlimited, forward stops at the current week.
                if !isKidSession {
                    weekNavigator
                }

                // Week Summary Card
                if !childChores.isEmpty {
                    VStack(spacing: 16) {
                        HStack(spacing: 16) {
                            VStack(spacing: 4) {
                                Text("\(weekCompletionStats.perfectDayCount)")
                                    .font(.display(30, weight: .bold))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.5)
                                    .foregroundColor(.choreStarTextPrimary)
                                Image(systemName: "star.fill")
                                    .font(.caption)
                                    .foregroundColor(.choreStarAccent)
                                Text("Perfect Days")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            .frame(maxWidth: .infinity)
                            
                            Divider()
                                .frame(height: 60)
                            
                            VStack(spacing: 4) {
                                // Amounts like "$12.50" overflow the narrow
                                // column at a fixed 36pt and wrapped to two
                                // lines; scale down instead of wrapping.
                                Text(manager.formatMoney(Double(weekCompletionStats.perfectDayEarningsCents) / 100.0))
                                    .font(.display(30, weight: .bold))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.5)
                                    .foregroundColor(.choreStarTextPrimary)
                                Image(systemName: "dollarsign.circle.fill")
                                    .font(.caption)
                                    .foregroundColor(.choreStarAccent)
                                Text("Earned")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            .frame(maxWidth: .infinity)
                            
                            Divider()
                                .frame(height: 60)
                            
                            VStack(spacing: 4) {
                                Text("\(weekCompletionStats.percentage)%")
                                    .font(.display(30, weight: .bold))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.5)
                                    .foregroundColor(.choreStarTextPrimary)
                                Image(systemName: "chart.bar.fill")
                                    .font(.caption)
                                    .foregroundColor(.choreStarSuccess)
                                Text("Complete")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            .frame(maxWidth: .infinity)
                        }
                        
                        // The daily-bonus explainer only makes sense in flat
                        // daily-rate mode; per-chore families were shown a
                        // confusing "$0.07" line that had nothing to do with
                        // their per-chore rewards.
                        if manager.familySettings?.isPerChoreMode != true {
                            HStack(spacing: 6) {
                                Image(systemName: "info.circle.fill")
                                    .font(.caption)
                                Text("Complete all chores in a day to earn \(manager.formatMoney(Double(manager.familySettings?.dailyRewardCents ?? 100) / 100.0))")
                                    .font(.caption)
                            }
                            .foregroundColor(.choreStarTextSecondary)
                        }
                    }
                    .padding(20)
                    .background(Color.choreStarCardBackground)
                    .cornerRadius(20)
                    .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
                    .padding(.horizontal, 20)
                }
                
                if childChores.isEmpty {
                    EmptyWeekView(childName: child.name)
                } else if viewMode == .daily {
                    // DAILY LIST VIEW
                    VStack(spacing: 16) {
                        ForEach(ChoreSchedule.displayOrder(), id: \.self) { dayIndex in
                            DayBreakdownCard(
                                dayIndex: dayIndex,
                                dayName: fullDays[dayIndex],
                                shortDayName: days[dayIndex],
                                chores: manager.dueChores(for: child.id, on: dayIndex, weekStart: viewedWeekStart),
                                weekStart: viewedWeekStart,
                                isCurrentWeek: isViewingCurrentWeek,
                                manager: manager,
                                earnedAchievements: $earnedAchievements,
                                showAchievementAlert: $showAchievementAlert,
                                showConfetti: $showConfetti
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                } else {
                    // WEEK VIEW (GRID): seven flexible columns that fit any
                    // width, no horizontal scrolling. Chore info sits ABOVE
                    // its row of cells (the web grid's shape), so the columns
                    // share the full card width on iPhone; iPad caps the card
                    // at a comfortable width instead of stretching cells.
                    VStack(spacing: 0) {
                            // Day headers — same spacing and padding as the
                            // cell rows below so the columns line up.
                            HStack(spacing: 6) {
                                ForEach(ChoreSchedule.displayOrder(), id: \.self) { dayIndex in
                                    VStack(spacing: 6) {
                                        Text(days[dayIndex])
                                            .font(.subheadline)
                                            .fontWeight(.bold)

                                        if isViewingCurrentWeek && dayIndex == currentDayOfWeek {
                                            Circle()
                                                .fill(Color.choreStarPrimary)
                                                .frame(width: 6, height: 6)
                                        } else {
                                            Circle()
                                                .fill(Color.clear)
                                                .frame(width: 6, height: 6)
                                        }

                                        // Show earnings if perfect day
                                        if isDayPerfect(dayIndex) {
                                            Text(manager.formatMoney(dayEarnings(dayIndex)))
                                                .font(.caption2)
                                                .fontWeight(.bold)
                                                .foregroundColor(.choreStarAccent)
                                                .lineLimit(1)
                                                .minimumScaleFactor(0.6)
                                                .padding(.horizontal, 4)
                                                .padding(.vertical, 2)
                                                .background(Color.choreStarAccent.opacity(0.15))
                                                .cornerRadius(6)
                                        }
                                    }
                                    .frame(maxWidth: .infinity)
                                    .foregroundColor(isViewingCurrentWeek && dayIndex == currentDayOfWeek ? .choreStarPrimary : .choreStarTextSecondary)
                                }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 14)
                            .background(Color.choreStarCardBackground)

                            Divider()

                            // Chore rows
                            ForEach(Array(childChores.enumerated()), id: \.element.id) { index, chore in
                                ChoreWeekRow(
                                    chore: chore,
                                    child: child,
                                    weekStart: viewedWeekStart,
                                    isCurrentWeek: isViewingCurrentWeek,
                                    manager: manager,
                                    earnedAchievements: $earnedAchievements,
                                    showAchievementAlert: $showAchievementAlert,
                                    showConfetti: $showConfetti,
                                    cellHeight: cellSize,
                                    isEvenRow: index % 2 == 0
                                )

                                if index < childChores.count - 1 {
                                    Divider()
                                        .padding(.horizontal, 12)
                                }
                            }
                        }
                        .background(Color.choreStarCardBackground)
                        .cornerRadius(20)
                        .shadow(color: .black.opacity(0.08), radius: 6, x: 0, y: 2)
                        .frame(maxWidth: horizontalSizeClass == .regular ? 560 : .infinity)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, 16)
                }
                
                    // Clear the floating tab bar so the last row's cells are
                    // never trapped underneath it.
                    Spacer(minLength: 110)
                }
            }
            .background(Color.choreStarBackground)
        }
        .navigationTitle("Week View")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button {
                        prepareBulk(todayOnly: true)
                    } label: {
                        Label("Mark Today Done", systemImage: "checkmark.circle")
                    }
                    Button {
                        prepareBulk(todayOnly: false)
                    } label: {
                        Label("Mark Week So Far Done", systemImage: "calendar.badge.checkmark")
                    }
                } label: {
                    Image(systemName: "checkmark.circle")
                }
                .accessibilityLabel("Mark chores done in bulk")
                // Bulk actions describe the CURRENT week ("today", "so far");
                // they stay off while a past week is on screen.
                .disabled(childChores.isEmpty || bulkBusy || !isViewingCurrentWeek)
            }
        }
        .overlay(alignment: .top) {
            if showAllCaughtUp {
                Label("All caught up", systemImage: "checkmark.seal.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.choreStarSuccess)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        Capsule()
                            .fill(Color.choreStarCardBackground)
                            .shadow(color: .black.opacity(0.12), radius: 8, x: 0, y: 3)
                    )
                    .padding(.top, 10)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .confetti(isPresented: $showConfetti)
        .alert(
            bulkTodayOnly ? "Mark Today Done" : "Mark Week So Far Done",
            isPresented: $showBulkConfirm,
            presenting: bulkPlan
        ) { _ in
            Button("Cancel", role: .cancel) { }
            Button("Mark Done") { runBulk() }
        } message: { plan in
            Text(bulkConfirmMessage(plan))
        }
        .alert("Achievement unlocked", isPresented: $showAchievementAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            if let first = earnedAchievements.first {
                Text("\(first.badgeIcon) \(first.badgeName)\n\(first.badgeDescription)")
            }
        }
    }

    // MARK: - Week navigation

    /// Prev/next chevrons around a "Week of <date>" label, the iOS sibling of
    /// the web's WeekNavigator: back unlimited, forward capped at the current
    /// week, with a quiet jump back to today when viewing history.
    private var weekNavigator: some View {
        HStack(spacing: 8) {
            Button {
                goToWeek(offset: -1)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.choreStarLink)
                    .frame(width: 44, height: 44)
                    .background(Color.choreStarBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .accessibilityLabel("Previous week")

            VStack(spacing: 2) {
                Text(weekLabel)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.choreStarTextPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)

                if !isViewingCurrentWeek {
                    Button("Back to this week") {
                        viewedWeekStart = currentWeekStart
                    }
                    .font(.caption)
                    .foregroundColor(.choreStarLink)
                }
            }
            .frame(maxWidth: .infinity)

            Button {
                goToWeek(offset: 1)
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.choreStarLink)
                    .frame(width: 44, height: 44)
                    .background(Color.choreStarBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(isViewingCurrentWeek)
            .opacity(isViewingCurrentWeek ? 0.35 : 1)
            .accessibilityLabel("Next week")
        }
        .padding(8)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
        .padding(.horizontal, 20)
        .animation(.easeInOut(duration: 0.15), value: isViewingCurrentWeek)
    }

    // MARK: - Bulk completion

    /// Compute the plan and either confirm it or say there is nothing to do.
    private func prepareBulk(todayOnly: Bool) {
        let fromDay = todayOnly ? currentDayOfWeek : 0
        let plan = manager.bulkCompletePlan(for: child, throughDay: currentDayOfWeek, fromDay: fromDay)
        if plan.isEmpty {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                showAllCaughtUp = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                withAnimation(.easeOut(duration: 0.25)) {
                    showAllCaughtUp = false
                }
            }
            return
        }
        bulkTodayOnly = todayOnly
        bulkPlan = plan
        showBulkConfirm = true
    }

    /// "This will check off 3 chores for Emma and add $0.75 to the week's
    /// earnings." The money comes from the real reward math, so daily mode
    /// (paid per perfect day) reads right too.
    private func bulkConfirmMessage(_ plan: SupabaseManager.BulkCompletePlan) -> String {
        let count = plan.cellCount
        let choreText = count == 1 ? "1 chore" : "\(count) chores"
        var text = "This will check off \(choreText) for \(child.name)"
        if plan.earningsDeltaCents > 0 {
            text += " and add \(manager.formatMoney(Double(plan.earningsDeltaCents) / 100.0)) to the week's earnings."
        } else {
            text += "."
        }
        if !plan.pendingIds.isEmpty {
            let waiting = plan.pendingIds.count
            text += waiting == 1
                ? " 1 chore waiting for your OK will be approved."
                : " \(waiting) chores waiting for your OK will be approved."
        }
        return text
    }

    private func runBulk() {
        let fromDay = bulkTodayOnly ? currentDayOfWeek : 0
        bulkBusy = true
        Task {
            let achievements = await manager.markComplete(
                child: child,
                throughDay: currentDayOfWeek,
                fromDay: fromDay
            )
            await MainActor.run {
                bulkBusy = false
                bulkPlan = nil
                Haptics.success()
                SoundManager.shared.play(.success)
                showConfetti = true
                if !achievements.isEmpty {
                    earnedAchievements = achievements
                    showAchievementAlert = true
                }
            }
        }
    }
}

struct ChoreWeekRow: View {
    let chore: Chore
    let child: Child
    let weekStart: String
    let isCurrentWeek: Bool
    @ObservedObject var manager: SupabaseManager
    @Binding var earnedAchievements: [Achievement]
    @Binding var showAchievementAlert: Bool
    @Binding var showConfetti: Bool
    let cellHeight: CGFloat
    let isEvenRow: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Chore info on its own line, so the seven cells below share the
            // full card width and the grid never scrolls sideways.
            HStack(spacing: 8) {
                AdaptiveIcon(icon: chore.icon ?? "📝", fallbackSymbol: "checklist", tint: Color.fromString(chore.color ?? ""), iconSize: 22)
                    .frame(width: 26, height: 26)

                Text(chore.name)
                    .font(.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextPrimary)
                    .lineLimit(1)

                if !chore.isEveryDay {
                    HStack(spacing: 3) {
                        Image(systemName: "calendar")
                            .font(.system(size: 9))
                        Text(chore.scheduleLabel)
                            .font(.caption)
                    }
                    .foregroundColor(.choreStarTextSecondary)
                    .lineLimit(1)
                }

                Spacer(minLength: 0)
            }

            // Day cells — seven flexible columns aligned with the header.
            HStack(spacing: 6) {
                ForEach(ChoreSchedule.displayOrder(), id: \.self) { dayIndex in
                    DayCell(
                        chore: chore,
                        dayIndex: dayIndex,
                        weekStart: weekStart,
                        isCurrentWeek: isCurrentWeek,
                        manager: manager,
                        earnedAchievements: $earnedAchievements,
                        showAchievementAlert: $showAchievementAlert,
                        showConfetti: $showConfetti,
                        cellHeight: cellHeight
                    )
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .background(isEvenRow ? Color.choreStarBackground.opacity(0.3) : Color.clear)
    }
}

struct DayCell: View {
    let chore: Chore
    let dayIndex: Int
    let weekStart: String
    let isCurrentWeek: Bool
    @ObservedObject var manager: SupabaseManager
    @Binding var earnedAchievements: [Achievement]
    @Binding var showAchievementAlert: Bool
    @Binding var showConfetti: Bool
    let cellHeight: CGFloat

    private var isToday: Bool {
        let currentDay = Calendar.current.component(.weekday, from: Date()) - 1
        return isCurrentWeek && dayIndex == currentDay
    }

    private var isCompleted: Bool {
        manager.isChoreCompleted(chore, forDay: dayIndex, weekStart: weekStart)
    }

    /// Ticked by the kid, waiting for a parent's OK. Tapping approves it.
    /// Pending ticks only exist for the current week.
    private var isPending: Bool {
        isCurrentWeek && manager.isChorePending(chore, forDay: dayIndex)
    }

    /// Off-day cells stay tappable (a parent can credit work done on another
    /// day) but read as "not scheduled": dashed and dimmed. A vacation day of
    /// the viewed week (its REAL date) has nothing due, so it reads the same.
    private var isDue: Bool {
        guard chore.isDue(on: dayIndex) else { return false }
        if let date = RewardMath.date(weekStart: weekStart, dayIndex: dayIndex),
           manager.isVacationDay(date) {
            return false
        }
        return true
    }

    var body: some View {
        Button(action: {
            let impact = UIImpactFeedbackGenerator(style: .light)
            impact.impactOccurred()

            let wasCompleted = isCompleted
            Task {
                let achievements = await manager.toggleChoreCompletion(
                    chore,
                    forDay: dayIndex,
                    weekStart: isCurrentWeek ? nil : weekStart
                )
                // Celebrations belong to today's ticks in the current week;
                // a backfilled tick in a past week earns quietly.
                if !wasCompleted && isToday && isCurrentWeek {
                    SoundManager.shared.play(.success)
                    await MainActor.run {
                        if !achievements.isEmpty {
                            earnedAchievements = achievements
                            showAchievementAlert = true
                        }
                        showConfetti = true
                    }
                }
            }
        }) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(isCompleted ? Color.choreStarSuccess : (isPending ? Color.choreStarWarning.opacity(0.18) : (isDue ? Color.choreStarBackground : Color.clear)))
                    .frame(maxWidth: .infinity)
                    .frame(height: cellHeight)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(
                                isCompleted ? Color.choreStarSuccess : (isPending ? Color.choreStarWarning : (isToday ? Color.choreStarPrimary.opacity(0.5) : Color.choreStarTextSecondary.opacity(isDue ? 0.2 : 0.35))),
                                style: StrokeStyle(lineWidth: isToday ? 3 : 1.5, dash: (isDue || isCompleted || isPending) ? [] : [4, 3])
                            )
                    )
                    .opacity(isDue || isCompleted || isPending ? 1 : 0.6)

                if isPending {
                    Image(systemName: "clock.fill")
                        .font(.system(size: cellHeight * 0.42, weight: .bold))
                        .foregroundColor(.choreStarWarning)
                        .accessibilityLabel("Waiting for your OK, tap to approve")
                }

                if isCompleted {
                    Image(systemName: "checkmark")
                        .font(.system(size: cellHeight * 0.5, weight: .bold))
                        .foregroundColor(.white)
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isCompleted ? 1.0 : 0.95)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isCompleted)
    }
}

struct DayBreakdownCard: View {
    let dayIndex: Int
    let dayName: String
    let shortDayName: String
    let chores: [Chore]
    let weekStart: String
    let isCurrentWeek: Bool
    @ObservedObject var manager: SupabaseManager
    @Binding var earnedAchievements: [Achievement]
    @Binding var showAchievementAlert: Bool
    @Binding var showConfetti: Bool

    private var currentDayOfWeek: Int {
        Calendar.current.component(.weekday, from: Date()) - 1
    }

    private var isToday: Bool {
        isCurrentWeek && dayIndex == currentDayOfWeek
    }

    private var completedChores: [Chore] {
        chores.filter { manager.isChoreCompleted($0, forDay: dayIndex, weekStart: weekStart) }
    }

    private var pendingChores: [Chore] {
        chores.filter { !manager.isChoreCompleted($0, forDay: dayIndex, weekStart: weekStart) }
    }

    private var completionPercentage: Double {
        guard !chores.isEmpty else { return 0 }
        return Double(completedChores.count) / Double(chores.count)
    }

    private var isPerfectDay: Bool {
        !chores.isEmpty && completedChores.count == chores.count
    }

    private var dayEarnings: Double {
        guard isPerfectDay, let firstChore = chores.first else { return 0.0 }
        return manager.calculateDayEarnings(for: firstChore.childId, dayOfWeek: dayIndex, weekStart: weekStart)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Day Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(dayName)
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(isToday ? .choreStarPrimary : .choreStarTextPrimary)
                        
                        if isToday {
                            Text("TODAY")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.choreStarFill)
                                .cornerRadius(8)
                        }
                    }
                    
                    HStack(spacing: 8) {
                        Text(chores.isEmpty ? "Nothing scheduled" : "\(completedChores.count) of \(chores.count) completed")
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary)
                        
                        // Show earnings ONLY if all chores complete
                        if isPerfectDay && dayEarnings > 0 {
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 10))
                                Text(manager.formatMoney(dayEarnings))
                                    .font(.caption)
                                    .fontWeight(.bold)
                            }
                            .foregroundColor(.choreStarAccent)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.choreStarAccent.opacity(0.15))
                            .cornerRadius(8)
                        }
                    }
                }
                
                Spacer()
                
                // Circular progress
                ZStack {
                    Circle()
                        .stroke(Color.choreStarTextSecondary.opacity(0.2), lineWidth: 4)
                        .frame(width: 50, height: 50)
                    
                    Circle()
                        .trim(from: 0, to: completionPercentage)
                        .stroke(
                            isPerfectDay ? Color.choreStarAccent : Color.choreStarSuccess,
                            style: StrokeStyle(lineWidth: 4, lineCap: .round)
                        )
                        .frame(width: 50, height: 50)
                        .rotationEffect(.degrees(-90))
                    
                    if isPerfectDay {
                        Image(systemName: "star.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.choreStarAccent)
                    } else {
                        Text("\(Int(completionPercentage * 100))%")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.choreStarTextPrimary)
                    }
                }
            }
            .padding(.bottom, 8)
            
            // Chores list
            VStack(spacing: 8) {
                ForEach(chores) { chore in
                    DailyChoreRow(
                        chore: chore,
                        dayIndex: dayIndex,
                        weekStart: weekStart,
                        isCurrentWeek: isCurrentWeek,
                        manager: manager,
                        earnedAchievements: $earnedAchievements,
                        showAchievementAlert: $showAchievementAlert,
                        showConfetti: $showConfetti
                    )
                }
            }
        }
        .padding(16)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(isToday ? Color.choreStarPrimary.opacity(0.3) : Color.clear, lineWidth: 2)
        )
        .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 2)
    }
}

struct DailyChoreRow: View {
    let chore: Chore
    let dayIndex: Int
    let weekStart: String
    let isCurrentWeek: Bool
    @ObservedObject var manager: SupabaseManager
    @Binding var earnedAchievements: [Achievement]
    @Binding var showAchievementAlert: Bool
    @Binding var showConfetti: Bool

    private var currentDayOfWeek: Int {
        Calendar.current.component(.weekday, from: Date()) - 1
    }

    private var isToday: Bool {
        isCurrentWeek && dayIndex == currentDayOfWeek
    }

    private var isCompleted: Bool {
        manager.isChoreCompleted(chore, forDay: dayIndex, weekStart: weekStart)
    }

    var body: some View {
        Button(action: {
            let impact = UIImpactFeedbackGenerator(style: .medium)
            impact.impactOccurred()

            let wasCompleted = isCompleted
            Task {
                let achievements = await manager.toggleChoreCompletion(
                    chore,
                    forDay: dayIndex,
                    weekStart: isCurrentWeek ? nil : weekStart
                )
                // Celebrations belong to today's ticks in the current week;
                // a backfilled tick in a past week earns quietly.
                if !wasCompleted && isToday && isCurrentWeek {
                    SoundManager.shared.play(.success)
                    await MainActor.run {
                        if !achievements.isEmpty {
                            earnedAchievements = achievements
                            showAchievementAlert = true
                        }
                        showConfetti = true
                    }
                }
            }
        }) {
            HStack(spacing: 12) {
                // Completion checkbox
                ZStack {
                    Circle()
                        .strokeBorder(
                            isCompleted ? Color.choreStarSuccess : Color.choreStarTextSecondary.opacity(0.3),
                            lineWidth: 2
                        )
                        .frame(width: 24, height: 24)
                    
                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.choreStarSuccess)
                    }
                }
                
                // Chore icon
                AdaptiveIcon(icon: chore.icon ?? "📝", fallbackSymbol: "checklist", tint: Color.fromString(chore.color ?? ""), iconSize: 24)
                    .frame(width: 28, height: 28)

                // Chore info
                VStack(alignment: .leading, spacing: 2) {
                    Text(chore.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                        .strikethrough(isCompleted, color: .choreStarTextSecondary)
                    
                    if let category = chore.category {
                        Text(ChoreCategory.label(for: category))
                            .font(.caption2)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
                
                Spacer()
            }
            .padding(10)
            .background(isCompleted ? Color.choreStarSuccess.opacity(0.05) : Color.clear)
            .cornerRadius(10)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct EmptyWeekView: View {
    let childName: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar")
                .font(.system(size: 60))
                .foregroundColor(.choreStarTextSecondary)

            Text("No chores yet")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.choreStarTextPrimary)

            Text("\(childName) doesn't have any chores assigned yet.\nAdd a chore to fill in their week.")
                .font(.body)
                .foregroundColor(.choreStarTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .padding(40)
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    NavigationStack {
        WeekCalendarView(
            child: Child(
                id: UUID(),
                name: "Emma",
                age: 8,
                avatarColor: "pink",
                avatarUrl: nil,
                avatarFile: nil,
                avatarPhotoPath: nil,
                userId: UUID(),
                createdAt: Date(),
                updatedAt: Date()
            )
        )
        .environmentObject(SupabaseManager.shared)
    }
}

