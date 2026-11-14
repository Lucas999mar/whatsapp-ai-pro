import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import {
  Link2,
  ExternalLink,
  Copy,
  Check,
  Hash,
  FileText,
  Sparkles,
  Calendar,
  Clock,
  Layers
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

// Code Block with Copy Button
function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const codeText = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-ev-border bg-ev-bg-tertiary shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-ev-bg-secondary/90 border-b border-ev-border/80 text-xs text-ev-text-muted select-none">
        <span className="font-mono text-ev-peach uppercase font-semibold text-[11px]">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-ev-bg-surface text-ev-text-secondary hover:text-ev-accent transition-colors text-[11px]"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-ev-green" />
              <span className="text-ev-green">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed custom-scrollbar">
        {children}
      </div>
    </div>
  );
}

export function Preview() {
  const {
    notes = [],
    activeNoteId,
    updateNote,
    createNote,
    setActiveNote,
    openTab,
    setSearchQuery,
  } = useNoteStore();

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId),
    [notes, activeNoteId]
  );

  // Handle clicking on a [[Wiki-link]]
  const handleWikiLinkClick = (targetTitle) => {
    const trimmedTitle = targetTitle.trim();
    const existing = notes.find(
      (n) => n.title?.toLowerCase() === trimmedTitle.toLowerCase() && !n.deletedAt
    );

    if (existing) {
      if (setActiveNote) setActiveNote(existing.id);
      if (openTab) openTab(existing.id);
    } else {
      // Auto-create linked note if it doesn't exist
      if (createNote) {
        createNote(activeNote?.folderId || null, {
          title: trimmedTitle,
          content: `# ${trimmedTitle}\n\nNota criada a partir de link em [[${activeNote?.title || 'Nota anterior'}]].`,
        }).then((newNote) => {
          if (newNote?.id) {
            if (setActiveNote) setActiveNote(newNote.id);
            if (openTab) openTab(newNote.id);
          }
        });
      }
    }
  };

  // Toggle interactive checkbox in markdown content
  const handleToggleCheckbox = (index) => {
    if (!activeNote || !updateNote) return;

    let currentIndex = 0;
    const lines = (activeNote.content || '').split('\n');
    const updatedLines = lines.map((line) => {
      const match = line.match(/^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/);
      if (match) {
        if (currentIndex === index) {
          const isChecked = match[2].toLowerCase() === 'x';
          currentIndex++;
          return `${match[1]}${isChecked ? ' ' : 'x'}${match[3]}`;
        }
        currentIndex++;
      }
      return line;
    });

    updateNote(activeNote.id, {
      content: updatedLines.join('\n'),
      updatedAt: new Date().toISOString(),
    });
  };

  // Pre-process markdown for wiki-links and tags
  const processedContent = useMemo(() => {
    if (!activeNote?.content) return '';
    let text = activeNote.content;

    // Transform [[Note Title]] into custom markdown link format: [Note Title](wikilink://Note%20Title)
    text = text.replace(/\[\[(.*?)\]\]/g, (match, title) => {
      return `[${title}](wikilink://${encodeURIComponent(title.trim())})`;
    });

    // Transform isolated #tag into [tag](taglink://tag)
    text = text.replace(/(^|\s)#([a-zA-Z0-9_\-\/]+)/g, (match, prefix, tag) => {
      return `${prefix}[#${tag}](taglink://${encodeURIComponent(tag.trim())})`;
    });

    return text;
  }, [activeNote?.content]);

  // Keep track of checkbox indices
  let checkboxCount = 0;

  if (!activeNote) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-ev-bg-primary text-ev-text-muted p-8 select-none">
        <FileText className="w-12 h-12 text-ev-text-muted/30 mb-3" />
        <p className="text-sm">Nenhuma nota selecionada para visualização</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-ev-bg-primary overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl w-full mx-auto px-8 py-10">
        {/* Note Header in Preview */}
        <div className="pb-6 mb-8 border-b border-ev-border/60">
          <h1 className="text-3xl font-extrabold tracking-tight text-ev-text-primary mb-3">
            {activeNote.title || 'Sem título'}
          </h1>

          <div className="flex items-center gap-4 text-xs text-ev-text-muted flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-ev-accent" />
              <span>Criado {formatRelativeTime(activeNote.createdAt)}</span>
            </span>

            {activeNote.updatedAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-ev-mauve" />
                <span>Atualizado {formatRelativeTime(activeNote.updatedAt)}</span>
              </span>
            )}

            {activeNote.tags && activeNote.tags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-ev-pink" />
                <div className="flex items-center gap-1 flex-wrap">
                  {activeNote.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      onClick={() => setSearchQuery && setSearchQuery(tag)}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-ev-mauve/15 text-ev-mauve hover:bg-ev-mauve/25 cursor-pointer border border-ev-mauve/30 transition-colors"
                    >
                      #{tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Markdown Rendered Content */}
        <article className="prose prose-invert max-w-none text-ev-text-primary leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeHighlight]}
            components={{
              // Heading anchors
              h1: ({ children, ...props }) => (
                <h1
                  className="text-2xl font-bold text-ev-text-primary mt-8 mb-4 pb-2 border-b border-ev-border/80 flex items-center group"
                  {...props}
                >
                  {children}
                </h1>
              ),
              h2: ({ children, ...props }) => (
                <h2
                  className="text-xl font-bold text-ev-text-primary mt-6 mb-3 pb-1 border-b border-ev-border/40 flex items-center group"
                  {...props}
                >
                  {children}
                </h2>
              ),
              h3: ({ children, ...props }) => (
                <h3
                  className="text-lg font-semibold text-ev-accent mt-5 mb-2"
                  {...props}
                >
                  {children}
                </h3>
              ),
              h4: ({ children, ...props }) => (
                <h4
                  className="text-base font-semibold text-ev-text-secondary mt-4 mb-2"
                  {...props}
                >
                  {children}
                </h4>
              ),
              p: ({ children, ...props }) => (
                <p className="my-3 text-sm leading-relaxed text-ev-text-primary" {...props}>
                  {children}
                </p>
              ),

              // Wiki-link and external link handling
              a: ({ href, children, ...props }) => {
                if (href?.startsWith('wikilink://')) {
                  const targetTitle = decodeURIComponent(href.replace('wikilink://', ''));
                  return (
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        handleWikiLinkClick(targetTitle);
                      }}
                      className="inline-flex items-center gap-1 font-medium text-ev-accent hover:text-ev-accent-hover bg-ev-accent/10 hover:bg-ev-accent/20 px-2 py-0.5 rounded cursor-pointer transition-all border border-ev-accent/30 mx-0.5 shadow-sm"
                      title={`Abrir nota: ${targetTitle}`}
                    >
                      <Link2 className="w-3 h-3 text-ev-accent inline" />
                      <span>{children}</span>
                    </span>
                  );
                }

                if (href?.startsWith('taglink://')) {
                  const tag = decodeURIComponent(href.replace('taglink://', ''));
                  return (
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        if (setSearchQuery) setSearchQuery(tag);
                      }}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-ev-mauve/15 text-ev-mauve hover:bg-ev-mauve/25 border border-ev-mauve/30 cursor-pointer transition-colors mx-0.5"
                    >
                      {children}
                    </span>
                  );
                }

                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ev-accent hover:text-ev-accent-hover underline decoration-ev-accent/40 hover:decoration-ev-accent inline-flex items-center gap-0.5 transition-colors"
                    {...props}
                  >
                    <span>{children}</span>
                    <ExternalLink className="w-3 h-3 text-ev-accent/70 inline" />
                  </a>
                );
              },

              // Code and syntax highlighting
              code: ({ node, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const isBlock = match || String(children).includes('\n');
                if (isBlock) {
                  return (
                    <CodeBlock language={match ? match[1] : ''}>
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </CodeBlock>
                  );
                }
                return (
                  <code
                    className="bg-ev-bg-tertiary text-ev-peach px-1.5 py-0.5 rounded font-mono text-xs border border-ev-border/60"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },

              // Interactive checkboxes
              input: ({ type, checked, ...props }) => {
                if (type === 'checkbox') {
                  const currentIdx = checkboxCount++;
                  return (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleCheckbox(currentIdx)}
                      className="w-4 h-4 rounded border-ev-border bg-ev-bg-surface text-ev-accent focus:ring-0 focus:ring-offset-0 cursor-pointer mr-2 align-middle accent-ev-accent"
                      {...props}
                    />
                  );
                }
                return <input type={type} {...props} />;
              },

              // Blockquotes
              blockquote: ({ children, ...props }) => (
                <blockquote
                  className="border-l-4 border-ev-mauve/70 bg-ev-bg-secondary/40 pl-4 py-2 my-4 rounded-r-lg text-ev-text-secondary italic text-sm"
                  {...props}
                >
                  {children}
                </blockquote>
              ),

              // Lists
              ul: ({ children, ...props }) => (
                <ul className="list-disc list-inside space-y-1 my-3 text-sm" {...props}>
                  {children}
                </ul>
              ),
              ol: ({ children, ...props }) => (
                <ol className="list-decimal list-inside space-y-1 my-3 text-sm" {...props}>
                  {children}
                </ol>
              ),
              li: ({ children, ...props }) => (
                <li className="leading-relaxed text-ev-text-primary" {...props}>
                  {children}
                </li>
              ),

              // Tables
              table: ({ children, ...props }) => (
                <div className="overflow-x-auto my-6 rounded-xl border border-ev-border shadow-sm">
                  <table className="w-full text-left text-sm border-collapse" {...props}>
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children, ...props }) => (
                <thead className="bg-ev-bg-surface text-ev-text-primary font-semibold border-b border-ev-border text-xs uppercase tracking-wider" {...props}>
                  {children}
                </thead>
              ),
              th: ({ children, ...props }) => (
                <th className="px-4 py-3 font-semibold" {...props}>
                  {children}
                </th>
              ),
              td: ({ children, ...props }) => (
                <td className="px-4 py-2.5 border-t border-ev-border/50 text-ev-text-secondary" {...props}>
                  {children}
                </td>
              ),
              tr: ({ children, ...props }) => (
                <tr className="hover:bg-ev-bg-hover/30 transition-colors" {...props}>
                  {children}
                </tr>
              ),

              // Horizontal Rule
              hr: () => <hr className="border-t border-ev-border my-8" />,

              // Images
              img: ({ src, alt, ...props }) => (
                <figure className="my-6">
                  <img
                    src={src}
                    alt={alt}
                    className="max-w-full h-auto rounded-xl border border-ev-border shadow-md"
                    {...props}
                  />
                  {alt && (
                    <figcaption className="text-center text-xs text-ev-text-muted mt-2">
                      {alt}
                    </figcaption>
                  )}
                </figure>
              ),
            }}
          >
            {processedContent}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

export default Preview;
