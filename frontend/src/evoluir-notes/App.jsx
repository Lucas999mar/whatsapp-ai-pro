import React, { useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { useNoteStore } from './store/noteStore'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'
import { GraphView } from './components/GraphView'
import { CommandPalette } from './components/CommandPalette'
import { BacklinksPanel } from './components/BacklinksPanel'

export default function App() {
  const {
    initStore,
    activeNoteId,
    editorMode,
    showGraphView,
    showCommandPalette,
    showBacklinks,
    setShowGraphView,
    setShowCommandPalette,
    createNote
  } = useNoteStore()

  // Initialize Dexie database and store on mount
  useEffect(() => {
    initStore()
  }, [initStore])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + N -> Nova Nota
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault()
        createNote({ title: 'Nota Sem Título' }).then((n) => {
          if (n) toast.success('Nova nota criada!')
        })
      }
      // Ctrl/Cmd + P -> Paleta de Comandos
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && !e.shiftKey) {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      // Ctrl/Cmd + Shift + G -> Visão em Grafo
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setShowGraphView(!showGraphView)
      }
      // Ctrl/Cmd + S -> Salvar
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        toast.success('Nota salva com sucesso!')
      }
      // Esc -> Fechar modais
      else if (e.key === 'Escape') {
        if (showCommandPalette) setShowCommandPalette(false)
        if (showGraphView) setShowGraphView(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createNote, showGraphView, showCommandPalette, setShowGraphView, setShowCommandPalette])

  return (
    <div className="flex h-full w-full min-h-screen overflow-hidden bg-ev-bg-primary text-ev-text-primary select-none font-sans relative">
      {/* Toast Notification Provider */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#181825',
            color: '#cdd6f4',
            border: '1px solid #313244',
            borderRadius: '8px',
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
          }
        }}
      />

      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-ev-bg-primary relative min-w-0">
        {/* Tab Bar at Top */}
        <TabBar />

        {/* Note Content Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeNoteId ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Editor / Preview Area */}
              <div className="flex-1 flex overflow-hidden">
                {editorMode === 'edit' && (
                  <div className="w-full h-full overflow-hidden">
                    <Editor />
                  </div>
                )}

                {editorMode === 'preview' && (
                  <div className="w-full h-full overflow-hidden">
                    <Preview />
                  </div>
                )}

                {editorMode === 'split' && (
                  <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/2 h-full border-r border-ev-border overflow-hidden">
                      <Editor />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden">
                      <Preview />
                    </div>
                  </div>
                )}
              </div>

              {/* Backlinks Panel (Collapsible at bottom) */}
              {showBacklinks && <BacklinksPanel />}
            </div>
          ) : (
            /* Fallback to Editor's built-in empty state */
            <div className="flex-1 h-full overflow-hidden">
              <Editor />
            </div>
          )}
        </div>
      </main>

      {/* Fullscreen / Modal Graph View Overlay */}
      {showGraphView && (
        <GraphView onClose={() => setShowGraphView(false)} />
      )}

      {/* Command Palette Modal Overlay */}
      {showCommandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
        />
      )}
    </div>
  )
}
