# Todo App — Behavior Specification

A single-page todo list, in English and French, that remembers its contents
between visits.

This is a **black-box specification**. It describes only what someone using the
app — with a pointer, a keyboard, or a screen reader — can observe. It says
nothing about how any of it is built. Two implementations that satisfy every
requirement below are equally correct.

Requirements are numbered (`P-1`, `A-3`, …) and the numbers are stable: cite
them in bug reports, tests, and commit messages.

---

## How to read this

**Scenario form.** Most requirements are written as Given / When / Then.
*Given* is the state before, *When* is what the user does, *Then* is what must
be observable afterwards. Requirements that constrain everything rather than one
episode are written as a **Rule** instead.

**Background.** Unless a scenario says otherwise, assume:

- **Given** the app is open in one browser tab
- **And** the initial load has finished
- **And** the **All** filter is selected
- **And** no operation is in flight

**Terms.**

- **Todo** — one entry in the list: a title and a done/not-done state.
- **Row** — the on-screen line for one todo: its checkbox, title, **Edit** and
  **Delete**.
- **Footer** — the area below the list holding the items-left count and
  **Clear completed**.
- **Operation** — anything the app does to the list: the initial load, add,
  toggle, rename, delete, clear completed. Every operation takes time (P-7).
- **Completes** — the operation's delay has elapsed and its result is on screen.
- **Busy indicator** — the marker shown while an operation is in flight (§9).

**Language.** Every piece of UI text quoted here is the **English** rendering.
Each has a French counterpart, and the two must stay in step (L-3).

---

## 1. Todos

- **D-1 — A todo is a title and a done state**
  - **Given** the list is empty
  - **When** I add "Buy milk"
  - **Then** a row appears showing the title "Buy milk", not done
  - **And** nothing else about the todo is shown or editable — no dates,
    priorities, notes, or identifiers

- **D-2 — Order is the order todos were added, and nothing reorders it**
  - **Given** the list is "Alpha", "Beta", "Gamma" in that order
  - **When** I complete "Beta", rename "Alpha" to "Zulu", and switch filters
    back and forth
  - **Then** the list reads "Zulu", "Beta", "Gamma" — each todo keeps the
    position it was added at

- **D-3 — Todos have an identity of their own, independent of their title**
  - **Given** the list is "Call Ana", "Call Ana"
  - **When** I complete the first one and then delete it
  - **Then** one "Call Ana" remains, not done
  - **And** no identifier is ever shown to the user

- **D-4 — Two todos may share a title**
  - **Given** the list contains "Call Ana"
  - **When** I add "Call Ana" again
  - **Then** the list shows two rows, each completed, renamed and deleted
    independently of the other

- **D-5 — Rule.** There is no limit on how many todos the list may hold and no
  maximum title length, beyond what the browser itself imposes.

## 2. Persistence and timing

- **P-1 — The list and the chosen language outlive the session**
  - **Given** the list is "Buy milk" (done) and "Call Ana" (not done), and the
    UI is in French
  - **When** I close the tab and open the app again in the same browser
  - **Then** once the initial load finishes the list reads "Buy milk" done,
    "Call Ana" not done, in that order
  - **And** the UI is in French

- **P-2 — Every change is remembered as it happens; opening the app changes nothing**
  - **Given** I have added, renamed, completed and deleted todos
  - **When** I reload at any moment when no operation is in flight
  - **Then** the list matches exactly what was on screen before the reload
  - **And** opening or reloading the app never alters what is stored

- **P-3 — Damaged stored data degrades; it never blocks the app**
  - **Given** the stored data cannot be read as a list of todos at all
  - **When** the app loads
  - **Then** it renders normally with an empty list, and I can add todos as usual

  - **Given** some stored entries are damaged — not a todo at all, or with a
    missing, non-text, or blank title
  - **When** the app loads
  - **Then** the intact entries are listed in their original order and the
    damaged ones are silently dropped

  - **Given** a stored entry has a usable title but no usable done state
  - **When** the app loads
  - **Then** it appears as not done

  - **And** in none of these cases does the app show an error, hang, or fail to
    render

- **P-4 — When the browser refuses to store data, the session still works**
  - **Given** the browser will not let the app store anything (private browsing,
    exhausted quota)
  - **When** I add, complete, rename or delete todos
  - **Then** every change takes effect on screen exactly as usual
  - **And** no error or warning is shown
  - **And** the changes are gone after a reload

- **P-5 — Only the list and the language are remembered**
  - **Given** I selected the **Completed** filter and left a row's editor open
    with unsaved text
  - **When** I reload
  - **Then** the **All** filter is selected, no row is being edited, and the
    new-todo field is empty

- **P-6 — Rule.** No operation is instant, and there is no fast path: an
  operation that turns out to change nothing still takes as long as one that
  changes everything.

- **P-7 — Every operation takes between 200 and 700 milliseconds**
  - **Given** I start any operation, the initial load included
  - **Then** its result appears no sooner than 200ms later, and normally within
    700ms — plus any time spent waiting behind an earlier operation (P-8)

- **P-8 — Operations take effect one at a time, in the order they were started**
  - **Given** the list is "Alpha", "Beta"
  - **When** I complete "Alpha" and immediately delete "Beta"
  - **Then** "Alpha" is shown done first, and "Beta" disappears after that
  - **And** the two together take roughly twice as long as one alone
  - **And** neither change is lost or overwritten by the other

- **P-9 — The screen never runs ahead of the result**
  - **Given** any todo
  - **When** I click its checkbox, or commit a rename, or press **Delete**
  - **Then** nothing about it changes until the operation completes: the
    checkbox stays where it was, the old title stays on screen, the row stays
    visible
  - **And** the app never shows a change it then has to take back

- **P-10 — An operation affects only the todo it names**
  - **Given** the list is "Alpha", "Beta", "Gamma"
  - **When** I rename "Beta" to "Bravo"
  - **Then** "Alpha" and "Gamma" keep their titles, done states and positions

  - **Given** another tab deleted "Beta" while I was editing it here
  - **When** my rename or delete of "Beta" completes
  - **Then** the list is left as the other tab wrote it, and no error appears

- **P-11 — A blank title never produces a todo**
  - **Given** anything that would create a todo whose title is blank once
    surrounding whitespace is ignored
  - **Then** no todo is created and the list is unchanged (see A-3)

- **P-12 — Rule.** Operations never fail. There are no error messages, retries,
  rollbacks, offline modes or conflict prompts anywhere in the app. Every
  started operation completes successfully. This is a deliberate simplification
  (§13) and the whole app depends on it.

## 3. Adding a todo

- **A-1 — The add form**
  - **Then** above the list there is a single-line text field labelled
    *New todo*, with the placeholder "What needs doing?", and an **Add** button

- **A-2 — A new todo lands at the end of the list**
  - **Given** the list is "Buy milk"
  - **When** I type "Call Ana" and press **Add**
  - **Then** **Add** shows a busy indicator (§9)
  - **And** when the operation completes the list reads "Buy milk", "Call Ana",
    with "Call Ana" not done

- **A-3 — Titles are trimmed, and a blank one is refused**
  - **When** I add "  Buy milk  "
  - **Then** the todo's title is "Buy milk", with no leading or trailing spaces

  - **Given** the field contains only spaces
  - **When** I try to submit
  - **Then** no todo is added, no busy indicator appears, and what I typed stays
    in the field

- **A-4 — Add is disabled unless there is something to add**
  - **Then** **Add** is disabled while the field is empty or holds only
    whitespace, during the initial load, and while an add is in flight
  - **And** it is enabled at all other times

- **A-5 — Enter submits**
  - **Given** I have typed "Call Ana" in the field
  - **When** I press Enter
  - **Then** exactly what pressing **Add** would do happens

- **A-6 — The field empties on submit, not on completion**
  - **When** I submit "Call Ana"
  - **Then** the field is empty immediately, while the add is still in flight
  - **And** I can start typing the next title straight away, subject to A-8

- **A-7 — Focus after submitting**
  - **When** I submit with Enter
  - **Then** focus stays in the field, so a second todo can be typed at once
  - *(Submitting with a pointer press on **Add** disables the button, A-4, and
    focus may be lost as a result. This is a known rough edge, not intended
    behavior.)*

- **A-8 — One add at a time**
  - **Given** an add is in flight
  - **When** I submit again
  - **Then** the second submission is ignored — it is not queued, no second todo
    is created, and no second busy indicator appears

- **A-9 — Adding while a filter hides the result**
  - **Given** the **Completed** filter is selected
  - **When** I add "Call Ana"
  - **Then** when it completes the todo exists — the items-left count rises and
    it is there under **All** — but it is not shown in the current view

## 4. Completing a todo

- **C-1 — The checkbox moves when the operation completes, not when it is clicked**
  - **Given** "Buy milk" is not done
  - **When** I click its checkbox
  - **Then** the checkbox stays unchecked and the row shows a busy indicator (§9)
  - **And** when the operation completes the checkbox is checked and the count
    in the footer has dropped by one

- **C-2 — A done todo is visibly done**
  - **Given** "Buy milk" is done
  - **Then** its title is struck through and rendered in the muted colour

- **C-3 — The checkbox names the action it will perform**
  - **Given** "Buy milk" is not done
  - **Then** its checkbox is labelled `Mark "Buy milk" as done` for assistive tech
  - **Given** "Buy milk" is done
  - **Then** its checkbox is labelled `Mark "Buy milk" as not done`

- **C-4 — Completing under a filter that excludes the result**
  - **Given** the **Active** filter is selected and "Buy milk" is not done
  - **When** I complete it
  - **Then** when the operation completes the row leaves the view
  - **And** the footer count updates
  - **And** the todo is still there under **All**

- **C-5 — Rule.** There is no toggle-all control. Todos are completed one at a
  time.

## 5. Editing a todo

- **E-1 — Two ways into the editor**
  - **When** I double-click a row's title, or press that row's **Edit**
  - **Then** the title is replaced in place by a text field

- **E-2 — The editor opens ready to type**
  - **When** the editor opens
  - **Then** it holds the current title, has focus, and has the whole text
    selected — so typing replaces the title outright, and a click puts a caret
    where I clicked

- **E-3 — Edit becomes Save while editing**
  - **Given** a row is being edited
  - **Then** that row's **Edit** button reads **Save**

- **E-4 — Committing closes the editor and saves**
  - **Given** I am editing "Buy milk" and have typed "Buy oat milk"
  - **When** I press Enter, press **Save**, or move focus out of the field
  - **Then** the editor closes at once and does not reopen
  - **And** the row shows its old title with a busy indicator (§9)
  - **And** when the operation completes the row reads "Buy oat milk"

- **E-5 — Escape cancels**
  - **Given** I am editing "Buy milk" and have typed "Buy oat milk"
  - **When** I press Escape
  - **Then** the editor closes, the row still reads "Buy milk", and no operation
    starts
  - **And** the focus loss that follows does not then save the abandoned text

- **E-6 — A committed title is trimmed, and an unchanged one is not written**
  - **When** I commit "  Buy milk  "
  - **Then** the stored title is "Buy milk"

  - **Given** I am editing "Buy milk"
  - **When** I commit it unchanged, or commit "  Buy milk  "
  - **Then** no operation starts and no busy indicator appears (B-9)

- **E-7 — Committing an empty title deletes the todo**
  - **Given** I am editing "Buy milk"
  - **When** I clear the field and commit
  - **Then** the todo is deleted, exactly as pressing **Delete** would have done
  - *(TodoMVC behavior. If reverting instead is ever preferred, this is the one
    requirement to change.)*

- **E-8 — Editing is per row and never outlives the row**
  - **Given** I open the editor on two different rows
  - **Then** both stay open; editing one row does not close the other

  - **Given** I am editing "Buy milk" with uncommitted text
  - **When** a filter change hides that row
  - **Then** the uncommitted text is discarded, and bringing the row back shows
    the stored title, not the abandoned draft

## 6. Filtering

- **F-1 — Three filters**
  - **Then** there are exactly three filter buttons — **All**, **Active** (not
    done), **Completed** (done) — exactly one of which is selected at a time
  - **And** their labels are written for the active language, not derived from
    an internal name

- **F-2 — All is the starting point**
  - **When** the app is opened or reloaded
  - **Then** **All** is selected (see P-5)

- **F-3 — The selected filter is apparent**
  - **Then** the selected filter button is visually distinguished and announced
    as pressed to assistive tech, and the other two are announced as not pressed

- **F-4 — Filtering only changes what is shown**
  - **Given** any list
  - **When** I switch between filters
  - **Then** no todo is created, modified, reordered or deleted, and the
    items-left count does not change
  - **And** the change is immediate — filtering is not an operation and takes no
    time (B-8)
  - *(Where the filter does show through: A-9, C-4, E-8 and R-5.)*

## 7. Deleting and clearing

- **R-1 — Deleting a single todo**
  - **When** I press a row's **Delete**
  - **Then** there is no confirmation step and no undo
  - **And** the row stays visible with a busy indicator (§9) until the operation
    completes, then disappears

- **R-2 — Delete names its todo**
  - **Given** a row for "Buy milk"
  - **Then** its **Delete** is labelled `Delete "Buy milk"` for assistive tech

- **R-3 — Clear completed**
  - **Given** the list holds 3 done todos and 2 not-done ones
  - **Then** the footer shows **Clear completed (3)**
  - **When** I press it
  - **Then** when the operation completes all 3 done todos are gone and the 2
    not-done ones remain, in their original order

- **R-4 — Clear completed is disabled when it would do nothing**
  - **Then** it is disabled when no todo is done, during the initial load, and
    while a clear is in flight
  - **And** while in flight it shows a busy indicator (§9)

- **R-5 — Clear completed ignores the filter**
  - **Given** the **Active** filter is selected, so no done todo is visible
  - **When** I press **Clear completed (3)**
  - **Then** all 3 done todos are removed, including the ones I could not see

## 8. Counts and empty states

- **S-1 — The items-left count**
  - **Given** 3 todos are not done
  - **Then** the footer reads `3 items left`
  - **Given** exactly 1 todo is not done
  - **Then** the footer reads `1 item left`
  - **Given** no todo is not done
  - **Then** the footer reads `0 items left`

- **S-2 — The count is of the whole list**
  - **Given** the list holds 5 not-done todos and the **Completed** filter is
    selected, so none of them is visible
  - **Then** the footer still reads `5 items left`

- **S-3 — Nothing is claimed before the list has loaded**
  - **Given** the initial load is in flight
  - **Then** the count area is blank rather than reading `0 items left`
  - **And** the list area shows the loading indicator (§9), not an empty-state
    message

- **S-4 — The empty list**
  - **Given** the initial load has finished and the list holds no todos
  - **Then** the list area reads "Nothing here yet. Add your first todo above."

- **S-5 — A filter that matches nothing**
  - **Given** the list is not empty but no todo matches the selected filter
  - **Then** the list area shows a message written for that filter — for example
    "No completed todos." under **Completed**, "No active todos." under **Active**
  - **And** each such message is written out per filter and per language, not
    assembled by dropping a filter name into a sentence (L-3)

- **S-6 — The footer is always there**
  - **Then** the footer, with its count and **Clear completed**, is shown during
    the initial load and when the list is empty, not only when there are todos

## 9. Busy states

Every operation takes 200–700ms (P-7), so every one of them must be visible
while it runs, and whatever it affects must not respond to further input.
Indicators are scoped to the thing that is busy — the app never blocks the whole
screen.

- **B-1 — The busy indicator**
  - **Then** it is a small ring, announced to assistive tech as a status whose
    label names the operation in the active language — "Loading your todos…",
    "Saving…", "Adding…", "Clearing…"
  - **Given** the user has asked for reduced motion
  - **Then** the ring does not animate, but still marks its element as busy

- **B-2 — The initial load**
  - **Given** the app has just been opened and the initial load is in flight
  - **Then** the list area shows a busy indicator labelled "Loading your todos…"
  - **And** the new-todo field is disabled, and **Add** and **Clear completed**
    are disabled
  - **And** the heading, the language switcher and the filter buttons stay usable

- **B-3 — Adding**
  - **Given** an add is in flight
  - **Then** **Add** shows a busy indicator beside its label and is announced as
    busy
  - **And** its label still reads **Add** — it does not change to "Adding…" or
    similar

- **B-4 — A row with an operation in flight**
  - **Given** a todo is being toggled, renamed or deleted
  - **Then** its row shows a busy indicator, dims its title, and is announced as
    busy
  - **And** its checkbox, **Edit** and **Delete** do not respond
  - **And** double-clicking its title does not open the editor, and the
    double-click hint is not offered

- **B-5 — Busy is per todo**
  - **Given** an operation is in flight on one row
  - **When** I toggle, rename or delete a different todo, or add one, or clear
    completed
  - **Then** that works normally — both rows show their own indicator, and
    neither disables the other, the add form, or the footer

- **B-6 — One operation per todo**
  - **Given** an operation is in flight on a row
  - **When** I manage to interact with that row again
  - **Then** the interaction is dropped rather than queued, so the indicator
    always stands for exactly one pending operation

- **B-7 — Clearing**
  - **Given** a clear is in flight
  - **Then** **Clear completed** shows a busy indicator beside its label, is
    announced as busy, and is disabled

- **B-8 — What is never blocked**
  - **Given** any number of operations are in flight
  - **When** I switch filter or language
  - **Then** it takes effect immediately, and neither control is ever disabled
    by an in-flight operation

- **B-9 — No indicator for something that never started**
  - **Given** a submission was dropped (A-8, B-6), refused (A-3), or committed
    unchanged (E-6)
  - **Then** no busy indicator appears at all

- **B-10 — A late result is discarded**
  - **Given** an operation is in flight
  - **When** its row leaves the view, or the app is closed, before it completes
  - **Then** the result is discarded silently — nothing reappears, and no error
    is shown

- **B-11 — Rule.** There is no global saving indicator, no progress bar, no
  skeleton rows and no completion toast. An operation finishing is signalled by
  its indicator disappearing and the list showing the result.

## 10. Two tabs at once

- **T-1 — A change in one tab reaches the other**
  - **Given** the app is open in two tabs of the same browser
  - **When** tab A adds, completes, renames or deletes a todo
  - **Then** tab B shows the same list shortly afterwards, without being touched
  - **And** the same holds for a language change (L-6)

- **T-2 — Clearing the browser's data for the app**
  - **Given** the app is open
  - **When** everything the app has stored is cleared from outside it
  - **Then** the app ends up showing an empty list, without an error

- **T-3 — Rule.** Reconciliation between tabs is last-write-wins over the whole
  list, not a per-todo merge: two tabs writing at the same moment can lose one
  tab's change. This is accepted for a local, single-user app.

- **T-4 — An open editor is private to its tab**
  - **Given** I am editing a title in tab A and have not committed
  - **Then** tab B shows the stored title, never the text I am typing
  - **And** what tab B does never opens or closes tab A's editor

- **T-5 — A refresh caused by another tab is quiet**
  - **Given** tab B is idle and tab A changes something
  - **Then** tab B shows no loading indicator and disables nothing
  - **And** its list is simply replaced when the new version arrives

## 11. Language

- **L-1 — Rule.** The UI is available in exactly two languages, English and
  French. English is the fallback whenever a choice cannot be honoured.

- **L-2 — The switcher**
  - **Then** the header holds one button per language, labelled **EN** and **FR**
  - **And** the active one is visually distinguished and announced as pressed
  - **And** the pair is labelled as a group ("Language" / "Langue")
  - **And** each button is announced in the language it names, so the codes are
    pronounced correctly

- **L-3 — Switching translates everything at once**
  - **Given** the UI is in English
  - **When** I press **FR**
  - **Then** every visible piece of text switches to French together: the
    heading, the field's label and placeholder, **Add**, the three filter
    labels, both kinds of empty-state message, the items-left count,
    **Clear completed**, every row's **Edit** / **Save** / **Delete**, the
    double-click hint, the busy indicators' labels, and the assistive-tech
    labels on the checkboxes and **Delete** buttons
  - **And** no string is left in the previous language
  - **And** nothing that exists in one language is missing from the other

- **L-4 — The choice is remembered**
  - **Given** I chose French
  - **When** I reload, or open the app again later in the same browser
  - **Then** the UI is in French
  - **Given** the remembered language is not one of the two supported ones
  - **Then** it is ignored, and the language is detected as in L-5

- **L-5 — With nothing remembered, the browser decides**
  - **Given** no language has been remembered for this browser yet
  - **When** the app opens
  - **Then** it uses the first of the browser's preferred languages that matches
    a supported one, comparing only the primary subtag, so `fr-CA` selects French
  - **And** if none matches, English is used
  - **And** the language it settles on is then remembered as in L-4, so detection
    does not run again on later visits

- **L-6 — A language change reaches other tabs** (§10, T-1)
  - **Given** the app is open in two tabs
  - **When** I press **FR** in one
  - **Then** the other switches to French too

- **L-7 — The page declares its language**
  - **Then** the page advertises the language currently in use, so that browser
    translation prompts, hyphenation, and screen-reader pronunciation follow it,
    and it changes when the language does

- **L-8 — Language is presentation only**
  - **Given** the list holds "Buy milk"
  - **When** I switch to French
  - **Then** the todo still reads "Buy milk" — titles are user data and are never
    translated
  - **And** no todo is modified, reordered or reloaded by the switch

- **L-9 — Strings that embed a value are written per language**
  - **Then** the items-left count, **Clear completed**, and the labels that quote
    a title are composed by each language on its own terms, not assembled from
    fragments
  - **And** this is what lets each language pick its own plural forms
    ("1 item left" / "1 tâche restante") and its own quotation marks
    (`"…"` / `« … »`)

- **L-10 — Rule.** Pluralisation is a one-versus-many rule in both languages.
  Languages needing more than two plural forms are not supported.

## 12. Presentation and accessibility

- **U-1 — Layout**
  - **Then** the app is a single centred card, at most about 34rem wide
  - **And** it stays usable down to a narrow phone viewport, with no horizontal
    scrolling

- **U-2 — Light and dark**
  - **Then** the app follows the operating system's light or dark setting, and
    is legible in both
  - **And** there is no in-app theme toggle

- **U-3 — Controls behave like standard controls**
  - **Then** the checkbox toggles with Space, Enter in the new-todo field submits
    the form, buttons activate with Enter and Space, and the browser's own
    focus order applies — none of this is re-implemented or overridden

- **U-4 — Keyboard**
  - **Then** every control can be reached and operated by keyboard alone
  - **And** the focused control shows a visible focus outline

- **U-5 — Labels**
  - **Then** controls are labelled with text rather than icons
  - **And** controls whose text is not self-describing on its own — the
    checkbox, **Delete** — name their todo for assistive tech (C-3, R-2)

- **U-6 — Long titles**
  - **Given** a todo with a very long title
  - **Then** it wraps onto further lines, and is never truncated, clipped, or
    allowed to overflow the card

## 13. Non-goals

Explicitly out of scope. Adding any of these is a change to this specification,
not a bug fix.

- Any backend, sync service, or account. Nothing leaves the browser.
- Due dates, reminders, priorities, tags, notes, or subtasks.
- Multiple lists or projects.
- Manual reordering or drag and drop.
- Undo/redo, or a trash/archive state.
- Search.
- Toggling every todo at once.
- Import/export.
- Error handling, retries, offline queueing, or conflict resolution (P-12), and
  any machinery for showing a change before it is committed or taking one back.
- Making the 200–700ms delay configurable or switchable off.
- Any language beyond English and French, right-to-left layout, or localisation
  of anything other than UI strings — there are no dates, numbers or currencies
  to format.
