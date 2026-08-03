import SwiftUI

enum AuthMode {
    case signIn
    case signUp
    case forgotPassword
}

struct AuthView: View {
    @EnvironmentObject var manager: SupabaseManager
    @EnvironmentObject var themeManager: ThemeManager
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var confirmPassword: String = ""
    @State private var familyName: String = ""
    @State private var authMode: AuthMode = .signIn
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var showingKidLogin = false

    var body: some View {
        ZStack {
            themeManager.gradient
                .ignoresSafeArea()
            
            VStack(spacing: 32) {
                Spacer()
                
                VStack(spacing: 12) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.white, Color.choreStarAccent],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
                    
                    Text("ChoreStar")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                    
                    Text("Make chores fun!")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.9))
                }
                .padding(.bottom, 20)
                
                VStack(spacing: 20) {
                    if authMode == .forgotPassword {
                        forgotPasswordCard
                    } else {
                        authCard
                    }
                }
                .padding(24)
                .background(Color.choreStarCardBackground)
                .cornerRadius(20)
                .shadow(color: .black.opacity(0.1), radius: 20, x: 0, y: 8)
                .frame(maxWidth: 560)
                .padding(.horizontal, 24)

                // Kid login entry — kids use a family code + PIN, no account
                kidLoginButton

                Spacer()
                Spacer()
            }
        }
        .sheet(isPresented: $showingKidLogin) {
            KidLoginView()
        }
        .onAppear {
            loadSavedEmail()
        }
    }

    private var kidLoginButton: some View {
        Button(action: { showingKidLogin = true }) {
            HStack(spacing: 8) {
                Text("🧒")
                Text("I'm a Kid!")
                    .fontWeight(.bold)
            }
            .font(.headline)
            .foregroundColor(.white)
            .padding(.horizontal, 28)
            .padding(.vertical, 14)
            .background(.white.opacity(0.2))
            .cornerRadius(24)
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .strokeBorder(.white.opacity(0.5), lineWidth: 1.5)
            )
        }
        .accessibilityIdentifier("auth.kidLoginButton")
    }
    
    // MARK: - Sign In / Sign Up Card
    
    private var authCard: some View {
        VStack(spacing: 20) {
            // Mode toggle
            Picker("", selection: $authMode) {
                Text("Sign In").tag(AuthMode.signIn)
                Text("Sign Up").tag(AuthMode.signUp)
            }
            .pickerStyle(.segmented)
            .onChange(of: authMode) {
                errorMessage = nil
                successMessage = nil
            }
            
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Email")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextSecondary)
                    
                    TextField("you@example.com", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .accessibilityIdentifier("auth.emailField")
                        .padding()
                        .background(Color.choreStarBackground)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.choreStarPrimary.opacity(0.2), lineWidth: 1)
                        )
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Password")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextSecondary)

                    SecureField("Enter your password", text: $password)
                        .accessibilityIdentifier("auth.passwordField")
                        .textContentType(authMode == .signUp ? .newPassword : .password)
                        .padding()
                        .background(Color.choreStarBackground)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.choreStarPrimary.opacity(0.2), lineWidth: 1)
                        )
                }
                
                if authMode == .signUp {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Confirm Password")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.choreStarTextSecondary)
                        
                        SecureField("Confirm your password", text: $confirmPassword)
                            .accessibilityIdentifier("auth.confirmPasswordField")
                            .textContentType(.newPassword)
                            .padding()
                            .background(Color.choreStarBackground)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.choreStarPrimary.opacity(0.2), lineWidth: 1)
                            )

                        // Stated up front rather than after a failed submit —
                        // these are the server's rules (lib/utils/validation.ts).
                        Text("At least 8 characters, with an uppercase letter, a lowercase letter, and a number.")
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 4) {
                            Text("Family Name")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.choreStarTextSecondary)
                            Text("(optional)")
                                .font(.caption)
                                .foregroundColor(.choreStarTextSecondary.opacity(0.7))
                        }

                        // Web parity: this is what the dashboard header shows.
                        // iOS never collected it, so every iOS family was unnamed.
                        TextField("e.g. The Smith Family", text: $familyName)
                            .textContentType(.organizationName)
                            .accessibilityIdentifier("auth.familyNameField")
                            .padding()
                            .background(Color.choreStarBackground)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.choreStarPrimary.opacity(0.2), lineWidth: 1)
                            )
                    }
                }
            }
            
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 4)
            }
            
            if let successMessage = successMessage {
                Text(successMessage)
                    .font(.caption)
                    .foregroundColor(.green)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 4)
            }
            
            Button(action: { performAuth() }) {
                HStack {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .accessibilityIdentifier("auth.submitButtonSpinner")
                            .scaleEffect(0.8)
                    }
                    Text(authMode == .signIn ? (isLoading ? "Signing In..." : "Sign In") :
                            (isLoading ? "Creating Account..." : "Create Account"))
                        .font(.headline)
                        .fontWeight(.bold)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(themeManager.gradient)
                .foregroundColor(.white)
                .cornerRadius(12)
                .shadow(color: themeManager.accentColor.opacity(0.4), radius: 12, x: 0, y: 4)
            }
            .accessibilityIdentifier("auth.submitButton")
            .disabled(!isFormValid || isLoading)
            .opacity(isFormValid ? 1.0 : 0.6)

            if authMode == .signIn {
                Button(action: { authMode = .forgotPassword }) {
                    Text("Forgot Password?")
                        .font(.subheadline)
                        .foregroundColor(themeManager.accentColor)
                }
            }
        }
    }
    
    // MARK: - Forgot Password Card
    
    private var forgotPasswordCard: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Image(systemName: "envelope.badge")
                    .font(.system(size: 36))
                    .foregroundColor(themeManager.accentColor)
                
                Text("Reset Password")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.choreStarTextPrimary)
                
                Text("Enter your email and we'll send you a link to reset your password.")
                    .font(.caption)
                    .foregroundColor(.choreStarTextSecondary)
                    .multilineTextAlignment(.center)
            }
            
            TextField("you@example.com", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .padding()
                .background(Color.choreStarBackground)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.choreStarPrimary.opacity(0.2), lineWidth: 1)
                )
            
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }
            
            if let successMessage = successMessage {
                Text(successMessage)
                    .font(.caption)
                    .foregroundColor(.green)
                    .multilineTextAlignment(.center)
            }
            
            Button(action: { performPasswordReset() }) {
                HStack {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    }
                    Text(isLoading ? "Sending..." : "Send Reset Link")
                        .font(.headline)
                        .fontWeight(.bold)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(themeManager.gradient)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(email.isEmpty || isLoading)
            .opacity(email.isEmpty ? 0.6 : 1.0)
            
            Button(action: {
                authMode = .signIn
                errorMessage = nil
                successMessage = nil
            }) {
                HStack {
                    Image(systemName: "arrow.left")
                    Text("Back to Sign In")
                }
                .font(.subheadline)
                .foregroundColor(themeManager.accentColor)
            }
        }
    }
    
    // MARK: - Helpers
    
    /// Mirrors validatePassword in lib/utils/validation.ts. The server rejects
    /// anything weaker, so accepting it here only produced a round-trip failure.
    private func passwordProblem(_ value: String) -> String? {
        if value.count < 8 { return "Password must be at least 8 characters." }
        if value.range(of: "[A-Z]", options: .regularExpression) == nil {
            return "Password must contain an uppercase letter."
        }
        if value.range(of: "[a-z]", options: .regularExpression) == nil {
            return "Password must contain a lowercase letter."
        }
        if value.range(of: "[0-9]", options: .regularExpression) == nil {
            return "Password must contain a number."
        }
        return nil
    }

    private var isFormValid: Bool {
        guard !email.isEmpty, !password.isEmpty else { return false }
        if authMode == .signUp {
            return !confirmPassword.isEmpty && password == confirmPassword && passwordProblem(password) == nil
        }
        return true
    }
    
    private func performAuth() {
        errorMessage = nil
        successMessage = nil
        
        if authMode == .signUp {
            guard password == confirmPassword else {
                errorMessage = "Passwords don't match."
                return
            }
            if let problem = passwordProblem(password) {
                errorMessage = problem
                return
            }
        }
        
        isLoading = true
        saveEmail()
        
        Task {
            if authMode == .signIn {
                await manager.signIn(email: email, password: password)
                await MainActor.run {
                    if !manager.isAuthenticated {
                        errorMessage = manager.debugLastError ?? "Sign in failed. Check your credentials."
                    }
                    isLoading = false
                }
            } else {
                do {
                    try await manager.signUp(email: email, password: password, familyName: familyName)
                    await MainActor.run {
                        // Signup never returns a session — the address has to be
                        // confirmed first — so always send them to the inbox.
                        successMessage = "Account created! Check your email to confirm, then sign in."
                        authMode = .signIn
                        isLoading = false
                    }
                } catch {
                    await MainActor.run {
                        errorMessage = error.localizedDescription
                        isLoading = false
                    }
                }
            }
        }
    }
    
    private func performPasswordReset() {
        errorMessage = nil
        successMessage = nil
        isLoading = true
        
        Task {
            do {
                try await manager.resetPassword(email: email)
                await MainActor.run {
                    successMessage = "Check your email for a password reset link."
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
    
    private func saveEmail() {
        UserDefaults.standard.set(email, forKey: "saved_email")
    }
    
    private func loadSavedEmail() {
        email = UserDefaults.standard.string(forKey: "saved_email") ?? ""
    }
}

#Preview {
    AuthView()
        .environmentObject(SupabaseManager.shared)
        .environmentObject(ThemeManager.shared)
}
