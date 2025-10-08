import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var buttonPressCount = 0

    var body: some View {
        NavigationView {
            Form {
                Section("Account") {
                    Text(manager.currentUserEmail ?? "Not signed in")
                    Button("Refresh Data") { manager.refreshData() }
                    Button("Check Session") {
                        buttonPressCount += 1
                        manager.checkAuthStatusSync()
                    }
                    Button("Sign Out", role: .destructive) { manager.signOut() }
                }
                Section("Debug Info") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack { 
                            Text("Supabase URL").fontWeight(.medium)
                            Spacer()
                            Text(manager.debugSupabaseURL ?? "-")
                                .foregroundColor(.secondary)
                                .font(.caption)
                                .lineLimit(2)
                        }
                        
                        HStack { 
                            Text("Anon Key").fontWeight(.medium)
                            Spacer()
                            Text(manager.debugHasKey ? "✅ Present" : "❌ Missing")
                                .foregroundColor(manager.debugHasKey ? .green : .red)
                        }
                        
                        HStack { 
                            Text("User ID").fontWeight(.medium)
                            Spacer()
                            Text(manager.debugUserId ?? "❌ None")
                                .foregroundColor(manager.debugUserId != nil ? .green : .red)
                                .font(.caption)
                                .lineLimit(2)
                        }
                        
                        HStack { 
                            Text("Auth Status").fontWeight(.medium)
                            Spacer()
                            Text(manager.isAuthenticated ? "✅ Authenticated" : "❌ Not Authenticated")
                                .foregroundColor(manager.isAuthenticated ? .green : .red)
                        }
                        
                        HStack { 
                            Text("Children Count").fontWeight(.medium)
                            Spacer()
                            Text("\(manager.children.count)")
                                .foregroundColor(.secondary)
                        }
                        
                        HStack { 
                            Text("Chores Count").fontWeight(.medium)
                            Spacer()
                            Text("\(manager.chores.count)")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Section("Last Error") {
                    if let err = manager.debugLastError, !err.isEmpty {
                        Text(err)
                            .font(.caption)
                            .foregroundColor(.red)
                    } else {
                        Text("No errors")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview { 
    SettingsView().environmentObject(SupabaseManager.shared) 
}
