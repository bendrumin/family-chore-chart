import SwiftUI

/// Standalone kid login: family code + PIN, no parent account needed on this device.
/// Mirrors the web app's /kid-login flow (PIN identifies the child, no name picker).
struct KidLoginView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss

    @State private var familyCode: String
    @State private var enteredPin = ""
    @State private var errorMessage: String?
    @State private var isVerifying = false
    @State private var step: Step

    private enum Step {
        case familyCode
        case pin
    }

    init() {
        // Pre-fill: parent's code if signed in on this device, else last successful code
        let known = SupabaseManager.shared.kidLoginCode
            ?? UserDefaults.standard.string(forKey: "last_family_code")
            ?? ""
        _familyCode = State(initialValue: known)
        _step = State(initialValue: known.isEmpty ? .familyCode : .pin)
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color.choreStarPrimary.opacity(0.25),
                    Color.choreStarSecondary.opacity(0.25),
                    Color.choreStarSuccess.opacity(0.25)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 28) {
                    header

                    if step == .familyCode {
                        familyCodeCard
                    } else {
                        pinCard
                    }

                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                            .padding(.horizontal, 24)
                    }

                    Button(action: { dismiss() }) {
                        HStack {
                            Image(systemName: "arrow.left.circle")
                            Text("Back to Parent Login")
                        }
                        .font(.subheadline)
                        .foregroundColor(.choreStarPrimary)
                        .padding()
                    }
                }
                .frame(maxWidth: 480)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
            }
        }
    }

    private var header: some View {
        VStack(spacing: 12) {
            Text("⭐")
                .font(.system(size: 64))

            Text("Kid Login")
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundColor(.choreStarTextPrimary)

            Text(step == .familyCode
                 ? "Ask a parent for your family code"
                 : "Enter your secret PIN")
                .font(.headline)
                .foregroundColor(.choreStarTextSecondary)
        }
    }

    private var familyCodeCard: some View {
        VStack(spacing: 20) {
            TextField("Family code", text: $familyCode)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .multilineTextAlignment(.center)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.asciiCapable)
                .padding()
                .background(Color.choreStarBackground)
                .cornerRadius(16)
                .onChange(of: familyCode) { _, newValue in
                    familyCode = String(newValue.lowercased().filter { $0.isLetter || $0.isNumber }.prefix(12))
                    errorMessage = nil
                }

            Button(action: {
                guard !familyCode.isEmpty else { return }
                step = .pin
                errorMessage = nil
            }) {
                HStack {
                    Text("Next")
                    Image(systemName: "arrow.right.circle.fill")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.choreStarGradient)
                .cornerRadius(16)
                .opacity(familyCode.isEmpty ? 0.5 : 1)
            }
            .disabled(familyCode.isEmpty)
        }
        .padding(24)
        .background(Color.choreStarCardBackground)
        .cornerRadius(24)
        .shadow(color: .black.opacity(0.1), radius: 20, x: 0, y: 8)
        .padding(.horizontal, 24)
    }

    private var pinCard: some View {
        VStack(spacing: 20) {
            // Family code reminder with a way back
            Button(action: {
                step = .familyCode
                enteredPin = ""
                errorMessage = nil
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "house.fill")
                        .font(.caption)
                    Text(familyCode)
                        .font(.system(.subheadline, design: .monospaced))
                        .fontWeight(.bold)
                    Image(systemName: "pencil")
                        .font(.caption2)
                }
                .foregroundColor(.choreStarTextSecondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.choreStarBackground)
                .cornerRadius(10)
            }

            // PIN dots (PINs are 4-6 digits)
            HStack(spacing: 12) {
                ForEach(0..<max(4, enteredPin.count), id: \.self) { index in
                    Circle()
                        .fill(index < enteredPin.count ? Color.choreStarPrimary : Color.choreStarBackground)
                        .frame(width: 16, height: 16)
                        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: enteredPin.count)
                }
            }

            VStack(spacing: 16) {
                ForEach(0..<3) { row in
                    HStack(spacing: 20) {
                        ForEach(1..<4) { col in
                            let number = row * 3 + col
                            NumberButton(number: "\(number)") {
                                addDigit("\(number)")
                            }
                        }
                    }
                }

                HStack(spacing: 20) {
                    NumberButton(number: "", icon: "arrow.left.circle.fill") {
                        step = .familyCode
                        enteredPin = ""
                        errorMessage = nil
                    }
                    NumberButton(number: "0") {
                        addDigit("0")
                    }
                    NumberButton(number: "", icon: "delete.left.fill") {
                        if !enteredPin.isEmpty {
                            enteredPin.removeLast()
                            errorMessage = nil
                        }
                    }
                }

                if enteredPin.count >= 4 {
                    Button(action: { verify() }) {
                        HStack {
                            if isVerifying {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: "checkmark.circle.fill")
                            }
                            Text("Go!")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.choreStarGradient)
                        .cornerRadius(16)
                    }
                    .disabled(isVerifying)
                }
            }
        }
        .padding(24)
        .background(Color.choreStarCardBackground)
        .cornerRadius(24)
        .shadow(color: .black.opacity(0.1), radius: 20, x: 0, y: 8)
        .padding(.horizontal, 24)
    }

    private func addDigit(_ digit: String) {
        guard enteredPin.count < 6, !isVerifying else { return }

        let impact = UIImpactFeedbackGenerator(style: .light)
        impact.impactOccurred()

        enteredPin += digit
        errorMessage = nil

        if enteredPin.count == 6 {
            verify()
        }
    }

    private func verify() {
        guard !isVerifying else { return }
        isVerifying = true

        Task {
            let authError = await manager.kidLogin(familyCode: familyCode, pin: enteredPin)

            await MainActor.run {
                if let authError = authError {
                    errorMessage = authError
                    enteredPin = ""

                    let notification = UINotificationFeedbackGenerator()
                    notification.notificationOccurred(.error)
                } else {
                    UserDefaults.standard.set(familyCode, forKey: "last_family_code")
                    SoundManager.shared.play(.cheer)
                    dismiss()
                }
                isVerifying = false
            }
        }
    }
}

#Preview {
    KidLoginView()
        .environmentObject(SupabaseManager.shared)
}
