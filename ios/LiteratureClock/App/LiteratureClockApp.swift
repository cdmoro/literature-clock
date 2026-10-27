import SwiftUI

@main
struct LiteratureClockApp: App {
    init() {
        ClockCatalogue.installSharedCatalogues()
    }

    var body: some Scene {
        WindowGroup { ClockHomeView() }
    }
}
