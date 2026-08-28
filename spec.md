# Todo App — Behavior Specification

A single-page todo list. React renders the UI; `localStorage` is the only
database. No backend, no network calls, no third-party UI or state libraries.

Storage is nevertheless **asynchronous on purpose**: every read and write is
delayed by 200–700ms to simulate a network round trip, so the interface has to
handle latency the way it would against a real API (§2, §9).

Requirements are numbered for reference (`P-1`, `A-3`, …). Unless a requirement
says otherwise, every mutation is *requested* immediately — there is no save
button — but it does not take effect until the simulated backend responds, and
the affected part of the UI shows a loading state until then (§9).

The UI is available in English and French (§11). Every piece of UI text quoted
in this document is the **English** rendering; each has a French counterpart in
the same strings table, and the two must stay in step (L-3).

---

## 1. Data model

- **D-1** A todo is an object with exactly three fields:
  - `id` — string, unique within the list, never reused, never shown to the user.
  - `title` — non-empty string, already trimmed of leading/trailing whitespace.
  - `done` — boolean.
- **D-2** The list is an ordered array. Order is insertion order: a new todo is
  appended to the end. Nothing reorders the list — not completing a todo, not
  editing it, not filtering.
- **D-3** `id` is generated with `crypto.randomUUID()`. Where that is
  unavailable, a timestamp-plus-random fallback is used. Uniqueness is the only
  contract; the format is not.
- **D-4** Duplicate titles are allowed. Two todos with the same title are two
  distinct todos.
- **D-5** There is no limit on the number of todos and no maximum title length
  beyond what the browser and storage quota impose.

## 2. Persistence

- **P-1** The list is stored under the `localStorage` key
  `todo-app.todos`, as a JSON array of `{ id, title, done }` objects. The
  selected language is stored separately under `todo-app.lang` (L-4). These are
  the only two keys the app owns.
- **P-2** The stored value is rewritten by every mutation, as part of the same
  operation that returns the new collection. Mounting only reads; it never
  writes. A reload restores the list exactly as it was left.
- **P-3** On load the stored value is treated as untrusted (it may have been
  written by an older version or hand-edited in devtools). Loading applies, in
  order:
  1. Unparseable JSON, or a value that is not an array → the list is empty.
  2. Each entry that is not an object is dropped.
  3. Each entry whose `title` is missing, not a string, or empty after trimming
     is dropped.
  4. A missing or non-string `id` is replaced with a freshly generated one.
  5. `done` is coerced to a boolean.
  A corrupted store therefore degrades to a shorter list or an empty list — it
  never throws and never blocks the app from rendering.
- **P-4** A failed write (private-browsing restrictions, exhausted quota) is
  swallowed. The app keeps working for the rest of the session; changes are
  simply not durable. No error is shown to the user.
- **P-5** The list and the selected language are the only persisted state. In
  particular the active filter (§6) resets to *all* on every reload, and
  in-progress edit state (§5) is never persisted.

### Simulated backend

- **P-6** The storage layer exposes an asynchronous, promise-based API — list,
  create, update, delete, delete-completed. Components and hooks never touch
  `localStorage` directly; it is reachable only through that API.
- **P-7** Every operation, reads included, resolves after a delay drawn
  uniformly at random from **200–700ms**. There is no fast path: a no-op still
  costs a full round trip.
- **P-8** Operations are serialised in submission order. Each one reads,
  modifies and writes the whole collection, so overlapping requests would
  otherwise lose each other's writes. Consequently *n* concurrent operations
  take roughly *n* × latency, and their effects apply in the order they were
  submitted.
- **P-9** Every mutation resolves with the resulting **whole collection**, and
  the caller replaces its state with that value. The UI never computes what the
  new list should be, and there are no optimistic updates — what is on screen
  after a mutation is what the store returned.
- **P-10** An update applies only the fields it is given and cannot change a
  todo's `id`. An update or delete naming an unknown `id` is a no-op that still
  resolves normally with the unchanged collection.
- **P-11** A create whose title is empty after trimming is a no-op that resolves
  with the unchanged collection (see A-3).
- **P-12** The simulated backend never rejects. Latency is modelled; failure is
  not, so there are no error states, retries, or rollbacks anywhere in the app.
  Replacing it with a real backend would require adding all three, which is why
  no component is allowed to assume a request succeeds by inspecting anything
  other than the resolved collection.

## 3. Adding a todo

- **A-1** A single-line text input labelled *New todo* sits above the list,
  with placeholder "What needs doing?" and an **Add** button.
- **A-2** Submitting the form sends a create request for one todo with the
  entered title and `done: false`. On success it is appended to the end of the
  list. Until then the **Add** button shows a loader (§9).
- **A-3** The title is trimmed before storing. A title that is empty after
  trimming is rejected: no todo is added.
- **A-4** The **Add** button is disabled whenever the input is empty or
  whitespace-only, so A-3 is normally unreachable through the button. It is also
  disabled during the initial load and while a create is in flight (§9).
- **A-5** Submitting via <kbd>Enter</kbd> in the input is equivalent to pressing
  **Add** (native form submission).
- **A-6** The input is cleared **on submit**, not on response — the request has
  been accepted, and keeping the text would invite a second submit of the same
  todo while the first is still in flight. Several todos can therefore be typed
  in a row, subject to A-8.
- **A-7** Focus stays in the input on the <kbd>Enter</kbd> path; on the
  **Add**-button path the button becomes disabled (A-4) and the browser may drop
  focus, which is a known rough edge rather than intended behavior.
- **A-8** At most one create is in flight at a time. A submit attempted while
  one is pending is ignored rather than queued.
- **A-9** A newly added todo appears as soon as the create resolves, unless the
  active filter excludes it — adding while the *completed* filter is active adds
  the todo but does not show it.

## 4. Completing a todo

- **C-1** Each row has a checkbox reflecting `done`. Toggling it sends an update
  inverting `done` for that todo only; the checkbox moves when the request
  resolves, not when it is clicked, and the row shows a loader meanwhile (§9).
- **C-2** A done todo's title renders struck through and in the muted colour.
- **C-3** The checkbox carries an accessible label of the form
  `Mark "<title>" as done` / `… as not done`, matching the action the toggle
  will perform.
- **C-4** Toggling a todo under the *active* or *completed* filter removes it
  from view, because it no longer matches (§6).
- **C-5** There is no bulk "toggle all" control.

## 5. Editing a todo

- **E-1** Editing starts by double-clicking the title, or by pressing the row's
  **Edit** button. The title is replaced in place by a text input.
- **E-2** The input opens pre-filled with the current title, focused, with the
  whole text selected — so typing replaces it and clicking positions a caret.
- **E-3** While editing, the **Edit** button becomes **Save**.
- **E-4** The edit is committed by pressing <kbd>Enter</kbd>, clicking **Save**,
  or moving focus out of the input (blur). Committing closes the editor
  immediately and sends the request; the row then shows its title with a loader
  until the response arrives.
- **E-5** The edit is cancelled by pressing <kbd>Escape</kbd>. The todo keeps
  its original title, and cancelling does not then commit on the resulting focus
  loss.
- **E-6** A committed title is trimmed. If it is unchanged from the current
  title, nothing is written.
- **E-7** Committing a title that is empty after trimming **deletes the todo**
  — a delete request, not an update. (TodoMVC behavior. If reverting is
  preferred instead, this is the one requirement to change.)
- **E-8** Only one todo can be in edit mode at a time per row; edit state is
  local to the row and is discarded when the row unmounts — for example when a
  filter change hides it.

## 6. Filtering

- **F-1** Three mutually exclusive filters are offered as buttons: **All**,
  **Active** (`!done`), **Completed** (`done`). The button labels come from the
  strings table in display form, already capitalised per language — they are not
  derived from the internal filter key or capitalised by CSS, because casing
  rules differ between languages.
- **F-2** *all* is selected on first load and after every reload (see P-5).
- **F-3** The selected filter button is visually distinguished and exposes
  `aria-pressed="true"`; the others expose `aria-pressed="false"`.
- **F-4** Filtering only changes what is rendered. It never modifies, reorders,
  or deletes todos, and the filter is not considered by any other requirement
  except A-9, C-4, and E-8.

## 7. Deleting and clearing

- **R-1** Each row has a **Delete** button that sends a delete request for that
  todo, with no confirmation step and no undo. The row stays visible with a
  loader until the request resolves, then disappears.
- **R-2** **Delete** carries an accessible label of the form
  `Delete "<title>"`.
- **R-3** A **Clear completed (n)** button in the footer removes every todo with
  `done: true`, where `n` is the current count of completed todos.
- **R-4** **Clear completed** is disabled when `n` is 0, during the initial
  load, and while a clear is in flight; while in flight it also shows a loader.
- **R-5** **Clear completed** ignores the active filter — it clears all
  completed todos, including ones not currently visible.

## 8. Counts and empty states

- **S-1** The footer shows the number of not-done todos as
  `n items left`, using the singular `1 item left` when `n` is 1.
- **S-2** The count reflects the whole list, not the filtered view.
- **S-3** During the initial load the count is blank rather than a misleading
  `0 items left`, and the list area shows the loading indicator (§9) instead of
  either empty-state message.
- **S-4** Once loaded and entirely empty, the list area shows
  "Nothing here yet. Add your first todo above."
- **S-5** When the list is non-empty but the active filter matches nothing, the
  list area shows a message written per filter — e.g. "No completed todos." The
  message is a distinct string per filter per language, not a filter name
  interpolated into a sentence frame, since that does not translate (L-3).
- **S-6** The footer, including the count and **Clear completed**, is always
  rendered — during loading, and when the list is empty.

## 9. Loading and busy states

Because every operation costs 200–700ms (P-7), each in-flight operation must be
visible, and whatever it affects must be un-clickable while it runs. Loaders are
scoped to the thing that is busy — the app never blocks the whole screen.

- **B-1** The loading indicator is a small spinning ring (`role="status"`) with
  an `aria-label` naming the operation in the active language — "Loading your
  todos…", "Saving…", "Adding…", "Clearing…". Under
  `prefers-reduced-motion: reduce` it renders as a static ring instead of
  animating, so it still marks the element as busy.
- **B-2** **Initial load.** On mount the app requests the list. Until it
  resolves: the list area shows a spinner with "Loading your todos…", the
  new-todo input is disabled, and **Add** and **Clear completed** are disabled.
  The header, the language switcher, and the filter buttons stay live.
- **B-3** **Creating.** While a create is in flight the **Add** button shows a
  spinner beside its unchanged label and carries `aria-busy="true"`. The label
  does not change and the button does not resize enough to shift the layout.
- **B-4** **Per-row operations.** Toggling, renaming, and deleting are tracked
  per todo. A row with a request in flight shows a spinner, dims its title,
  carries `aria-busy="true"`, and disables its checkbox, **Edit** and
  **Delete**; double-clicking the title no longer opens the editor and the
  double-click hint is suppressed.
- **B-5** Busy state is per todo, not global. Several rows can be busy at once,
  and a busy row never disables another row or the form.
- **B-6** At most one request per todo is in flight. A second interaction with a
  busy row is dropped, not queued — so the loader always corresponds to exactly
  one pending operation.
- **B-7** **Clearing.** While **Clear completed** is in flight it shows a
  spinner beside its label, carries `aria-busy="true"`, and is disabled.
- **B-8** Filtering (§6) and switching language (§11) are pure UI state, resolve
  synchronously, and are never disabled by in-flight requests.
- **B-9** No spinner is shown for an operation that was dropped rather than
  sent (A-8, B-6) or that was rejected client-side (A-3).
- **B-10** State is never updated after the component unmounts; a response that
  arrives late is discarded.
- **B-11** There is no global "saving" indicator, no progress bar, no skeleton
  rows, and no toast on completion. Completion is signalled by the loader
  disappearing and the list reflecting the result.

## 10. Multi-tab behavior

- **T-1** The app listens for the `storage` event. When another tab of the same
  origin changes `todo-app.todos`, this tab re-fetches the list through the
  storage API — paying the usual latency — and re-renders. When it changes
  `todo-app.lang`, this tab switches language (L-6).
- **T-2** A whole-store clear (`storage` event with a null key) also triggers a
  reload, which yields an empty list.
- **T-3** Reconciliation is last-write-wins on the whole array — there is no
  per-todo merge. Serialisation (P-8) only orders operations within a tab, so
  two tabs writing simultaneously can still lose one tab's change. This is
  accepted for a local single-user app.
- **T-5** A background re-fetch does not show a loading indicator and does not
  disable anything; it replaces the list when it resolves.
- **T-4** In-progress edit state is local to the tab and is not synchronised.

## 11. Language

- **L-1** The UI is available in exactly two languages: English (`en`) and
  French (`fr`). English is the fallback.
- **L-2** A switcher in the header offers one button per language, labelled with
  the uppercased code (**EN**, **FR**). The active one is visually
  distinguished and exposes `aria-pressed="true"`. The group carries an
  accessible label ("Language" / "Langue"), and each button carries its own
  `lang` attribute so assistive tech pronounces the code correctly.
- **L-3** Switching language re-renders every piece of user-visible text at
  once: heading, input placeholder and label, filter labels, both empty-state
  messages, the items-left count, **Clear completed**, the per-row
  **Edit**/**Save**/**Delete** labels, the double-click hint, and the
  `aria-label`s on the checkbox and **Delete**. No string may be left
  hard-coded in a component — every one lives in the strings table, and a key
  present in one language must be present in the other.
- **L-4** The choice persists under the `localStorage` key `todo-app.lang` and
  survives reload. Only `en` and `fr` are accepted from storage; any other value
  is ignored and treated as absent.
- **L-5** With no stored choice, the language is detected from
  `navigator.languages`, matching on the primary subtag so `fr-CA` selects
  French. If no entry matches a supported language, English is used.
- **L-6** A language change in one tab propagates to other open tabs via the
  `storage` event (§10).
- **L-7** `document.documentElement.lang` is kept in sync with the active
  language, so the page advertises its language to the browser, to assistive
  tech, and to CSS.
- **L-8** Language affects presentation only. It never modifies stored todos:
  titles are user data and are never translated, and switching language does not
  touch the list.
- **L-9** Strings that embed a value — the items-left count, **Clear
  completed**, and the two `aria-label`s that quote a todo title — are built by
  per-language functions, not by concatenation at the call site. This is what
  lets each language choose its own pluralisation ("1 item left" / "1 tâche
  restante") and its own quotation marks (`"…"` / `« … »`).
- **L-10** Pluralisation is a simple one-versus-many rule in both languages.
  There is no `Intl.PluralRules` integration and no support for languages
  needing more than two plural forms.

## 12. Presentation and accessibility

- **U-1** The app is a single centred card, max width ~34rem, and is usable down
  to a narrow phone viewport.
- **U-2** Light and dark palettes are both defined and follow the OS setting via
  `prefers-color-scheme`. There is no in-app theme toggle.
- **U-3** All controls are native elements — `input`, `button`, `ul`/`li`,
  `form` — so keyboard interaction, checkbox semantics, and form submission are
  the browser's, not re-implemented.
- **U-4** Every control is reachable and operable by keyboard, and focus is
  shown with a visible `:focus-visible` outline.
- **U-5** Icon-free text labels are used throughout; controls whose text is not
  self-describing in context (checkbox, **Delete**) carry an `aria-label` naming
  the todo.
- **U-6** Long titles wrap rather than overflow or truncate.

## 13. Non-goals

Explicitly out of scope. Adding any of these is a change to this spec, not a
bug fix:

- Any backend, sync service, or account. The app never makes a network request
  after loading its own assets.
- Due dates, reminders, priorities, tags, notes, or subtasks.
- Multiple lists or projects.
- Manual reordering or drag and drop.
- Undo/redo, or a trash/archive state.
- Search.
- Bulk toggle-all.
- Import/export.
- Error handling, retries, or offline queueing for the simulated backend
  (P-12), and any optimistic-update or rollback machinery.
- Configurable or disable-able latency, and any dev toggle for it.
- Any language beyond English and French, right-to-left layout, or localisation
  of anything other than UI strings (there are no dates, numbers, or currencies
  to format).
