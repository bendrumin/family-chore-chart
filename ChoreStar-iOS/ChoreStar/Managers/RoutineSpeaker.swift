import AVFoundation
import Foundation

/// Read-aloud for routine steps (free; migration 032's routines.auto_read_aloud
/// turns it on by default for a routine). On-device AVSpeechSynthesizer, no
/// network, like the web's SpeechSynthesis.
///
/// Template titles are spoken localized in the kid's language; titles a parent
/// typed are spoken in the family's language when it is known (a Spanish
/// title read with an English voice is gibberish), else the device's.
final class RoutineSpeaker: NSObject, ObservableObject, AVSpeechSynthesizerDelegate {
    @Published private(set) var isSpeaking = false
    private let synthesizer = AVSpeechSynthesizer()

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    /// The BCP-47 voice language for a step title.
    static func voiceLanguage(isTemplateTitle: Bool, familyLanguage: String?, deviceLanguage: String = Locale.preferredLanguages.first ?? "en-US") -> String {
        if !isTemplateTitle, let familyLanguage, !familyLanguage.isEmpty {
            return familyLanguage
        }
        return deviceLanguage
    }

    func speak(stepTitle: String, familyLanguage: String?) {
        let isTemplate = RoutineTemplate.localizableStepTitles.contains(stepTitle)
        let text = isTemplate ? RoutineTemplate.localizedStepTitle(stepTitle) : stepTitle
        let language = Self.voiceLanguage(isTemplateTitle: isTemplate, familyLanguage: familyLanguage)
        stop()
        // Uses the app's ambient session (SoundManager), like every other sound.
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: language) ?? AVSpeechSynthesisVoice(language: nil)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9
        synthesizer.speak(utterance)
        isSpeaking = true
    }

    func stop() {
        if synthesizer.isSpeaking { synthesizer.stopSpeaking(at: .immediate) }
        isSpeaking = false
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.isSpeaking = false }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.isSpeaking = false }
    }
}
