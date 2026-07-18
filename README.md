# FridgeFirst

A desktop pantry tracker and recipe finder that helps you use up what you already have before it goes to waste. Add ingredients as you buy them, get an urgency-first view of what needs to be eaten soon, and find real recipes that use it — by ingredient, mood, meal course, diet, or voice.

Built with React, Vite, and Electron.

## Features

- **Pantry tracking** — add ingredients with a structured form or by voice; expiry dates default from a shelf-life heuristic (leafy greens vs. pantry staples vs. dairy, etc.) but can be overridden.
- **Rescue dashboard** — an urgency-first home screen: what to eat today, what's coming up soon, and proactive recipe suggestions pulled from what's already expiring.
- **Recipe search** — real recipes from Spoonacular, filterable by ingredients on hand, meal course, mood, diet, cuisine, and cook time. Falls back to TheMealDB automatically if Spoonacular's daily limit is hit.
- **Voice search** — speak your search instead of typing (ElevenLabs Scribe).
- **Read aloud** — have a recipe's instructions read aloud hands-free while cooking (ElevenLabs TTS).
- **AI recipe fallback** — if a search comes back sparse, generate a one-off custom recipe from your pantry ingredients (Groq / Llama 3.3). Always clearly labeled as AI-generated, never mixed in with real search results, and never a substitute for the two recipe APIs above.
- **Rescue streaks & history** — tracks how many ingredients you've used before they expired, with a simple day-streak counter.
- **Native notifications** — a nudge when something needs to be used today.

## Tech stack

- React 19 + Vite (Rolldown build)
- Electron + electron-builder (packaged as a native macOS app)
- Oxlint
- No backend — everything is stored locally via `localStorage`

## Getting started

```bash
git clone https://github.com/YOUR_USERNAME/fridgefirst.git
cd fridgefirst
npm install
```

### API keys

Create a `.env` file in the project root:

```
VITE_SPOONACULAR_API_KEY=
VITE_ELEVENLABS_API_KEY=
VITE_GROQ_API_KEY=
```

- **Spoonacular** — recipe search. Free tier at [spoonacular.com/food-api](https://spoonacular.com/food-api).
- **ElevenLabs** — voice search and read-aloud. Free tier at [elevenlabs.io](https://elevenlabs.io). You'll also need at least one voice saved to your account's voice library (Voice Library → "Add to my voices") — free-tier accounts can't use arbitrary voice IDs via the API.
- **Groq** — AI recipe fallback. Free, no card required, at [console.groq.com](https://console.groq.com).

The app degrades gracefully without any of these — Spoonacular is the only one needed for core recipe search; voice and AI generation just show a clear error if their key is missing.

## Running it

```bash
npm run dev            # browser, at localhost:5173
npm run electron:dev   # desktop app in dev mode, with hot reload
```

## Building the desktop app

```bash
npm run electron:build      # packages a .dmg into release/
npm run electron:reinstall  # builds, then replaces the installed app in /Applications and relaunches it (macOS only)
```

`electron:dev` is for active development — it hot-reloads but isn't a real installed app. `electron:reinstall` is the one-command way to get changes into the actual app on your Mac.

## Project structure

```
src/
  api/           Spoonacular, TheMealDB, ElevenLabs, Groq clients
  components/    UI components
  hooks/         usePantry (core state), useToast
  data/          shelf-life heuristics, ingredient suggestions, filter options
  utils/         recipe ranking/matching, AI recipe generation helper
electron/
  main.js        Electron main process
scripts/
  reinstall-mac.sh
```
