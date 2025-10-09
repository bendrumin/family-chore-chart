import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var manager: SupabaseManager
    @ObservedObject var soundManager = SoundManager.shared
    @State private var buttonPressCount = 0
    @State private var showingChangePassword = false

    var body: some View {
        NavigationView {
            Form {
                Section("Preferences") {
                    Toggle(isOn: $soundManager.isSoundEnabled) {
                        HStack {
                            Image(systemName: soundManager.isSoundEnabled ? "speaker.wave.3.fill" : "speaker.slash.fill")
                                .foregroundColor(soundManager.isSoundEnabled ? .choreStarSuccess : .choreStarTextSecondary)
                            Text("Sound Effects")
                        }
                    }
                    .onChange(of: soundManager.isSoundEnabled) { newValue in
                        if newValue {
                            SoundManager.shared.play(.cheer)
                        }
                    }
                }
                
                Section("Account") {
                    HStack {
                        Text("Email")
                            .foregroundColor(.choreStarTextSecondary)
                        Spacer()
                        Text(manager.currentUserEmail ?? "Not signed in")
                            .foregroundColor(.choreStarTextPrimary)
                    }
                    
                    Button(action: { showingChangePassword = true }) {
                        HStack {
                            Text("Change Password")
                            Spacer()
                            Image(systemName: "lock.rotation")
                                .foregroundColor(.choreStarPrimary)
                        }
                    }
                }
                
                Section("Data") {
                    Button("Refresh Data") {
                        manager.refreshData()
                    }
                    
                    HStack {
                        Text("Children")
                        Spacer()
                        Text("\(manager.children.count)")
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    
                    HStack {
                        Text("Chores")
                        Spacer()
                        Text("\(manager.chores.count)")
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
                
                Section {
                    Button("Sign Out", role: .destructive) {
                        manager.signOut()
                    }
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
            .sheet(isPresented: $showingChangePassword) {
                ChangePasswordView()
            }
        }
    }
}

#Preview { 
    SettingsView().environmentObject(SupabaseManager.shared) 
}
