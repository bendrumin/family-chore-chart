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

    var body: some View {
        Form {
            kidLoginSection

            if manager.isSharedMember {
                memberSection
            } else {
                shareSection
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
                HStack {
                    Text(code)
                        .font(.system(.title3, design: .monospaced).weight(.bold))
                        .textSelection(.enabled)

                    Spacer()

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
                HStack {
                    Text(code)
                        .font(.system(.title3, design: .monospaced).weight(.bold))
                        .textSelection(.enabled)

                    Spacer()

                    ShareLink(
                        item: "Join our family on ChoreStar! Open the app, tap Settings → Family Sharing → Join a Family, and enter code: \(code)"
                    ) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
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
            Text("Invite a Co-Parent")
        } footer: {
            Text("Share this code with a partner or grandparent so they can see and manage your family's chores from their own account.")
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
