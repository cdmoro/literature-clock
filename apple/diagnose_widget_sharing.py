#!/usr/bin/env python3
"""Read actual app/widget sharing evidence from macOS logs. Run from Terminal."""
import json
from pathlib import Path
import re
import subprocess


def sharing_events(records):
    for record in records:
        message = record.get("eventMessage", "")
        match = re.search(r"SHARING_(APP|WIDGET) (\{.*\})", message)
        if match:
            try:
                yield match.group(1), json.loads(match.group(2))
            except json.JSONDecodeError:
                continue


def assess(events, build):
    app = None
    observations = []
    for kind, values in events:
        if values.get("build") != build:
            continue
        if kind == "APP":
            app = values
            observations = []
        elif kind == "WIDGET" and app is not None:
            observations.append(values)
    if app is None:
        return "INCONCLUSIVE", "No app probe from this build. Open the installed app first."
    if not observations:
        return "INCONCLUSIVE", "No widget read after the latest app change. Edit a widget and press Done."
    latest = observations[-1]
    if latest.get("selection") != "app":
        return "INCONCLUSIVE", "The latest widget read uses a fixed color. Select Follow app for the test."
    fields = ("token", "palette", "group")
    if app.get("palette") == "custom":
        fields += ("accent",)
    if (all(latest.get(key) == app.get(key) and app.get(key) for key in fields)
            and latest.get("appliedPalette") == app.get("palette")):
        return "PASS", f"The widget read the app's unique marker and color ({app.get('palette')})."
    return "FAIL", (
        f"The widget did not read the latest app settings: app palette={app.get('palette')}, "
        f"widget palette={latest.get('palette')}, matching marker={latest.get('token') == app.get('token')}, "
        f"app container={app.get('container')}, widget container={latest.get('container')}. "
        "This is an observed sharing failure, not proof that sharing can never work."
    )


def main():
    config = (Path(__file__).parent / "Version.xcconfig").read_text()
    build = re.search(r"^CURRENT_PROJECT_VERSION\s*=\s*(\S+)", config, re.M).group(1)
    result = subprocess.run([
        "/usr/bin/log", "show", "--last", "20m", "--info", "--debug", "--style", "json",
        "--predicate", 'subsystem == "net.literatureclock.app.sharing"',
    ], text=True, capture_output=True)
    if result.returncode:
        raise SystemExit("Cannot read macOS logs; run this from your Mac's Terminal.\n" + result.stderr)
    try:
        records = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise SystemExit(f"Unexpected log output: {error}") from error
    events = list(sharing_events(records))
    status, detail = assess(events, build)
    print(f"Build {build}: {status}\n{detail}")
    print("\nApp/widget evidence (only diagnostic settings, no quotes):")
    for kind, values in events[-12:]:
        print(kind, json.dumps(values, sort_keys=True))


if __name__ == "__main__":
    main()
