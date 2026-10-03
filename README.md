# Bluefish & Albie Trip Planner

A personal fishing trip planner. It ranks shore spots, party boats and charters by season, drive time,
your schedule, tide, forecast and recent reports. Live tides and forecasts refresh every 4 hours.

## Setup (about 10 minutes, no coding tools needed)

1. Sign in at github.com. Click the + at the top right, then **New repository**.
   Name it `fishing-planner`, choose **Public**, and click **Create repository**.
2. On the new repository page, click **uploading an existing file**. Unzip the project first, then drag in
   everything inside the folder (index.html, the data and scripts folders, and the other files).
   Click **Commit changes**.
3. Click **Add file > Create new file**. In the name box type `.github/workflows/refresh.yml`
   (typing the slashes creates the folders). Paste in the contents of the refresh.yml file you were sent.
   Click **Commit changes**.
4. Go to **Settings > Pages**. Under **Source**, choose **GitHub Actions**.
5. Go to the **Actions** tab, open **Refresh and publish**, and click **Run workflow**.
   When it finishes (about a minute), your app is at `https://YOUR-USERNAME.github.io/fishing-planner/`.
6. On your phone, open that address, then use Share > **Add to Home Screen**.

## Notes
- GitHub pauses scheduled jobs after 60 days with no activity in the repository. If the live-data banner
  says the data is old, open the Actions tab and click Run workflow.
- Your logged reports, extra spots and typed forecasts are saved in the browser on each device.
- To add approved reports for every device, edit `data/reports.json` on GitHub. Each entry looks like
  `{"spot":"sandyhook","date":"2026-10-03","rating":4,"note":"Blues to 8 lb","source":"https://..."}`.
- If a lookup fails, the banner at the top of the page says which one.
