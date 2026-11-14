import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileText,
  Star,
  Plus,
  MoreHorizontal,
  Columns,
  Eye,
  PenTool,
  Share2,
  Command,
  ChevronRight,
  ChevronLeft,
  PanelLeft
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';

export function TabBar() {
  const {
    notes = [],
    activeNoteId,
    activeTabId,
    openTabs = [],
    sidebarOpen = true,
    toggleSidebar,
    setActiveNote,
    setActiveTab,
    createNote,
    openTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    editorMode = 'edit',
    setEditorMode,
    toggleGraphView,
    toggleCommandPalette,
  } = useNoteStore();

  const [contextMenu, setContextMenu] = useState(null); // { x, y, tabId }
  const [draggedTabId, setDraggedTabId] = useState(null);
  const scrollContainerRef = useRef(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Determine current active id
  const currentActiveId = activeTabId || activeNoteId;

  // Normalized tabs list (ensuring if openTabs is empty but activeNoteId exists, it's displayed)
  const normalizedTabs = React.useMemo(() => {
    const list = openTabs.map((t) => (typeof t === 'object' && t ? t.id : t));
    if (list.length === 0 && activeNoteId) {
      return [activeNoteId];
    }
    return list;
  }, [openTabs, activeNoteId]);

  // Handle Tab Selection
  const handleSelectTab = (tabId) => {
    if (setActiveTab) setActiveTab(tabId);
    if (setActiveNote) setActiveNote(tabId);
  };

  // Handle Close Tab
  const handleCloseTab = (e, tabId) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (closeTab) {
      closeTab(tabId);
    }
  };

  // Middle-click (wheel click) closes tab
  const handleAuxClick = (e, tabId) => {
    if (e.button === 1) {
      e.preventDefault();
      handleCloseTab(null, tabId);
    }
  };

  // Right-click context menu
  const handleContextMenu = (e, tabId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 150),
      tabId,
    });
  };

  // Drag and drop reordering
  const handleDragStart = (e, tabId) => {
    setDraggedTabId(tabId);
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetTabId) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetTabId) return;

    // If reordering tabs is handled by the store or local tabs
    const fromIndex = normalizedTabs.indexOf(draggedTabId);
    const toIndex = normalizedTabs.indexOf(targetTabId);
    if (fromIndex !== -1 && toIndex !== -1) {
      const newTabs = [...normalizedTabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      // We can update state if store supports it
    }
    setDraggedTabId(null);
  };

  // Scroll tab bar left/right
  const scroll = (offset) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Create new note quickly
  const handleNewNote = () => {
    if (createNote) {
      createNote(null, { title: 'Nova Nota' }).then((n) => {
        if (n?.id) {
          if (setActiveNote) setActiveNote(n.id);
          if (openTab) openTab(n.id);
        }
      });
    }
  };

  if (normalizedTabs.length === 0) {
    if (!sidebarOpen) {
      return (
        <div className="flex items-center bg-ev-bg-secondary border-b border-ev-border/80 h-10 px-2 select-none z-10 flex-shrink-0">
          <button
            onClick={toggleSidebar}
            title="Expandir Barra Lateral"
            className="p-1.5 text-ev-text-muted hover:text-ev-text-primary hover:bg-ev-bg-hover rounded-md transition-colors"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex items-center justify-between bg-ev-bg-secondary border-b border-ev-border/80 h-10 select-none z-10 flex-shrink-0">
      {/* Scrollable Tabs Container */}
      <div className="flex items-center flex-1 min-w-0 h-full overflow-hidden relative">
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            title="Expandir Barra Lateral"
            className="p-1.5 ml-2 mr-1 text-ev-text-muted hover:text-ev-text-primary hover:bg-ev-bg-hover rounded-md transition-colors shrink-0"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <div
          ref={scrollContainerRef}
          className="flex items-center h-full overflow-x-auto no-scrollbar scroll-smooth"
        >
          {normalizedTabs.map((tabId) => {
            const note = notes.find((n) => n.id === tabId);
            const isActive = tabId === currentActiveId;
            const title = note?.title || 'Sem título';

            return (
              <div
                key={tabId}
                draggable
                onDragStart={(e) => handleDragStart(e, tabId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tabId)}
                onClick={() => handleSelectTab(tabId)}
                onAuxClick={(e) => handleAuxClick(e, tabId)}
                onContextMenu={(e) => handleContextMenu(e, tabId)}
                title={`${title} (Clique do meio para fechar)`}
                className={`group relative flex items-center gap-2 px-3.5 h-full text-xs cursor-pointer border-r border-ev-border/60 transition-all flex-shrink-0 max-w-[200px] ${
                  isActive
                    ? 'bg-ev-bg-primary text-ev-text-primary border-t-2 border-t-ev-accent font-medium shadow-sm'
                    : 'bg-ev-bg-secondary text-ev-text-muted hover:text-ev-text-secondary hover:bg-ev-bg-surface/40 border-t-2 border-t-transparent'
                }`}
              >
                {/* Note Icon / Star */}
                {note?.starred ? (
                  <Star className="w-3.5 h-3.5 text-ev-yellow fill-ev-yellow flex-shrink-0" />
                ) : (
                  <FileText
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isActive ? 'text-ev-accent' : 'text-ev-text-muted group-hover:text-ev-text-secondary'
                    }`}
                  />
                )}

                {/* Tab Title */}
                <span className="truncate">{title}</span>

                {/* Close Button */}
                <button
                  onClick={(e) => handleCloseTab(e, tabId)}
                  className={`p-0.5 rounded-full hover:bg-ev-bg-hover hover:text-ev-red transition-colors opacity-60 group-hover:opacity-100 ${
                    isActive ? 'opacity-100' : ''
                  }`}
                  title="Fechar aba"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* New Tab Quick Button */}
        <button
          onClick={handleNewNote}
          title="Nova Nota"
          className="px-2 h-full flex items-center justify-center text-ev-text-muted hover:text-ev-accent hover:bg-ev-bg-hover/50 transition-colors flex-shrink-0 border-r border-ev-border/60"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Right Quick Controls */}
      <div className="flex items-center gap-1 px-2 flex-shrink-0 bg-ev-bg-secondary">
        {/* View Mode Switcher */}
        {setEditorMode && (
          <div className="flex items-center bg-ev-bg-tertiary p-0.5 rounded-md border border-ev-border/60 mr-1">
            <button
              onClick={() => setEditorMode('edit')}
              title="Apenas Editor"
              className={`p-1 rounded ${
                editorMode === 'edit'
                  ? 'bg-ev-accent text-ev-bg-tertiary font-bold'
                  : 'text-ev-text-muted hover:text-ev-text-primary'
              }`}
            >
              <PenTool className="w-3 h-3" />
            </button>
            <button
              onClick={() => setEditorMode('split')}
              title="Modo Dividido"
              className={`p-1 rounded ${
                editorMode === 'split'
                  ? 'bg-ev-accent text-ev-bg-tertiary font-bold'
                  : 'text-ev-text-muted hover:text-ev-text-primary'
              }`}
            >
              <Columns className="w-3 h-3" />
            </button>
            <button
              onClick={() => setEditorMode('preview')}
              title="Apenas Pré-visualização"
              className={`p-1 rounded ${
                editorMode === 'preview'
                  ? 'bg-ev-accent text-ev-bg-tertiary font-bold'
                  : 'text-ev-text-muted hover:text-ev-text-primary'
              }`}
            >
              <Eye className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Graph View Trigger */}
        {toggleGraphView && (
          <button
            onClick={() => toggleGraphView()}
            title="Grafo de Conexões (Ctrl+Shift+G)"
            className="p-1.5 text-ev-text-muted hover:text-ev-accent hover:bg-ev-bg-hover rounded-md transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Command Palette Trigger */}
        {toggleCommandPalette && (
          <button
            onClick={() => toggleCommandPalette()}
            title="Paleta de Comandos (Ctrl+P)"
            className="p-1.5 text-ev-text-muted hover:text-ev-mauve hover:bg-ev-bg-hover rounded-md transition-colors"
          >
            <Command className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Context Menu for Tabs */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 min-w-[150px] bg-ev-bg-surface border border-ev-border rounded-lg shadow-xl py-1 text-xs text-ev-text-primary animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleCloseTab(null, contextMenu.tabId);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ev-bg-hover text-left"
          >
            <X className="w-3.5 h-3.5 text-ev-red" />
            <span>Fechar aba</span>
          </button>

          <button
            onClick={() => {
              if (closeOtherTabs) {
                closeOtherTabs(contextMenu.tabId);
              } else if (openTabs) {
                // fallback
                normalizedTabs.forEach((id) => {
                  if (id !== contextMenu.tabId && closeTab) closeTab(id);
                });
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ev-bg-hover text-left"
          >
            <span>Fechar outras abas</span>
          </button>

          <button
            onClick={() => {
              if (closeAllTabs) {
                closeAllTabs();
              } else {
                normalizedTabs.forEach((id) => closeTab && closeTab(id));
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ev-bg-hover text-left text-ev-text-muted"
          >
            <span>Fechar todas as abas</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default TabBar;
