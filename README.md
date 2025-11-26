# Gravity — Flight Simulator✈️

Defy expectations. Defy gravity.🧹

https://slevin48.github.io/gravity/

Inspired by the soaring spirit of "Defying Gravity" from Wicked, Gravity is a tiny flight simulator built with React + Vite — a playful demo where you pilot a craft through simple physics and enjoy the feeling of lift.

## Overview

Gravity is a small React app demonstrating a flight simulation toy: lift, thrust, and gentle gravity combine for a satisfying, arcade-like flight experience. It’s ideal for a playful experiment in physics and UI.

## Features

- Lightweight React + Vite app for instant feedback and fast dev loops
- Simple physics model for lift, thrust, and drag
- Keyboard controls for intuitive piloting
- Ready for a screen recording to showcase the demo

## Getting Started

- Prerequisites: `node` (v16+ recommended) and `npm` or `pnpm`/`yarn`.

1. Install dependencies

```bash
npm install
```

2. Run the dev server

```bash
npm run dev
```

3. Open the app

Visit `http://localhost:5173` (Vite will print the exact URL).

## Controls

- W / Up Arrow: Thrust / Pitch up
- S / Down Arrow: Reduce thrust / Pitch down
- A / Left Arrow: Roll/turn left
- D / Right Arrow: Roll/turn right
- Space: Quick boost (if implemented)

Tip: Use a screen recorder (OBS, macOS screen capture, or your platform's tool) to capture a short demo — then place it at the top of this README.

## Inspiration

This project takes its attitude from Wicked’s anthem of flight: bold, defiant, and full of possibility. The UI and wording are intentionally playful — think sparkles and wide open skies.

## Contributing

Feel free to open issues or PRs. Ideas to explore:

- Polished physics (wind, turbulence)
- Camera effects and HUD polish
- Touch / mobile controls
- Replay / GIF export for quick demos

## License

This project is open — see the `LICENSE` file in the repo.

## Credits

- Built with React + Vite. Template cleaned and adapted for this flight demo.
- Inspired by Wicked — musical and metaphorical inspiration only.

Enjoy defying gravity.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
