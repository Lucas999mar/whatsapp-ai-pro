import React, { useState, useMemo } from 'react';
import {
  Link2,
  ChevronUp,
  ChevronDown,
  X,
  FileText,
  Calendar,
  Folder,
  ArrowRight
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

// Escape special regex chars
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function BacklinksPanel() {
  const {
    notes = [],
    folders = [],
    activeNoteId,
    setActiveNote,
    openTab,
    showBacklinks = true,
    toggleBacklinks,
    getBacklinks,
  } = useNoteStore();

  const [isExpanded, setIsExpanded] = useState(true);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId),
    [notes, activeNoteId]
  );

  // Compute backlinks and context snippets
  const backlinks = useMemo(() => {
    if (!activeNote || !activeNote.title?.trim()) return [];

    // Check if store provided getBacklinks
    if (getBacklinks) {
      try {
        const storeLinks = getBacklinks(activeNote.id);
        if (Array.isArray(storeLinks) && storeLinks.length > 0) {
          return storeLinks;
        }
      } catch (e) {
        // Fallback
      }
    }

    const titleTarget = activeNote.title.trim();
    const regex = new RegExp(`\\[\\[\\s*${escapeRegExp(titleTarget)}\\s*\\]\\]`, 'gi');

    const results = [];

    notes.forEach((note) => {
      if (note.id === activeNote.id || note.deletedAt || !note.content) return;

      if (regex.test(note.content)) {
        // Find paragraph / context containing the link
        const paragraphs = note.content.split(/\n\s*\n/);
        let contextSnippet = '';

        for (const p of paragraphs) {
          if (new RegExp(`\\[\\[\\s*${escapeRegExp(titleTarget)}\\s*\\]\\]`, 'i').test(p)) {
            contextSnippet = p.replace(/^#+\s+/gm, '').trim();
            break;
          }
        }

        if (!contextSnippet) {
          const lines = note.content.split('\n');
          for (const line of lines) {
            if (new RegExp(`\\[\\[\\s*${escapeRegExp(titleTarget)}\\s*\\]\\]`, 'i').test(line)) {
              contextSnippet = line.replace(/^#+\s+/gm, '').trim();
              break;
            }
          }
        }

        const folder = folders.find((f) => f.id === note.folderId);

        results.push({
          note,
          folderName: folder ? folder.name : null,
          context: contextSnippet || note.content.slice(0, 100),
        });
      }
    });

    return results;
  }, [activeNote, notes, folders, getBacklinks]);

  if (!showBacklinks || !activeNote) return null;

  return (
    <div className="bg-ev-bg-secondary border-t border-ev-border select-none flex-shrink-0 transition-all duration-200">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-ev-border/40">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-semibold text-ev-text-primary hover:text-ev-accent transition-colors"
        >
          <div className="p-1 rounded bg-ev-accent/15 text-ev-accent">
            <Link2 className="w-3.5 h-3.5" />
          </div>
          <span>Backlinks Conectados</span>
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-medium ${
              backlinks.length > 0
                ? 'bg-ev-accent/20 text-ev-accent border border-ev-accent/30'
                : 'bg-ev-bg-surface text-ev-text-muted border border-ev-border'
            }`}
          >
            {backlinks.length}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-ev-text-muted ml-1" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-ev-text-muted ml-1" />
          )}
        </button>

        <div className="flex items-center gap-1">
          {toggleBacklinks && (
            <button
              onClick={() => toggleBacklinks()}
              title="Fechar painel de backlinks"
              className="p-1 text-ev-text-muted hover:text-ev-text-primary rounded hover:bg-ev-bg-hover transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Backlinks content list */}
      {isExpanded && (
        <div className="p-3 max-h-52 overflow-y-auto custom-scrollbar space-y-2">
          {backlinks.length === 0 ? (
            <div className="text-center py-4 text-xs text-ev-text-muted">
              <Link2 className="w-6 h-6 mx-auto text-ev-text-muted/40 mb-1" />
              <p>Nenhuma outra nota faz referência a esta nota.</p>
              <p className="text-[11px] text-ev-text-muted/60 mt-0.5">
                Digite <code className="text-ev-accent">[[{activeNote.title}]]</code> em qualquer
                outra nota para criar uma conexão bidirecional.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {backlinks.map(({ note, folderName, context }) => (
                <div
                  key={note.id}
                  onClick={() => {
                    if (setActiveNote) setActiveNote(note.id);
                    if (openTab) openTab(note.id);
                  }}
                  className="group p-2.5 rounded-xl bg-ev-bg-surface/60 hover:bg-ev-bg-hover/80 border border-ev-border hover:border-ev-accent/40 cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-ev-accent flex-shrink-0" />
                      <span className="font-semibold text-xs text-ev-text-primary group-hover:text-ev-accent truncate transition-colors">
                        {note.title || 'Sem título'}
                      </span>
                    </div>

                    {folderName && (
                      <span className="flex items-center gap-1 text-[10px] text-ev-mauve bg-ev-mauve/10 px-1.5 py-0.2 rounded border border-ev-mauve/20 flex-shrink-0">
                        <Folder className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[80px]">{folderName}</span>
                      </span>
                    )}
                  </div>

                  {/* Context excerpt */}
                  <p className="text-[11px] text-ev-text-muted line-clamp-2 leading-relaxed bg-ev-bg-tertiary/70 p-1.5 rounded-lg border border-ev-border/40 font-mono">
                    {context}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-ev-text-muted mt-1.5 pt-1 border-t border-ev-border/30">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-ev-text-muted/60" />
                      <span>{formatRelativeTime(note.updatedAt || note.createdAt)}</span>
                    </span>

                    <span className="text-ev-accent opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity font-medium">
                      <span>Abrir</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BacklinksPanel;
