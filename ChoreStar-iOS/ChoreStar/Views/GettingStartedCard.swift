import SwiftUI

/// Setup checklist for new families on the parent dashboard. Derives its
/// three steps live from manager state, walks the parent to the next one,
/// and gets out of the way for good once the funnel is complete (or the
/// parent hides it). Never shown to kid sessions or shared members: they
/// joined a family that already runs.
struct GettingStartedCard: View {
    @EnvironmentObject var manager: SupabaseManager
    @AppStorage("gettingStartedHidden") private var hidden = false
    @State private var copiedCode = false

    private var progress: GettingStartedProgress {
        GettingStartedProgress(
            hasKids: !manager.children.isEmpty,
            hasChores: !manager.chores.isEmpty,
            hasCompletion: !manager.choreCompletions.isEmpty
                || !manager.weekCompletions.isEmpty
                || !manager.pendingCompletions.isEmpty
                || !manager.achievements.isEmpty
        )
    }

    private let stepLabels = ["Add a kid", "Give them chores", "Let them check one off"]

    var body: some View {
        let progress = self.progress

        if hidden || manager.isChildSession || manager.isSharedMember || !manager.initialDataLoaded {
            EmptyView()
        } else if progress.allDone {
            // Funnel complete: remember that so the card never comes back.
            EmptyView().onAppear { hidden = true }
        } else {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) {
                    Text("Three steps and the chart runs itself")
                        .font(.display(17, weight: .bold))
                        .foregroundColor(.choreStarTextPrimary)

                    Spacer()

                    Button("Hide") { hidden = true }
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextSecondary)
                }

                ForEach(0..<3, id: \.self) { index in
                    stepRow(index: index, done: progress.steps[index], progress: progress)
                }
            }
            .padding(20)
            .background(Color.choreStarCardBackground)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(Color.choreStarPrimary.opacity(0.25), lineWidth: 1)
            )
        }
    }

    @ViewBuilder
    private func stepRow(index: Int, done: Bool, progress: GettingStartedProgress) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: done ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 22))
                .foregroundColor(done ? .choreStarSuccess : .choreStarTextSecondary.opacity(0.4))
                .accessibilityLabel(done ? "Done" : "Not done yet")

            VStack(alignment: .leading, spacing: 8) {
                Text(stepLabels[index])
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(done ? .choreStarTextSecondary : .choreStarTextPrimary)
                    .strikethrough(done, color: .choreStarTextSecondary.opacity(0.5))

                // Only the next actionable step gets its helper UI.
                if index == progress.nextStep {
                    stepAction(index: index)
                }
            }
        }
    }

    @ViewBuilder
    private func stepAction(index: Int) -> some View {
        switch index {
        case 1:
            if let firstChild = manager.children.first {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Pick from suggestions or write your own. Two or three is plenty to start.")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)

                    NavigationLink(destination: ChildDetailView(child: firstChild)) {
                        Text("Add chores for \(firstChild.name)")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color.choreStarFill)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
            }
        case 2:
            VStack(alignment: .leading, spacing: 8) {
                Text("Kids sign in with your family code and their PIN. No email. Set a PIN from each kid's edit screen.")
                    .font(.caption)
                    .foregroundColor(.choreStarTextSecondary)

                if let code = manager.kidLoginCode {
                    HStack(spacing: 10) {
                        Text(code.uppercased())
                            .font(.system(.subheadline, design: .monospaced))
                            .fontWeight(.bold)
                            .kerning(2)
                            .foregroundColor(.choreStarPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.choreStarPrimary.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                        Button {
                            UIPasteboard.general.string = code
                            copiedCode = true
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { copiedCode = false }
                        } label: {
                            Label(copiedCode ? "Copied" : "Copy", systemImage: copiedCode ? "checkmark" : "doc.on.doc")
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        .buttonStyle(.bordered)
                        .tint(.choreStarPrimary)
                    }
                } else {
                    Text("Your family code is in Settings, Family section.")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextSecondary)
                }
            }
        default:
            EmptyView()
        }
    }
}
