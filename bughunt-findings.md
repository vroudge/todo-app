# Todo App — Persona Dogfooding Report

**Date:** 2026-08-28
**Target:** `http://localhost:5173/`
**Method:** Black-box UI testing only. Five independent persona agents drove the live app
through headless Chromium (Playwright), each in an isolated browser context with its own
`localStorage`. No agent read application source code. Findings are cited against
`spec.md` requirement IDs.

**Result:** 35 distinct bugs. Every finding was reproduced at least twice on separate
browser contexts before being filed.

---

## The personas

| Persona | Lane |
|---|---|
| **Chloé Béchard**, 34 — bilingual office manager, `fr-CA` browser | §11 Language: EN/FR string parity, plurals, typography, detection & fallback, cross-tab language sync |
| **Tomás Iglesias**, 41 — blind QA contractor, keyboard + screen reader | ARIA roles/names, `aria-pressed`/`aria-busy`, focus order and visibility, live-region busy labels, editor focus and selection |
| **Marcus Deng**, 38 — power user with 200+ todos | Data model, identity, insertion order, filters, counts, clear-completed, content edge cases, layout at scale |
| **Marguerite**, 71 — has Parkinson's (tremor, bradykinesia) | Tremor multi-clicks, pointer drift, key repeat, reduced motion, 200% zoom, hit-target sizes, accidental Escape/blur |
| **Priya Raghunathan**, 29 — adversarial QA | Timing and FIFO queueing, optimistic-UI detection, corrupted storage, storage-refused mode, two-tab races |

---

## Root cause summary

**Six bugs were found independently by all five personas.** They share one signature: a
boolean read the wrong way round. Seven behaviours are inverted relative to the spec:

1. Strikethrough and muted colour applied to **not-done** rows (C-2)
2. Items-left reports the **done** count (S-1, S-2)
3. `Clear completed (n)` shows the **active** count, and its disabled predicate is inverted (R-3, R-4)
4. Idle rows read **Save**; the row being edited reads **Edit** (E-3)
5. **Escape commits** the edit instead of cancelling it (E-5)
6. French **Active** and **Completed** filter labels are transposed (F-1, L-3)
7. The plural form is used only when **n = 1** (S-1, L-10)

Each is plausibly a one-line fix. This cluster accounts for 4 of the 5 blockers and 3 of
the majors below — 7 bugs in total, and most of what makes the app unusable.

A second cluster is a **half-wired translation layer**: several strings are hardcoded in
one language regardless of the active locale, in both directions.

---

## Blockers

| # | Bug | Spec | Found by |
|---|---|---|---|
| 1 | Escape commits the edit instead of cancelling — and **deletes the todo** if the field is empty | E-5, E-7 | Tomás, Marguerite |
| 2 | `Clear completed (n)` counts active todos and is disabled when todos *are* done → feature unreachable once everything is complete | R-3, R-4 | all five |
| 3 | Strikethrough + muted colour applied to **not-done** rows; done rows render full-contrast | C-2 | Marcus, Marguerite, Priya |
| 4 | Items-left reports the **done** count | S-1, S-2, A-9 | all five |
| 5 | With storage refused (private browsing / quota), every operation discards the previous one; the first toggle empties the list | P-4 | Priya |

### 1. Escape saves instead of cancelling

1. Add "Doctor appointment 3pm".
2. Double-click the title to edit (text is fully selected — correct per E-2).
3. Type `ABANDONED`, press **Escape**.

**Expected** (E-5): *"the editor closes, the row still reads 'Buy milk', and no operation
starts. And the focus loss that follows does not then save the abandoned text."*
**Actual:** the row goes `aria-busy="true"` — an operation *starts* — and settles reading
`"ABANDONEDBuy milk"`. With the field cleared first, Escape **permanently deletes** the
todo. There is no undo (R-1), so a stray keystroke is unrecoverable. 6/6 trials across
both editor entry paths.

### 2. Clear completed is unreachable

| state | actual | expected |
|---|---|---|
| 2 todos, 0 done | `Clear completed (2)`, enabled | `Clear completed (0)`, disabled |
| 2 todos, 1 done | `Clear completed (1)`, enabled | `Clear completed (1)`, enabled |
| 2 todos, 2 done | `Clear completed (0)`, **disabled** | `Clear completed (2)`, **enabled** |
| 3 done / 2 active | `Clear completed (2)` | `Clear completed (3)` |

Pressing it with 0 done is a silent no-op: 0 DOM mutations, no busy indicator. The
*action* is correct — with 3 done / 2 active it removed exactly the 3 done ones, preserved
survivor order (R-3), and correctly ignored the active filter (R-5). Only the label count
and the disabled predicate are inverted.

### 3. Done/not-done styling inverted

| row | checkbox | `text-decoration` | colour (light) | contrast |
|---|---|---|---|---|
| Alpha (not done) | unchecked | `line-through` | `rgb(107,107,118)` | 5.26:1 |
| Beta (**done**) | checked | `none` | `rgb(27,27,31)` | 17.17:1 |

Not-done rows carry `class="todo-title done"`; done rows carry `class="todo-title"`. A
freshly seeded list of 11 untouched todos looks entirely completed. Reproduced in light
and dark, at 3 and 11 rows.

### 4. Items-left counts the wrong set

| done / active | footer shows | should show |
|---|---|---|
| 1 / 0 | `1 items left` | `0 items left` |
| 1 / 3 | `1 items left` | `3 items left` |
| 3 / 2 | `3 item left` | `2 items left` |
| 4 / 7 | `4 item left` | `7 items left` |

Two bugs stacked: the wrong set is counted (S-1, S-2), and the plural rule is inverted
(bug #11). Also breaks A-9 — adding under the Completed filter leaves the count static
where the spec requires it to rise.

### 5. Storage-refused mode destroys the list

With `Storage.prototype.setItem` throwing `QuotaExceededError` (private browsing,
exhausted quota), each operation appears to rebuild from persisted state that can never
update, so every operation discards everything before it:

```
add "A"  -> [A]
add "B"  -> [B]      <- A gone
add "C"  -> [C]      <- B gone
toggle   -> []       <- everything gone
```

**Expected** (P-4): *"every change takes effect on screen exactly as usual … and the
changes are gone after a reload."* The list must survive intact for the session.
**Actual:** it never holds more than one todo. Silently — no console error, no
`pageerror`, no warning, so the "no error is shown" half of P-4 and all of P-12 still
pass while the data evaporates. 3/3 deterministic.

---

## Major

| # | Bug | Spec | Found by |
|---|---|---|---|
| 6 | Edit/Save labels inverted — idle row reads "Save", editing row reads "Edit" | E-3 | all five |
| 7 | FR filter labels swapped — "Terminées" applies the **Active** filter | F-1, L-3 | Chloé, Tomás, Marcus, Marguerite |
| 8 | Delete renders "Supprimer" in the English UI (its `aria-label` is correctly English) | L-3 | all five |
| 9 | Empty-state slots keyed on the wrong condition — the real S-5 case gets a hardcoded French sentence | S-5, S-4, L-3 | Chloé, Tomás, Marcus |
| 10 | Empty list reads "No todos." instead of the specified sentence | S-4 | all five |
| 11 | English plural rule inverted — `0 item left`, `1 items left`, `3 item left` | S-1, L-10 | all five |
| 12 | Opening a second editor closes the first | E-8 | Tomás |
| 13 | Language switcher highlights the language you are *not* in (`aria-pressed` is correct) | L-2 | Chloé |
| 14 | `<h1>Todos` never translates | L-3 | Chloé, Tomás, Marguerite |
| 15 | Placeholder "What needs doing?" never translates (its `aria-label` does) | L-3, A-1 | Chloé, Tomás |
| 16 | Load spinner hardcoded "Loading your todos…" even under `<html lang="fr">` | B-1, L-3 | Chloé, Tomás |
| 17 | French count reads "n tâches **left**" — the English word never translates | L-3, L-9 | Chloé, Tomás, Marcus, Priya |
| 18 | Duplicate stored ids fan out — toggling or deleting one row hits two | P-10, D-3 | Priya |
| 19 | Entries with no stored id swallow toggles — full busy cycle, nothing applied | P-3, C-1, P-8 | Priya |
| 20 | Focus drops to `<body>` after toggle, delete, commit and cancel | U-3, U-4, UX | Tomás, Marguerite |
| 21 | Row is `flex-direction: row-reverse` — Delete far-left, checkbox far-right | U-3, UX | Marguerite |
| 22 | Checkbox is a 13×13px target; 8px of pointer drift silently fails to toggle | UX | Marguerite |

### 6. Edit/Save inverted — and its accessibility consequence

An idle row's button reads **Save**; once the editor opens it reads **Edit**. Beyond the
confusion, Tomás's finding is that **there is then no "Edit" affordance anywhere in the
tab order**. The only other route into the editor is double-click (E-1), which a
keyboard-only user cannot perform. The single discoverable path to renaming a todo is
mislabelled as the thing you press to finish renaming.

### 7. French filter labels transposed

| Position | English | French shown | French should be |
|---|---|---|---|
| 1 | All | Toutes | Toutes |
| 2 | Active | **Terminées** | À faire |
| 3 | Completed | **À faire** | Terminées |

Confirmed behaviourally, not just by translation: with one active todo, pressing
"Terminées" (reads *Completed*) shows it, and pressing "À faire" (reads *Active*) shows
the empty message. `aria-pressed` is correct throughout, so a screen reader announces
which filter is selected — using the wrong name for it.

### 9. Empty-state slots keyed on the wrong condition

Verified directly to resolve a disagreement between personas — both observations were
correct, in different states:

```
empty list      + All        -> "No todos."
empty list      + Active     -> "No active todos."       <- correct per-filter strings...
empty list      + Completed  -> "No completed todos."       ...but in the wrong state
1 active todo   + Completed  -> "Rien pour l'instant. Ajoutez votre première tâche ci-dessus."
```

The per-filter strings S-5 requires **do exist and are correctly written in English** —
they just fire when the list is *empty*, which is S-4's case. The genuine S-5 case (list
non-empty, filter matches nothing) falls through to a hardcoded French sentence, in both
languages and for both filters. This needs re-keying, not new strings. S-4 separately
still needs its specified sentence.

### 18–19. Damaged-storage identity bugs

Reachable only via hand-edited storage — the app mints UUIDs and cannot self-inflict
these. But P-3 requires damaged data to degrade gracefully, and these entries have usable
titles so they are kept and rendered.

**Duplicate ids** (`[{"id":"x","title":"one"},{"id":"x","title":"two"}]`): clicking row 0's
checkbox checks **both** rows; pressing row 0's Delete removes **both**. Operations
address by id, so a shared id fans out — deleting one todo deletes two.

**Missing ids** (`[{"title":"noid1","done":false}]`): the row renders, the toggle shows a
busy indicator for the full 200–700ms, then applies nothing. Ids are minted and persisted
but `done` is never flipped. Rename on the same row works, so this is specific to the
toggle path.

### 21–22. Motor accessibility

The todo row is `flex-direction: row-reverse` while the header, add form, filters and
footer are all normal LTR. Measured at a 420px viewport:

```
41px: Delete    151px: Save    220px: title    363px: checkbox
```

The row reads **Delete → Save → title → checkbox**. A user reaching to the left of a row
to tick something off lands on Delete, which has no confirmation and no undo (R-1). Tab
order follows the DOM, so keyboard focus visibly jumps right → middle → left, which reads
against U-3's *"the browser's own focus order applies."*

Hit areas at a 360px viewport:

| control | size |
|---|---|
| **row checkbox** | **13.0 × 13.0** |
| EN / FR | 35 × 25 / 33.7 × 25 |
| row Edit/Save | 59.3 × 32.8 |
| row Delete | 99.8 × 32.8 |
| Add | 53.4 × 36 |

13px is roughly half the 24×24 minimum. Measured effect: with 3px and 5px of
mousedown→mouseup drift the toggle registers; **at 8px it silently does nothing**. The
destructive control has ~8× the hit area of the safe one, on the side reached for first.

---

## Minor / nit

| # | Bug | Spec | Found by |
|---|---|---|---|
| 23 | French uses the plural for zero (`0 tâches`); should be singular while English stays plural | S-1, L-10 | Chloé |
| 24 | "Effacer tout" means "Clear **all**" on a destructive control | L-3, R-3 | Chloé, Marcus, Priya |
| 25 | Clear's busy label says "Suppression…" (Deleting…) rather than "Effacement…" | B-1 | Chloé |
| 26 | FR hint reads "Cliquez pour modifier" — wrong gesture; E-1 requires a double-click | L-3, E-1 | Chloé, Marcus |
| 27 | Guillemets use a plain space instead of a narrow no-break space (U+202F) | UX, L-9 | Chloé |
| 28 | The edit field has no accessible name — no label, `aria-label`, or placeholder | U-5, UX | Tomás |
| 29 | Busy live regions carry an `aria-label` but empty text content, so screen readers announce nothing | B-1, UX | Tomás |
| 30 | Placeholder contrast 3.56:1 in dark mode (fails AA); the only colour that doesn't adapt between themes | UX | Marcus |
| 31 | Title column collapses to 29px at a 320px viewport; row buttons hold a fixed 159px | U-1, U-6, UX | Marcus |
| 32 | Horizontal scroll below ~300px; Delete pushed off the left edge (−70px at 180px) | U-1 | Marguerite |
| 33 | A zero-width-space title enables **Add** and creates an invisible phantom row | P-11 | Marcus |
| 34 | `done` coerced by truthiness — `done: "false"` renders as **done** | P-3 | Priya |
| 35 | React duplicate-key error in the console (with duplicate stored ids) | hygiene | Priya |

**On #29** — `<span role="status" aria-label="Adding…">` with empty text satisfies B-1 as
literally written, but NVDA and VoiceOver announce a live region's *contents*, not its
accessible name. In practice the app goes silent for 200–700ms after every action. The
loading indicator gets this right with real text beside it; the other three should follow
that pattern. Worth a spec clarification either way.

**On #33** — defensible under P-11, since `trim()` does not strip U+200B and so it isn't
"surrounding whitespace". The result is still a phantom row with `aria-label='Delete ""'`
that survives reload. Tabs, plain spaces, non-breaking spaces and mixes are all correctly
refused.

---

## Tested and found correct

Most of this app is solid. These were actively probed and passed:

**Timing and concurrency**
- **P-6, P-7** — all six operation types land in the 200–700ms band across 96 samples. No
  fast path, no systematic overrun.
- **P-8** — strict FIFO verified under 7 rapid interleaved operations (toggle / delete /
  rename / toggle / delete / add). Nothing lost or reordered. Two operations took 1204ms
  against 560ms for one — "roughly twice as long," as specified.
- **P-9** — **zero optimistic UI**. At 12ms polling across toggle, rename and delete, rows
  go old state → busy → final state, never showing a change then taking it back.

**Persistence**
- **P-2** — byte-identical storage across reload, including corrupt payloads. Load never
  rewrites.
- **P-3** — 31 corruption payloads. Unparseable, non-array and wrong-type values degrade
  to an empty renderable list; damaged entries (non-object, missing / non-string / blank
  title) are silently dropped with intact entries kept **in original order**. No hang, no
  error, no failure to render. (Two gaps: #19 and #34.)
- **P-5** — only `todo-app.todos` and `todo-app.lang` are written. Filter, open editor,
  draft text and field contents are all correctly discarded on reload. `sessionStorage`
  untouched.
- **P-11, P-12** — clean.

**Busy states (§9)** — B-2 through B-10 all pass, including:
- **B-1 reduced motion** — under `prefers-reduced-motion: reduce`, `animation-name` goes
  `spin` → `none` while `role="status"`, the label and `aria-busy="true"` all persist.
- **B-4, B-6 against tremor** — three clicks in 120ms produce exactly one toggle; three
  clicks on Delete delete once; a 600ms Enter key-repeat creates exactly one todo. Busy
  rows disable the checkbox and both buttons, dim to `opacity: 0.55`, refuse
  double-click-to-edit and withdraw the `title` hint.
- **B-5, B-8** — busy is per todo; the add form, footer, filters and language buttons stay
  enabled throughout.

**Two tabs (§10)** — T-1 and L-6 propagate in ~100ms; T-2 external clear yields an empty
list without error; T-4 drafts stay private to their tab; T-5 idle tabs stay quiet. T-3's
documented last-write-wins limitation behaves as described — no duplicated or resurrected
todos.

**Data model** — D-1 (nothing extra rendered or exposed in the DOM), D-2 (insertion order
held through complete + rename + 6 filter switches and at 200 items), D-3/D-4 (identity is
genuinely id-based: four identical "follow up" rows, operating on the middle ones hits
exactly the right row), D-5 (no `maxlength`; 5,400- and 20,000-char titles round-trip).

**Content safety** — `<script>alert(1)</script>` and `<b>bold</b>` render as literal text.
`&amp;`, quotes, backslashes, `{"done":true}`, ZWJ emoji, combining accents and RTL Arabic
all survive reload byte-identical and quote correctly inside aria-labels.

**Accessibility mechanics** — real `<button>` and `<input type=checkbox>` throughout, with
**Space and Enter both activating every button**; exact DOM tab order with no positive
`tabindex`; a visible 2px focus outline on every focusable, correctly matching
`:focus-visible`; correct `aria-pressed` on filters and language buttons; `lang="en"` /
`lang="fr"` on the switcher so the codes are pronounced correctly; one `<h1>`;
`<main>` / `<header>` / `<footer>` landmarks; real `<ul>` / `<li>` list semantics.

**Also clean** — A-1, A-3, A-4, A-5, A-6, A-7, A-8; C-1, C-3, C-4; E-1, E-2, E-4, E-6,
E-7; F-1 (English), F-2, F-3, F-4 (65–166ms at 200 rows); R-1, R-3 behaviour, R-5; S-3,
S-6; L-4, L-5, L-7, L-8; U-1 card width, U-2, U-6.

**L-5 language detection is thorough and correct** — `fr-CA` → French (primary subtag
only); `['de-DE','fr-FR','en-US']` → French (first *matching* preferred language);
`['de-DE','en-US','fr-FR']` → English; `['de-DE']` → English fallback. The settled
language is persisted so detection does not re-run. Every malformed stored value tried
(`"de"`, `"fr-CA"`, `""`, `"FR"`, `123`, `{}`, `null`, `"[]"`) is ignored and detection
re-runs, with no crash.

---

## Appendix A — timing

Measured in-page with `performance.now()`, click to DOM reflecting the result.

| Operation | n | min | median | max | <200ms | >700ms |
|---|---|---|---|---|---|---|
| Initial load | 15 | 223 | 510 | 687 | 0 | 0 |
| Add | 18 | 265 | 514 | 705 | 0 | 2 |
| Toggle | 18 | 213 | 519 | 706 | 0 | 2 |
| Rename | 18 | 242 | 513 | 669 | 0 | 0 |
| Delete | 12 | 217 | 494 | 673 | 0 | 0 |
| Clear completed | 15 | 305 | 573 | 697 | 0 | 0 |

The four samples at 703–706ms sit within measurement overhead of the bound, and P-7 says
"normally within 700ms". Not filed as a violation.

## Appendix B — layout and contrast

**Card width** — 544px (34.00rem) at 3440px, 1920px and 768px viewports, centred.
`documentElement.scrollWidth === clientWidth` at every width tested from 320px up, in
every state including a 20,000-char title and an open editor.

**Row title column** — 320px viewport: 29px (12% of the row) · 360px: 69px · 390px: 99px ·
414px: 123px. Row buttons hold a fixed 159px at every width.

**Long titles** — no clipping anywhere. `text-overflow: clip`, `overflow: visible`,
`white-space: normal`, `-webkit-line-clamp: none`, `overflow-wrap: anywhere`. A 500-char
unbroken word wraps correctly.

**Contrast ratios**

| element | light | dark |
|---|---|---|
| h1 | 17.17 | 13.93 |
| title, not done (muted — bug #3) | 5.26 | 5.96 |
| title, done (full contrast — bug #3) | 17.17 | 13.93 |
| placeholder | 4.61 | **3.56** (fails AA) |
| footer count | 5.26 | 5.96 |
| clear button | 5.26 | 5.96 |
| selected filter | 17.17 | 13.93 |
| Add / row buttons | 17.17 | 13.93 |

## Appendix C — tab order, populated state

Two todos, none done, English, fresh reload:

```
 0  BUTTON      "EN"
 1  BUTTON      "FR"
 2  INPUT[text] "New todo"
 3  BUTTON      "All"
 4  BUTTON      "Active"
 5  BUTTON      "Completed"
 6  CHECKBOX    Mark "Buy milk" as done
 7  BUTTON      "Save"                    <- should read "Edit" (#6)
 8  BUTTON      Delete "Buy milk"         <- visible text is "Supprimer" (#8)
 9  CHECKBOX    Mark "Call Ana" as done
10  BUTTON      "Save"                    <- (#6)
11  BUTTON      Delete "Call Ana"         <- (#8)
12  BUTTON      "Clear completed (2)"     <- counts active; should be (0) and disabled (#2)
13  wraps to "EN"
```

`Add` is correctly absent from the order while disabled.

---

## Attribution pattern

Six bugs were found independently by all five personas — the signature of the shared
inversion. Every single-persona finding came from that persona's specific lane:

- **Priya** owns all four storage and identity bugs (#5, #18, #19, #34)
- **Marguerite** owns all three motor and hit-target bugs (#21, #22, #32)
- **Tomás** owns the screen-reader-only bugs (#12, #28, #29)
- **Chloé** owns the fine-grained i18n bugs (#13, #23, #25, #27)
- **Marcus** owns the content and layout bugs (#30, #31, #33)

No persona was redundant.
