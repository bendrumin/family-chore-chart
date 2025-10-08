//
//  DashboardView.swift
//

import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var selectedChildId: UUID?
    @State private var showingAddChoreSheet = false
    @State private var showingAddChildSheet = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                headerView
                Divider()
                if let children = manager.children, !children.isEmpty {
                    childPicker(children: children)
                        .animation(.easeInOut, value: selectedChildId)
                    choresGrid(for: selectedChild)
                        .animation(.easeInOut, value: selectedChildId)
                } else {
                    emptyStateView
                }
                Spacer()
            }
            .padding()
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingAddChoreSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add chore")
                }
            }
            .sheet(isPresented: $showingAddChoreSheet) {
                NavigationStack {
                    Text("Add chore coming soon")
                        .navigationTitle("Add Chore")
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Close") {
                                    showingAddChoreSheet = false
                                }
                            }
                        }
                }
            }
            .sheet(isPresented: $showingAddChildSheet) {
                NavigationStack {
                    AddEditChildView()
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Close") {
                                    showingAddChildSheet = false
                                }
                            }
                        }
                }
            }
            .onAppear {
                if let children = manager.children, !children.isEmpty, selectedChildId == nil {
                    selectedChildId = children.first?.id
                }
            }
        }
    }

    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Hello!")
                    .font(.title)
                    .fontWeight(.bold)
                if let email = manager.currentUser?.email {
                    Text(email)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            Spacer()
            Button {
                manager.refreshData()
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.title2)
                    .foregroundColor(Color.choreStarPrimary ?? .blue)
                    .accessibilityLabel("Refresh data")
            }
        }
    }

    private func childPicker(children: [Child]) -> some View {
        Picker("Select Child", selection: $selectedChildId) {
            ForEach(children) { child in
                Text(child.name).tag(child.id as UUID?)
            }
        }
        .pickerStyle(SegmentedPickerStyle())
    }

    private var selectedChild: Child? {
        guard let id = selectedChildId,
              let children = manager.children else { return nil }
        return children.first(where: { $0.id == id })
    }

    private func choresGrid(for child: Child?) -> some View {
        ScrollView {
            if let chores = child?.chores, !chores.isEmpty {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 16)], spacing: 16) {
                    ForEach(chores) { chore in
                        ChoreCardView(
                            chore: chore,
                            isCompleted: manager.isChoreCompleted(chore)
                        ) {
                            Task {
                                await manager.toggleChoreCompletion(chore)
                            }
                        }
                        .animation(.easeInOut, value: manager.isChoreCompleted(chore))
                    }
                }
                .padding(.top, 8)
            } else {
                Text("No chores found for this child.")
                    .foregroundColor(.secondary)
                    .padding(.top, 12)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Spacer()
            Text("No children added yet.")
                .font(.headline)
                .foregroundColor(.secondary)
            Button {
                showingAddChildSheet = true
            } label: {
                Label("Add a Child", systemImage: "plus.circle.fill")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.choreStarPrimary?.opacity(0.2) ?? Color.blue.opacity(0.2))
                    .foregroundColor(Color.choreStarPrimary ?? .blue)
                    .cornerRadius(12)
            }
            .buttonStyle(.borderless)
            Spacer()
        }
        .padding(.horizontal)
    }
}

#Preview {
    DashboardView()
        .environmentObject(SupabaseManager.shared)
}
