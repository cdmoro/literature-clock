import SwiftUI
import WidgetKit
import OSLog

@main
struct LiteratureClockApp: App {
    init() {
        ClockCatalogue.installSharedCatalogues()
        // Running a new app build doesn't invalidate an already displayed
        // widget timeline. Ask WidgetKit to rebuild it with the installed code.
        WidgetCenter.shared.reloadTimelines(ofKind: "net.literatureclock.app.configurable-clock")
        // Inspect the system's installed widget records from the containing app,
        // even when the extension never receives a snapshot or timeline request.
        WidgetCenter.shared.getCurrentConfigurations { result in
            let logger = Logger(subsystem: "net.literatureclock.app", category: "WidgetRegistration")
            switch result {
            case .success(let widgets):
                logger.notice("Registered widgets: \(widgets.count)")
                for widget in widgets {
                    let hasConfiguration = widget.widgetConfigurationIntent(of: ClockWidgetConfiguration.self) != nil
                    logger.notice("Widget kind: \(widget.kind, privacy: .public); configuration decoded: \(hasConfiguration)")
                }
            case .failure(let error):
                logger.error("Widget registration query failed: \(error.localizedDescription, privacy: .public)")
            }
        }
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
