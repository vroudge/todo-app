// Simulated backend. The "database" is localStorage, but every operation is
// asynchronous and takes 200–700ms, so the UI has to deal with latency exactly
// as it would against a real API.

const KEY = 'todo-app.todos'
const MIN_LATENCY_MS = 200
const MAX_LATENCY_MS = 700

function latency() {
  return MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Operations are serialised. Each one reads, modifies and writes the whole
// store, so overlapping requests would otherwise lose each other's writes.
let queue = Promise.resolve()

function transaction(work) {
  const result = queue.then(async () => {
    await sleep(latency())
    return work()
  })
  queue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

export function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Anything persisted by an older version — or hand-edited in devtools — is
// untrusted, so every todo is normalised on the way out of storage.
function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) return null
  return {
    id: typeof raw.id === 'string' ? raw.id : createId(),
    title,
    done: Boolean(raw.done),
  }
}

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY))
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalize).filter(Boolean)
  } catch {
    return []
  }
}

function write(todos) {
  try {
    localStorage.setItem(KEY, JSON.stringify(todos))
  } catch {
    // Private browsing or a full quota: the app still works for this session.
  }
  return todos
}

// Every mutation resolves with the resulting collection, so callers replace
// their state with the server's version rather than guessing at it.

export function listTodos() {
  return transaction(read)
}

export function createTodo(title) {
  return transaction(() => {
    const trimmed = title.trim()
    if (!trimmed) return read()
    return write([...read(), { id: createId(), title: trimmed, done: false }])
  })
}

export function updateTodo(id, patch) {
  return transaction(() =>
    write(read().map((todo) => (todo.id === id ? { ...todo, ...patch, id: todo.id } : todo))),
  )
}

export function deleteTodo(id) {
  return transaction(() => write(read().filter((todo) => todo.id !== id)))
}

export function deleteCompleted() {
  return transaction(() => write(read().filter((todo) => !todo.done)))
}

export const STORAGE_KEY = KEY
