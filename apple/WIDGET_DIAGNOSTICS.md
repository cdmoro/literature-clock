# Widget timeline investigation (2026-10-30)

Investigated on `revert-162-revert-158-feat/apple-apps`. The reported symptom is
that the first quote remains visible and its progress bar reaches the end.
The on-device cause is **not yet established**. No device crash, jetsam report,
or trace of the failing timeline was available during this investigation.

## Confirmed in this branch

- `ClockProvider.makeTimeline` already supplies **61 entries**, at minute
  boundaries from the current minute through the next hour. Each entry contains
  its selected language and quote, not a request to read them later.
- Its policy is `.after(currentMinute + 30 minutes)`, leaving another 30 minutes
  of scheduled entries if the provider reload is delayed. This is a request,
  not a deadline the system guarantees.
- `ClockCatalogue.catalogue(for:)` decodes a whole locale JSON on its first use
  and retains it in a static dictionary for the lifetime of that process.
  It prefers the bundled catalogue and falls back to the App Group copy.
  It does **not** decode the JSON once per displayed minute. A new extension
  process starts with an empty in-memory cache.
- For every future minute, `randomLocale` checks availability in **all selected
  languages**. Consequently, requesting all languages loads all their complete
  catalogues during timeline construction. Random choices are stored in shared
  defaults, keyed by minute, configuration identity, candidate languages and
  safe-only mode. These keys currently accumulate without expiry.
- The widget configuration has its own languages; it does not inherit the app's
  language selection. Editing the widget causes WidgetKit to request a timeline
  for the new configuration, and its identity includes the selected languages.
- This checkout has **12**, not 14, language cases and bundled catalogues.
  All contain 1,438 minute slots and 3,640 quotes. `10:28` and `18:44` have no
  quotes; another 27 slots have no safe quote. Those gaps explain isolated empty
  entries, not a permanently frozen first quote.
- `ProgressView(timerInterval:)` uses the entry date through date + 60 seconds.
  It can advance independently of extension execution. Without a new displayed
  entry, its old interval ends and remains completed. That symptom does not
  establish whether a provider reload, timeline delivery, or rendering failed.

## Local memory experiment

A standalone macOS Swift process decoded the actual catalogues with the actual
`Quote` model and retained the same `[String: [String: [Quote]]]` shape. Resident
memory rose from 7,340,032 bytes to 45,154,304 bytes after all 12 languages;
decoding took about 0.19 seconds. This excludes SwiftUI, WidgetKit and rendering.
The probe used an autorelease pool per file; the production loader does not.

This establishes a significant retained-data cost on this Mac. It is **not** an
iOS extension footprint measurement, a memory limit measurement, or evidence of
a memory termination on the affected phone. A jetsam/crash report is required
before attributing the freeze to memory.

## Instrumentation

Filter the connected device's Console by subsystem
`net.literatureclock.app.widget`. The added logs record:

- `Building timeline`: request ID, family, languages and first date (Unix time).
- `Decoded catalogue`: language, input bytes, minute count, retained locale
  count and decode duration. Read/decode errors are no longer silently discarded.
- `Timeline ready`: matching request ID, number of entries and nonempty quotes,
  last date, reload request date and total build duration.

These logs describe provider execution, **not proof that the system displayed
each entry**. An ordinary extension exit after returning a timeline is expected;
future entries should not depend on that process staying alive.

## Physical-device checks

1. Install this branch's signed build and re-add an old widget if it uses the
   obsolete widget kind (see README). Confirm Edit Widget languages explicitly.
2. Capture one run attached to Xcode to inspect provider execution, then repeat
   with the debugger detached and the app closed to observe real scheduling.
   Keep device Console logging during the detached run.
3. Test one language, then all available languages; compare small and medium
   widgets. Observe at least three minute boundaries, then the 30-minute reload
   point and the hour boundary. Record the time displayed versus wall-clock time.
4. Change widget languages and safe-only mode. Confirm a new build request,
   correct language list and matching `Timeline ready` request ID.
5. If a `Building timeline` has no matching `Timeline ready`, inspect device logs
   and Xcode's Devices and Simulators device logs for crashes or memory kills.
   Also inspect Settings > Privacy & Security > Analytics & Improvements >
   Analytics Data for relevant JetsamEvent reports. Absence of a completion log
   alone does not prove a crash; logs can be lost.
6. If a complete timeline is returned but the **second** entry never displays,
   investigate delivery/rendering and widget registration; a reload budget at
   minute 30 alone does not explain that observation. If it stops only after the
   hour, investigate delayed provider reloads and available budget.

## Cache evaluation

Preselecting 30–60 future quotes/languages is already implemented. Persisting
those entries could reduce work across extension launches, but would not make
WidgetKit deliver entries more precisely. A disk cache also does not reduce
the initial all-language decode peak by itself.

If device traces support a resource problem, build a **bounded minute-window
cache** by decoding one locale at a time and retaining only quotes needed for
the horizon. Avoid calling the current global full-catalogue cache while doing
so. Persist only the selected quotes and required variant metadata. Key cached
data by language set, safe-only mode, configuration identity, catalogue version
and time zone; discard expired entries and invalidate on configuration changes.
Preserve quote navigation overrides when reusing entries. Write atomically and
fall back to rebuilding if the cache is missing or invalid. A persistent cache
is not introduced here without evidence that it addresses the failing path.

## Validation and limits

An isolated macOS executable compiled the actual provider and configuration
sources, plus the catalogue loader with its bundle resource URL redirected to
this checkout and a minimal settings stub. It verified 61 entries, 60-second
spacing, consecutive minute IDs, quotes belonging to their entry's minute and
language, and stable quote/language selections on repeated timeline generation.
Cases included a partial current minute, midnight, and the autumn DST transition
date, also run with `TZ=Europe/London`. This validates provider data generation,
not WidgetKit display delivery. The `.after(+30 minutes)` policy was reviewed
in source; no private policy representation was inspected.

The full unsigned iOS Simulator build was attempted but failed in the restricted
environment: SwiftUI's external macro plugin could not run its nested sandbox,
and CoreSimulator access was unavailable. A complete app build and physical
device delivery remain unverified. `git diff --check` passed.

## Apple guidance

- [Keeping a widget up to date](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date):
  provider reloads have a budget; future timeline entries and provider reloads
  are different mechanisms. Apple recommends entries about five minutes apart,
  so minute-level display remains best effort, not a precision guarantee.
- [Apple staff answer about one-entry, per-minute reloads](https://developer.apple.com/forums/thread/653265?answerId=619739022):
  applies directly to requesting a new provider timeline every minute. This
  branch already avoids that design. It does not establish that precomputed
  minute entries are impossible, nor explain commercial widgets' internals.

The changes here add diagnostics only. They do not claim to fix the reported
device freeze or alter the scheduling policy. Web and screensaver release
versions are unaffected by the component mapping in
`scripts/validate_release_versions.py`.

## Follow-up: Mac test and widget controls

The user reports that the native Mac desktop widgets advance correctly. Their
accent colors also appear correctly in the system's Default icon/widget style;
Clear Dark was transforming those colors. This is evidence for that Mac run,
not proof of delivery on iPhone.

The shared widget UI now removes the share button, shows the configured
book/author credits even in the small/fuzzy widget, and hides the fuzzy toggle
for `.systemSmall` using `Switch(.widgetFamily)` in the parameter summary.
Small widgets still force fuzzy mode and do not have quote navigation buttons.

The user also reports that iPhone does not offer widget editing. The generated
iOS Simulator extension's `Metadata.appintents/extract.actionsdata` contains
`ClockWidgetConfiguration` and its parameters. The iOS target includes the
configuration source, uses `AppIntentConfiguration`, and embeds the WidgetKit
extension. This does not verify the metadata or registration of the installed
device build. Missing editing UI should be investigated alongside installation,
intent metadata and system registration, rather than explained solely by the
provider's refresh budget. The app's registration log now says `configuration
decoded` instead of `configurable`: a nil typed configuration returned by
WidgetKit is not by itself a determination of editability.

Direct Swift compiler type-checks of all widget and model sources passed for
macOS and the iOS 17 device target after the UI changes. The macOS check emitted
existing Text concatenation deprecation warnings. A full device extension build
was also attempted but failed on environment write restrictions for Xcode's
module session/DerivedData paths. CoreDeviceService could not initialize in
this environment, so installed phone metadata was not inspected. Physical
device UI and the iPhone freeze remain unverified.

## Follow-up: bounded timeline loading (2026-10-31)

The shared provider now decodes one selected language at a time and retains only
minute slots for its 61-entry horizon. It does not populate the process-wide
full-catalogue cache during timeline construction. Language availability,
safe-only filtering and quote-navigation overrides use the same window.
The synchronous placeholder uses a literal sample and performs no catalogue
reads or preferences writes. These changes remove unnecessary extension work;
they are not confirmation of the cause of the physical iPhone freeze.

An unsigned iphoneos extension build generated App Intents metadata containing
ClockWidgetConfiguration, all nine parameters and its widget-family summary.
This validates the built extension metadata, not the installed phone registration.
The containing app build failed because the restricted environment prevented
SwiftUI macro plugin execution. Reinstall using the LiteratureClock app scheme,
remove/re-add the widget to discard old registrations, and check Edit Widget and
three consecutive minute boundaries with the debugger detached. If either still
fails, capture the device Console and relevant crash/Jetsam reports; do not
attribute missing editing controls to timeline refresh budgets.

Validation of the bounded loader: an executable using the actual Quote and
ClockCatalogue sources compared every retained quote ID against full catalogues
for all 12 languages and 61 minutes spanning midnight; passed. Shared widget
sources also passed direct type-checking for the iOS 17 device target. Full
extension rebuild remains blocked by Xcode module-session filesystem access.

## Physical iPhone evidence (2026-10-31)

Xcode's device console was inspected directly. The containing app reports four
installed widgets of the current kind with undecodable configuration. Debugging
the widget extension records `Failed to create LinkAction`
(`AppIntentsArchivingError`, code 1000), `Unable to get LNAction from intent`,
and `No AppIntent in timeline(for:with:)`. No matching provider timeline-start
logs appear in that session. This establishes failure before our provider is
called for these requests; reducing catalogue memory cannot repair that path.
The literal sample now makes the previously concealed placeholder state visible.

Device Hub also contains extension crash reports from the debug attempts:
EXC_BREAKPOINT in `_EXRunningExtension._start(with:)`, before catalogue/provider
frames. These are startup assertions, not evidence of a catalogue memory kill.
The exact underlying assertion message is absent from the exported report.

The iOS app and extension build number was advanced from 3 to 4 for a controlled
registration test. Built products contain matching version 4 and all nine intent
parameters. A build-number change is a diagnostic attempt, not a confirmed fix.
Do not remove user app data or claim success without a delivered real timeline
and working Edit Widget UI on the phone.

Result of build 4 registration test: the containing app still logs the same
LinkAction error and all four installed widget configurations remain
undecodable. Incrementing CFBundleVersion alone did not resolve the failure.
A new-widget gallery test could not be completed: computer control reported
that the Mac was locked and automatic unlock was paused by physical input.
No app data was deleted, no widget kind/intent identity was renamed, and no
unverified replacement configuration was introduced.
