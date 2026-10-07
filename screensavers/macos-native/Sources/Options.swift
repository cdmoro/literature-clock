import AppKit
import ScreenSaver

enum ClockLocale {
    static func resolve(_ identifier: String, supported: [String]) -> String {
        let normalized = identifier.replacingOccurrences(of: "_", with: "-").lowercased()
        if let exact = supported.first(where: { $0.lowercased() == normalized }) { return exact }
        let language = normalized.split(separator: "-").first.map(String.init) ?? ""
        let dominant = ["en": "en-GB", "es": "es-ES", "fr": "fr-FR", "it": "it-IT",
                        "pt": "pt-PT", "de": "de-DE", "el": "el-GR", "zh": "zh-CN",
                        "ru": "ru-RU", "eo": "eo", "ar": "ar-AE"]
        if let match = dominant[language], supported.contains(match) { return match }
        return "en-GB"
    }
}
