# Clockwise

Clockwise is a time management dashboard application.

## Versioning

To bump the version across all packages and components (dashboard, server, Tauri configs, and Cargo manifests), you can use the provided script at the root of the repository.

Run the following command, replacing `<version>` with your target version:

```bash
node scripts/bump-version.mjs <version>
```

This will automatically update the version in:
- `clockwise-dashboard/package.json`
- `clockwise-dashboard/src-tauri/tauri.conf.json`
- `clockwise-dashboard/src-tauri/Cargo.toml`
- `clockwise-server/package.json`
