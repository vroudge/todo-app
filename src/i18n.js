import { useEffect, useState } from 'react'

export const LANGUAGES = ['en', 'fr']
const KEY = 'todo-app.lang'
const FALLBACK = 'en'

// Titles are interpolated into a few strings, so those entries are functions
// rather than templates — French needs guillemets and different word order.
const STRINGS = {
  en: {
    name: 'English',
    appTitle: 'Todos',
    newTodoLabel: 'New todo',
    newTodoPlaceholder: 'What needs doing?',
    add: 'Add',
    languageLabel: 'Language',
    filters: { all: 'All', active: 'Active', completed: 'Completed' },
    emptyList: 'Nothing here yet. Add your first todo above.',
    emptyFilter: { all: 'No todos.', active: 'No active todos.', completed: 'No completed todos.' },
    itemsLeft: (n) => `${n} ${n === 1 ? 'item' : 'items'} left`,
    clearCompleted: (n) => `Clear completed (${n})`,
    edit: 'Edit',
    save: 'Save',
    remove: 'Delete',
    editHint: 'Double-click to edit',
    loading: 'Loading your todos…',
    saving: 'Saving…',
    adding: 'Adding…',
    clearing: 'Clearing…',
    toggleLabel: (title, done) => `Mark "${title}" as ${done ? 'not done' : 'done'}`,
    removeLabel: (title) => `Delete "${title}"`,
  },
  fr: {
    name: 'Français',
    appTitle: 'Tâches',
    newTodoLabel: 'Nouvelle tâche',
    newTodoPlaceholder: 'Qu’y a-t-il à faire ?',
    add: 'Ajouter',
    languageLabel: 'Langue',
    filters: { all: 'Toutes', active: 'À faire', completed: 'Terminées' },
    emptyList: 'Rien pour l’instant. Ajoutez votre première tâche ci-dessus.',
    emptyFilter: {
      all: 'Aucune tâche.',
      active: 'Aucune tâche à faire.',
      completed: 'Aucune tâche terminée.',
    },
    itemsLeft: (n) => `${n} ${n === 1 ? 'tâche restante' : 'tâches restantes'}`,
    clearCompleted: (n) => `Supprimer les terminées (${n})`,
    edit: 'Modifier',
    save: 'Enregistrer',
    remove: 'Supprimer',
    editHint: 'Double-cliquez pour modifier',
    loading: 'Chargement de vos tâches…',
    saving: 'Enregistrement…',
    adding: 'Ajout…',
    clearing: 'Suppression…',
    toggleLabel: (title, done) =>
      `Marquer « ${title} » comme ${done ? 'à faire' : 'terminée'}`,
    removeLabel: (title) => `Supprimer « ${title} »`,
  },
}

function readStored() {
  try {
    const stored = localStorage.getItem(KEY)
    if (LANGUAGES.includes(stored)) return stored
  } catch {
    // Storage unavailable: fall through to the browser preference.
  }
  return null
}

function detect() {
  const preferred = typeof navigator !== 'undefined' ? navigator.languages ?? [] : []
  for (const tag of preferred) {
    const base = String(tag).toLowerCase().split('-')[0]
    if (LANGUAGES.includes(base)) return base
  }
  return FALLBACK
}

export function useLanguage() {
  const [lang, setLang] = useState(() => readStored() ?? detect())

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      // Not durable this session; the UI is still translated.
    }
  }, [lang])

  // Keep other tabs on the same language.
  useEffect(() => {
    function onStorage(event) {
      if (event.key !== null && event.key !== KEY) return
      const stored = readStored()
      if (stored) setLang(stored)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { lang, setLang, t: STRINGS[lang] ?? STRINGS[FALLBACK] }
}
