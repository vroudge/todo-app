import { useState } from 'react'
import Spinner from './Spinner.jsx'
import TodoItem from './TodoItem.jsx'
import { LANGUAGES, useLanguage } from './i18n.js'
import { useTodos } from './useTodos.js'

const FILTERS = {
  all: () => true,
  active: (todo) => !todo.done,
  completed: (todo) => todo.done,
}

export default function App() {
  const {
    todos,
    loading,
    creating,
    clearing,
    pending,
    addTodo,
    toggleTodo,
    renameTodo,
    removeTodo,
    clearCompleted,
  } = useTodos()
  const { lang, setLang, t } = useLanguage()
  const [filter, setFilter] = useState('all')
  const [text, setText] = useState('')

  const visible = todos.filter(FILTERS[filter])
  const remaining = todos.filter((todo) => !todo.done).length
  const completed = todos.length - remaining

  function onSubmit(event) {
    event.preventDefault()
    if (!text.trim() || creating) return
    // Clear the field straight away: the request is already accepted, and
    // keeping the text would invite a double submit while it is in flight.
    setText('')
    addTodo(text)
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>{t.appTitle}</h1>
        <div className="languages" role="group" aria-label={t.languageLabel}>
          {LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              className={lang === code ? 'lang active' : 'lang'}
              aria-pressed={lang === code}
              lang={code}
              onClick={() => setLang(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <form className="new-todo" onSubmit={onSubmit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t.newTodoPlaceholder}
          aria-label={t.newTodoLabel}
          disabled={loading}
        />
        <button type="submit" disabled={loading || creating || !text.trim()} aria-busy={creating || undefined}>
          {creating && <Spinner label={t.adding} />}
          {t.add}
        </button>
      </form>

      <div className="filters">
        {Object.keys(FILTERS).map((name) => (
          <button
            key={name}
            type="button"
            className={filter === name ? 'filter active' : 'filter'}
            aria-pressed={filter === name}
            onClick={() => setFilter(name)}
          >
            {t.filters[name]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty loading">
          <Spinner label={t.loading} />
          {t.loading}
        </p>
      ) : visible.length === 0 ? (
        <p className="empty">{todos.length === 0 ? t.emptyList : t.emptyFilter[filter]}</p>
      ) : (
        <ul className="todo-list">
          {visible.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              t={t}
              busy={pending.has(todo.id)}
              onToggle={toggleTodo}
              onRename={renameTodo}
              onRemove={removeTodo}
            />
          ))}
        </ul>
      )}

      <footer className="summary">
        <span>{loading ? ' ' : t.itemsLeft(remaining)}</span>
        <button
          type="button"
          onClick={clearCompleted}
          disabled={loading || clearing || completed === 0}
          aria-busy={clearing || undefined}
        >
          {clearing && <Spinner label={t.clearing} />}
          {t.clearCompleted(completed)}
        </button>
      </footer>
    </main>
  )
}
