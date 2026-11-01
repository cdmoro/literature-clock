#!/usr/bin/env python3
"""Label a merged PR with the artifacts affected by its changed paths."""

import json
import os
import urllib.error
import urllib.request

from component_ownership import changed_components

LABELS = {
    "Web": ("affects:web", "2496ED"),
    "macOS": ("affects:macos-screensaver", "555555"),
    "Windows": ("affects:windows-screensaver", "0078D4"),
}


def request(method, url, token, body=None):
    req = urllib.request.Request(
        url,
        data=None if body is None else json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
                 "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # GitHub returns 422 when a label already exists; the following add call is idempotent.
        if method == "POST" and error.code == 422:
            return None
        raise


def main():
    repo = os.environ["GITHUB_REPOSITORY"]
    number = os.environ["PR_NUMBER"]
    token = os.environ["GITHUB_TOKEN"]
    api = f"https://api.github.com/repos/{repo}"
    paths = []
    page = 1
    while True:
        batch = request("GET", f"{api}/pulls/{number}/files?per_page=100&page={page}", token)
        paths.extend(file["filename"] for file in batch)
        if len(batch) < 100:
            break
        page += 1
    names = []
    for component in sorted(changed_components(paths)):
        name, color = LABELS[component]
        names.append(name)
        request("POST", f"{api}/labels", token,
                {"name": name, "color": color, "description": f"Merged PR affects {component}"})
    if names:
        request("POST", f"{api}/issues/{number}/labels", token, {"labels": names})
    print(f"Applied impact labels: {', '.join(names) if names else '(none)'}")


if __name__ == "__main__":
    main()
