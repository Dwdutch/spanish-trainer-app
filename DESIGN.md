# Spanish Training Tool: Design Summary and Handoff

Design summary for anyone enhancing the app. Written 2026-10-28 and checked against the code as published (app code last changed in repo commit 9ccd8f3).

## 1. Repository and deployment

| Item | Value |
|---|---|
| Repo | `Dwdutch/spanish-trainer-app` (public) https://github.com/Dwdutch/spanish-trainer-app |
| Branch | `main` (only branch; GitHub Pages serves it, root folder) |
| Commits | App code last changed in `9ccd8f3`. Later commits updated `DESIGN.md` and the two `words.json` files (cleanup on 2026-10-28). Check the commits page for anything newer. |
| David's app | https://dwdutch.github.io/spanish-trainer-app/david/ |
| Lynn's app | https://dwdutch.github.io/spanish-trainer-app/lynn/ |
| Landing page | https://dwdutch.github.io/spanish-trainer-app/ (two links) |

Files in the repo:

```
index.html                  landing page (links to david/ and lynn/)
README.md
DESIGN.md                   this file
david/index.html            the whole app (CSS + JS inline, about 44 KB)
david/words.json            word list, 768 words, 321 flagged m:1
david/sw.js                 service worker, cache name spanish-trainer-david-<build>
david/manifest.webmanifest
lynn/index.html             identical app; only PROFILE and NAME constants differ
lynn/words.json             474 rows, none mastered
lynn/sw.js                  same as David's with "lynn" in the cache name
lynn/manifest.webmanifest
fonts/nunito-latin-{400,700,900}-normal.woff2   shared, bundled (no CDN)
icons/icon-{180,192,512}.png                    shared blue "¡Hola! ESPAÑOL" bubble
```

Does the repo match the iPhone? As of this writing David had not yet installed it on the iPhone. The iPhone gets whatever the Pages site serves when it is opened online, so the repo (main) is the version that will run. Once installed, a phone runs the cached copy and picks up changes as described in section 8.

How updates deploy: there is no build step in the repo. Commit changed files to `main` and GitHub Pages republishes in about a minute . Because the page is cached by the phone's service worker, a changed app file reaches the phone on the second launch after deploy unless `CACHE` is bumped (section 8). Source of truth is `david/index.html`; `lynn/index.html` must stay identical except for the `PROFILE` and `NAME` lines. Bump the `CACHE` string in both `sw.js` files with every app change.

## 2. Purpose and use

A flashcard app in the style of Duolingo's "Say the words in Spanish", built on David's Duolingo word list. It runs as a Home Screen web app on an iPhone (Safari, Add to Home Screen) and works with no connection after the first load. Cards mix English-to-Spanish and Spanish-to-English. No microphone in v1. Light background and large print on purpose (David prints and reads on a phone, and dislikes dark backgrounds).

Two profiles, same code: david (768 words) and lynn (474 words). Each keeps separate scores, because each profile has its own localStorage key and its own service worker cache. The word master list is the spreadsheet `Duolingo_Spanish_Words.xlsx` (see section 4).

## 3. Code organization (`david/index.html`)

One IIFE in a single `<script>`, `"use strict"`, plain JavaScript with ES5-style syntax (no framework, no build). Sections in order:

1. Constants: `PROFILE`, `NAME`, `KEY`, `DEFAULTS`, `memOnly`, `db`.
2. Helpers: `esc`, `keyOf`, `norm`, `meanings`, `shortGloss`, `shuffle`, `dayKey`, `byKey`, `reindex`.
3. Storage: `freshDb`, `load`, `save`, `status`, `counts`.
4. UI state variables: `tab`, `S` (session), `C` (current card), `filter`, `tagFilter`, `q`, `shown`, `openKey`, `confirmKey`, `confirmReset`.
5. Rendering: `render`, `renderNav`, `renderHome`, `renderWords` (+ `updateChips`, `updateList`, `wordRow`), `renderProgress`, `renderSettings`, `renderCard`, `feedback`, `renderSummary`, `toast`, `seg`, `topbar`. Everything is rebuilt through `innerHTML` into `#app`; the tab bar goes into `#navwrap`.
6. Study engine: `startSession`, `pool`, `pickKey`, `nextCard`, `optText`, `buildOptions`, `record`, `introDone`, `answer`, `doCheck`, `finish`.
7. Word list sync: `setStat`, `applyRemote`, `syncWords`.
8. CSV and backup: `csvCell`, `buildCsv`, `exportCsv`, `parseCsv`, `restoreCsv`; the `backup` and `restore` actions.
9. Actions: `parseLine`, `addWords`, `setVal`, the `actions` dispatch table, `tagList`.
10. Events: one delegated `click` listener that reads `data-act` and calls `actions[name](el.dataset)`, plus `pointerdown` (keeps focus when tapping accent buttons), `input` and `change` listeners.
11. Boot at the bottom: `load(); render(); syncWords(true);` and service worker registration on window `load`.

CSS is in one `<style>` block with variables on `:root` (`--bg:#F3F6FB`, `--accent:#1B74D1`, etc.). Four bottom tabs: Study, Words, Progress, Settings. The tab bar is hidden during a session.

## 4. Word list

Source: David's Duolingo Words page, copied into the spreadsheet `Duolingo_Spanish_Words.xlsx` (sheet "Spanish Words": Spanish, English, Mastered, Tags, Status, Times Right, Times Wrong, Streak, Last Practiced). In that sheet an `X` in Mastered means David already knew the word before using the app; 321 words are marked.

Published format, `words.json`:

```json
{"v":1,"words":[{"es":"hola","en":"hello","m":1},{"es":"aprender","en":"to learn","tags":["verb"]}]}  (illustrative; the real files have no tags yet)
```

`es` and `en` are required. `m:1` means "already mastered" and `tags` is optional (no word in the current files has tags; the Words tab shows tag chips when tags exist). The "Print 2-up" sheet in the xlsx is a print layout of the same words, stored as fixed values (not linked), so it must be regenerated whenever the list changes. English glosses use comma-separated meanings (for example `reloj` = "watch, clock"). Cleanup already applied: "(?)" markers removed, "studyin" corrected to "studying", camiseta = "T-shirt", maestro = general teacher, profesor = secondary and above teacher.

Counts (after the 2026-10-28 cleanup): David's `words.json` has 768 words, 321 of them flagged `m:1`, in Duolingo's "Recently learned" order (newest first), matching the spreadsheet. Lynn's file has 474 words with no `m` flags; they are the oldest 474 entries of David's list.

Spreadsheet columns on "Spanish Words": A Spanish, B English, C Mastered (`x`), D Tags, E Status, F Times Right, G Times Wrong, H Streak, I Last Practiced, **J Order** (fixed number, 1 = oldest, 768 = newest; never renumbered, new words get the next number; sort freely and re-sort by Order to restore Duolingo order), **K Stage** (formula from Order: Recent = newest 100, Middle = next 100, Early = the rest). Stage settings are in M1:N4 (N2 and N3 hold the 100s). Print area is A:B only. The app does not read Order or Stage yet. Lynn's source was `Lynn_Duolingo_Spanish_Words_StudySheet` in the same folder.

How it loads and updates:
- Each launch calls `syncWords(true)`, which fetches `words.json?t=<now>` with `cache:"no-store"`. The service worker serves network first and falls back to the cached copy with an `x-offline: 1` header, which the app reads to say "No connection. Using the saved word list."
- `applyRemote(list)` adds words that are not on the phone, updates `en` when the glosses differ, and merges tags. It never removes words and never overwrites phone-side progress.
- `db.seeded[k]` records that a word has been seen by a sync. Only when a word is not yet in `db.seeded` and has no `db.stats[k]` does the remote status (`m:1`) seed progress, through `setStat`. This is the "phone wins" rule.
- Users can also add words on the phone (Words tab, "Add words": `parseLine`/`addWords`) or open a text file. Those are marked seeded too. Phone-only words are not pushed to GitHub.
- Planned update routine for new Duolingo words: open the Duolingo Words page in the browser, add the new rows to the xlsx, merge the latest exported progress CSV into the same xlsx in one pass, regenerate `words.json`, upload it to GitHub.

## 5. Card types and session flow

Session starts from Study: Active Learning (`startSession("active")`) or Refresher (`"refresh"`). Session object `S` fields: `mode`, `len`, `shown`, `answered`, `right`, `combo`, `best`, `recent` (last 3 keys), `retry` (queue of `{k,due}`), `introduced`, `missed`, `newMastered`, `id` (session id, `String(Date.now())`), `done`.

`pickKey()`:
- A retry entry whose `due <= S.shown` goes first and is asked as a quiz.
- Otherwise it excludes the last 3 shown and anything waiting in `retry`, then:
  - Refresher: picks randomly among the 8 oldest-practiced mastered words (sorted by `stats[k].last`). Session length is `min(10, mastered count)`.
  - Active: with probability 0.6 (if fewer than 6 learning words) or 0.3 it draws a new word, while `S.introduced < settings.newCap`. Else about 10% of the time it draws a mastered word (always, if nothing is learning). Else it draws a learning word, weighted by `1 + 3*missRate + min(3,daysSinceLast) + (streak<2 ? 1.5 : 0)`. Falls back to a new word.

`nextCard()` picks the card `kind` and direction `dir` ("es2en" or "en2es", 50/50):
- `intro`: a word with no `stats[k].intro`. Shows both languages and a "Got it" button. `introDone()` creates the stat record and queues a retry 3 cards later.
- `flip`: tap to reveal, then "Missed it" or "Got it" (self-graded).
- `choice`: up to 5 options (the answer plus up to 4 distractors). `buildOptions` ranks other words by closeness in text length plus random jitter, drops duplicate texts and any word sharing a meaning (via `meanings()`), and shuffles. English side uses `shortGloss` (first two meanings).
- `type`: English prompt, type the Spanish (direction forced to en2es), with accent buttons á é í ó ú ñ ¿ ¡ and "I don't know". `doCheck` compares with `norm()` (case-insensitive, accent-insensitive, ignores `¿?¡!.,;:`); an answer that matches only after normalizing, for example missing accents, still counts as correct and shows "Watch the spelling: <word>".
- Style setting: `mixed` = 45% choice, 30% type, 25% flip; retries are always `choice`.
- Session ends when `S.shown >= S.len` or no card is available; the summary shows percent, best combo, new words, newly mastered and the missed list. The ✕ ends early and shows the summary if anything was answered.

## 6. Data storage

Mechanism: `localStorage` on the app's origin (`dwdutch.github.io`), one key per profile:

- `spanish-training-tool-v1-david`
- `spanish-training-tool-v1-lynn`

`save()` writes `JSON.stringify(db)` after deleting the transient `db.index` (rebuilt by `reindex()`). If storage is unavailable, `memOnly=true` and the Study tab shows a warning. On iOS the Safari tab and the Home Screen icon typically hold separate storage, so the app should be used from the icon once installed. Both profiles share one origin (`dwdutch.github.io`) and are separated only by the key suffix.

Structure of `db`:

```
{ v:1,
  words:   [{k, es, en, tags:[...]}],      k = es.trim().toLowerCase()
  stats:   { <k>: {intro:1, r, w, streak, last, first, hist, cred} },
  seeded:  { <k>: 1 },
  settings:{ len, newCap, T, style, size },
  days:    { "YYYY-MM-DD": {n, ok} },
  lastSync: <ms>                            (set only on a real, online sync)
}
```

`stats[k]` fields: `intro` (word has been introduced), `r` times right, `w` times wrong, `streak` (sessions in a row), `last` (ms timestamp of last answer), `first` (ms when introduced), `hist` (last 12 results as a string of 1s and 0s, newest last), `cred` (id of the last session that credited the streak). No stat record means "new". Defaults: `DEFAULTS = {len:15, newCap:5, T:4, style:"mixed", size:20}`.

Export formats: CSV (see below) and a "full backup" JSON text (`app`, `profile`, `saved`, `words`, `stats`, `seeded`, `settings`, `days`).

## 7. Mastery and metrics

Status is derived, never stored: `status(k)` returns "new" if there is no `stats[k]` or `intro` is falsy; "mastered" if `stats[k].streak >= settings.T`; otherwise "learning". `T` defaults to 4 and is a setting (2, 3, 4, 5, 6 or 8) described as "sessions in a row to call a word mastered".

Updates, all in `record(k, ok)`:
- Correct: `r++`; `streak++` only if `st.cred !== S.id` (at most once per session), then `cred = S.id`.
- Wrong: `w++`; `streak = (was mastered) ? max(0, T-2) : 0`; the word is added to `S.missed` and to `S.retry` with `due = S.shown + 3`.
- Always: `last = now`; `hist` appended and trimmed to 12; `db.days[today].n++` (and `.ok++` if right); then `save()`.
- If the status flipped to mastered, the key goes into `S.newMastered`.
- Intro: `introDone()` sets `{intro:1,r:0,w:0,streak:0,last:now,first:now,hist:""}`. It does not count as right or wrong.
- Manual: "Mark mastered" sets `streak = T` with r and w at 0. "Reset progress" deletes `stats[k]`. "Erase all scores" clears `stats` and `days` but keeps words and `seeded`.
- `seeded` is never cleared by those actions, so after a reset or erase the word-list flags (`m:1`) do not seed mastery again. A word reset this way becomes "new" for good unless restored from a CSV or backup.
- Changing `T` later changes who counts as mastered, since status is derived.

Metrics shown: counts of new, learning and mastered; per-word right of total and streak; overall accuracy (sum of `r` and `w` across current words); cards answered per day for 7 days; "Trickiest words" (at least 2 attempts and at least 1 miss, sorted by miss rate); a note once mastered reaches 100 prompting verbs (see section 10). `hist`, `first` and `cred` are stored but not displayed.

CSV export (`buildCsv`, share sheet via `navigator.share` with a File, else clipboard and the textarea): columns Spanish, English, Mastered (`X` if mastered), Tags (`;` separated), Status (New, Learning, Mastered), Times Right, Times Wrong, Streak, Last Practiced (`YYYY-MM-DD`). The file is `Spanish_Progress_<NAME>.csv`, UTF-8 with a BOM. These columns mirror the spreadsheet. Restore (`restoreCsv`) reads the same columns, matches by the Spanish key, adds missing words, and calls `setStat(..., force=true)`, which can replace phone progress. The CSV does not carry `hist` or daily counts. A restore from CSV sets `hist` to empty and `first` to the Last Practiced date (or now), a Mastered row gets `streak = max(Streak, T)`, and `db.days` is left as it was.

## 8. iPhone and offline behavior

- Manifest: `display:"standalone"`, `start_url` and `scope` `./`, background and theme `#F3F6FB`, icons 192 and 512; `apple-touch-icon` is `icons/icon-180.png`; apple-mobile-web-app meta tags set.
- Service worker `sw.js` per profile. Install pre-caches `ASSETS` (page, words.json, manifest, 3 font files, 2 icons) and calls `skipWaiting`; activate deletes older caches whose name starts with `spanish-trainer-<profile>-` and claims clients. Fetch handler: `words.json` is network first with cached fallback marked `x-offline: 1`; everything else is cache first, refreshed in the background (stale-while-revalidate).
- Update quirk: because app files are cache first, a changed `index.html` shows up on the second launch after it is deployed (the first launch serves the old copy and refreshes the cache behind it). Changing the `CACHE` string in `sw.js` forces a new install and cleans old caches. `words.json` updates are immediate when online.
- Safe areas are handled with `env(safe-area-inset-*)`; fonts are bundled so offline text looks the same.
- iOS may evict site data for sites unused for a long time (Safari storage policy, mostly for non-installed sites). Export a CSV now and then.
- First load needs internet. After that, airplane mode works and was tested offline in a desktop browser (reload with network off).

## 9. Settings, options and UI conventions

Settings tab: Cards per session (10, 15, 25, 40); New words per session (3, 5, 8, 12); Sessions in a row to master (2 to 8); Card style (Mixed, Flip, Choice, Type); Text size (Large 18, Larger 20, Largest 23, applied as the root `font-size` in px); Sync words now; Export progress CSV; Restore from a CSV file; Copy full backup text; Restore from pasted backup; Erase all scores (tap twice).

Conventions: big tap targets (min height about 52 to 58 px), thick bottom border on buttons, one column max 560 px, green for correct and red for wrong, amber for learning, blue for new. Destructive actions need a second tap (`confirmKey`, `confirmReset`). The right/wrong feedback bar is fixed over the bottom of the screen. Toasts for messages. No dark mode (`color-scheme: light`). Words tab: search, status chips, tag chips, 100 rows at a time, tap a row for Mark mastered, Reset progress, Delete word.

## 10. Decisions, known issues and limitations

Decisions and why:
- Scores stay only on each phone (localStorage); GitHub holds only the word list. Avoids accounts and servers, and keeps Lynn's and David's data separate. The CSV export is an optional safety copy. The xlsx is the master list.
- Phone wins: GitHub status never overwrites progress already on the phone (`db.seeded`).
- Public repo because free GitHub Pages needs it. It contains only a Spanish word list.
- Mastered requires success in several separate sessions (default 4), once per session, so repeating a word in one sitting does not master it.
- Plain JS and one file per profile so it stays easy to host and cache.
- No microphone in v1 (pronunciation practice is out of scope for now).

Known issues and limits:
- The "start verbs" note in Progress shows whenever mastered is 100 or more. David already has 321 mastered words from the xlsx seeding, so it appears immediately and cannot act as a "good time" signal as designed. Consider a one-time dismiss or a threshold based on words mastered through the app.
- Deleting a word on the phone only removes it locally; the next sync re-adds it if it is still in `words.json`.
- After a per-word Reset or "Erase all scores", the seeded flags are not reapplied (see section 7).
- Safari tab versus Home Screen icon store progress separately on iOS; start from the icon.
- Phone-added words exist only on that phone (not in the xlsx or `words.json`) unless David adds them to the xlsx.
- `restoreCsv` forces statuses from the CSV and loses `hist` and `first`. Use the full backup JSON for exact restores.
- Streak and status are derived from `T`; there is no per-day review scheduling (spaced repetition is approximated by oldest-first selection in Refresher).
- Typed answers must match the single `es` string; alternate Spanish forms are not accepted.
- Choice cards show only the first two meanings of a gloss (`shortGloss`), while flip and intro cards show the full gloss.
- Lynn's list has no mastered flags yet; her Mastered column can be marked later in her word table.

Planned features: Demo mode (section 11 example); a Recent/Middle/Early filter worked out in the app from word order (not stored as tags, because the sync only adds tags and never removes them); a Conjugation Review that links conjugated forms to their base verbs (a draft count found 66 forms of 20 missing base verbs plus 7 forms of verbs already in the list; the link would be a new optional field, never a replacement of the form cards); verb practice (present tense, then preterite, irregular verbs, reflexive verbs). The Progress tab already shows a prompt note once 100 words are mastered; David asked to be reminded at a good time, and the current threshold is `c.mastered>=100` in `renderProgress`.

## 11. Guidance for adding features safely

Do not change without a migration:
- The localStorage key names, the `db` top-level shape, the `stats[k]` fields and meanings, `keyOf()` (the key rule) and `status()`. Existing phones hold data in these formats.
- The CSV column names and order (they match the spreadsheet and `restoreCsv` finds columns by lowercased header text).
- The "phone wins" logic (`db.seeded`, `applyRemote`, `setStat` force flag).

Safe patterns:
- Additive fields only: new keys in `db` or `stats[k]` must be optional with defaults in `load()` (see how `seeded`, `days` and `settings` are defaulted there). Never rename or delete existing keys. If a structural change is unavoidable, bump `db.v` and write a one-time migration in `load()` that keeps a copy of the old JSON first (for example under `KEY+"-backup"`).
- New card types or practice modes (verbs, conjugation): store results in a new object (for example `db.verbs`) so mastery of existing words and `days` are untouched. If they reuse `record()`, check it does not alter `stats[k].streak` for the wrong word. New words from tags (such as `verb`) can reuse the existing word list and tag chips.
- New settings: add to `DEFAULTS` (they merge into saved settings automatically) and to `renderSettings`. Do not change the default `T` meaning.
- Keep both profiles identical in code. After each change, update both `index.html` files, bump `CACHE` in both `sw.js`, and test with a fresh profile and with a copy of a populated one (export a backup first).
- Test offline: load the page, confirm the service worker is active, switch the network off and reload. Playwright works for this (`context.setOffline(true)`).
- Back up before releasing: ask the user to run Export progress CSV and Copy full backup text.
- Keep the light theme: no dark mode and no large dark blocks (the screens are meant to print well).

### Example: a demo or practice mode that must not change progress

Every path that writes progress goes through `record(k, ok)` (stats, `hist`, `db.days`), `introDone()` (creates `stats[k]`), and `save()`. A demo session should therefore:
- Be started by its own function (not `startSession`) that sets `S.demo = true` and draws a fixed set of sample cards.
- Skip `record()` and `introDone()` writes when `S.demo` is true, keeping results only in `S` (`right`, `answered`, `best`, `missed`), and never call `save()`.
- Use a throwaway copy of the needed `stats` entries if card selection depends on them, never the live `db.stats` objects.
- Show the normal summary screen (`renderSummary`) without adding to `newMastered`, `db.days` or the Progress tab, and label it clearly as a demo.
- Be tested by comparing `localStorage` for the profile key before and after a demo run; the stored JSON should be byte-identical.
