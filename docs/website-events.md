# Website event management — TEST rollout

The Events tab is the editing source. Visitors load `events-data.js` and optimised images from this website, never Google Sheets or Drive. The welcome slide stays permanent; event slides rotate every 3 seconds.

## First setup

Copy all cells in `website-events-starter.tsv` into A1 of the Events tab. It contains seven existing events, their original public images and dates. Dates must be plain text in YYYY-MM-DD form. Set the date columns to **Format > Number > Plain text** before pasting if Sheets reformats them. Keep IDs stable when editing.

Published CSV: https://docs.google.com/spreadsheets/d/e/2PACX-1vRoxocl9mHeT5eMxnq16kpZQNhTVPapCLRD8P_m44088wGyLEea_fBXO8gWLRckZSMgnAFqQkYF-Dzb/pub?gid=0&single=true&output=csv

Poster upload folder: https://drive.google.com/drive/folders/1koCVPPJq_lBTMKCS0yZAXzNVRSf3IyM6

## Add an event

Upload the event poster to that folder; copy the individual file's sharing link, not the folder link, into Poster URL. For a homepage slide also supply desktop and mobile file links, Show in Slideshow=Yes, slide start/end dates and an order number. Use Yes/No for Enabled. Optional Event Link may point to a parish event page or social post.

For a homepage announcement, add **Show in Events** as an optional column. Set it to **No**, set **Show in Slideshow** and **Enabled** to **Yes**, and supply both banner links and both slide dates. Leave Poster URL and the event Start Date and End Date blank. Existing rows with a blank or missing Show in Events value are listed as usual.

Images must be publicly readable via their links. Do not upload videos into this system: use a small video cover as the poster and a social-media link. Existing website image links are also supported.

Optional extra sheet columns: Instagram URL, Facebook URL, Description, Date Label, Media Type (photo/video). Existing social links/descriptions are retained by ID if those columns are absent. Adding those columns lets you change or clear their values yourself. Use Date Label for events on several nonconsecutive dates, such as carol visits.

## Publish to TEST

In Codespaces on website-next-development:

```
git pull origin website-next-development
python3 scripts/sync_events.py
git add events-data.json events-data.js images/events/managed
git commit -m "Update website events"
git push origin website-next-development
```

The managed directory exists after a new Drive image is downloaded. If it does not exist, omit it from `git add`. Pillow is needed for new images (`python3 -m pip install Pillow`). The script validates every row and image before publishing data. A headings-only sheet keeps the current snapshot; to deliberately hide every event, retain the rows and set Enabled=No.

Alternatively, use GitHub Actions > **Sync schedule now** > Run workflow: select website-next-development in BOTH the workflow branch selector and target_branch input. This existing workflow also syncs the weekly schedule. GitHub requires workflow definitions on the default branch for unattended scheduling: during the TEST-only rollout, use a manual run or Codespaces sync. Production's existing hourly schedule job is unchanged. Hourly event sync will be enabled explicitly with the later approved production rollout.

## Date behaviour

Events remain Upcoming through their End Date (inclusive), and move to Earlier Events at midnight in America/Toronto. Multi-day events stay Upcoming through their last day. Slides use their own inclusive date range. Dates are rechecked when a page opens, every minute while open, and when returning to the page. Reload after publishing changed data.

If Google is unavailable or validation fails, existing website data/images remain available. Images are content-addressed and reused. No files are deleted automatically, so earlier posters remain available and Git history is preserved.
