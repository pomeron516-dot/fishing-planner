name: Refresh and publish

on:
  schedule:
    - cron: '17 */4 * * *'   # every 4 hours
  workflow_dispatch:         # lets you run it from the Actions tab
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Refresh tides, forecast and report links
        run: node refresh.mjs
      - name: Build site folder
        run: |
          mkdir site
          cp index.html styles.css engine.js app.js sw.js manifest.webmanifest icon.svg icon-180.png icon-192.png icon-512.png live.json inbox.json reports.json site/
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deploy
        uses: actions/deploy-pages@v4
