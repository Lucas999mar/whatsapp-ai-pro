import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  Folder,
  FolderPlus,
  FilePlus,
  Search,
  ChevronRight,
  ChevronDown,
  Star,
  Trash2,
  RotateCcw,
  MoreVertical,
  Edit2,
  FolderInput,
  X,
  Sparkles,
  Command,
  Share2,
  Layers,
  ChevronLeft
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper to safely format dates
function formatRelativeTime(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
  } catch {
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  }
}

// Strip markdown formatting for preview text
function getCleanSnippet(content = '') {
  if (!content) return 'Nenhum conteúdo adicional';
  return content
    .replace(/^#+\s+/gm, '') // headings
    .replace(/\[\[(.*?)\]\]/g, '$1') // wiki links
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/`{1,3}(.*?)`{1,3}/gs, '$1') // code
    .replace(/^\s*[-*+]\s+/gm, '') // lists
    .replace(/^\s*\d+\.\s+/gm, '') // numbered lists
    .replace(/^\s*>\s+/gm, '') // quotes
    .trim()
    .slice(0, 120);
}

export function Sidebar() {
  const {
    notes = [],
    folders = [],
    activeNoteId,
    activeFolderId,
    sidebarOpen = true,
    sidebarWidth = 280,
    searchQuery = '',
    trash = [],
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    updateFolder,
    deleteFolder,
    setActiveNote,
    setActiveFolder,
    toggleSidebar,
    setSidebarWidth,
    setSearchQuery,
    toggleCommandPalette,
    toggleGraphView,
    moveToTrash,
    restoreFromTrash,
    emptyTrash,
    starNote,
    openTab,
  } = useNoteStore();

  // Local state
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showTrashSection, setShowTrashSection] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null); // { x, y, type: 'note'|'folder', targetId }
  
  // Modal states for rename / new folder / move
  const [renameModal, setRenameModal] = useState({ open: false, type: 'note', id: null, title: '' });
  const [newFolderModal, setNewFolderModal] = useState({ open: false, parentId: null, name: '' });
  const [moveModal, setMoveModal] = useState({ open: false, noteId: null });

  // Drag over folder feel
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  const sidebarRef = useRef(null);

  // Resize handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(220, e.clientX), 500);
      if (setSidebarWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Toggle folder expand/collapse
  const toggleFolder = (folderId, e) => {
    if (e) e.stopPropagation();
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Starred notes
  const starredNotes = useMemo(() => {
    return notes.filter((n) => n.starred && !n.deletedAt);
  }, [notes]);

  // Filtered notes based on search or active folder
  const filteredNotes = useMemo(() => {
    let result = notes.filter((n) => !n.deletedAt);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.content && n.content.toLowerCase().includes(q)) ||
          (n.tags && Array.isArray(n.tags) && n.tags.some((t) => t.toLowerCase().includes(q)))
      );
    } else if (showStarredOnly) {
      result = result.filter((n) => n.starred);
    } else if (activeFolderId) {
      result = result.filter((n) => n.folderId === activeFolderId);
    }

    return result;
  }, [notes, searchQuery, showStarredOnly, activeFolderId]);

  // Handle Note selection
  const handleSelectNote = (note) => {
    if (setActiveNote) setActiveNote(note.id);
    if (openTab) openTab(note.id);
  };

  // Handle Note Creation
  const handleCreateNote = async (folderId = null) => {
    const targetFolderId = folderId || activeFolderId || null;
    let newNote;
    if (createNote) {
      newNote = await createNote(targetFolderId, {
        title: 'Nova Nota',
        content: '# Nova Nota\n\nComece a escrever...',
        folderId: targetFolderId,
      });
    }
    if (newNote && newNote.id) {
      if (setActiveNote) setActiveNote(newNote.id);
      if (openTab) openTab(newNote.id);
    }
  };

  // Handle Star toggle
  const handleToggleStar = (e, noteId) => {
    e.stopPropagation();
    if (starNote) {
      starNote(noteId);
    } else if (updateNote) {
      const note = notes.find((n) => n.id === noteId);
      if (note) updateNote(noteId, { starred: !note.starred });
    }
  };

  // Context menu trigger
  const handleContextMenu = (e, type, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 250),
      type,
      targetId,
    });
  };

  // Drag and drop support
  const handleDragStart = (e, noteId) => {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = (e, targetFolderId) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const noteId = e.dataTransfer.getData('text/plain');
    if (noteId && updateNote) {
      updateNote(noteId, { folderId: targetFolderId });
    }
  };

  if (!sidebarOpen) {
    return null;
  }

  return (
    <aside
      ref={sidebarRef}
      style={{ width: `${sidebarWidth}px` }}
      className="relative flex flex-col h-full bg-ev-bg-secondary border-r border-ev-border text-ev-text-primary select-none flex-shrink-0 z-20 transition-all duration-75"
    >
      {/* 1. Header / Branding */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-ev-border/60 bg-ev-bg-secondary">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-ev-mauve via-ev-accent to-ev-teal flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-ev-bg-tertiary stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-ev-accent via-ev-mauve to-ev-pink bg-clip-text text-transparent">
              Evoluir Notes
            </h1>
            <span className="text-[10px] text-ev-text-muted uppercase tracking-wider block font-semibold -mt-0.5">
              Workspace
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {toggleGraphView && (
            <button
              onClick={() => toggleGraphView()}
              title="Grafo de Conexões"
              className="p-1.5 text-ev-text-muted hover:text-ev-accent hover:bg-ev-bg-hover rounded-md transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          {toggleCommandPalette && (
            <button
              onClick={() => toggleCommandPalette()}
              title="Paleta de Comandos (Ctrl+P)"
              className="p-1.5 text-ev-text-muted hover:text-ev-mauve hover:bg-ev-bg-hover rounded-md transition-colors"
            >
              <Command className="w-4 h-4" />
            </button>
          )}
          {toggleSidebar && (
            <button
              onClick={() => toggleSidebar()}
              title="Recolher Barra Lateral"
              className="p-1.5 text-ev-text-muted hover:text-ev-text-primary hover:bg-ev-bg-hover rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Quick Action Buttons */}
      <div className="p-2.5 grid grid-cols-2 gap-1.5 border-b border-ev-border/40">
        <button
          onClick={() => handleCreateNote()}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-ev-bg-surface hover:bg-ev-bg-hover text-ev-text-primary hover:text-ev-accent border border-ev-border rounded-md text-xs font-medium transition-all shadow-sm"
        >
          <FilePlus className="w-3.5 h-3.5 text-ev-accent" />
          <span>Nova Nota</span>
        </button>

        <button
          onClick={() => setNewFolderModal({ open: true, parentId: null, name: '' })}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-ev-bg-surface hover:bg-ev-bg-hover text-ev-text-primary hover:text-ev-mauve border border-ev-border rounded-md text-xs font-medium transition-all shadow-sm"
        >
          <FolderPlus className="w-3.5 h-3.5 text-ev-mauve" />
          <span>Nova Pasta</span>
        </button>
      </div>

      {/* 3. Search Bar */}
      <div className="px-2.5 py-2">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-ev-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar notas (#tags, [[]])..."
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            className="w-full bg-ev-bg-tertiary border border-ev-border/80 focus:border-ev-accent text-ev-text-primary placeholder:text-ev-text-muted text-xs rounded-md pl-8 pr-7 py-1.5 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery && setSearchQuery('')}
              className="absolute right-2 text-ev-text-muted hover:text-ev-text-primary p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Navigation Views (All Notes, Starred) */}
      <div className="px-2 py-1 space-y-0.5 border-b border-ev-border/40 text-xs">
        <button
          onClick={() => {
            setShowStarredOnly(false);
            if (setActiveFolder) setActiveFolder(null);
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
            !showStarredOnly && !activeFolderId
              ? 'bg-ev-bg-surface text-ev-accent font-medium'
              : 'text-ev-text-secondary hover:bg-ev-bg-hover hover:text-ev-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-ev-accent" />
            <span>Todas as Notas</span>
          </div>
          <span className="text-[11px] text-ev-text-muted font-mono">
            {notes.filter((n) => !n.deletedAt).length}
          </span>
        </button>

        <button
          onClick={() => {
            setShowStarredOnly(true);
            if (setActiveFolder) setActiveFolder(null);
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
            showStarredOnly
              ? 'bg-ev-bg-surface text-ev-yellow font-medium'
              : 'text-ev-text-secondary hover:bg-ev-bg-hover hover:text-ev-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-ev-yellow fill-ev-yellow/30" />
            <span>Favoritas</span>
          </div>
          <span className="text-[11px] text-ev-text-muted font-mono">{starredNotes.length}</span>
        </button>
      </div>

      {/* 5. Scrollable Area: Folders & Note List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-3 custom-scrollbar">
        {/* Starred Notes Quick Shelf */}
        {!searchQuery && !showStarredOnly && starredNotes.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-ev-text-muted uppercase tracking-wider">
              <span>Favoritos</span>
              <span className="text-[10px] text-ev-yellow">{starredNotes.length}</span>
            </div>
            <div className="space-y-0.5">
              {starredNotes.map((note) => (
                <div
                  key={`starred-${note.id}`}
                  onClick={() => handleSelectNote(note)}
                  className={`group flex items-center justify-between px-2.5 py-1 rounded text-xs cursor-pointer transition-colors ${
                    activeNoteId === note.id
                      ? 'bg-ev-bg-surface text-ev-accent font-medium'
                      : 'text-ev-text-secondary hover:bg-ev-bg-hover hover:text-ev-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Star className="w-3 h-3 text-ev-yellow fill-ev-yellow flex-shrink-0" />
                    <span className="truncate">{note.title || 'Sem título'}</span>
                  </div>
                  <span className="text-[10px] text-ev-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatRelativeTime(note.updatedAt || note.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Folder Tree */}
        {!searchQuery && !showStarredOnly && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-ev-text-muted uppercase tracking-wider">
              <span>Pastas</span>
              <button
                onClick={() => setNewFolderModal({ open: true, parentId: null, name: '' })}
                className="text-ev-text-muted hover:text-ev-mauve p-0.5"
                title="Criar pasta"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-0.5">
              {folders.map((folder) => {
                const isExpanded = !!expandedFolders[folder.id];
                const folderNotesCount = notes.filter(
                  (n) => n.folderId === folder.id && !n.deletedAt
                ).length;
                const isDragOver = dragOverFolderId === folder.id;

                return (
                  <div
                    key={folder.id}
                    onDragOver={(e) => handleDragOver(e, folder.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder.id)}
                    className="space-y-0.5"
                  >
                    <div
                      onClick={() => {
                        if (setActiveFolder) {
                          setActiveFolder(activeFolderId === folder.id ? null : folder.id);
                        }
                      }}
                      onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                        isDragOver
                          ? 'bg-ev-accent/20 border border-dashed border-ev-accent'
                          : activeFolderId === folder.id
                          ? 'bg-ev-bg-surface text-ev-accent font-medium'
                          : 'text-ev-text-secondary hover:bg-ev-bg-hover hover:text-ev-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          onClick={(e) => toggleFolder(folder.id, e)}
                          className="p-0.5 text-ev-text-muted hover:text-ev-text-primary rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        <Folder className="w-3.5 h-3.5 text-ev-mauve flex-shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-ev-text-muted font-mono">
                          {folderNotesCount}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateNote(folder.id);
                          }}
                          title="Criar nota nesta pasta"
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-ev-text-muted hover:text-ev-accent transition-opacity"
                        >
                          <FilePlus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-items inside expanded folder */}
                    {isExpanded && (
                      <div className="pl-5 space-y-0.5 border-l border-ev-border/50 ml-3">
                        {notes
                          .filter((n) => n.folderId === folder.id && !n.deletedAt)
                          .map((note) => (
                            <div
                              key={note.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, note.id)}
                              onClick={() => handleSelectNote(note)}
                              onContextMenu={(e) => handleContextMenu(e, 'note', note.id)}
                              className={`group flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                                activeNoteId === note.id
                                  ? 'bg-ev-bg-surface text-ev-accent font-medium'
                                  : 'text-ev-text-secondary hover:bg-ev-bg-hover hover:text-ev-text-primary'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <FileText className="w-3 h-3 text-ev-text-muted group-hover:text-ev-accent flex-shrink-0" />
                                <span className="truncate">{note.title || 'Sem título'}</span>
                              </div>
                              {note.starred && (
                                <Star className="w-2.5 h-2.5 text-ev-yellow fill-ev-yellow flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        {folderNotesCount === 0 && (
                          <div className="text-[11px] text-ev-text-muted py-1 italic">
                            Pasta vazia
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Note List Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-ev-text-muted uppercase tracking-wider">
            <span>
              {searchQuery
                ? 'Resultados da Busca'
                : showStarredOnly
                ? 'Notas Favoritas'
                : activeFolderId
                ? 'Notas na Pasta'
                : 'Todas as Notas'}
            </span>
            <span className="text-[10px] text-ev-text-muted font-mono">
              {filteredNotes.length}
            </span>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="text-center py-6 px-3">
              <FileText className="w-8 h-8 mx-auto text-ev-text-muted/40 mb-2" />
              <p className="text-xs text-ev-text-muted">Nenhuma nota encontrada</p>
              <button
                onClick={() => handleCreateNote(activeFolderId)}
                className="mt-2 text-xs text-ev-accent hover:underline font-medium"
              >
                + Criar uma nota agora
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotes.map((note) => {
                const isActive = activeNoteId === note.id;
                const snippet = getCleanSnippet(note.content);

                return (
                  <div
                    key={note.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, note.id)}
                    onClick={() => handleSelectNote(note)}
                    onContextMenu={(e) => handleContextMenu(e, 'note', note.id)}
                    className={`group relative p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-ev-bg-surface border-ev-accent/40 shadow-sm'
                        : 'bg-ev-bg-tertiary/60 border-ev-border/60 hover:border-ev-border-hover hover:bg-ev-bg-hover/50'
                    }`}
                  >
                    {/* Active accent strip */}
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-ev-accent rounded-r" />
                    )}

                    <div className="flex items-start justify-between gap-1.5 mb-1 pl-1">
                      <h3
                        className={`text-xs font-semibold truncate ${
                          isActive ? 'text-ev-accent' : 'text-ev-text-primary'
                        }`}
                      >
                        {note.title || 'Sem título'}
                      </h3>
                      <button
                        onClick={(e) => handleToggleStar(e, note.id)}
                        className="text-ev-text-muted hover:text-ev-yellow p-0.5 flex-shrink-0 transition-colors"
                        title={note.starred ? 'Desfavoritar' : 'Favoritar'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            note.starred
                              ? 'text-ev-yellow fill-ev-yellow'
                              : 'text-ev-text-muted/50 group-hover:text-ev-text-muted'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Preview snippet */}
                    <p className="text-[11px] text-ev-text-muted line-clamp-2 leading-relaxed mb-1.5 pl-1">
                      {snippet}
                    </p>

                    {/* Footer: Date and tags */}
                    <div className="flex items-center justify-between text-[10px] text-ev-text-muted pl-1 pt-1 border-t border-ev-border/30">
                      <span>{formatRelativeTime(note.updatedAt || note.createdAt)}</span>
                      {note.tags && Array.isArray(note.tags) && note.tags.length > 0 && (
                        <div className="flex items-center gap-1 max-w-[120px] overflow-hidden">
                          {note.tags.slice(0, 2).map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 bg-ev-mauve/10 text-ev-mauve rounded text-[9px] font-mono truncate"
                            >
                              #{t.replace(/^#/, '')}
                            </span>
                          ))}
                          {note.tags.length > 2 && (
                            <span className="text-[9px] text-ev-text-muted">
                              +{note.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6. Trash Section at Bottom */}
      <div className="p-2 border-t border-ev-border bg-ev-bg-secondary/90">
        <button
          onClick={() => setShowTrashSection(!showTrashSection)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-ev-text-secondary hover:bg-ev-bg-hover hover:text-ev-text-primary transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5 text-ev-red/80" />
            <span>Lixeira</span>
          </div>
          <span className="text-[11px] text-ev-text-muted font-mono">{trash.length}</span>
        </button>

        {showTrashSection && (
          <div className="mt-2 p-2 bg-ev-bg-tertiary rounded-md border border-ev-border max-h-48 overflow-y-auto custom-scrollbar space-y-1">
            <div className="flex items-center justify-between pb-1 border-b border-ev-border/40 text-[10px]">
              <span className="text-ev-text-muted font-medium uppercase">Itens Deletados</span>
              {trash.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja esvaziar a lixeira permanentemente?')) {
                      if (emptyTrash) emptyTrash();
                    }
                  }}
                  className="text-ev-red hover:underline font-semibold"
                >
                  Esvaziar
                </button>
              )}
            </div>

            {trash.length === 0 ? (
              <p className="text-[11px] text-ev-text-muted text-center py-3 italic">
                A lixeira está vazia
              </p>
            ) : (
              trash.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-1.5 rounded bg-ev-bg-surface/50 hover:bg-ev-bg-hover text-xs group"
                >
                  <span className="truncate text-ev-text-secondary max-w-[120px]">
                    {item.title || 'Sem título'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => restoreFromTrash && restoreFromTrash(item.id)}
                      title="Restaurar nota"
                      className="p-1 text-ev-text-muted hover:text-ev-green rounded"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteNote && deleteNote(item.id)}
                      title="Deletar permanentemente"
                      className="p-1 text-ev-text-muted hover:text-ev-red rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 7. Resizable Drag Handle on Right Edge */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-ev-accent/50 active:bg-ev-accent transition-colors z-30"
        title="Arrastar para redimensionar"
      />

      {/* 8. Context Menu (Floating) */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 min-w-[160px] bg-ev-bg-surface border border-ev-border rounded-lg shadow-xl py-1 text-xs text-ev-text-primary animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'note' && (
            <>
              <button
                onClick={() => {
                  const note = notes.find((n) => n.id === contextMenu.targetId);
                  setContextMenu(null);
                  setRenameModal({
                    open: true,
                    type: 'note',
                    id: contextMenu.targetId,
                    title: note?.title || '',
                  });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ev-bg-hover text-left"
              >
                <Edit2 className="w-3.5 h-3.5 text-ev-accent" />
                <span>Renomear</span>
              </button>

              <button
                onClick={() => {
                  handleToggleStar({ stopPropagation: () => {} }, contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ev-bg-hover text-left"
              >
                <Star className="w-3.5 h-3.5 text-ev-yellow" />
                <span>Favoritar / Desfavoritar</span>
              </button>

              <button
                onClick={() => {
                  setMoveModal({ open: true, noteId: contextMenu.targetId });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ev-bg-hover text-left"
              >
                <FolderInput className="w-3.5 h-3.5 text-ev-mauve" />
                <span>Mover para pasta...</span>
              </button>

              <div className="my-1 border-t border-ev-border/50" />

              <button
                onClick={() => {
                  if (moveToTrash) {
                    moveToTrash(contextMenu.targetId);
                  } else if (deleteNote) {
                    deleteNote(contextMenu.targetId);
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ev-red/20 text-ev-red text-left"
              >
                <Trash2 className="w-3.5 h-3.5 text-ev-red" />
                <span>Mover para Lixeira</span>
              </button>
            </>
          )}

          {contextMenu.type === 'folder' && (
            <>
              <button
                onClick={() => {
                  handleCreateNote(contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ev-bg-hover text-left"
              >
                <FilePlus className="w-3.5 h-3.5 text-ev-accent" />
                <span>Nova Nota nesta pasta</span>
              </button>

              <button
                onClick={() => {
                  const folder = folders.find((f) => f.id === contextMenu.targetId);
                  setContextMenu(null);
                  setRenameModal({
                    open: true,
                    type: 'folder',
                    id: contextMenu.targetId,
                    title: folder?.name || '',
                  });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ev-bg-hover text-left"
              >
                <Edit2 className="w-3.5 h-3.5 text-ev-mauve" />
                <span>Renomear Pasta</span>
              </button>

              <div className="my-1 border-t border-ev-border/50" />

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Deseja excluir esta pasta? As notas contidas nela serão mantidas na raiz.'
                    )
                  ) {
                    if (deleteFolder) deleteFolder(contextMenu.targetId);
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ev-red/20 text-ev-red text-left"
              >
                <Trash2 className="w-3.5 h-3.5 text-ev-red" />
                <span>Excluir Pasta</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {/* 1. Rename Modal */}
      {renameModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-ev-bg-surface border border-ev-border rounded-xl p-4 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-ev-text-primary mb-2">
              Renomear {renameModal.type === 'note' ? 'Nota' : 'Pasta'}
            </h3>
            <input
              type="text"
              autoFocus
              value={renameModal.title}
              onChange={(e) => setRenameModal({ ...renameModal, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (renameModal.type === 'note' && updateNote) {
                    updateNote(renameModal.id, { title: renameModal.title });
                  } else if (renameModal.type === 'folder' && updateFolder) {
                    updateFolder(renameModal.id, { name: renameModal.title });
                  }
                  setRenameModal({ open: false, type: 'note', id: null, title: '' });
                } else if (e.key === 'Escape') {
                  setRenameModal({ open: false, type: 'note', id: null, title: '' });
                }
              }}
              className="w-full bg-ev-bg-tertiary border border-ev-border rounded-lg px-3 py-2 text-xs text-ev-text-primary outline-none focus:border-ev-accent mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameModal({ open: false, type: 'note', id: null, title: '' })}
                className="px-3 py-1.5 rounded-lg text-xs text-ev-text-secondary hover:bg-ev-bg-hover"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (renameModal.type === 'note' && updateNote) {
                    updateNote(renameModal.id, { title: renameModal.title });
                  } else if (renameModal.type === 'folder' && updateFolder) {
                    updateFolder(renameModal.id, { name: renameModal.title });
                  }
                  setRenameModal({ open: false, type: 'note', id: null, title: '' });
                }}
                className="px-3 py-1.5 rounded-lg text-xs bg-ev-accent text-ev-bg-tertiary font-semibold hover:bg-ev-accent-hover"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. New Folder Modal */}
      {newFolderModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-ev-bg-surface border border-ev-border rounded-xl p-4 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-ev-text-primary mb-2">Criar Nova Pasta</h3>
            <input
              type="text"
              autoFocus
              placeholder="Nome da pasta"
              value={newFolderModal.name}
              onChange={(e) => setNewFolderModal({ ...newFolderModal, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderModal.name.trim()) {
                  if (createFolder) {
                    createFolder(newFolderModal.name.trim(), newFolderModal.parentId);
                  }
                  setNewFolderModal({ open: false, parentId: null, name: '' });
                } else if (e.key === 'Escape') {
                  setNewFolderModal({ open: false, parentId: null, name: '' });
                }
              }}
              className="w-full bg-ev-bg-tertiary border border-ev-border rounded-lg px-3 py-2 text-xs text-ev-text-primary outline-none focus:border-ev-mauve mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNewFolderModal({ open: false, parentId: null, name: '' })}
                className="px-3 py-1.5 rounded-lg text-xs text-ev-text-secondary hover:bg-ev-bg-hover"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (newFolderModal.name.trim() && createFolder) {
                    createFolder(newFolderModal.name.trim(), newFolderModal.parentId);
                  }
                  setNewFolderModal({ open: false, parentId: null, name: '' });
                }}
                className="px-3 py-1.5 rounded-lg text-xs bg-ev-mauve text-ev-bg-tertiary font-semibold hover:opacity-90"
              >
                Criar Pasta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Move Note Modal */}
      {moveModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-ev-bg-surface border border-ev-border rounded-xl p-4 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-ev-text-primary mb-3">
              Mover nota para uma pasta
            </h3>
            <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar mb-4">
              <button
                onClick={() => {
                  if (updateNote) updateNote(moveModal.noteId, { folderId: null });
                  setMoveModal({ open: false, noteId: null });
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-ev-bg-hover text-xs text-ev-text-primary flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-ev-accent" />
                <span>Raiz (Sem pasta)</span>
              </button>

              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    if (updateNote) updateNote(moveModal.noteId, { folderId: f.id });
                    setMoveModal({ open: false, noteId: null });
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-ev-bg-hover text-xs text-ev-text-primary flex items-center gap-2"
                >
                  <Folder className="w-4 h-4 text-ev-mauve" />
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setMoveModal({ open: false, noteId: null })}
                className="px-3 py-1.5 rounded-lg text-xs text-ev-text-secondary hover:bg-ev-bg-hover"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
