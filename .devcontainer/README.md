# Home Assistant Custom Card - Dev Container Setup

This directory contains the development container configuration for building and testing the restriction-card custom card for Home Assistant.

## Setup Instructions

1. **Install VS Code Remote Containers**
   - [VS Code Extension: Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

2. **Open in Dev Container**
   - Open the project folder in VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Remote-Containers: Reopen in Container"
   - Wait for the container to build (first time takes ~2-3 minutes)

3. **Build the Card**
   ```bash
   yarn build      # Lint and build
   yarn start      # Start dev server with hot reload (port 5050, override with DEV_PORT)
   yarn lint       # Check code quality
   yarn rollup     # Production build
   ```

4. **Access Services**
   - **Dev Container**: Terminal in VS Code (automatic)
   - **Home Assistant**: http://localhost:8123 (user: dev/pass: dev)
   - **Rollup Dev Server**: http://localhost:5050

5. **Configure Home Assistant to Use Your Card**
   - In Home Assistant, go to Settings > Dashboards
   - Create a new Dashboard
   - Add the card from the GUI

## File Structure

```
.devcontainer/
├── devcontainer.json    # VS Code dev container config
├── .gitignore          # Ignore HA data
└── README.md           # This file
```

## Base Image

This project uses the published image:

- `ghcr.io/custom-cards/custom-card-devcontainer:latest`

The image includes the `container` helper used by the devcontainer lifecycle commands.

## Development Workflow

### Building the Card

```bash
# One-time setup (automatic on container creation)
yarn install

# Development with hot reload
yarn start              # Runs Rollup in watch mode on port 5050

# Quality checks
yarn lint             # ESLint check
yarn build            # Full build pipeline (lint + rollup)

# Production build
yarn rollup           # Create optimized dist files
```

### Testing Against a Real Home Assistant Instance

You can try a local build on your own Home Assistant (including one reached over HTTPS, such as Nabu Casa) without publishing a release or changing its configuration:

1. Run `yarn start` on the same machine as your browser. It serves `dist/restriction-card.js` on `http://127.0.0.1:5050`.
2. Open Home Assistant on a page that isn't a dashboard (for example `/history`), so the installed card hasn't loaded yet.
3. In the browser console, load the local build:
   ```js
   await import('http://127.0.0.1:5050/restriction-card.js');
   ```
4. Go to your dashboard using the sidebar (don't reload the page). The card only registers itself once, so the installed version is skipped and every card in this tab uses your build.

Reloading the tab goes back to the installed version. Other devices aren't affected. If the browser asks whether the page may access devices on your local network, allow it; the dev server sends the `Access-Control-Allow-Private-Network` header Chrome needs for this.

### File Locations

- **Source Code**: `src/`
- **Built Output**: `dist/` (inside container)
- **Configuration**: Root directory (`tsconfig.json`, `rollup.config.js`, etc.)

## Troubleshooting

### Container Won't Start
```bash
# Rebuild the container
ctrl+shift+p → "Remote: Rebuild Container"
```

### Port Already in Use
```bash
# Find what's using port 5050 or 8123
lsof -i :5050
lsof -i :8123
```

### Node Modules Issues
```bash
# Clear and reinstall dependencies
rm -rf node_modules
yarn install
```

## Additional Resources

- [Home Assistant Custom Card Development](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [VS Code Dev Containers Docs](https://code.visualstudio.com/docs/remote/containers)
- [Lit Documentation](https://lit.dev/)
- [Material Design Web Components](https://github.com/material-components/material-web)

## Environment Details

- **Node.js**: 24
- **TypeScript**: 5.9.3
- **Build Tool**: Rollup 4.20
- **Linter**: ESLint 9 + TypeScript Support
- **Code Formatter**: Prettier 3.8
- **Web Framework**: Lit 3.3
- **Home Assistant Image**: Latest (optional)

## Notes

- All Yarn commands run inside the container automatically
- VS Code extensions are configured for TypeScript and YAML development
