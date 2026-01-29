import AVFoundation
import SwiftUI

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
        
        // Pre-load sounds
        preloadSounds()
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
    
    private func preloadSounds() {
        // We'll generate sounds programmatically since we can't include files
        // This keeps the app self-contained
        generateSounds()
    }
    
    private func generateSounds() {
        // Generate simple tones for each sound effect
        // These are programmatically created to avoid needing external files
        
        // Success: High-pitched pleasant tone
        players["success"] = createTonePlayer(frequency: 800, duration: 0.3)
        
        // Pop: Quick pop sound
        players["pop"] = createTonePlayer(frequency: 600, duration: 0.1)
        
        // Coin: Two-tone ding
        players["coin"] = createTonePlayer(frequency: 1000, duration: 0.2)
        
        // Cheer: Rising tone
        players["cheer"] = createTonePlayer(frequency: 700, duration: 0.4)
    }
    
    private func createTonePlayer(frequency: Float, duration: Double) -> AVAudioPlayer? {
        let sampleRate = 44100.0
        let amplitude: Float = 0.3
        let frames = Int(sampleRate * duration)
        
        var audioData = Data()
        
        for frame in 0..<frames {
            let value = sin(2.0 * .pi * Double(frequency) * Double(frame) / sampleRate)
            let sample = Int16(value * Double(amplitude) * Double(Int16.max))
            var sampleData = sample
            audioData.append(Data(bytes: &sampleData, count: MemoryLayout<Int16>.size))
        }
        
        // Create a temporary file
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(UUID().uuidString).wav")
        
        // Write WAV header and data
        if let wavData = createWAVData(from: audioData, sampleRate: Int(sampleRate)) {
            try? wavData.write(to: tempURL)
            return try? AVAudioPlayer(contentsOf: tempURL)
        }
        
        return nil
    }
    
    private func createWAVData(from pcmData: Data, sampleRate: Int) -> Data? {
        var wavData = Data()
        
        // WAV header
        let numChannels: UInt16 = 1
        let bitsPerSample: UInt16 = 16
        let byteRate = UInt32(sampleRate) * UInt32(numChannels) * UInt32(bitsPerSample / 8)
        let blockAlign = numChannels * (bitsPerSample / 8)
        let dataSize = UInt32(pcmData.count)
        
        // RIFF chunk
        wavData.append("RIFF".data(using: .ascii)!)
        var chunkSize = dataSize + 36
        wavData.append(Data(bytes: &chunkSize, count: 4))
        wavData.append("WAVE".data(using: .ascii)!)
        
        // fmt chunk
        wavData.append("fmt ".data(using: .ascii)!)
        var subchunk1Size: UInt32 = 16
        wavData.append(Data(bytes: &subchunk1Size, count: 4))
        var audioFormat: UInt16 = 1 // PCM
        wavData.append(Data(bytes: &audioFormat, count: 2))
        var channels = numChannels
        wavData.append(Data(bytes: &channels, count: 2))
        var rate = UInt32(sampleRate)
        wavData.append(Data(bytes: &rate, count: 4))
        var byteRateVar = byteRate
        wavData.append(Data(bytes: &byteRateVar, count: 4))
        var blockAlignVar = blockAlign
        wavData.append(Data(bytes: &blockAlignVar, count: 2))
        var bitsVar = bitsPerSample
        wavData.append(Data(bytes: &bitsVar, count: 2))
        
        // data chunk
        wavData.append("data".data(using: .ascii)!)
        var dataSizeVar = dataSize
        wavData.append(Data(bytes: &dataSizeVar, count: 4))
        wavData.append(pcmData)
        
        return wavData
    }
    
    func play(_ sound: SoundEffect) {
        guard isSoundEnabled else { return }
        
        DispatchQueue.global(qos: .userInteractive).async { [weak self] in
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

