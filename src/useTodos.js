import { useCallback, useEffect, useRef, useState } from 'react'
import {
  STORAGE_KEY,
  createTodo,
  deleteCompleted,
  deleteTodo,
  listTodos,
  updateTodo,
} from './storage.js'

export function useTodos() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [clearing, setClearing] = useState(false)
  // Ids of todos with a request in flight, so each row can show its own loader.
  const [pending, setPending] = useState(() => new Set())

  const alive = useRef(true)
  useEffect(() => {
    // Set on every setup, not just the first: React re-runs effects after a
    // simulated unmount in development, and a ref that is only ever cleared
    // would stay false for the rest of the session.
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const commit = useCallback((next) => {
    if (alive.current) setTodos(next)
  }, [])

  const refresh = useCallback(async () => {
    const next = await listTodos()
    commit(next)
    return next
  }, [commit])

  useEffect(() => {
    refresh().finally(() => {
      if (alive.current) setLoading(false)
    })
  }, [refresh])

  // Another tab wrote to the store: pull its version.
  useEffect(() => {
    function onStorage(event) {
      if (event.key === null || event.key === STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  const markPending = useCallback((id, busy) => {
    setPending((current) => {
      const next = new Set(current)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  // One request per todo at a time — a second click while the first is in
  // flight is dropped rather than queued, which keeps the loader honest.
  const perTodo = useCallback(
    async (id, request) => {
      if (pending.has(id)) return
      markPending(id, true)
      try {
        commit(await request())
      } finally {
        if (alive.current) markPending(id, false)
      }
    },
    [commit, markPending, pending],
  )

  const addTodo = useCallback(
    async (title) => {
      const trimmed = title.trim()
      if (!trimmed || creating) return
      setCreating(true)
      try {
        commit(await createTodo(trimmed))
      } finally {
        if (alive.current) setCreating(false)
      }
    },
    [commit, creating],
  )

  const toggleTodo = useCallback(
    (id) => {
      const todo = todos.find((candidate) => candidate.id === id)
      if (!todo) return
      return perTodo(id, () => updateTodo(id, { done: !todo.done }))
    },
    [perTodo, todos],
  )

  const renameTodo = useCallback(
    (id, title) => {
      const trimmed = title.trim()
      if (!trimmed) return perTodo(id, () => deleteTodo(id))
      return perTodo(id, () => updateTodo(id, { title: trimmed }))
    },
    [perTodo],
  )

  const removeTodo = useCallback((id) => perTodo(id, () => deleteTodo(id)), [perTodo])

  const clearCompleted = useCallback(async () => {
    if (clearing) return
    setClearing(true)
    try {
      commit(await deleteCompleted())
    } finally {
      if (alive.current) setClearing(false)
    }
  }, [clearing, commit])

  return {
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
  }
}
