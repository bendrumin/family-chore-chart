import SwiftUI

/// Family sharing management: share a join code with a co-parent, see who's
/// joined, or join another family yourself. Also surfaces the kid login code.
struct FamilySharingView: View {
    @EnvironmentObject var manager: SupabaseManager

    @State private var joinCodeInput = ""
    @State private var isJoining = false
    @State private var isGeneratingCode = false
    @State private var errorMessage: String?
    @State private var memberPendingRemoval: FamilyMemberInfo?
    @State private var showingLeaveConfirm = false
    @State private var showingRevokeConfirm = false

    /// Inviting (creating or sharing a join code) is the Premium part.
    private var canInvite: Bool { manager.canUse(.sharing) }

    var body: some View {
        Form {
            kidLoginSection

            if manager.isSharedMember {
                memberSection
            } else {
                // Only inviting new co-parents is Premium. A family that
                // lapsed to free still sees its code (to replace or turn it
                // off) and its members (to remove one).
                if canInvite {
                    shareSection
                } else {
                    Section {
                        PremiumFeatureGate(feature: .sharing)
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                    }
                    if manager.familyJoinCode != nil {
                        shareSection
                    }
                }
                membersSection
                joinSection
            }

            if let errorMessage = errorMessage {
                Section {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }
        }
        .navigationTitle("Family Sharing")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await manager.loadFamilySharing()
        }
    }

    // MARK: - Kid login code

    private var kidLoginSection: some View {
        Section {
            if let code = manager.kidLoginCode, !code.isEmpty {
                HStack(spacing: 16) {
                    Text(code)
                        .font(.system(.title3, design: .monospaced).weight(.bold))
                        .textSelection(.enabled)

                    Spacer()

                    // Copy puts the bare code on the clipboard; Share carries
                    // the friendly sentence. Never mix the two.
                    CopyCodeButton(code: code)

                    ShareLink(
                        item: URL(string: "https://chorestar.app/kid-login/\(code)")!,
                        message: Text("Log in to ChoreStar with our family code: \(code)")
                    ) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            } else {
                Text("Your kid login code appears here once it's generated on chorestar.app.")
                    .font(.caption)
                    .foregroundColor(.choreStarTextSecondary)
            }
        } header: {
            Text("Kid Login Code")
        } footer: {
            Text("Kids use this code plus their PIN to log in on any device.")
        }
    }

    // MARK: - Owner: share + members

    private var shareSection: some View {
        Section {
            if let code = manager.familyJoinCode {
                HStack(spacing: 16) {
                    Text(code)
                        .font(.system(.title3, design: .monospaced).weight(.bold))
                        .textSelection(.enabled)

                    Spacer()

                    if canInvite {
                        CopyCodeButton(code: code)

                        ShareLink(
                            item: "Join our family on ChoreStar! Open the app, tap Settings → Family Sharing → Join a Family, and enter code: \(code)"
                        ) {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                }

                Button {
                    regenerateCode()
                } label: {
                    HStack {
                        if isGeneratingCode {
                            ProgressView()
                        } else {
                            Image(systemName: "arrow.clockwise")
                        }
                        Text("New Code")
                    }
                }
                .disabled(isGeneratingCode)

                Button(role: .destructive) {
                    showingRevokeConfirm = true
                } label: {
                    HStack {
                        Image(systemName: "xmark.circle")
                        Text("Turn Off Code")
                    }
                }
                .disabled(isGeneratingCode)
            } else {
                Button {
                    generateCode()
                } label: {
                    HStack {
                        if isGeneratingCode {
                            ProgressView()
                        } else {
                            Image(systemName: "person.badge.plus")
                        }
                        Text("Create Invite Code")
                    }
                }
                .disabled(isGeneratingCode)
            }
        } header: {
            if canInvite {
                Text("Invite a Co-Parent")
            } else {
                Text("Your Invite Code")
            }
        } footer: {
            if canInvite {
                Text("Share this code with a partner or grandparent so they can see and manage your family's chores from their own account. The same code works in the iOS app and on chorestar.app.")
            } else {
                Text("New co-parents can't join on the free plan. Get a new code or turn this one off so an old code can't be reused.")
            }
        }
        .confirmationDialog("Turn off this invite code?", isPresented: $showingRevokeConfirm, titleVisibility: .visible) {
            Button("Turn Off Code", role: .destructive) {
                revokeCode()
            }
        } message: {
            Text("No one can join with it. Co-parents who already joined keep access until you remove them.")
        }
    }

    private var membersSection: some View {
        Section("Family Members") {
            if manager.familyMembers.isEmpty {
                Text("No one has joined yet.")
                    .font(.subheadline)
                    .foregroundColor(.choreStarTextSecondary)
            } else {
                ForEach(manager.familyMembers) { member in
                    HStack {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.title2)
                            .foregroundColor(.choreStarPrimary)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Co-parent")
                                .font(.body)
                            if let joined = member.joinedAt {
                                Text("Joined \(joined.formatted(date: .abbreviated, time: .omitted))")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                        }

                        Spacer()
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            memberPendingRemoval = member
                        } label: {
                            Label("Remove", systemImage: "person.badge.minus")
                        }
                    }
                }
            }
        }
        .alert("Remove this co-parent?", isPresented: Binding(
            get: { memberPendingRemoval != nil },
            set: { if !$0 { memberPendingRemoval = nil } }
        )) {
            Button("Cancel", role: .cancel) { memberPendingRemoval = nil }
            Button("Remove", role: .destructive) {
                if let member = memberPendingRemoval {
                    Task {
                        try? await manager.removeFamilyMember(memberId: member.id)
                    }
                }
                memberPendingRemoval = nil
            }
        } message: {
            Text("They'll lose access to your family's chores and routines.")
        }
    }

    // MARK: - Join another family

    private var joinSection: some View {
        Section {
            TextField("Enter invite code", text: $joinCodeInput)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .font(.system(.body, design: .monospaced))

            Button {
                join()
            } label: {
                HStack {
                    if isJoining {
                        ProgressView()
                    }
                    Text("Join Family")
                }
            }
            .disabled(joinCodeInput.trimmingCharacters(in: .whitespaces).isEmpty || isJoining)
        } header: {
            Text("Join a Family")
        } footer: {
            Text("Got a code from your partner? Enter it here to manage their family together. Your view switches to their family's chores.")
        }
    }

    // MARK: - Member view

    private var memberSection: some View {
        Section {
            HStack {
                Image(systemName: "person.2.fill")
                    .foregroundColor(.choreStarPrimary)
                Text("You're sharing another family's chores.")
                    .font(.subheadline)
            }

            Button(role: .destructive) {
                showingLeaveConfirm = true
            } label: {
                Text("Leave Family")
            }
        } header: {
            Text("Family Membership")
        } footer: {
            Text("Leaving switches you back to your own family's data.")
        }
        .confirmationDialog("Leave this family?", isPresented: $showingLeaveConfirm, titleVisibility: .visible) {
            Button("Leave Family", role: .destructive) {
                Task {
                    try? await manager.leaveFamily()
                }
            }
        }
    }

    // MARK: - Actions

    private func generateCode() {
        isGeneratingCode = true
        errorMessage = nil
        Task {
            do {
                _ = try await manager.generateFamilyJoinCode()
            } catch {
                await MainActor.run {
                    errorMessage = "Couldn't create a code: \(error.localizedDescription)"
                }
            }
            await MainActor.run {
                isGeneratingCode = false
            }
        }
    }

    private func regenerateCode() {
        isGeneratingCode = true
        errorMessage = nil
        Task {
            do {
                _ = try await manager.regenerateFamilyJoinCode()
            } catch {
                await MainActor.run {
                    errorMessage = String(localized: "Couldn't create a code: \(error.localizedDescription)")
                }
            }
            await MainActor.run {
                isGeneratingCode = false
            }
        }
    }

    private func revokeCode() {
        isGeneratingCode = true
        errorMessage = nil
        Task {
            do {
                try await manager.revokeFamilyJoinCode()
            } catch {
                await MainActor.run {
                    errorMessage = String(localized: "Couldn't turn off the code: \(error.localizedDescription)")
                }
            }
            await MainActor.run {
                isGeneratingCode = false
            }
        }
    }

    private func join() {
        isJoining = true
        errorMessage = nil
        Task {
            let result = await manager.joinFamily(code: joinCodeInput)
            await MainActor.run {
                if let result = result {
                    errorMessage = result
                    Haptics.error()
                } else {
                    joinCodeInput = ""
                    Haptics.success()
                }
                isJoining = false
            }
        }
    }
}

#Preview {
    NavigationStack {
        FamilySharingView()
            .environmentObject(SupabaseManager.shared)
    }
}

/// Copies exactly the code — no surrounding sentence — and flashes a
/// checkmark so the tap visibly landed.
struct CopyCodeButton: View {
    let code: String
    @State private var justCopied = false

    var body: some View {
        Button {
            UIPasteboard.general.string = code
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            withAnimation { justCopied = true }
            Task {
                try? await Task.sleep(for: .seconds(2))
                withAnimation { justCopied = false }
            }
        } label: {
            Image(systemName: justCopied ? "checkmark" : "doc.on.doc")
                .foregroundColor(justCopied ? .green : .accentColor)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(justCopied ? "Copied" : "Copy code")
    }
}
