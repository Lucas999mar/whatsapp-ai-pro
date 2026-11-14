import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, Decoration, ViewPlugin, MatchDecorator } from '@codemirror/view';
import {
  Bold,
  Italic,
  Heading,
  Link,
  Image,
  Code,
  List,
  CheckSquare,
  Table,
  FilePlus,
  Command,
  Save,
  Clock,
  Type,
  FileText,
  Sparkles,
  Link2,
  Quote,
  Eye,
  PenTool,
  Columns,
  Search,
  X
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';

// Custom decoration for Wiki-links [[Note Name]]
const wikiLinkDecorator = new MatchDecorator({
  regexp: /\[\[([^\]]+)\]\]/g,
  decoration: () =>
    Decoration.mark({
      class: 'cm-wikilink',
    }),
});

const wikiLinkPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = wikiLinkDecorator.createDeco(view);
    }
    update(update) {
      this.decorations = wikiLinkDecorator.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: (instance) => instance.decorations,
  }
);

// Custom decoration for Tags #tagname
const tagDecorator = new MatchDecorator({
  regexp: /(?:^|\s)(#[a-zA-Z0-9_\-\/]+)/g,
  decoration: () =>
    Decoration.mark({
      class: 'cm-hashtag',
    }),
});

const tagPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = tagDecorator.createDeco(view);
    }
    update(update) {
      this.decorations = tagDecorator.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: (instance) => instance.decorations,
  }
);

// Custom theme tailored to Catppuccin Mocha / ev-* Tailwind palette
const evCustomTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#1e1e2e',
      color: '#cdd6f4',
      height: '100%',
      fontSize: '14px',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
    },
    '.cm-content': {
      caretColor: '#89b4fa',
      padding: '20px 24px',
      lineHeight: '1.7',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#89b4fa',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: '#45475a !important',
    },
    '.cm-gutters': {
      backgroundColor: '#181825',
      color: '#6c7086',
      borderRight: '1px solid #313244',
      paddingRight: '8px',
      fontFamily: 'inherit',
    },
    '.cm-activeLine': {
      backgroundColor: '#25253650',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#252536',
      color: '#89b4fa',
    },
    '.cm-wikilink': {
      color: '#89b4fa !important',
      textDecoration: 'underline',
      textDecorationColor: '#89b4fa60',
      fontWeight: '600',
      backgroundColor: '#89b4fa18',
      padding: '1px 4px',
      borderRadius: '3px',
      cursor: 'pointer',
    },
    '.cm-hashtag': {
      color: '#cba6f7 !important',
      fontWeight: '600',
      backgroundColor: '#cba6f718',
      padding: '1px 4px',
      borderRadius: '3px',
    },
  },
  { dark: true }
);

export function Editor() {
  const {
    notes = [],
    activeNoteId,
    updateNote,
    createNote,
    editorMode = 'edit',
    setEditorMode,
    toggleCommandPalette,
    toggleBacklinks,
    showBacklinks,
  } = useNoteStore();

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId),
    [notes, activeNoteId]
  );

  const [localContent, setLocalContent] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('Salvo'); // 'Salvo' | 'Salvando...'
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSearchText, setLinkSearchText] = useState('');
  const debounceTimerRef = useRef(null);
  const editorViewRef = useRef(null);

  // Sync state when active note changes
  useEffect(() => {
    if (activeNote) {
      setLocalContent(activeNote.content || '');
      setLocalTitle(activeNote.title || '');
      setSaveStatus('Salvo');
    } else {
      setLocalContent('');
      setLocalTitle('');
    }
  }, [activeNote?.id]);

  // Debounced Auto-Save
  const triggerDebouncedSave = useCallback(
    (newContent, newTitle) => {
      if (!activeNote) return;
      setSaveStatus('Salvando...');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (updateNote && activeNote) {
          // Extract tags from content automatically
          const foundTags = Array.from(
            new Set((newContent.match(/(?:^|\s)#([a-zA-Z0-9_\-\/]+)/g) || []).map((t) => t.trim()))
          );

          updateNote(activeNote.id, {
            content: newContent,
            title: newTitle,
            tags: foundTags,
            updatedAt: new Date().toISOString(),
          });
        }
        setSaveStatus('Salvo');
      }, 500);
    },
    [activeNote, updateNote]
  );

  // Handle content change from CodeMirror
  const handleContentChange = useCallback(
    (val) => {
      setLocalContent(val);
      triggerDebouncedSave(val, localTitle);
    },
    [localTitle, triggerDebouncedSave]
  );

  // Handle Title change
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setLocalTitle(val);
    triggerDebouncedSave(localContent, val);
  };

  // Text insertion helper for Toolbar buttons
  const insertFormatting = (prefix, suffix = '', defaultText = '') => {
    const view = editorViewRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;

    view.dispatch({
      changes: { from, to, insert: replacement },
      selection: {
        anchor: from + prefix.length,
        head: from + prefix.length + selectedText.length,
      },
    });
    view.focus();
  };

  // Metrics
  const stats = useMemo(() => {
    const text = localContent.trim();
    if (!text) return { words: 0, chars: 0, readTime: 0 };
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readTime };
  }, [localContent]);

  // Extensions list
  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      oneDark,
      evCustomTheme,
      wikiLinkPlugin,
      tagPlugin,
      EditorView.lineWrapping,
    ],
    []
  );

  // Empty State when no note is selected
  if (!activeNote) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-ev-bg-primary text-ev-text-muted p-8 select-none">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-ev-mauve/20 via-ev-accent/20 to-ev-teal/20 border border-ev-border flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-ev-accent" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-ev-text-primary">
              Bem-vindo ao Evoluir Notes
            </h2>
            <p className="text-sm text-ev-text-muted">
              Crie notas conectadas com links bidirecionais [[wiki]], tags # e visualização em grafo.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => createNote && createNote(null, { title: 'Nova Nota' })}
              className="flex items-center gap-2 px-4 py-2 bg-ev-accent text-ev-bg-tertiary rounded-lg font-medium text-xs hover:bg-ev-accent-hover transition-colors shadow-lg"
            >
              <FilePlus className="w-4 h-4" />
              <span>Criar Nova Nota</span>
            </button>
            <button
              onClick={() => toggleCommandPalette && toggleCommandPalette()}
              className="flex items-center gap-2 px-4 py-2 bg-ev-bg-surface hover:bg-ev-bg-hover text-ev-text-primary rounded-lg font-medium text-xs border border-ev-border transition-colors"
            >
              <Command className="w-4 h-4 text-ev-mauve" />
              <span>Paleta de Comandos</span>
            </button>
          </div>

          <div className="pt-6 grid grid-cols-2 gap-2 text-left text-xs bg-ev-bg-secondary/60 p-4 rounded-xl border border-ev-border/50">
            <div className="flex items-center gap-2 text-ev-text-secondary">
              <span className="px-1.5 py-0.5 bg-ev-bg-surface border border-ev-border rounded text-[10px] font-mono">
                Ctrl + N
              </span>
              <span>Nova Nota</span>
            </div>
            <div className="flex items-center gap-2 text-ev-text-secondary">
              <span className="px-1.5 py-0.5 bg-ev-bg-surface border border-ev-border rounded text-[10px] font-mono">
                Ctrl + P
              </span>
              <span>Comandos</span>
            </div>
            <div className="flex items-center gap-2 text-ev-text-secondary">
              <span className="px-1.5 py-0.5 bg-ev-bg-surface border border-ev-border rounded text-[10px] font-mono">
                [[Link]]
              </span>
              <span>Conectar Notas</span>
            </div>
            <div className="flex items-center gap-2 text-ev-text-secondary">
              <span className="px-1.5 py-0.5 bg-ev-bg-surface border border-ev-border rounded text-[10px] font-mono">
                #Tag
              </span>
              <span>Categorizar</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-ev-bg-primary overflow-hidden">
      {/* 1. Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-ev-bg-secondary border-b border-ev-border/70 flex-shrink-0 text-ev-text-secondary">
        {/* Markdown Action Buttons */}
        <div className="flex items-center gap-0.5 flex-wrap">
          <button
            onClick={() => insertFormatting('**', '**', 'negrito')}
            title="Negrito (**texto**)"
            className="p-1.5 rounded hover:bg-ev-bg-hover hover:text-ev-accent transition-colors"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('*', '*', 'itálico')}
            title="Itálico (*texto*)"
            className="p-1.5 rounded hover:bg-ev-bg-hover hover:text-ev-accent transition-colors"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('### ', '', 'Título')}
            title="Título (### Título)"
            className="p-1.5 rounded hover:bg-ev-bg-hover hover:text-ev-accent transition-colors"
          >
            <Heading className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-ev-border mx-1" />

          <button
            onClick={() => setIsLinkModalOpen(true)}
            title="Conectar com outra nota ([[Wiki-link]])"
            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 transition-all flex items-center gap-1 font-bold text-xs"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>[[ Link de Nota ]]</span>
          </button>
          <button
            onClick={() => insertFormatting('[', '](https://)', 'texto do link')}
            title="Link Externo"
            className="p-1.5 rounded hover:bg-ev-bg-hover hover:text-ev-accent transition-colors"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('![', '](https://)', 'imagem')}
            title="Imagem"
            className="p-1.5 rounded hover:bg-ev-bg-hover hover:text-ev-accent transition-colors"
          >
            <Image className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-ev-border mx-1" />

          <button
            onClick={() => insertFormatting('```\n', '\n```', 'código')}
            title="Bloco de Código"
            className="p-1.5 rounded hover:bg-ev-bg-hover hover:text-ev-mauve transition-colors"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('- ', '', 'item da lista')}
            title="Lista com marcadores"
            className="p-1.5 rounded hover:bg-ev-bg-hover hover:text-ev-text-primary transition-colors"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('- [ ] ', '', 'tarefa a fazer')}
            title="Lista de Tarefas"
            className="p-1.5 rounded hover:bg-ev-bg-hover hover:text-ev-green transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting('> ', '', 'citação')}
            title="Citação"
            className="p-1.5 rounded hover:bg-ev-bg-hover hover:text-ev-text-primary transition-colors"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              insertFormatting(
                '| Coluna 1 | Coluna 2 |\n|---|---|\n| Item 1 | Item 2 |\n',
                '',
                ''
              )
            }
            title="Tabela Markdown"
            className="p-1.5 rounded hover:bg-ev-bg-hover hover:text-ev-text-primary transition-colors"
          >
            <Table className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode & Save Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-ev-bg-surface text-ev-text-muted text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                saveStatus === 'Salvo' ? 'bg-ev-green' : 'bg-ev-yellow animate-pulse'
              }`}
            />
            <span>{saveStatus}</span>
          </div>

          {setEditorMode && (
            <div className="flex items-center bg-ev-bg-surface p-0.5 rounded-lg border border-ev-border">
              <button
                onClick={() => setEditorMode('edit')}
                title="Apenas Editor"
                className={`p-1 rounded ${
                  editorMode === 'edit'
                    ? 'bg-ev-accent text-ev-bg-tertiary font-bold'
                    : 'text-ev-text-muted hover:text-ev-text-primary'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
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
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditorMode('preview')}
                title="Apenas Visualização"
                className={`p-1 rounded ${
                  editorMode === 'preview'
                    ? 'bg-ev-accent text-ev-bg-tertiary font-bold'
                    : 'text-ev-text-muted hover:text-ev-text-primary'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Note Title Input */}
      <div className="px-8 pt-6 pb-2 bg-ev-bg-primary flex-shrink-0">
        <input
          type="text"
          value={localTitle}
          onChange={handleTitleChange}
          placeholder="Título da Nota..."
          className="w-full text-2xl font-bold bg-transparent border-none outline-none text-ev-text-primary placeholder:text-ev-text-muted/50 tracking-tight"
        />
        {activeNote.tags && activeNote.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {activeNote.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-ev-mauve/15 text-ev-mauve border border-ev-mauve/25"
              >
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. CodeMirror Area */}
      <div className="flex-1 overflow-hidden relative">
        <CodeMirror
          ref={editorViewRef}
          value={localContent}
          height="100%"
          extensions={extensions}
          onChange={handleContentChange}
          theme={oneDark}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
          }}
          className="h-full text-sm"
        />
      </div>

      {/* 4. Status Bar at Bottom */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-ev-bg-secondary border-t border-ev-border/60 text-[11px] text-ev-text-muted flex-shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Type className="w-3 h-3 text-ev-accent" />
            <span>{stats.words} palavras</span>
          </span>
          <span className="text-ev-border">•</span>
          <span>{stats.chars} caracteres</span>
          <span className="text-ev-border">•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-ev-mauve" />
            <span>{stats.readTime} min de leitura</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {toggleBacklinks && (
            <button
              onClick={() => toggleBacklinks()}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                showBacklinks
                  ? 'bg-ev-accent/20 text-ev-accent font-medium'
                  : 'hover:bg-ev-bg-hover text-ev-text-muted hover:text-ev-text-primary'
              }`}
            >
              <Link2 className="w-3 h-3" />
              <span>Backlinks</span>
            </button>
          )}
          <span className="text-ev-text-muted/60 font-mono">Markdown (UTF-8)</span>
        </div>
      </div>

      {/* Modal Selecionar Nota para Link Wiki [[ ]] */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181825] border border-emerald-500/30 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-3 animate-scale-in text-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Link2 size={16} />
                </div>
                <h3 className="text-xs font-bold text-white">Inserir Link para Nota</h3>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar nota para conectar..."
                value={linkSearchText}
                onChange={(e) => setLinkSearchText(e.target.value)}
                className="w-full bg-[#11111b] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
              {notes
                .filter((n) => !n.isTrash && !n.deletedAt && n.id !== activeNoteId)
                .filter((n) => !linkSearchText || (n.title && n.title.toLowerCase().includes(linkSearchText.toLowerCase())))
                .map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      insertFormatting('[[', ']]', n.title || 'Sem título');
                      setIsLinkModalOpen(false);
                      setLinkSearchText('');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-white flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <span className="truncate">{n.title || 'Sem título'}</span>
                    <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 font-bold">
                      Conectar ➔
                    </span>
                  </button>
                ))}
            </div>

            {linkSearchText.trim() && (
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={() => {
                    insertFormatting('[[', ']]', linkSearchText.trim());
                    setIsLinkModalOpen(false);
                    setLinkSearchText('');
                  }}
                  className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Inserir "[[{linkSearchText.trim()}]]"</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Editor;
