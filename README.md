# Shotter

A hand-tracking bird shooting game built with Three.js and MediaPipe. Use your hands as guns to shoot birds flying across the screen — no controller needed!

## [Play Now](https://ashwanthkumar.github.io/shotter-game/)

## How to Play

- Show **1 or 2 hands** to your webcam
- Move your hand to aim — shooting is **automatic** when your crosshair is on a bird
- Grab **power-ups** (glowing cyan orbs) for rapid fire
- **Don't shoot the aircraft** or it's game over!

## Game Modes

| Mode | Description |
|------|-------------|
| **Classic** | 5 lives. Lose a life when a bird escapes. |
| **Arcade** | 60 seconds. Get the highest score! |
| **Zen** | 90 seconds. No aircraft, no pressure. |

## Birds

7 bird types from common Sparrows to the rare Golden Phoenix, each with unique size, speed, and point value. Rarer birds appear as difficulty increases.

## Tech Stack

- **TypeScript** + **Three.js** for 3D rendering
- **MediaPipe** for real-time hand tracking via webcam
- **Web Audio API** for procedural sound (zero audio files)
- **Vite** for dev server and bundling
- Everything is procedurally generated — zero external assets

## Development

```bash
npm install
npm run dev     # Start dev server
npm run build   # Production build
```

## License

[MIT](LICENSE)
