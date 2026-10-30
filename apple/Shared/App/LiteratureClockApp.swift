import SwiftUI
import WidgetKit
import OSLog

@main
struct LiteratureClockApp: App {
    init() {
        ClockCatalogue.installSharedCatalogues()
        // Inspect the system's installed widget records from the containing app,
        // even when the extension never receives a snapshot or timeline request.
        WidgetCenter.shared.getCurrentConfigurations { result in
            let logger = Logger(subsystem: "net.literatureclock.app", category: "WidgetRegistration")
            switch result {
            case .success(let widgets):
                logger.notice("Registered widgets: \(widgets.count)")
                for widget in widgets {
                    let hasConfiguration = widget.widgetConfigurationIntent(of: ClockWidgetConfiguration.self) != nil
                    logger.notice("Widget kind: \(widget.kind, privacy: .public); configurable: \(hasConfiguration)")
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
