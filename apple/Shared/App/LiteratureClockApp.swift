import SwiftUI
import WidgetKit

@main
struct LiteratureClockApp: App {
    init() {
        ClockCatalogue.installSharedCatalogues()
        // Running a new app build doesn't invalidate an already displayed
        // widget timeline. Ask WidgetKit to rebuild it with the installed code.
        WidgetCenter.shared.reloadTimelines(ofKind: "net.literatureclock.app.configurable-clock")
    }

    var body: some Scene {
        WindowGroup {
            ClockHomeView()
                #if os(macOS)
                .frame(minWidth: 480, minHeight: 420)
                // Prefer this existing window for every widget deep link.
                // Without a preference, WindowGroup can open another window.
                .handlesExternalEvents(preferring: ["*"], allowing: ["*"])
                #endif
        }
        #if os(macOS)
        .defaultSize(width: 700, height: 600)
        #endif
        #if os(macOS)
        Settings {
            NavigationStack { SettingsView() }
                .frame(width: 540, height: 650)
        }
        #endif
    }
}
