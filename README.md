# GTA VI Trophy Guide & Tracker — Vice Got a Price!

A fan-made guide and checklist for all 55 official Grand Theft Auto VI
trophies on PlayStation 5, including the platinum. Every trophy has a
practical guide written for this entry, and the tracker lets you tick off
what you have earned, search and filter the list, hide or reveal hidden
trophies, follow a seven-stage roadmap, and export or import your progress
as JSON. Everything runs offline — no network requests, no build step.

## How to run

Open `app/index.html` in a browser, or serve the folder:

```sh
node serve.ts
```

Then open the printed address and use the search box, filters and
check-off buttons. Your checked trophies are saved in localStorage.

## How the build works

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` (and `screenshots/`, when present) into the output
directory and writes `dossier.json` through the vendored makefun helper.

## Scope note

The guide text in this entry is this entry's own words. Trophy names and
descriptions are the official list as published by PlayStation, reported
18 Nov 2026 from Exophase and cross-checked with PSNProfiles and
TrueAchievements.
