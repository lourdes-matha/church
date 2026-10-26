# Schedule data sync

Editors continue using the published Google Sheet. The browser reads `schedule-data.json`, never the sheet directly. Returning visitors can see a saved snapshot while the current file loads. The visible timestamp is the time the schedule content last changed, displayed in Windsor time. An unchanged feed creates no commit. It is not a guarantee that the source was checked at that displayed time.

Run locally / in Codespaces:

```sh
python3 scripts/sync_schedule.py
```

Commit and push `schedule-data.json` after a manual local sync if it changes. The script rejects invalid feeds before replacing the last valid snapshot. Blank rows are ignored; populated rows require ISO dates, an event name and a Weekly/Upcoming category. Published Google data may itself lag behind a sheet edit.

The `Sync schedule now` GitHub Actions workflow supports manual branch selection and checks hourly at minute 17 (UTC). GitHub schedules can be delayed and may be disabled after prolonged repository inactivity. Check the Actions page for failures; the previous snapshot remains available. It uses standard public-repository runners and the repository's automatic token; no personal token or additional service is needed.

## Test rollout

The workflow runs once when its file or sync script is pushed to `website-next-development`. Hourly scheduled runs and GitHub's manual workflow button require this workflow to exist on the default branch. Until production approval, test the seeded snapshot and run the Python command above when new sheet content is needed. Do not merge the page or workflow to main as part of Test preparation.

## Production rollout

After approval, merge the tested files to main. Scheduled runs then refresh main. A manual run defaults to Test; select main to publish an urgent schedule change. The workflow requests a Pages rebuild explicitly after production bot commits because automatic-token commits do not normally trigger Pages builds. This step assumes the existing branch-based GitHub Pages configuration; recheck it if hosting is changed to a custom Actions deployment. Never place secret keys or private registration responses in the public sheet/snapshot.
