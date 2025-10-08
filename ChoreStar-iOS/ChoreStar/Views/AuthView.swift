import SwiftUI

struct AuthView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var rememberMe = false
    @State private var isSigningIn = false

    var body: some View {
        ZStack {
            // Gradient background
            Color.choreStarGradient
                .ignoresSafeArea()
            
            VStack(spacing: 32) {
                Spacer()
                
                // Logo and title
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
                
                // Sign in card
                VStack(spacing: 20) {
                    VStack(spacing: 16) {
                        // Email field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.choreStarTextSecondary)
                            
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
                        }
                        
                        // Password field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.choreStarTextSecondary)
                            
                            SecureField("Enter your password", text: $password)
                                .textContentType(.password)
                                .padding()
                                .background(Color.choreStarBackground)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.choreStarPrimary.opacity(0.2), lineWidth: 1)
                                )
                        }
                        
                        // Remember me toggle
                        HStack {
                            Toggle("Remember Me", isOn: $rememberMe)
                                .toggleStyle(SwitchToggleStyle(tint: .choreStarPrimary))
                            Spacer()
                        }
                        .padding(.top, 4)
                    }
                    
                    // Sign in button
                    Button(action: {
                        if rememberMe {
                            saveCredentials()
                        }
                        isSigningIn = true
                        Task {
                            await manager.signIn(email: email, password: password)
                            isSigningIn = false
                        }
                    }) {
                        HStack {
                            if isSigningIn {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.8)
                            }
                            Text(isSigningIn ? "Signing In..." : "Sign In")
                                .font(.headline)
                                .fontWeight(.bold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.choreStarGradient)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .shadow(color: Color.choreStarPrimary.opacity(0.4), radius: 12, x: 0, y: 4)
                    }
                    .disabled(email.isEmpty || password.isEmpty || isSigningIn)
                    .opacity(email.isEmpty || password.isEmpty ? 0.6 : 1.0)
                }
                .padding(24)
                .background(Color.choreStarCardBackground)
                .cornerRadius(20)
                .shadow(color: .black.opacity(0.1), radius: 20, x: 0, y: 8)
                .padding(.horizontal, 24)
                
                Spacer()
                Spacer()
            }
        }
        .onAppear {
            loadSavedCredentials()
        }
    }

    private func saveCredentials() {
        UserDefaults.standard.set(email, forKey: "saved_email")
        UserDefaults.standard.set(password, forKey: "saved_password")
        UserDefaults.standard.set(true, forKey: "remember_me")
    }

    private func loadSavedCredentials() {
        if UserDefaults.standard.bool(forKey: "remember_me") {
            email = UserDefaults.standard.string(forKey: "saved_email") ?? ""
            password = UserDefaults.standard.string(forKey: "saved_password") ?? ""
            rememberMe = true
        }
    }
}

#Preview {
    AuthView().environmentObject(SupabaseManager.shared)
}
