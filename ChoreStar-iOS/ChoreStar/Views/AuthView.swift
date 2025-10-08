import SwiftUI

struct AuthView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var rememberMe = false

    var body: some View {
        VStack(spacing: 16) {
            Text("ChoreStar")
                .font(.largeTitle).bold()
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textFieldStyle(RoundedBorderTextFieldStyle())
            SecureField("Password", text: $password)
                .textFieldStyle(RoundedBorderTextFieldStyle())

            HStack {
                Toggle("Remember Me", isOn: $rememberMe)
                    .toggleStyle(SwitchToggleStyle())
                Spacer()
            }

            Button("Sign In") {
                if rememberMe {
                    saveCredentials()
                }
                Task {
                    await manager.signIn(email: email, password: password)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(email.isEmpty || password.isEmpty)
        }
        .padding()
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
