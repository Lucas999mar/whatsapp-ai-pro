import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  FilePlus,
  FolderPlus,
  Trash2,
  Share2,
  PanelLeft,
  Columns,
  Eye,
  PenTool,
  Download,
  Upload,
  Moon,
  Sun,
  Star,
  Link2,
  Layers,
  ArrowRight,
  FileText,
  X,
  Sparkles
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';

export function CommandPalette({ isOpen, onClose }) {
  const {
    notes = [],
    activeNoteId,
    createNote,
    createFolder,
    deleteNote,
    moveToTrash,
    toggleSidebar,
    sidebarOpen,
    editorMode = 'edit',
    setEditorMode,
    toggleGraphView,
    toggleBacklinks,
    showBacklinks,
    setActiveNote,
    openTab,
    closeTab,
    closeAllTabs,
    setSearchQuery,
    starNote,
    emptyTrash,
    showCommandPalette,
    toggleCommandPalette,
  } = useNoteStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId),
    [notes, activeNoteId]
  );

  const isPaletteOpen = isOpen !== undefined ? isOpen : showCommandPalette;

  const handleClose = () => {
    setQuery('');
    setSelectedIndex(0);
    if (onClose) onClose();
    else if (toggleCommandPalette) toggleCommandPalette();
  };

  // Export Active Note as .md file
  const handleExportNote = () => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeNote.title || 'nota').replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    handleClose();
  };

  // Import notes from files
  const handleImportFiles = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const title = file.name.replace(/\.[^/.]+$/, '');
        if (createNote) {
          createNote(null, {
            title,
            content,
          });
        }
      };
      reader.readAsText(file);
    });

    handleClose();
  };

  // Toggle Dark / Light mode (adds/removes 'dark' class on documentElement)
  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    handleClose();
  };

  // Define All Built-in Commands
  const commands = useMemo(() => {
    const baseList = [
      // Category: Notes
      {
        id: 'new-note',
        title: 'Criar Nova Nota',
        description: 'Cria uma nova nota em branco',
        category: 'Notes',
        icon: FilePlus,
        shortcut: 'Ctrl+N',
        action: () => {
          if (createNote) {
            createNote(null, { title: 'Nova Nota' }).then((n) => {
              if (n?.id) {
                if (setActiveNote) setActiveNote(n.id);
                if (openTab) openTab(n.id);
              }
            });
          }
        },
      },
      {
        id: 'new-folder',
        title: 'Criar Nova Pasta',
        description: 'Cria uma pasta para organizar notas',
        category: 'Notes',
        icon: FolderPlus,
        shortcut: '',
        action: () => {
          const name = window.prompt('Nome da nova pasta:');
          if (name?.trim() && createFolder) {
            createFolder(name.trim());
          }
        },
      },
      {
        id: 'star-note',
        title: activeNote?.starred ? 'Desfavoritar Nota Atual' : 'Favoritar Nota Atual',
        description: 'Marca ou desmarca a nota ativa como favorita',
        category: 'Notes',
        icon: Star,
        shortcut: '',
        disabled: !activeNote,
        action: () => {
          if (activeNote && starNote) starNote(activeNote.id);
        },
      },
      {
        id: 'delete-note',
        title: 'Excluir Nota Atual',
        description: 'Move a nota atual para a lixeira',
        category: 'Notes',
        icon: Trash2,
        shortcut: 'Del',
        disabled: !activeNote,
        action: () => {
          if (activeNote) {
            if (moveToTrash) moveToTrash(activeNote.id);
            else if (deleteNote) deleteNote(activeNote.id);
          }
        },
      },
      {
        id: 'export-note',
        title: 'Exportar Nota Atual (.md)',
        description: 'Baixa a nota ativa como arquivo Markdown',
        category: 'Notes',
        icon: Download,
        shortcut: '',
        disabled: !activeNote,
        action: handleExportNote,
      },
      {
        id: 'import-notes',
        title: 'Importar Notas (.md / .txt)',
        description: 'Importa arquivos de texto para o workspace',
        category: 'Notes',
        icon: Upload,
        shortcut: '',
        action: () => {
          if (fileInputRef.current) fileInputRef.current.click();
        },
      },

      // Category: View
      {
        id: 'toggle-graph',
        title: 'Alternar Visualização em Grafo',
        description: 'Abre o grafo de conexões interativo',
        category: 'View',
        icon: Share2,
        shortcut: 'Ctrl+Shift+G',
        action: () => {
          if (toggleGraphView) toggleGraphView();
        },
      },
      {
        id: 'toggle-sidebar',
        title: sidebarOpen ? 'Recolher Barra Lateral' : 'Expandir Barra Lateral',
        description: 'Mostra ou oculta a barra lateral de navegação',
        category: 'View',
        icon: PanelLeft,
        shortcut: 'Ctrl+B',
        action: () => {
          if (toggleSidebar) toggleSidebar();
        },
      },
      {
        id: 'mode-edit',
        title: 'Modo de Edição: Apenas Editor',
        description: 'Exibe apenas o editor de código Markdown',
        category: 'View',
        icon: PenTool,
        shortcut: '',
        action: () => {
          if (setEditorMode) setEditorMode('edit');
        },
      },
      {
        id: 'mode-split',
        title: 'Modo de Edição: Dividido (Split)',
        description: 'Exibe o editor e a pré-visualização lado a lado',
        category: 'View',
        icon: Columns,
        shortcut: '',
        action: () => {
          if (setEditorMode) setEditorMode('split');
        },
      },
      {
        id: 'mode-preview',
        title: 'Modo de Edição: Apenas Pré-visualização',
        description: 'Exibe apenas a pré-visualização formatada',
        category: 'View',
        icon: Eye,
        shortcut: '',
        action: () => {
          if (setEditorMode) setEditorMode('preview');
        },
      },
      {
        id: 'toggle-backlinks',
        title: showBacklinks ? 'Ocultar Painel de Backlinks' : 'Exibir Painel de Backlinks',
        description: 'Painel com notas que referenciam a nota atual',
        category: 'View',
        icon: Link2,
        shortcut: '',
        action: () => {
          if (toggleBacklinks) toggleBacklinks();
        },
      },

      // Category: Navigation
      {
        id: 'search-notes',
        title: 'Pesquisar em Todas as Notas',
        description: 'Foca no campo de busca da barra lateral',
        category: 'Navigation',
        icon: Search,
        shortcut: 'Ctrl+F',
        action: () => {
          if (!sidebarOpen && toggleSidebar) toggleSidebar();
          const searchInput = document.querySelector('aside input');
          if (searchInput) searchInput.focus();
        },
      },
      {
        id: 'close-tab',
        title: 'Fechar Aba Atual',
        description: 'Fecha a aba da nota aberta',
        category: 'Navigation',
        icon: X,
        shortcut: 'Ctrl+W',
        disabled: !activeNoteId,
        action: () => {
          if (activeNoteId && closeTab) closeTab(activeNoteId);
        },
      },
      {
        id: 'close-all-tabs',
        title: 'Fechar Todas as Abas',
        description: 'Fecha todas as notas abertas',
        category: 'Navigation',
        icon: Layers,
        shortcut: '',
        action: () => {
          if (closeAllTabs) closeAllTabs();
        },
      },

      // Category: Actions
      {
        id: 'toggle-theme',
        title: 'Alternar Tema Escuro / Claro',
        description: 'Alterna a aparência visual do aplicativo',
        category: 'Actions',
        icon: Moon,
        shortcut: '',
        action: handleToggleTheme,
      },
      {
        id: 'empty-trash',
        title: 'Esvaziar Lixeira',
        description: 'Remove definitivamente todos os itens deletados',
        category: 'Actions',
        icon: Trash2,
        shortcut: '',
        action: () => {
          if (window.confirm('Esvaziar lixeira permanentemente?')) {
            if (emptyTrash) emptyTrash();
          }
        },
      },
    ];

    return baseList.filter((c) => !c.disabled);
  }, [
    activeNote,
    activeNoteId,
    sidebarOpen,
    editorMode,
    showBacklinks,
    createNote,
    createFolder,
    deleteNote,
    moveToTrash,
    toggleSidebar,
    setEditorMode,
    toggleGraphView,
    toggleBacklinks,
    setActiveNote,
    openTab,
    closeTab,
    closeAllTabs,
    starNote,
    emptyTrash,
  ]);

  // Combined & Filtered Items (Notes matching query + Commands matching query)
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Matching Notes
    const validNotes = notes.filter((n) => !n.deletedAt);
    const matchingNotes = validNotes
      .filter((n) => {
        if (!q) return true;
        return (
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
        );
      })
      .slice(0, 6)
      .map((note) => ({
        id: `note-${note.id}`,
        title: note.title || 'Sem título',
        description: note.content ? note.content.slice(0, 60).replace(/[#*`[\]]/g, '') : '',
        category: 'Notas',
        icon: FileText,
        shortcut: 'Nota',
        isNote: true,
        action: () => {
          if (setActiveNote) setActiveNote(note.id);
          if (openTab) openTab(note.id);
        },
      }));

    // 2. Matching Commands
    const matchingCommands = commands.filter((cmd) => {
      if (!q) return true;
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
      );
    });

    return [...matchingNotes, ...matchingCommands];
  }, [notes, commands, query, setActiveNote, openTab]);

  // Keyboard navigation inside Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPaletteOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev - 1 < 0 ? (filteredItems.length || 1) - 1 : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          handleClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaletteOpen, filteredItems, selectedIndex]);

  // Auto focus input on open
  useEffect(() => {
    if (isPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isPaletteOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4 select-none animate-fade-in"
      onClick={handleClose}
    >
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt"
        multiple
        onChange={handleImportFiles}
        className="hidden"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-ev-bg-surface border border-ev-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[520px] animate-scale-in"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-ev-border/80 bg-ev-bg-secondary/60">
          <Search className="w-5 h-5 text-ev-accent mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite um comando ou busque uma nota..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-ev-text-primary placeholder:text-ev-text-muted outline-none"
          />
          <button
            onClick={handleClose}
            className="p-1 text-ev-text-muted hover:text-ev-text-primary rounded-md ml-2"
          >
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-ev-bg-tertiary border border-ev-border rounded">
              ESC
            </span>
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar text-xs"
        >
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-ev-text-muted space-y-1">
              <p>Nenhum comando ou nota encontrada para "{query}"</p>
              <p className="text-[11px] text-ev-text-muted/60">
                Tente buscar por palavras-chave ou crie uma nova nota
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  data-selected={isSelected}
                  onClick={() => {
                    item.action();
                    handleClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-ev-accent/15 text-ev-text-primary border border-ev-accent/30 shadow-sm'
                      : 'text-ev-text-secondary hover:bg-ev-bg-hover/60 hover:text-ev-text-primary border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 ${
                        isSelected
                          ? 'bg-ev-accent text-ev-bg-tertiary shadow-sm'
                          : 'bg-ev-bg-tertiary text-ev-text-muted group-hover:text-ev-accent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ev-text-primary truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-ev-bg-surface text-ev-text-muted rounded border border-ev-border/60 uppercase tracking-wider font-mono">
                          {item.category}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-ev-text-muted truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shortcut or navigation cue */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {item.shortcut ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-ev-bg-tertiary border border-ev-border text-ev-text-muted rounded shadow-sm">
                        {item.shortcut}
                      </span>
                    ) : (
                      isSelected && (
                        <ArrowRight className="w-3.5 h-3.5 text-ev-accent animate-pulse" />
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between px-4 py-2 bg-ev-bg-secondary/70 border-t border-ev-border/70 text-[11px] text-ev-text-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-ev-bg-surface border border-ev-border rounded text-[10px]">
                ↑↓
              </kbd>{' '}
              Navegar
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-ev-bg-surface border border-ev-border rounded text-[10px]">
                Enter
              </kbd>{' '}
              Executar
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-ev-bg-surface border border-ev-border rounded text-[10px]">
                Esc
              </kbd>{' '}
              Fechar
            </span>
          </div>
          <span className="text-[10px] text-ev-accent flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3" />
            Evoluir Notes
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
