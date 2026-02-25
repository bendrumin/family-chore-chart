import SwiftUI

struct RoutinesListView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var showingBuilder = false
    @State private var editingRoutine: Routine?
    @State private var filterType: RoutineFilterType = .all
    
    enum RoutineFilterType: String, CaseIterable {
        case all = "All"
        case morning = "Morning"
        case bedtime = "Bedtime"
        case afterschool = "After School"
        case custom = "Custom"
        
        var routineType: String? {
            switch self {
            case .all: return nil
            case .morning: return "morning"
            case .bedtime: return "bedtime"
            case .afterschool: return "afterschool"
            case .custom: return "custom"
            }
        }
    }
    
    private var filteredRoutines: [Routine] {
        if let type = filterType.routineType {
            return manager.routines.filter { $0.type == type }
        }
        return manager.routines
    }
    
    private var groupedRoutines: [(child: Child, routines: [Routine])] {
        let grouped = Dictionary(grouping: filteredRoutines, by: { $0.childId })
        return manager.children.compactMap { child in
            guard let routines = grouped[child.id], !routines.isEmpty else { return nil }
            return (child: child, routines: routines)
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Filter tabs
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(RoutineFilterType.allCases, id: \.self) { type in
                        Button(action: {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                filterType = type
                            }
                        }) {
                            Text(type.rawValue)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(filterType == type ? .white : .choreStarTextSecondary)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(filterType == type ? Color.choreStarPrimary : Color.clear)
                                )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
            }
            
            if groupedRoutines.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(spacing: 24) {
                        ForEach(groupedRoutines, id: \.child.id) { group in
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                colors: [Color.fromString(group.child.avatarColor), Color.fromString(group.child.avatarColor).opacity(0.7)],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 28, height: 28)
                                        .overlay(
                                            Text(group.child.initials)
                                                .font(.caption2)
                                                .fontWeight(.bold)
                                                .foregroundColor(.white)
                                        )
                                    
                                    Text(group.child.name)
                                        .font(.headline)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarTextPrimary)
                                    
                                    Spacer()
                                    
                                    Text("\(group.routines.count)")
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarPrimary)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.choreStarPrimary.opacity(0.1))
                                        .cornerRadius(8)
                                }
                                .padding(.horizontal, 20)
                                
                                ForEach(group.routines) { routine in
                                    RoutineCardView(routine: routine, child: group.child) {
                                        editingRoutine = routine
                                    }
                                    .contextMenu {
                                        Button {
                                            editingRoutine = routine
                                        } label: {
                                            Label("Edit", systemImage: "pencil")
                                        }
                                        
                                        Button(role: .destructive) {
                                            Task {
                                                try? await manager.deleteRoutine(routineId: routine.id)
                                            }
                                        } label: {
                                            Label("Delete", systemImage: "trash")
                                        }
                                    }
                                    .padding(.horizontal, 20)
                                }
                            }
                        }
                        
                        Spacer(minLength: 80)
                    }
                    .padding(.top, 8)
                }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            Button(action: { showingBuilder = true }) {
                Image(systemName: "plus")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .frame(width: 56, height: 56)
                    .background(Color.choreStarGradient)
                    .clipShape(Circle())
                    .shadow(color: Color.choreStarPrimary.opacity(0.4), radius: 12, x: 0, y: 4)
            }
            .padding(.trailing, 20)
            .padding(.bottom, 20)
        }
        .sheet(isPresented: $showingBuilder) {
            RoutineBuilderView()
        }
        .sheet(item: $editingRoutine) { routine in
            RoutineBuilderView(existingRoutine: routine)
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 20) {
            Spacer()
            
            Image(systemName: "repeat.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(Color.choreStarGradient)
            
            Text("No Routines Yet")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.choreStarTextPrimary)
            
            Text("Create a morning or bedtime routine\nto help your kids build great habits!")
                .font(.subheadline)
                .foregroundColor(.choreStarTextSecondary)
                .multilineTextAlignment(.center)
            
            Button(action: { showingBuilder = true }) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Create Routine")
                }
                .font(.headline)
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 14)
                .background(Color.choreStarGradient)
                .cornerRadius(14)
            }
            .padding(.top, 8)
            
            Spacer()
        }
        .padding(40)
    }
}

#Preview {
    NavigationView {
        RoutinesListView()
            .environmentObject(SupabaseManager.shared)
    }
}
