# Sunnyvale: One Last Scheme

A top-down browser adventure set in Sunnyvale Trailer Park. Walk the park, meet Ricky, Julian, Bubbles and the neighbours, collect supplies, and complete connected missions. Built with HTML, CSS, JavaScript modules and a Canvas renderer; no install or game engine required.

Explore 12 locations, meet 8 residents, and complete 12 schemes with 36 mission steps. Hand-placed collectibles, snack shops, repeatable odd jobs, and a repair fundraiser give the park a shared purpose.

[Play on GitHub Pages](https://claytonseager.github.io/TrailerParkBoys_SwitchGame/)

## Play

| Action | Control |
| --- | --- |
| Walk | WASD or arrow keys |
| Sprint | Hold Shift |
| Talk, collect, or interact | E |
| Park map | M |
| Mission journal | J |
| Handbag | I or B |

The game also provides on-screen controls for touch devices. Progress saves in this browser's local storage. Use the in-game new-game control to start over.

## Run locally

Serve the repository through a web server so browsers can load its JavaScript modules:

```powershell
python -m http.server 8080
```

Open [localhost:8080](http://localhost:8080). Opening `index.html` directly from the filesystem does not support module loading in most browsers.

Run the mechanics tests with Node.js 22 or newer:

```powershell
npm test
```

## Publish

This repository already publishes the `main` branch from `/ (root)` through GitHub Pages. Push a change to `main`, then wait for the **pages build and deployment** workflow in the repository's Actions tab. The public URL is [claytonseager.github.io/TrailerParkBoys_SwitchGame](https://claytonseager.github.io/TrailerParkBoys_SwitchGame/).

If Pages ever needs to be configured again, open **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, and select `main` and `/ (root)`. The `.nojekyll` file keeps this a plain static site. All runtime assets use relative paths to support the repository URL.

The separate [checks workflow](.github/workflows/checks.yml) runs the mechanics tests and verifies the runtime files on pushes and pull requests. It does not change the existing publishing setup.

## Project layout

- `app.js`: input, menus, HUD and the game loop.
- `renderer.js`: the park, characters and camera.
- `gameEngine.js`: movement, interactions, missions, inventory and saves.
- `story/`: locations, characters, items, pickups and mission content.
- `tests/`: mechanics and data checks.

This is an unofficial fan project. Trailer Park Boys and its characters belong to their respective rights holders.
