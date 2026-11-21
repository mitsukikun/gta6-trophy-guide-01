# GTA VI Trophy Guide & Tracker — Vice Got a Price!

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mitsukikun/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mitsukikun/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Built for the gta6-trophy-guide-01 bounty on make.fun — https://make.fun/bounty/gta6-trophy-guide-01

## What this is

A fan-made guide and checklist for all 55 official Grand Theft Auto VI trophies on PlayStation 5, including the platinum. Every trophy comes with a practical guide written for this entry — what to do, where to go, and what to watch out for — so you can work through the list without hunting for tips elsewhere.

## The tracker

The tracker turns the guide into something you can actually use while you play:

- Tick off trophies as you earn them; progress is saved in your browser (localStorage).
- Search the list and filter by category, stage, or completion status.
- Hide or reveal hidden trophies, so you can dodge spoilers until you want them.
- Follow a seven-stage roadmap that orders the trophies into a sensible play order.
- Export your progress as JSON, and import it back later on any device.

Everything runs offline — no network requests, no build step, no accounts.

## How to run

Open `app/index.html` in a browser, or run `node serve.ts` and open the address it prints.

## How the build works

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` (and `screenshots/`, when present) into the output directory and writes `dossier.json` through the vendored makefun helper.

## Scope note

The guide text is this entry's own words. Trophy names and descriptions are the official list as published by PlayStation, reported 18 Nov 2026 from Exophase and cross-checked with PSNProfiles and TrueAchievements.
