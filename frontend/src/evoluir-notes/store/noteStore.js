import { create } from 'zustand'
import { db, seedDatabase } from '../utils/db'

export const parseWikiLinks = (content = '') => {
  if (!content) return []
  const matches = []
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const rawTarget = match[1].trim()
    if (rawTarget && !matches.includes(rawTarget)) {
      matches.push(rawTarget)
    }
  }
  return matches
}

export const parseTags = (content = '') => {
  if (!content) return []
  const tags = new Set()
  const regex = /(?:^|\s)#([a-zA-Z0-9_\u00C0-\u017F-]+)/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const tag = match[1].trim().toLowerCase()
    if (tag) tags.add(tag)
  }
  return Array.from(tags)
}

export const useNoteStore = create((set, get) => ({
  notes: [],
  folders: [],
  trash: [],
  activeNoteId: null,
  activeTabId: null,
  activeFolderId: null,
  openTabs: [],
  sidebarOpen: true,
  sidebarWidth: 280,
  editorMode: 'split', // 'edit' | 'preview' | 'split'
  searchQuery: '',
  searchResults: [],
  selectedTag: null,
  showCommandPalette: false,
  showGraphView: false,
  showBacklinks: false,
  graphFullscreen: false,
  isLoading: true,

  initStore: async () => {
    try {
      set({ isLoading: true })
      await seedDatabase()

      const allNotes = await db.notes.toArray()
      const allFolders = await db.folders.toArray()

      const activeNotes = allNotes.filter(n => !n.isTrash)
      const trashNotes = allNotes.filter(n => !!n.isTrash)

      const initialNoteId = activeNotes.length > 0 ? activeNotes[0].id : null
      const initialTabs = initialNoteId ? [initialNoteId] : []

      set({
        notes: activeNotes,
        folders: allFolders,
        trash: trashNotes,
        activeNoteId: initialNoteId,
        activeTabId: initialNoteId,
        openTabs: initialTabs,
        isLoading: false
      })
    } catch (err) {
      console.error('Failed to init store from Dexie:', err)
      set({ isLoading: false })
    }
  },

  // Notes CRUD
  createNote: async (arg1, arg2) => {
    let title = 'Sem Título'
    let folderId = get().activeFolderId || null
    let content = ''

    if (arg1 && typeof arg1 === 'object') {
      title = arg1.title || title
      folderId = arg1.folderId !== undefined ? arg1.folderId : folderId
      content = arg1.content || content
    } else {
      if (arg1 !== undefined && arg1 !== null) {
        folderId = arg1
      }
      if (arg2 && typeof arg2 === 'object') {
        title = arg2.title || title
        if (arg2.folderId !== undefined) folderId = arg2.folderId
        content = arg2.content || content
      }
    }

    const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    const extractedTags = parseTags(content)
    const now = new Date().toISOString()

    const newNote = {
      id,
      title: title || 'Sem Título',
      folderId,
      content,
      tags: extractedTags,
      starred: 0,
      isTrash: 0,
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    }

    try {
      await db.notes.add(newNote)
      set(state => {
        const updatedNotes = [newNote, ...state.notes]
        const openTabs = state.openTabs.includes(id)
          ? state.openTabs
          : [...state.openTabs, id]
        return {
          notes: updatedNotes,
          activeNoteId: id,
          activeTabId: id,
          openTabs
        }
      })
      return newNote
    } catch (err) {
      console.error('Error creating note:', err)
      return null
    }
  },

  updateNote: async (id, updates) => {
    const { notes } = get()
    const target = notes.find(n => n.id === id)
    if (!target) return

    let finalTags = updates.tags
    if (updates.content !== undefined && updates.tags === undefined) {
      finalTags = parseTags(updates.content)
    }

    const payload = {
      ...updates,
      tags: finalTags !== undefined ? finalTags : target.tags,
      updatedAt: new Date().toISOString()
    }

    try {
      await db.notes.update(id, payload)
      set(state => ({
        notes: state.notes.map(n => (n.id === id ? { ...n, ...payload } : n))
      }))
    } catch (err) {
      console.error('Error updating note:', err)
    }
  },

  deleteNote: async (id) => {
    // Soft-delete: Move to trash
    try {
      const now = new Date().toISOString()
      await db.notes.update(id, { isTrash: 1, deletedAt: now, updatedAt: now })

      set(state => {
        const deletedNote = state.notes.find(n => n.id === id)
        if (!deletedNote) return state

        const updatedNotes = state.notes.filter(n => n.id !== id)
        const updatedTrash = [{ ...deletedNote, isTrash: 1, deletedAt: now, updatedAt: now }, ...state.trash]
        const updatedTabs = state.openTabs.filter(tabId => tabId !== id)

        let nextActiveNoteId = state.activeNoteId
        if (state.activeNoteId === id) {
          nextActiveNoteId = updatedTabs.length > 0 ? updatedTabs[updatedTabs.length - 1] : (updatedNotes[0]?.id || null)
        }

        return {
          notes: updatedNotes,
          trash: updatedTrash,
          openTabs: updatedTabs,
          activeNoteId: nextActiveNoteId,
          activeTabId: nextActiveNoteId
        }
      })
    } catch (err) {
      console.error('Error deleting note:', err)
    }
  },

  moveToTrash: (id) => get().deleteNote(id),

  restoreNote: async (id) => {
    try {
      const now = new Date().toISOString()
      await db.notes.update(id, { isTrash: 0, deletedAt: null, updatedAt: now })

      set(state => {
        const restored = state.trash.find(n => n.id === id)
        if (!restored) return state

        const updatedTrash = state.trash.filter(n => n.id !== id)
        const restoredNote = { ...restored, isTrash: 0, deletedAt: null, updatedAt: now }
        const updatedNotes = [restoredNote, ...state.notes]

        return {
          notes: updatedNotes,
          trash: updatedTrash,
          activeNoteId: id,
          activeTabId: id,
          openTabs: state.openTabs.includes(id) ? state.openTabs : [...state.openTabs, id]
        }
      })
    } catch (err) {
      console.error('Error restoring note:', err)
    }
  },

  restoreFromTrash: (id) => get().restoreNote(id),

  permanentDeleteNote: async (id) => {
    try {
      await db.notes.delete(id)
      set(state => ({
        trash: state.trash.filter(n => n.id !== id)
      }))
    } catch (err) {
      console.error('Error permanent deleting note:', err)
    }
  },

  emptyTrash: async () => {
    try {
      const trashIds = get().trash.map(n => n.id)
      await db.notes.bulkDelete(trashIds)
      set({ trash: [] })
    } catch (err) {
      console.error('Error emptying trash:', err)
    }
  },

  toggleStar: async (id) => {
    const { notes } = get()
    const target = notes.find(n => n.id === id)
    if (!target) return

    const newStarred = target.starred ? 0 : 1
    try {
      await db.notes.update(id, { starred: newStarred })
      set(state => ({
        notes: state.notes.map(n => (n.id === id ? { ...n, starred: newStarred } : n))
      }))
    } catch (err) {
      console.error('Error toggling star:', err)
    }
  },

  starNote: (id) => get().toggleStar(id),

  // Folders CRUD
  createFolder: async (name, parentId = null) => {
    const id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    const newFolder = {
      id,
      name: name || 'Nova Pasta',
      parentId,
      createdAt: new Date().toISOString()
    }

    try {
      await db.folders.add(newFolder)
      set(state => ({
        folders: [...state.folders, newFolder],
        activeFolderId: id
      }))
      return newFolder
    } catch (err) {
      console.error('Error creating folder:', err)
      return null
    }
  },

  updateFolder: async (id, updates) => {
    try {
      await db.folders.update(id, updates)
      set(state => ({
        folders: state.folders.map(f => (f.id === id ? { ...f, ...updates } : f))
      }))
    } catch (err) {
      console.error('Error updating folder:', err)
    }
  },

  deleteFolder: async (id) => {
    try {
      const { notes } = get()
      const notesInFolder = notes.filter(n => n.folderId === id)

      for (const note of notesInFolder) {
        await db.notes.update(note.id, { folderId: null })
      }

      await db.folders.delete(id)

      set(state => ({
        folders: state.folders.filter(f => f.id !== id),
        notes: state.notes.map(n => (n.folderId === id ? { ...n, folderId: null } : n)),
        activeFolderId: state.activeFolderId === id ? null : state.activeFolderId
      }))
    } catch (err) {
      console.error('Error deleting folder:', err)
    }
  },

  // Tabs & Navigation
  setActiveNote: (id) => {
    set(state => {
      if (!id) return { activeNoteId: null, activeTabId: null }
      const exists = state.notes.some(n => n.id === id)
      if (!exists) return state

      const openTabs = state.openTabs.includes(id)
        ? state.openTabs
        : [...state.openTabs, id]

      return {
        activeNoteId: id,
        activeTabId: id,
        openTabs
      }
    })
  },

  setActiveTab: (id) => get().setActiveNote(id),

  openNoteInTab: (id) => {
    get().setActiveNote(id)
  },

  openTab: (id) => {
    get().setActiveNote(id)
  },

  closeTab: (id) => {
    set(state => {
      const openTabs = state.openTabs.filter(tabId => tabId !== id)
      let nextActiveNoteId = state.activeNoteId

      if (state.activeNoteId === id) {
        if (openTabs.length > 0) {
          nextActiveNoteId = openTabs[openTabs.length - 1]
        } else {
          nextActiveNoteId = null
        }
      }

      return {
        openTabs,
        activeNoteId: nextActiveNoteId,
        activeTabId: nextActiveNoteId
      }
    })
  },

  closeOtherTabs: (keepId) => {
    set({
      openTabs: [keepId],
      activeNoteId: keepId,
      activeTabId: keepId
    })
  },

  closeAllTabs: () => {
    set({
      openTabs: [],
      activeNoteId: null,
      activeTabId: null
    })
  },

  setActiveFolder: (id) => {
    set({ activeFolderId: id, selectedTag: null })
  },

  setSelectedTag: (tag) => {
    set({ selectedTag: tag, activeFolderId: null })
  },

  // UI State toggles
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(600, width)) }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setShowCommandPalette: (show) => set({ showCommandPalette: show }),
  toggleCommandPalette: () => set(s => ({ showCommandPalette: !s.showCommandPalette })),
  setShowGraphView: (show) => set({ showGraphView: show }),
  toggleGraphView: () => set(s => ({ showGraphView: !s.showGraphView })),
  setShowBacklinks: (show) => set({ showBacklinks: show }),
  toggleBacklinks: () => set(s => ({ showBacklinks: !s.showBacklinks })),
  setGraphFullscreen: (fullscreen) => set({ graphFullscreen: fullscreen }),

  // Search
  setSearchQuery: (query) => {
    const q = (query || '').toLowerCase().trim()
    const { notes } = get()

    if (!q) {
      set({ searchQuery: '', searchResults: [] })
      return
    }

    const results = notes.filter(n => {
      const matchTitle = (n.title || '').toLowerCase().includes(q)
      const matchContent = (n.content || '').toLowerCase().includes(q)
      const matchTags = (n.tags || []).some(t => t.toLowerCase().includes(q))
      return matchTitle || matchContent || matchTags
    })

    set({ searchQuery: query, searchResults: results })
  },

  // Graph and Links
  getGraphData: () => {
    const { notes } = get()
    const titleToNoteMap = new Map()

    notes.forEach(note => {
      titleToNoteMap.set(note.title.toLowerCase().trim(), note)
      titleToNoteMap.set(note.id, note)
    })

    const links = []
    const linkCounts = new Map()

    notes.forEach(note => {
      const targets = parseWikiLinks(note.content)
      targets.forEach(rawTarget => {
        const targetClean = rawTarget.toLowerCase().trim()
        const targetNote = titleToNoteMap.get(targetClean)

        if (targetNote && targetNote.id !== note.id) {
          const exists = links.some(l => l.source === note.id && l.target === targetNote.id)
          if (!exists) {
            links.push({
              source: note.id,
              target: targetNote.id
            })
            linkCounts.set(note.id, (linkCounts.get(note.id) || 0) + 1)
            linkCounts.set(targetNote.id, (linkCounts.get(targetNote.id) || 0) + 1)
          }
        }
      })
    })

    const nodes = notes.map(note => {
      const connections = linkCounts.get(note.id) || 0
      return {
        id: note.id,
        title: note.title || 'Sem Título',
        tags: note.tags || [],
        folderId: note.folderId,
        starred: note.starred,
        content: note.content || '',
        connections,
        linkCount: connections,
        radius: Math.max(7, Math.min(22, 7 + connections * 2.5))
      }
    })

    return { nodes, links }
  },

  getLinkGraph: () => get().getGraphData(),

  getBacklinks: (noteId) => {
    const { notes, folders } = get()
    const targetNote = notes.find(n => n.id === noteId)
    if (!targetNote) return []

    const targetTitle = (targetNote.title || '').toLowerCase().trim()

    const matchingNotes = notes.filter(note => {
      if (note.id === noteId || note.isTrash || note.deletedAt) return false
      const links = parseWikiLinks(note.content)
      return links.some(link => {
        const clean = link.toLowerCase().trim()
        return clean === targetTitle || clean === noteId
      })
    })

    return matchingNotes.map(note => {
      const folder = folders.find(f => f.id === note.folderId)
      let context = ''
      if (note.content) {
        const lines = note.content.split('\n')
        for (const line of lines) {
          if (line.toLowerCase().includes(`[[${targetTitle}`) || (targetNote.id && line.includes(targetNote.id))) {
            context = line.replace(/^#+\s+/gm, '').trim()
            break
          }
        }
      }
      if (!context) {
        context = (note.content || '').replace(/^#+\s+/gm, '').trim().slice(0, 120)
      }

      return {
        ...note,
        note,
        folderName: folder ? folder.name : null,
        context: context || 'Referência encontrada'
      }
    })
  },

  getForwardLinks: (noteId) => {
    const { notes } = get()
    const note = notes.find(n => n.id === noteId)
    if (!note) return []

    const links = parseWikiLinks(note.content)
    const titleToNoteMap = new Map()
    notes.forEach(n => {
      titleToNoteMap.set(n.title.toLowerCase().trim(), n)
      titleToNoteMap.set(n.id, n)
    })

    const result = []
    links.forEach(raw => {
      const match = titleToNoteMap.get(raw.toLowerCase().trim())
      if (match && !result.some(r => r.id === match.id)) {
        result.push(match)
      }
    })
    return result
  }
}))
