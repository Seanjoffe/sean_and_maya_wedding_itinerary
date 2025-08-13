# 💜 Sean & Maya’s Wedding Week Itinerary

Welcome, friends and family! 🎉 See the live site here: **[https://seanjoffe.github.io/sean\_and\_maya\_wedding\_itinerary/](https://seanjoffe.github.io/sean_and_maya_wedding_itinerary/)**

---

## What is this?

A tiny, mobile-friendly web app that shows the wedding-week schedule. It reads events from a CSV in this repo and turns them into day tabs and activity cards with maps, calendar adds, and downloadable `.ics` files—no backend, no build tools.

---

## Project structure

```
/  (repo root)
├── index.html
├── styles.css
├── script.js
└── wedding_week_itinerary.csv
```

---

## Features

* 💜 White–purple–blue theme, mobile-first
* 🗓️ Day tabs with sorted activities (start/end time, title, details)
* 📍 Map button (Google Maps link or location search)
* ➕ “Add to Google Calendar” deep link
* 📥 One-click `.ics` download (Apple/Outlook)
* 🏷️ Category badges (wedding, meal, tour, free)
* 🖼️ Optional image per activity
* ⏳ Countdown to the wedding date
* ♿ Accessible labels and live regions

---

## File overview (short + key functions)

**index.html** — Markup shell and mount points.
Holds the header (title/date/countdown), the day tabs `<nav id="tabs">`, the cards grid `<div id="cards">`, and links to `styles.css` + `script.js`.

**styles.css** — All styles.
Theme variables, layout (banner, frame, grid), components (tabs, cards, badges, buttons), error banner, small responsive tweaks.

**script.js** — Data loading + rendering.

* `load()` – fetches `wedding_week_itinerary.csv`, basic header check, calls `render()`.
* `parseCSV(text)` – robust, quote-aware CSV parser using `splitCSVLine()`.
* `splitCSVLine(line)` – safely splits one CSV line (handles quotes/escapes).
* `normalizeRows(rows)` – groups by Day/Date, maps columns, sorts days & items.
* `render(days)` – builds tabs, handles day switching, inserts activity cards.
* `activityCard(item, dateISO)` – one card UI: time, title, description, map/Google/`.ics` buttons, optional image.
* `googleCal({...})` – builds a Google Calendar add-event URL.
* `icsFile({...})` – generates a downloadable `.ics` file.
* Helpers: `fmtDate()`, `daysUntil()`, `isoToGcal()`, `badgeClass()`, `icon()`.

**wedding\_week\_itinerary.csv** — Source of truth for events.
Header must be exactly:

```
Day, Date, Start Time, End Time, Activity Name, Description, Location, Map Link, Category, Image URL
```

Add/edit rows, commit, refresh the site.

---
