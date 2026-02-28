# Matrix Rust SDK Log Visualiser

[![codecov](https://codecov.io/gh/manuroe/matrix-rust-sdk-log-visualiser/graph/badge.svg)](https://codecov.io/gh/manuroe/matrix-rust-sdk-log-visualiser)

A web viewer for [matrix-rust-sdk](https://github.com/matrix-org/matrix-rust-sdk) logs. **All processing runs locally in your browser** — no data is sent anywhere.

Live at **https://manuroe.github.io/matrix-rust-sdk-log-visualiser/**

![Logs view](public/demo/screenshot-logs-light.png#gh-light-mode-only)
![Logs view](public/demo/screenshot-logs-dark.png#gh-dark-mode-only)

![Summary view](public/demo/screenshot-summary-light.png#gh-light-mode-only)
![Summary view](public/demo/screenshot-summary-dark.png#gh-dark-mode-only)

![Sync waterfall](public/demo/screenshot-sync-light.png#gh-light-mode-only)
![Sync waterfall](public/demo/screenshot-sync-dark.png#gh-dark-mode-only)

## Demo mode

Click **"Try with demo logs"** on the landing page to explore the app without a real log file.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:5173

## Contributing

See [AGENTS.MD](AGENTS.MD) for architecture notes and agent/contributor guidance.
