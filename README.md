# Sunnyvale: One Last Scheme

A top-down browser adventure set in Sunnyvale Trailer Park. Walk the park, meet Ricky, Julian, Bubbles and the neighbours, collect supplies, and complete connected missions. Built with HTML, CSS, JavaScript modules and a Canvas renderer; no install or game engine required.

Explore 47 buildings along winding trailer park lanes, with furnished interiors behind every door. Meet the residents, complete 12 connected schemes, drive Ricky's Shitmobile, and survive the occasional neighbourhood argument. The closer camera has adjustable zoom, richer character sprites, and detailed lots and rooms.

Random encounters include four bottle kids throwing visible bottles, Lahey pulling up with Randy, Cyrus demanding money, runaway shopping carts, and a kitty rescue with Bubbles. Conversations can lead to peaceful resolutions or real-time scraps. Punch, block, dodge, earn XP, and level up. Knockouts preserve gear and mission progress.

[Play on GitHub Pages](https://claytonseager.github.io/TrailerParkBoys_SwitchGame/)

## Play

| Action | Control |
| --- | --- |
| Walk / drive | WASD or arrow keys |
| Sprint | Hold Shift |
| Talk / enter a building / enter or exit the car | E |
| Drive the Shitmobile | W gas, S brake/reverse, A/D steer |
| Punch | F or left-click the world during a fight |
| Block | Q |
| Dodge | Space |
| Camera zoom | + / −, mouse wheel, or on-screen buttons |
| Park map | M |
| Mission journal | J |
| Handbag | I or B |

The game also provides clickable combat and touch movement controls. Approach doors or furniture and press E. Beds restore your stats; shop counters sell snacks; the repair shop offers odd jobs. You can flee an encounter into a building or the Shitmobile without earning its reward.

Progress saves in this browser's local storage. Earlier saves retain cash, inventory, and mission progress and move the player to the expanded park's spawn. The car, interior, and RPG progress also save; active ambushes do not resume on reload. Use How to play → Start a new game to start over.

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
- `encounters.js`: roaming events, choices, projectiles, combat and rewards.
- `story/interiors.js`: furnished room layouts and interactions for every building.
- `story/`: locations, characters, items, pickups and mission content.
- `tests/`: mechanics and data checks.

This is an unofficial fan project. Trailer Park Boys and its characters belong to their respective rights holders.
