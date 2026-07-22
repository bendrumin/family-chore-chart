import AVFoundation
import SwiftUI

/// Plays short musical cues synthesized at launch (no bundled assets).
///
/// Each cue is a sequence of bell-like notes: a fundamental plus soft
/// harmonics, a fast attack to avoid clicks, and an exponential decay —
/// closer to a glockenspiel than the raw sine "beep" this replaced.
class SoundManager: ObservableObject {
    static let shared = SoundManager()

    @Published var isSoundEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isSoundEnabled, forKey: "soundEnabled")
        }
    }

    private var players: [String: AVAudioPlayer] = [:]

    init() {
        // Load preference from UserDefaults (default: enabled)
        self.isSoundEnabled = UserDefaults.standard.object(forKey: "soundEnabled") as? Bool ?? true

        // Configure audio session for mixing with other audio
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)

        // Synthesis is cheap (<50ms total) but keep it off the main thread
        DispatchQueue.global(qos: .utility).async { [weak self] in
            self?.generateSounds()
        }
    }

    enum SoundEffect: String {
        case success = "success"
        case pop = "pop"
        case coin = "coin"
        case cheer = "cheer"

        var filename: String {
            self.rawValue
        }
    }

    // MARK: - Note synthesis

    /// One note in a cue: when it starts, its pitch, how long it rings, how loud.
    private struct Note {
        let startTime: Double   // seconds into the cue
        let frequency: Double   // Hz
        let ringTime: Double    // seconds of audible decay
        let amplitude: Double   // 0...1 relative loudness
    }

    // Pitches (Hz): C major — friendly, kid-app appropriate
    private enum Pitch {
        static let c5 = 523.25
        static let e5 = 659.26
        static let g5 = 783.99
        static let c6 = 1046.50
        static let e6 = 1318.51
        static let g6 = 1567.98
    }

    private func generateSounds() {
        // pop — a soft, low "tock": single short pluck (tap feedback)
        let pop = renderNotes([
            Note(startTime: 0, frequency: Pitch.c5, ringTime: 0.16, amplitude: 0.55),
        ])

        // success — a bright two-note chime (C→E, a happy major third)
        let success = renderNotes([
            Note(startTime: 0.00, frequency: Pitch.c6, ringTime: 0.45, amplitude: 0.55),
            Note(startTime: 0.09, frequency: Pitch.e6, ringTime: 0.60, amplitude: 0.60),
        ])

        // coin — a quick sparkle (high G with an octave shimmer)
        let coin = renderNotes([
            Note(startTime: 0.00, frequency: Pitch.g6, ringTime: 0.30, amplitude: 0.45),
            Note(startTime: 0.05, frequency: Pitch.g5, ringTime: 0.35, amplitude: 0.30),
        ])

        // cheer — an ascending C-major arpeggio with a final sparkle (celebrations)
        let cheer = renderNotes([
            Note(startTime: 0.00, frequency: Pitch.c5, ringTime: 0.50, amplitude: 0.50),
            Note(startTime: 0.11, frequency: Pitch.e5, ringTime: 0.50, amplitude: 0.50),
            Note(startTime: 0.22, frequency: Pitch.g5, ringTime: 0.55, amplitude: 0.52),
            Note(startTime: 0.33, frequency: Pitch.c6, ringTime: 0.80, amplitude: 0.58),
            Note(startTime: 0.48, frequency: Pitch.e6, ringTime: 0.70, amplitude: 0.35),
            Note(startTime: 0.48, frequency: Pitch.g6, ringTime: 0.70, amplitude: 0.25),
        ])

        let rendered: [(String, Data?)] = [
            ("pop", pop), ("success", success), ("coin", coin), ("cheer", cheer),
        ]

        var newPlayers: [String: AVAudioPlayer] = [:]
        for (name, wavData) in rendered {
            guard let wavData = wavData,
                  let player = try? AVAudioPlayer(data: wavData) else { continue }
            player.prepareToPlay()
            newPlayers[name] = player
        }

        DispatchQueue.main.async { [weak self] in
            self?.players = newPlayers
        }
    }

    /// Renders a note sequence to 16-bit mono WAV data.
    ///
    /// Timbre: fundamental + one octave partial + a faint bell partial (×2.76,
    /// characteristic of struck bars), 4ms attack ramp, exponential decay.
    private func renderNotes(_ notes: [Note]) -> Data? {
        let sampleRate = 44100.0
        guard let last = notes.max(by: { ($0.startTime + $0.ringTime) < ($1.startTime + $1.ringTime) }) else {
            return nil
        }

        let totalDuration = last.startTime + last.ringTime + 0.05
        let frameCount = Int(sampleRate * totalDuration)
        var samples = [Double](repeating: 0, count: frameCount)

        for note in notes {
            let startFrame = Int(note.startTime * sampleRate)
            let noteFrames = Int(note.ringTime * sampleRate)
            let attackFrames = Int(0.004 * sampleRate) // 4ms — no click
            // Decay constant so the note fades to ~1% by the end of its ring time
            let decayRate = 4.6 / note.ringTime

            for i in 0..<noteFrames {
                let frame = startFrame + i
                guard frame < frameCount else { break }

                let t = Double(i) / sampleRate
                let attack = i < attackFrames ? Double(i) / Double(attackFrames) : 1.0
                let envelope = attack * exp(-decayRate * t)

                let phase = 2.0 * Double.pi * note.frequency * t
                // Struck-bar timbre: fundamental + octave + inharmonic bell partial
                var value = sin(phase)
                value += 0.35 * sin(2.0 * phase) * exp(-3.0 * t)
                value += 0.12 * sin(2.76 * phase) * exp(-6.0 * t)

                samples[frame] += value * envelope * note.amplitude
            }
        }

        // Soft-clip and convert to 16-bit PCM
        var pcmData = Data(capacity: frameCount * 2)
        for sample in samples {
            let limited = tanh(sample * 0.8)
            var value = Int16(max(-1.0, min(1.0, limited)) * Double(Int16.max) * 0.9)
            withUnsafeBytes(of: &value) { pcmData.append(contentsOf: $0) }
        }

        return wavData(from: pcmData, sampleRate: Int(sampleRate))
    }

    private func wavData(from pcmData: Data, sampleRate: Int) -> Data {
        var wav = Data()

        let numChannels: UInt16 = 1
        let bitsPerSample: UInt16 = 16
        let byteRate = UInt32(sampleRate) * UInt32(numChannels) * UInt32(bitsPerSample / 8)
        let blockAlign = numChannels * (bitsPerSample / 8)
        let dataSize = UInt32(pcmData.count)

        wav.append("RIFF".data(using: .ascii)!)
        var chunkSize = dataSize + 36
        withUnsafeBytes(of: &chunkSize) { wav.append(contentsOf: $0) }
        wav.append("WAVE".data(using: .ascii)!)

        wav.append("fmt ".data(using: .ascii)!)
        var subchunk1Size: UInt32 = 16
        withUnsafeBytes(of: &subchunk1Size) { wav.append(contentsOf: $0) }
        var audioFormat: UInt16 = 1 // PCM
        withUnsafeBytes(of: &audioFormat) { wav.append(contentsOf: $0) }
        var channels = numChannels
        withUnsafeBytes(of: &channels) { wav.append(contentsOf: $0) }
        var rate = UInt32(sampleRate)
        withUnsafeBytes(of: &rate) { wav.append(contentsOf: $0) }
        var byteRateVar = byteRate
        withUnsafeBytes(of: &byteRateVar) { wav.append(contentsOf: $0) }
        var blockAlignVar = blockAlign
        withUnsafeBytes(of: &blockAlignVar) { wav.append(contentsOf: $0) }
        var bitsVar = bitsPerSample
        withUnsafeBytes(of: &bitsVar) { wav.append(contentsOf: $0) }

        wav.append("data".data(using: .ascii)!)
        var dataSizeVar = dataSize
        withUnsafeBytes(of: &dataSizeVar) { wav.append(contentsOf: $0) }
        wav.append(pcmData)

        return wav
    }

    // MARK: - Playback

    func play(_ sound: SoundEffect) {
        guard isSoundEnabled else { return }

        DispatchQueue.main.async { [weak self] in
            guard let player = self?.players[sound.filename] else { return }
            player.currentTime = 0
            player.play()
        }
    }

    func toggle() {
        isSoundEnabled.toggle()
    }
}

// View extension for easy access
extension View {
    func playSound(_ sound: SoundManager.SoundEffect) {
        SoundManager.shared.play(sound)
    }
}
