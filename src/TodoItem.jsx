import { useEffect, useRef, useState } from 'react'
import Spinner from './Spinner.jsx'

export default function TodoItem({ todo, t, busy, onToggle, onRename, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  // A rename that is still in flight must not be re-committed on blur, and the
  // row's own edit box closes as soon as the request is sent.
  function startEditing() {
    setDraft(todo.title)
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    if (draft.trim() !== todo.title) onRename(todo.id, draft)
  }

  function onKeyDown(event) {
    if (event.key === 'Enter') commit()
    if (event.key === 'Escape') setEditing(false)
  }

  return (
    <li className={busy ? 'todo busy' : 'todo'} aria-busy={busy || undefined}>
      <input
        type="checkbox"
        checked={todo.done}
        disabled={busy}
        onChange={() => onToggle(todo.id)}
        aria-label={t.toggleLabel(todo.title, todo.done)}
      />

      {editing ? (
        <input
          ref={inputRef}
          className="todo-edit"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          autoFocus
        />
      ) : (
        <span
          className={todo.done ? 'todo-title done' : 'todo-title'}
          onDoubleClick={busy ? undefined : startEditing}
          title={busy ? undefined : t.editHint}
        >
          {todo.title}
        </span>
      )}

      {busy && <Spinner label={t.saving} />}

      <button type="button" disabled={busy} onClick={editing ? commit : startEditing}>
        {editing ? t.save : t.edit}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onRemove(todo.id)}
        aria-label={t.removeLabel(todo.title)}
      >
        {t.remove}
      </button>
    </li>
  )
}
