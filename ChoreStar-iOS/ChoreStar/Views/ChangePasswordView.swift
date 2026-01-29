import SwiftUI

struct ChangePasswordView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    
    @State private var currentPassword: String = ""
    @State private var newPassword: String = ""
    @State private var confirmPassword: String = ""
    @State private var isChanging = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    
    var body: some View {
        NavigationView {
            Form {
                Section("Current Password") {
                    SecureField("Enter current password", text: $currentPassword)
                        .textContentType(.password)
                }
                
                Section("New Password") {
                    SecureField("Enter new password", text: $newPassword)
                        .textContentType(.newPassword)
                    
                    SecureField("Confirm new password", text: $confirmPassword)
                        .textContentType(.newPassword)
                    
                    if !newPassword.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            PasswordRequirement(
                                met: newPassword.count >= 8,
                                text: "At least 8 characters"
                            )
                            PasswordRequirement(
                                met: newPassword == confirmPassword && !confirmPassword.isEmpty,
                                text: "Passwords match"
                            )
                        }
                        .font(.caption)
                    }
                }
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
                
                if let successMessage = successMessage {
                    Section {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text(successMessage)
                                .foregroundColor(.green)
                                .font(.caption)
                        }
                    }
                }
            }
            .navigationTitle("Change Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Change") {
                        changePassword()
                    }
                    .disabled(!isFormValid || isChanging)
                    .fontWeight(.semibold)
                }
            }
        }
    }
    
    private var isFormValid: Bool {
        !currentPassword.isEmpty &&
        !newPassword.isEmpty &&
        newPassword.count >= 8 &&
        newPassword == confirmPassword
    }
    
    private func changePassword() {
        isChanging = true
        errorMessage = nil
        successMessage = nil
        
        Task {
            do {
                try await manager.changePassword(newPassword: newPassword)
                
                await MainActor.run {
                    successMessage = "Password changed successfully!"
                    isChanging = false
                    
                    // Auto-dismiss after 1 second
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                        dismiss()
                    }
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Error: \(error.localizedDescription)"
                    isChanging = false
                }
            }
        }
    }
}

struct PasswordRequirement: View {
    let met: Bool
    let text: String
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: met ? "checkmark.circle.fill" : "circle")
                .foregroundColor(met ? .green : .secondary)
                .font(.caption)
            
            Text(text)
                .foregroundColor(met ? .green : .secondary)
        }
    }
}

#Preview {
    ChangePasswordView()
        .environmentObject(SupabaseManager.shared)
}

