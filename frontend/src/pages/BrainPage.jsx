import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import api from '../api/api';
import {
    BrainCircuit, Sparkles, Plus, Trash2, Edit3, Search, ChevronRight, ChevronDown,
    Save, Info, Upload, UploadCloud, Star, FileText, Folder, FolderPlus, Maximize2,
    Minimize2, X, Bold, Italic, Heading, Link as LinkIcon, Hash, CheckSquare, Code,
    Table, Quote, Copy, Check, Command, Split, Eye, Layers, ExternalLink, RotateCcw,
    BookOpen, Clock, Lightbulb, Network, ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── UTILS: PARSERS PARA WIKI-LINKS & TAGS ──
export const parseWikiLinks = (content = '') => {
    if (!content) return [];
    const matches = [];
    const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const rawTarget = match[1].trim();
        if (rawTarget && !matches.includes(rawTarget)) {
            matches.push(rawTarget);
        }
    }
    return matches;
};

export const parseTags = (content = '') => {
    if (!content) return [];
    const tags = new Set();
    const regex = /(?:^|\s)#([a-zA-Z0-9_\u00C0-\u017F-]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const tag = match[1].trim().toLowerCase();
        if (tag) tags.add(tag);
    }
    return Array.from(tags);
};

// ── SUB-COMPONENTE: RENDERIZADOR MARKDOWN ENRIQUECIDO COM WIKI-LINKS & CHECKBOXES ──
function MarkdownRenderer({ content, onWikiLinkClick, onTagClick, onToggleCheckbox }) {
    const renderMarkdown = () => {
        if (!content) return null;

        const lines = content.split('\n');
        const elements = [];
        let inCodeBlock = false;
        let codeBlockContent = [];
        let codeBlockLang = '';

        lines.forEach((line, lineIndex) => {
            // Blocos de código ```
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    const fullCode = codeBlockContent.join('\n');
                    elements.push(
                        <CodeBlock key={`code-${lineIndex}`} code={fullCode} lang={codeBlockLang} />
                    );
                    codeBlockContent = [];
                    inCodeBlock = false;
                    codeBlockLang = '';
                } else {
                    inCodeBlock = true;
                    codeBlockLang = line.trim().slice(3).trim();
                }
                return;
            }

            if (inCodeBlock) {
                codeBlockContent.push(line);
                return;
            }

            // Títulos H1 a H6
            if (line.startsWith('# ')) {
                elements.push(
                    <h1 key={lineIndex} className="text-2xl font-black text-white mt-5 mb-2 pb-1 border-b border-white/10 tracking-tight">
                        {renderInlineFormatted(line.slice(2), lineIndex, onWikiLinkClick, onTagClick)}
                    </h1>
                );
                return;
            }
            if (line.startsWith('## ')) {
                elements.push(
                    <h2 key={lineIndex} className="text-xl font-bold text-purple-300 mt-4 mb-2 tracking-tight">
                        {renderInlineFormatted(line.slice(3), lineIndex, onWikiLinkClick, onTagClick)}
                    </h2>
                );
                return;
            }
            if (line.startsWith('### ')) {
                elements.push(
                    <h3 key={lineIndex} className="text-lg font-semibold text-cyan-300 mt-3 mb-1.5">
                        {renderInlineFormatted(line.slice(4), lineIndex, onWikiLinkClick, onTagClick)}
                    </h3>
                );
                return;
            }
            if (line.startsWith('#### ')) {
                elements.push(
                    <h4 key={lineIndex} className="text-base font-semibold text-slate-200 mt-2 mb-1">
                        {renderInlineFormatted(line.slice(5), lineIndex, onWikiLinkClick, onTagClick)}
                    </h4>
                );
                return;
            }

            // Citações (Blockquotes)
            if (line.startsWith('> ')) {
                elements.push(
                    <blockquote key={lineIndex} className="border-l-4 border-purple-500 bg-purple-500/10 px-4 py-2 my-2 rounded-r-lg text-slate-300 italic text-sm">
                        {renderInlineFormatted(line.slice(2), lineIndex, onWikiLinkClick, onTagClick)}
                    </blockquote>
                );
                return;
            }

            // Checkbox / Lista de tarefas
            const taskMatch = line.match(/^(\s*)-\s\[([ xX])\]\s(.*)$/);
            if (taskMatch) {
                const isChecked = taskMatch[2].toLowerCase() === 'x';
                const taskText = taskMatch[3];
                elements.push(
                    <div key={lineIndex} className="flex items-center gap-2.5 my-1.5 text-sm group">
                        <button
                            type="button"
                            onClick={() => onToggleCheckbox && onToggleCheckbox(lineIndex, !isChecked)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                                isChecked
                                    ? 'bg-purple-500 border-purple-500 text-white'
                                    : 'border-slate-500 hover:border-purple-400 bg-black/20'
                            }`}
                        >
                            {isChecked && <Check size={12} strokeWidth={3} />}
                        </button>
                        <span className={`${isChecked ? 'line-through text-slate-500' : 'text-slate-200'} transition-all`}>
                            {renderInlineFormatted(taskText, lineIndex, onWikiLinkClick, onTagClick)}
                        </span>
                    </div>
                );
                return;
            }

            // Listas ordenadas e não ordenadas
            if (line.match(/^(\s*)[-*+]\s(.*)$/)) {
                const bulletText = line.replace(/^(\s*)[-*+]\s/, '');
                elements.push(
                    <li key={lineIndex} className="list-disc list-inside text-sm text-slate-300 my-1">
                        {renderInlineFormatted(bulletText, lineIndex, onWikiLinkClick, onTagClick)}
                    </li>
                );
                return;
            }

            // Linha vazia
            if (!line.trim()) {
                elements.push(<div key={lineIndex} className="h-2" />);
                return;
            }

            // Parágrafo padrão
            elements.push(
                <p key={lineIndex} className="text-sm text-slate-300 leading-relaxed my-1.5">
                    {renderInlineFormatted(line, lineIndex, onWikiLinkClick, onTagClick)}
                </p>
            );
        });

        return elements;
    };

    return <div className="space-y-0.5 select-text">{renderMarkdown()}</div>;
}

// Renderiza formatações inline: [[WikiLink]], #Tag, **negrito**, *itálico*, `código`
function renderInlineFormatted(text, keyPrefix, onWikiLinkClick, onTagClick) {
    if (!text) return '';

    // Regex combinado para identificar tokens especiais
    const tokenRegex = /(\[\[(?:[^\]|]+)(?:\|[^\]]+)?\]\]|#[a-zA-Z0-9_\u00C0-\u017F-]+|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, i) => {
        if (!part) return null;
        const key = `${keyPrefix}-${i}`;

        // 1. Wiki-link [[Nota]] ou [[Nota|Rótulo]]
        if (part.startsWith('[[') && part.endsWith(']]')) {
            const inner = part.slice(2, -2);
            const [target, label] = inner.split('|');
            const noteTitle = (target || '').trim();
            const displayTitle = (label || target || '').trim();

            return (
                <button
                    key={key}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onWikiLinkClick && onWikiLinkClick(noteTitle);
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm group"
                    title={`Abrir nota: ${noteTitle}`}
                >
                    <LinkIcon size={10} className="text-purple-400 group-hover:scale-110 transition-transform" />
                    <span>{displayTitle}</span>
                </button>
            );
        }

        // 2. Tags #tag
        if (part.startsWith('#') && !part.includes(' ')) {
            const tagName = part.slice(1);
            return (
                <button
                    key={key}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTagClick && onTagClick(tagName);
                    }}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 hover:text-cyan-100 border border-cyan-500/25 text-[11px] font-mono transition-all cursor-pointer"
                    title={`Filtrar por #${tagName}`}
                >
                    <Hash size={9} />
                    <span>{tagName}</span>
                </button>
            );
        }

        // 3. Negrito **texto**
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={key} className="font-bold text-white">{part.slice(2, -2)}</strong>;
        }

        // 4. Itálico *texto*
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={key} className="italic text-slate-200">{part.slice(1, -1)}</em>;
        }

        // 5. Código inline `código`
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <code key={key} className="bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700">
                    {part.slice(1, -1)}
                </code>
            );
        }

        return <span key={key}>{part}</span>;
    });
}

// Bloco de código com botão de cópia
function CodeBlock({ code, lang }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative my-3 rounded-xl overflow-hidden border border-white/10 bg-[#0A0E1A] group">
            <div className="flex justify-between items-center px-3.5 py-1.5 bg-white/5 border-b border-white/5 text-[11px] text-slate-400 font-mono">
                <span>{lang || 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-xs font-mono text-purple-200 leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
}

// ── COMPONENTE PRINCIPAL: SEGUNDO CÉREBRO — EVOLUIR NOTES ──
export default function BrainPage() {
    // ── ESTADOS PRINCIPAIS ──
    const [notes, setNotes] = useState([]);
    const [links, setLinks] = useState([]);
    const [trash, setTrash] = useState([]);
    const [starredIds, setStarredIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('evoluir_brain_starred') || '[]');
        } catch {
            return [];
        }
    });

    // ── ESTADOS DE ABAS & NOTA ATIVA ──
    const [openTabs, setOpenTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [currentNote, setCurrentNote] = useState(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'dirty'

    // ── MODOS DE EXIBIÇÃO & LAYOUT ──
    const [editorViewMode, setEditorViewMode] = useState('split');
    const [showGraphModal, setShowGraphModal] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showBacklinks, setShowBacklinks] = useState(true);

    // ── FILTROS & NAVEGAÇÃO LATERAL ──
    const [sidebarTab, setSidebarTab] = useState('notes'); // 'notes' | 'starred' | 'tags' | 'trash'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState(null);

    // ── COPILOT & UPLOAD ──
    const [copilotSuggestions, setCopilotSuggestions] = useState('');
    const [loadingCopilot, setLoadingCopilot] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    // ── CANVAS / EFEITO TEIA (GRAPH PHYSICS ENGINE) ──
    const canvasRef = useRef(null);
    const modalCanvasRef = useRef(null);
    const nodesRef = useRef([]);
    const linksRef = useRef([]);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const zoomRef = useRef(1);
    const panRef = useRef({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const mousePos = useRef({ x: 0, y: 0 });
    const [draggedNode, setDraggedNode] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);

    // ── ATALHOS DE TECLADO GLOBAIS (Ctrl+P, Ctrl+N, Ctrl+S) ──
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+P / Cmd+P -> Paleta de Comandos
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                setShowCommandPalette(prev => !prev);
            }
            // Ctrl+N -> Nova Nota
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                handleCreateNewNote();
            }
            // Ctrl+S -> Salvar Nota
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSaveNote();
            }
            // Escape -> Fechar Paleta ou Modal
            if (e.key === 'Escape') {
                setShowCommandPalette(false);
                setShowGraphModal(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [noteTitle, noteContent, currentNote]);

    // ── CARREGAMENTO INICIAL DE DADOS ──
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/brain');
            const fetchedNotes = res.data.notes || [];
            const fetchedLinks = res.data.links || [];

            setNotes(fetchedNotes);
            setLinks(fetchedLinks);

            if (fetchedNotes.length > 0 && !currentNote) {
                openNoteInTab(fetchedNotes[0]);
            }
        } catch (err) {
            console.error('Erro ao buscar notas do cérebro:', err);
        }
    };

    // ── GERENCIAMENTO DE ABAS ──
    const openNoteInTab = (note) => {
        if (!note) return;
        const noteId = note.id || 'temp-new';

        setOpenTabs(prev => {
            const exists = prev.find(t => t.id === noteId);
            if (exists) return prev;
            return [...prev, { id: noteId, title: note.title || 'Sem título' }];
        });

        setActiveTabId(noteId);
        setCurrentNote(note);
        setNoteTitle(note.title || '');
        setNoteContent(note.content || '');
        setIsDirty(false);
        setSaveStatus('saved');
        setCopilotSuggestions('');
    };

    const closeTab = (e, tabId) => {
        e.stopPropagation();
        setOpenTabs(prev => {
            const updated = prev.filter(t => t.id !== tabId);
            if (activeTabId === tabId) {
                if (updated.length > 0) {
                    const nextTab = updated[updated.length - 1];
                    const nextNote = notes.find(n => n.id === nextTab.id);
                    if (nextNote) openNoteInTab(nextNote);
                } else {
                    setActiveTabId(null);
                    setCurrentNote(null);
                    setNoteTitle('');
                    setNoteContent('');
                }
            }
            return updated;
        });
    };

    // ── ATUALIZAÇÃO DO CONTEÚDO (AUTO-SAVE) ──
    const handleContentChange = (e) => {
        setNoteContent(e.target.value);
        setIsDirty(true);
        setSaveStatus('dirty');
    };

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setNoteTitle(newTitle);
        setIsDirty(true);
        setSaveStatus('dirty');

        // Atualiza título da aba
        if (activeTabId) {
            setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, title: newTitle || 'Sem título' } : t));
        }
    };

    // ── SALVAR NOTA NO BACKEND (SUPABASE & IA) ──
    const handleSaveNote = async () => {
        if (!noteTitle.trim()) {
            alert('Por favor, dê um título para a nota antes de salvar!');
            return;
        }

        setSaving(true);
        setSaveStatus('saving');

        try {
            const { data } = await api.post('/brain', {
                id: currentNote?.id || null,
                title: noteTitle.trim(),
                content: noteContent
            });

            const saved = data.note || {
                id: currentNote?.id || Date.now().toString(),
                title: noteTitle.trim(),
                content: noteContent,
                updated_at: new Date().toISOString()
            };

            // Atualiza lista de notas
            setNotes(prev => {
                const idx = prev.findIndex(n => n.id === saved.id);
                if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx] = saved;
                    return updated;
                } else {
                    return [saved, ...prev];
                }
            });

            // Atualiza links
            if (data.links) {
                setLinks(data.links);
            }

            setCurrentNote(saved);
            setActiveTabId(saved.id);
            setOpenTabs(prev => prev.map(t => (t.id === 'temp-new' || t.id === saved.id) ? { id: saved.id, title: saved.title } : t));
            setIsDirty(false);
            setSaveStatus('saved');
        } catch (err) {
            console.error('Erro ao salvar nota:', err);
            setSaveStatus('dirty');
            alert('Erro ao salvar nota no servidor.');
        } finally {
            setSaving(false);
        }
    };

    // ── CRIAR NOVA NOTA ──
    const handleCreateNewNote = () => {
        const tempNote = {
            id: null,
            title: 'Nova Nota',
            content: '# Nova Nota\n\nEscreva os tópicos do seu negócio aqui. Você pode linkar outras notas digitando o nome delas entre colchetes duplos. Exemplo: [[Script de Vendas]] ou [[Instruções do Bot]] para criar conexões de teia.'
        };
        openNoteInTab(tempNote);
    };

    // ── EXCLUIR NOTA (COM SOFT-DELETE) ──
    const handleDeleteNote = async (id, e) => {
        if (e) e.stopPropagation();
        const noteToDelete = notes.find(n => n.id === id);
        if (!noteToDelete) return;

        if (!window.confirm(`Tem certeza que deseja mover a nota "${noteToDelete.title}" para a lixeira?`)) return;

        try {
            await api.delete(`/brain/${id}`);
            setNotes(prev => prev.filter(n => n.id !== id));
            setTrash(prev => [noteToDelete, ...prev]);
            setLinks(prev => prev.filter(l => l.source_note_id !== id && l.target_note_id !== id));

            // Fecha aba se estiver aberta
            setOpenTabs(prev => prev.filter(t => t.id !== id));
            if (currentNote?.id === id) {
                const remaining = notes.filter(n => n.id !== id);
                if (remaining.length > 0) openNoteInTab(remaining[0]);
                else {
                    setCurrentNote(null);
                    setNoteTitle('');
                    setNoteContent('');
                }
            }
        } catch (err) {
            console.error('Erro ao excluir:', err);
        }
    };

    // ── RESTAURAR DA LIXEIRA ──
    const handleRestoreFromTrash = async (note) => {
        try {
            await api.post('/brain', {
                id: note.id,
                title: note.title,
                content: note.content
            });
            setTrash(prev => prev.filter(n => n.id !== note.id));
            setNotes(prev => [note, ...prev]);
            openNoteInTab(note);
        } catch (err) {
            console.error('Erro ao restaurar:', err);
        }
    };

    // ── FAVORITAR NOTA (STARRED) ──
    const toggleStarNote = (id, e) => {
        if (e) e.stopPropagation();
        setStarredIds(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            localStorage.setItem('evoluir_brain_starred', JSON.stringify(next));
            return next;
        });
    };

    // ── NAVEGAÇÃO DE WIKI-LINKS: ABRIR OU CRIAR ──
    const handleWikiLinkClick = (targetTitle) => {
        const found = notes.find(n => n.title.trim().toLowerCase() === targetTitle.trim().toLowerCase());
        if (found) {
            openNoteInTab(found);
        } else {
            if (window.confirm(`A nota "[[${targetTitle}]]" ainda não existe. Deseja criá-la agora?`)) {
                const newNote = {
                    id: null,
                    title: targetTitle,
                    content: `# ${targetTitle}\n\nNota criada automaticamente a partir de um wiki-link em [[${noteTitle}]].`
                };
                openNoteInTab(newNote);
            }
        }
    };

    // ── ALTERNAR CHECKBOX DENTRO DO MARKDOWN ──
    const handleToggleCheckbox = (lineIndex, isChecked) => {
        const lines = noteContent.split('\n');
        if (lineIndex >= 0 && lineIndex < lines.length) {
            const currentLine = lines[lineIndex];
            lines[lineIndex] = currentLine.replace(
                /^(\s*-\s\[)([ xX])(\])/,
                `$1${isChecked ? 'x' : ' '}$3`
            );
            const newContent = lines.join('\n');
            setNoteContent(newContent);
            setIsDirty(true);
            setSaveStatus('dirty');
        }
    };

    // ── INSERÇÃO DE FORMATAÇÃO NO EDITOR ──
    const insertFormatting = (prefix, suffix = '', defaultText = '') => {
        const textarea = document.getElementById('brain-markdown-editor');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = noteContent.substring(start, end) || defaultText;
        const replacement = `${prefix}${selected}${suffix}`;

        const newContent = noteContent.substring(0, start) + replacement + noteContent.substring(end);
        setNoteContent(newContent);
        setIsDirty(true);
        setSaveStatus('dirty');

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        }, 50);
    };

    // ── CÁLCULO DE BACKLINKS REVERSOS ──
    const currentBacklinks = useMemo(() => {
        if (!currentNote || !noteTitle.trim()) return [];
        const currentTitleLower = noteTitle.trim().toLowerCase();

        return notes
            .filter(n => n.id !== currentNote.id && (n.content || '').toLowerCase().includes(`[[${currentTitleLower}`))
            .map(n => {
                const lines = (n.content || '').split('\n');
                const matchingLine = lines.find(l => l.toLowerCase().includes(`[[${currentTitleLower}`)) || '';
                return {
                    note: n,
                    context: matchingLine.trim() || n.title
                };
            });
    }, [notes, currentNote, noteTitle]);

    // ── EXTRAÇÃO DE TODAS AS TAGS DAS NOTAS ──
    const allTags = useMemo(() => {
        const tagMap = {};
        notes.forEach(note => {
            const tags = parseTags(note.content || '');
            tags.forEach(t => {
                tagMap[t] = (tagMap[t] || 0) + 1;
            });
        });
        return Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
    }, [notes]);

    // ── FILTRAGEM DE NOTAS NA SIDEBAR ──
    const filteredNotes = useMemo(() => {
        let list = notes;

        if (sidebarTab === 'starred') {
            list = list.filter(n => starredIds.includes(n.id));
        }

        if (selectedTag) {
            list = list.filter(n => parseTags(n.content || '').includes(selectedTag));
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(n =>
                (n.title || '').toLowerCase().includes(q) ||
                (n.content || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [notes, sidebarTab, selectedTag, searchQuery, starredIds]);

    // ── COPILOT DE IA & UPLOAD DE ARQUIVOS ──
    const handleTriggerCopilot = async () => {
        setLoadingCopilot(true);
        setCopilotSuggestions('');
        try {
            const res = await api.post('/brain/copilot', {
                title: noteTitle,
                content: noteContent
            });
            setCopilotSuggestions(res.data.suggestions || '');
        } catch (err) {
            setCopilotSuggestions('⚠️ Não foi possível se conectar com a IA no momento.');
        } finally {
            setLoadingCopilot(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            return alert('O arquivo enviado excede o limite de 15MB permitidos.');
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploadingFile(true);
        try {
            const { data } = await api.post('/brain/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.success) {
                setNotes(data.notes || []);
                setLinks(data.links || []);
                if (data.note) openNoteInTab(data.note);
                alert(`Sucesso! O documento "${file.name}" foi processado, transformado em nota e indexado.`);
            }
        } catch (err) {
            console.error('Erro de upload:', err);
            const errMsg = err.response?.data?.error || 'Falha ao importar documento.';
            alert(errMsg);
        } finally {
            setUploadingFile(false);
            e.target.value = '';
        }
    };

    // ── CONTADORES DE MÉTRICAS (PALAVRAS, CARACTERES, TEMPO) ──
    const metrics = useMemo(() => {
        const words = (noteContent.match(/\S+/g) || []).length;
        const chars = noteContent.length;
        const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
        return { words, chars, readTimeMinutes };
    }, [noteContent]);

    // ── MOTOR DE FÍSICA DO CANVAS (OBSIDIAN FORCE SIMULATION) ──
    useEffect(() => {
        const activeCanvas = showGraphModal ? modalCanvasRef.current : canvasRef.current;
        if (!activeCanvas) return;

        const width = activeCanvas.clientWidth || 800;
        const height = activeCanvas.clientHeight || 450;

        const graphNodes = notes.map((note) => {
            const connectionCount = links.filter(l => l.source_note_id === note.id || l.target_note_id === note.id).length;
            const existing = nodesRef.current.find(n => n.id === note.id);
            return {
                id: note.id,
                title: note.title,
                x: existing ? existing.x : (width / 2) + (Math.random() * 100 - 50),
                y: existing ? existing.y : (height / 2) + (Math.random() * 100 - 50),
                vx: existing ? existing.vx : 0,
                vy: existing ? existing.vy : 0,
                radius: 8 + Math.min((note.content || '').length / 150, 8) + (connectionCount * 3.5),
                color: note.id === currentNote?.id
                    ? '#c084fc' // Roxo vibrante para nota ativa
                    : (connectionCount === 0 ? '#64748b' : '#38bdf8'), // Azul-celeste para conectadas, cinza para órfãs
            };
        });

        nodesRef.current = graphNodes;
        linksRef.current = links;
    }, [notes, links, currentNote, showGraphModal]);

    // Loop de animação do Canvas
    useEffect(() => {
        let animationFrameId;

        const renderLoop = () => {
            const activeCanvas = showGraphModal ? modalCanvasRef.current : canvasRef.current;
            if (!activeCanvas) return;
            const ctx = activeCanvas.getContext('2d');
            if (!ctx) return;

            const width = activeCanvas.clientWidth || 800;
            const height = activeCanvas.clientHeight || 450;
            const centerX = width / 2;
            const centerY = height / 2;

            const nodes = nodesRef.current;
            const linksData = linksRef.current;

            // Física
            nodes.forEach(node => {
                const dx = centerX - node.x;
                const dy = centerY - node.y;
                node.vx += dx * 0.00018;
                node.vy += dy * 0.00018;

                // Repulsão entre nós
                nodes.forEach(other => {
                    if (node.id === other.id) return;
                    const kx = node.x - other.x;
                    const ky = node.y - other.y;
                    const dist = Math.sqrt(kx * kx + ky * ky) || 1;
                    const minDist = node.radius + other.radius + 60;

                    if (dist < minDist) {
                        const force = (minDist - dist) * 0.02;
                        node.vx += (kx / dist) * force;
                        node.vy += (ky / dist) * force;
                        other.vx -= (kx / dist) * force;
                        other.vy -= (ky / dist) * force;
                    }
                });

                // Tração elástica de links
                linksData.forEach(link => {
                    const source = nodes.find(n => n.id === link.source_note_id);
                    const target = nodes.find(n => n.id === link.target_note_id);
                    if (source && target) {
                        const lx = target.x - source.x;
                        const ly = target.y - source.y;
                        const lDist = Math.sqrt(lx * lx + ly * ly) || 1;
                        const targetDist = 120;
                        const force = (lDist - targetDist) * 0.015;
                        source.vx += (lx / lDist) * force;
                        source.vy += (ly / lDist) * force;
                        target.vx -= (lx / lDist) * force;
                        target.vy -= (ly / lDist) * force;
                    }
                });

                node.x += node.vx;
                node.y += node.vy;
                node.vx *= 0.86;
                node.vy *= 0.86;

                // Limites
                const pad = node.radius + 15;
                if (node.x < pad) node.x = pad;
                if (node.x > width - pad) node.x = width - pad;
                if (node.y < pad) node.y = pad;
                if (node.y > height - pad) node.y = height - pad;
            });

            // Redimensionamento de buffer HD
            const dpr = window.devicePixelRatio || 1;
            if (activeCanvas.width !== width * dpr || activeCanvas.height !== height * dpr) {
                activeCanvas.width = width * dpr;
                activeCanvas.height = height * dpr;
            }

            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, width, height);

            // Transformações de Pan e Zoom
            ctx.translate(panRef.current.x, panRef.current.y);
            ctx.scale(zoomRef.current, zoomRef.current);

            // 1. Desenho de Conexões (Linhas)
            linksData.forEach(link => {
                const source = nodes.find(n => n.id === link.source_note_id);
                const target = nodes.find(n => n.id === link.target_note_id);
                if (source && target) {
                    const isHighlighted = (hoveredNode && (hoveredNode.id === source.id || hoveredNode.id === target.id)) ||
                        (currentNote && (currentNote.id === source.id || currentNote.id === target.id));

                    ctx.beginPath();
                    ctx.moveTo(source.x, source.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.strokeStyle = isHighlighted ? 'rgba(192, 132, 252, 0.7)' : 'rgba(148, 163, 184, 0.2)';
                    ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
                    ctx.stroke();
                }
            });

            // 2. Desenho de Nós (Círculos)
            nodes.forEach(node => {
                const isHovered = hoveredNode?.id === node.id;
                const isCurrent = currentNote?.id === node.id;

                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fillStyle = node.color;
                ctx.shadowColor = isCurrent ? '#c084fc' : (isHovered ? '#38bdf8' : 'transparent');
                ctx.shadowBlur = isCurrent || isHovered ? 14 : 0;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Borda
                ctx.lineWidth = isCurrent ? 2.5 : 1;
                ctx.strokeStyle = isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
                ctx.stroke();

                // Rótulo da Nota
                ctx.fillStyle = isCurrent ? '#ffffff' : (isHovered ? '#e2e8f0' : '#94a3b8');
                ctx.font = `${isCurrent || isHovered ? '600' : '500'} 11px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(node.title, node.x, node.y + node.radius + 14);
            });

            ctx.restore();
            animationFrameId = requestAnimationFrame(renderLoop);
        };

        animationFrameId = requestAnimationFrame(renderLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [showGraphModal, currentNote, hoveredNode]);

    // ── CONTROLES DO MOUSE NO CANVAS (ZOOM, PAN & DRAG) ──
    const handleCanvasMouseDown = (e, isModal = false) => {
        const canvas = isModal ? modalCanvasRef.current : canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const x = (clientX - panRef.current.x) / zoomRef.current;
        const y = (clientY - panRef.current.y) / zoomRef.current;

        const clickedNode = nodesRef.current.find(n => {
            const dx = n.x - x;
            const dy = n.y - y;
            return dx * dx + dy * dy < n.radius * n.radius;
        });

        if (clickedNode) {
            const note = notes.find(n => n.id === clickedNode.id);
            if (note) openNoteInTab(note);
            setDraggedNode(clickedNode);
        } else {
            isPanningRef.current = true;
            panStartRef.current = {
                x: clientX - panRef.current.x,
                y: clientY - panRef.current.y
            };
        }
    };

    const handleCanvasMouseMove = (e, isModal = false) => {
        const canvas = isModal ? modalCanvasRef.current : canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        if (isPanningRef.current) {
            const newPan = {
                x: clientX - panStartRef.current.x,
                y: clientY - panStartRef.current.y
            };
            panRef.current = newPan;
            setPan(newPan);
        }

        const x = (clientX - panRef.current.x) / zoomRef.current;
        const y = (clientY - panRef.current.y) / zoomRef.current;
        mousePos.current = { x, y };

        if (draggedNode) {
            draggedNode.x = x;
            draggedNode.y = y;
            draggedNode.vx = 0;
            draggedNode.vy = 0;
        }

        // Hover
        const found = nodesRef.current.find(n => {
            const dx = n.x - x;
            const dy = n.y - y;
            return dx * dx + dy * dy < n.radius * n.radius;
        });
        setHoveredNode(found || null);
    };

    const handleCanvasMouseUp = () => {
        setDraggedNode(null);
        isPanningRef.current = false;
    };

    const handleCanvasWheel = (e) => {
        e.preventDefault();
        const zoomFactor = 1.08;
        let newZoom = zoomRef.current;
        if (e.deltaY < 0) newZoom *= zoomFactor;
        else newZoom /= zoomFactor;
        newZoom = Math.max(0.2, Math.min(newZoom, 3.5));
        zoomRef.current = newZoom;
        setZoom(newZoom);
    };

    const resetGraphView = () => {
        zoomRef.current = 1;
        panRef.current = { x: 0, y: 0 };
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">

            {/* ── HEADER PRINCIPAL ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-500/20 via-purple-500/10 to-cyan-500/20 border border-purple-500/30 text-purple-400 shadow-lg shadow-purple-500/10">
                            <BrainCircuit size={30} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-3xl font-black text-white tracking-tight">Segundo Cérebro</h2>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Evoluir Notes
                                </span>
                            </div>
                            <p className="text-slate-400 text-sm mt-0.5">
                                Base de conhecimento hiperconectada com links bidirecionais <code className="text-purple-300 bg-purple-500/10 px-1 py-0.5 rounded text-xs">[[Nota]]</code> integrada à IA.
                            </p>
                        </div>
                    </div>
                </div>

                {/* AÇÕES DE CABEÇALHO */}
                <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto justify-between sm:justify-start">
                    {/* Botão de Paleta de Comandos */}
                    <button
                        onClick={() => setShowCommandPalette(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer"
                        title="Abrir busca rápida (Ctrl+P)"
                    >
                        <Command size={14} className="text-purple-400" />
                        <span>Comandos</span>
                        <kbd className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded border border-white/10 text-slate-400 font-mono">
                            Ctrl+P
                        </kbd>
                    </button>

                    {/* Botão Graph View Tela Cheia */}
                    <button
                        onClick={() => setShowGraphModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer"
                        title="Abrir Teia em Tela Cheia"
                    >
                        <Network size={14} className="text-cyan-400" />
                        <span>Teia Cheia</span>
                    </button>

                    {/* Botão Nova Nota */}
                    <button
                        onClick={handleCreateNewNote}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-xl text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                    >
                        <Plus size={16} />
                        <span>Nova Nota</span>
                    </button>
                </div>
            </div>

            {/* ── GRID PRINCIPAL: SIDEBAR + WORKSPACE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── COLUNA 1: SIDEBAR DE NOTAS & NAVEGAÇÃO (3 COLUNAS) ── */}
                <div className="lg:col-span-3 space-y-3.5">

                    {/* BUSCA RÁPIDA */}
                    <div className="glass-panel p-2.5 border-white/5 flex items-center gap-2 bg-[#0E1322]">
                        <Search className="text-slate-500 shrink-0 ml-1.5" size={15} />
                        <input
                            type="text"
                            placeholder="Buscar notas, tags ou conteúdo..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-none text-slate-200 outline-none text-xs placeholder:text-slate-500"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="p-1 text-slate-500 hover:text-white text-xs">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* ABAS DA SIDEBAR (Todas, Favoritas, Tags, Lixeira) */}
                    <div className="flex bg-[#0E1322] border border-white/5 p-1 rounded-xl text-[11px] font-bold">
                        <button
                            onClick={() => { setSidebarTab('notes'); setSelectedTag(null); }}
                            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                sidebarTab === 'notes' && !selectedTag ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <FileText size={12} />
                            <span>Notas ({notes.length})</span>
                        </button>
                        <button
                            onClick={() => { setSidebarTab('starred'); setSelectedTag(null); }}
                            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                sidebarTab === 'starred' ? 'bg-yellow-500/20 text-yellow-300 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Star size={12} />
                            <span>Favoritos</span>
                        </button>
                        <button
                            onClick={() => setSidebarTab('tags')}
                            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                sidebarTab === 'tags' || selectedTag ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Hash size={12} />
                            <span>Tags</span>
                        </button>
                        <button
                            onClick={() => setSidebarTab('trash')}
                            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                sidebarTab === 'trash' ? 'bg-red-500/20 text-red-300 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Trash2 size={12} />
                            <span>Lixeira</span>
                        </button>
                    </div>

                    {/* LISTAGEM DE TAGS (Quando aba 'tags' ativa) */}
                    {sidebarTab === 'tags' && (
                        <div className="glass-panel p-3 border-white/5 bg-[#0E1322] max-h-48 overflow-y-auto space-y-1.5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tags no Cérebro</h4>
                            {allTags.length === 0 ? (
                                <p className="text-[11px] text-slate-500 italic py-2 text-center">Nenhuma tag criada com # ainda.</p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {allTags.map(([tag, count]) => (
                                        <button
                                            key={tag}
                                            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                            className={`px-2 py-1 rounded-lg text-xs font-mono flex items-center gap-1 transition-all cursor-pointer ${
                                                selectedTag === tag
                                                    ? 'bg-cyan-500 text-white font-bold'
                                                    : 'bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/20'
                                            }`}
                                        >
                                            <span>#{tag}</span>
                                            <span className="text-[10px] opacity-70">({count})</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* LISTA DE NOTAS */}
                    <div className="glass-panel p-2.5 border-white/5 bg-[#0E1322] max-h-[460px] overflow-y-auto space-y-1.5">
                        {sidebarTab === 'trash' ? (
                            // Lixeira
                            trash.length === 0 ? (
                                <p className="text-xs text-slate-500 italic text-center py-8">Lixeira vazia.</p>
                            ) : (
                                trash.map(item => (
                                    <div key={item.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                                        <div className="min-w-0 pr-2">
                                            <p className="text-xs font-semibold text-slate-300 truncate">{item.title}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreFromTrash(item)}
                                            className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold hover:bg-purple-500/30 transition-all cursor-pointer"
                                        >
                                            Restaurar
                                        </button>
                                    </div>
                                ))
                            )
                        ) : (
                            // Notas Normais
                            filteredNotes.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <FileText size={24} className="mx-auto text-slate-600 mb-2" />
                                    <p className="text-xs text-slate-500 italic">Nenhuma anotação encontrada.</p>
                                </div>
                            ) : (
                                filteredNotes.map(note => {
                                    const isActive = currentNote?.id === note.id;
                                    const isStarred = starredIds.includes(note.id);
                                    const connections = links.filter(l => l.source_note_id === note.id || l.target_note_id === note.id).length;

                                    return (
                                        <div
                                            key={note.id || 'new'}
                                            onClick={() => openNoteInTab(note)}
                                            className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-2 group ${
                                                isActive
                                                    ? 'bg-purple-500/15 border border-purple-500/40 text-purple-200 shadow-sm'
                                                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-transparent'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-bold truncate leading-snug">{note.title || 'Sem título'}</p>
                                                    {connections > 0 && (
                                                        <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono shrink-0">
                                                            {connections}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                                    {(note.content || '').replace(/[#*`[\]]/g, '') || 'Sem conteúdo adicional'}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => toggleStarNote(note.id, e)}
                                                    className={`p-1 rounded hover:bg-white/10 ${isStarred ? 'text-yellow-400 opacity-100' : 'text-slate-500'}`}
                                                    title={isStarred ? 'Remover favorito' : 'Favoritar nota'}
                                                >
                                                    <Star size={12} fill={isStarred ? 'currentColor' : 'none'} />
                                                </button>
                                                {note.id && (
                                                    <button
                                                        onClick={(e) => handleDeleteNote(note.id, e)}
                                                        className="p-1 rounded text-red-400 hover:bg-red-500/20"
                                                        title="Excluir nota"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>

                    {/* IMPORTADOR DE ARQUIVOS (PDF, DOCX, TXT, MD) */}
                    <div className="glass-panel p-3 border-white/5 bg-[#0E1322] space-y-2">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                            <Upload size={12} className="text-purple-400" />
                            Importar para o Cérebro
                        </h4>
                        <label className="border border-dashed border-white/10 hover:border-purple-500/40 bg-white/5 hover:bg-white/10 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all gap-1 text-center group">
                            <UploadCloud size={20} className="text-slate-500 group-hover:text-purple-400 transition-all" />
                            <span className="text-[10px] font-bold text-slate-300">Upload de Arquivo</span>
                            <span className="text-[9px] text-slate-500">PDF, Word, TXT ou MD (Max 15MB)</span>
                            <input
                                type="file"
                                accept=".pdf,.docx,.txt,.md,.markdown"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploadingFile}
                            />
                        </label>
                        {uploadingFile && (
                            <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-purple-400 font-semibold animate-pulse">
                                <span>🌀</span> Processando e indexando nota...
                            </div>
                        )}
                    </div>

                </div>

                {/* ── COLUNA 2: WORKSPACE (EDITOR / PREVIEW / TEIA) (9 COLUNAS) ── */}
                <div className="lg:col-span-9 space-y-4">

                    {/* ── BARRA DE ABAS (TAB BAR) ── */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-1">
                        <div className="flex items-center gap-1 overflow-x-auto max-w-[70%]">
                            {openTabs.map(tab => {
                                const isActive = tab.id === activeTabId;
                                return (
                                    <div
                                        key={tab.id}
                                        onClick={() => {
                                            const note = notes.find(n => n.id === tab.id);
                                            if (note) openNoteInTab(note);
                                        }}
                                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-semibold cursor-pointer transition-all border-b-2 ${
                                            isActive
                                                ? 'bg-[#151C2E] text-white border-purple-500 shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
                                        }`}
                                    >
                                        <FileText size={12} className={isActive ? 'text-purple-400' : 'text-slate-500'} />
                                        <span className="truncate max-w-[140px]">{tab.title}</span>
                                        {isActive && isDirty && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" title="Não salvo" />
                                        )}
                                        <button
                                            onClick={(e) => closeTab(e, tab.id)}
                                            className="p-0.5 rounded-full hover:bg-white/15 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                            title="Fechar aba"
                                        >
                                            <X size={11} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* COMUTADOR DE VISUALIZAÇÃO DO EDITOR */}
                        <div className="flex items-center gap-1 bg-[#0E1322] border border-white/10 p-0.5 rounded-xl text-xs">
                            <button
                                onClick={() => setEditorViewMode('edit')}
                                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                                    editorViewMode === 'edit' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Somente Editor"
                            >
                                <Edit3 size={12} />
                                <span>Editor</span>
                            </button>
                            <button
                                onClick={() => setEditorViewMode('split')}
                                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                                    editorViewMode === 'split' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Lado a lado (Split)"
                            >
                                <Split size={12} />
                                <span>Dividido</span>
                            </button>
                            <button
                                onClick={() => setEditorViewMode('preview')}
                                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                                    editorViewMode === 'preview' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Somente Pré-visualização"
                            >
                                <Eye size={12} />
                                <span>Leitura</span>
                            </button>
                        </div>
                    </div>

                    {/* ── ÁREA PRINCIPAL DO EDITOR / PREVIEW ── */}
                    <div className="glass-panel p-5 border-white/5 bg-[#0B0F19] space-y-4">

                        {/* TÍTULO DA NOTA & STATUS DE SALVAMENTO */}
                        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
                            <input
                                type="text"
                                value={noteTitle}
                                onChange={handleTitleChange}
                                placeholder="Título da Nota..."
                                className="w-full bg-transparent border-none text-2xl font-black text-white outline-none placeholder:text-slate-600 tracking-tight"
                            />

                            <div className="flex items-center gap-3 shrink-0">
                                {/* Indicador de Salvamento */}
                                <div className="text-[11px] font-mono flex items-center gap-1 text-slate-400">
                                    {saveStatus === 'saving' && (
                                        <span className="text-yellow-400 flex items-center gap-1">
                                            <span className="animate-spin text-xs">🌀</span> Salvando...
                                        </span>
                                    )}
                                    {saveStatus === 'saved' && (
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <Check size={12} /> Salvo na IA
                                        </span>
                                    )}
                                    {saveStatus === 'dirty' && (
                                        <span className="text-slate-400">
                                            Alterações pendentes
                                        </span>
                                    )}
                                </div>

                                {/* Botão Salvar & Sincronizar com IA */}
                                <button
                                    onClick={handleSaveNote}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 cursor-pointer"
                                >
                                    <Save size={13} />
                                    <span>Salvar & IA</span>
                                </button>
                            </div>
                        </div>

                        {/* TOOLBAR RICA DE FORMATAÇÃO MARKDOWN */}
                        <div className="flex flex-wrap items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-xl text-slate-300">
                            <button
                                type="button"
                                onClick={() => insertFormatting('**', '**', 'negrito')}
                                className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                title="Negrito (**)"
                            >
                                <Bold size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormatting('*', '*', 'itálico')}
                                className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                title="Itálico (*)"
                            >
                                <Italic size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormatting('### ', '', 'Título')}
                                className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                title="Título (###)"
                            >
                                <Heading size={14} />
                            </button>
                            <span className="w-[1px] h-4 bg-white/10 mx-1" />
                            <button
                                type="button"
                                onClick={() => insertFormatting('[[', ']]', 'Nome da Nota')}
                                className="p-1.5 rounded hover:bg-purple-500/20 text-purple-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
                                title="Link Wiki ([[Nota]])"
                            >
                                <LinkIcon size={13} />
                                <span>[[ ]]</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormatting('#', '', 'tag')}
                                className="p-1.5 rounded hover:bg-cyan-500/20 text-cyan-300 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5 text-xs font-mono font-bold"
                                title="Tag (#tag)"
                            >
                                <Hash size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormatting('- [ ] ', '', 'Tarefa')}
                                className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                title="Lista de tarefas (- [ ])"
                            >
                                <CheckSquare size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormatting('> ', '', 'Citação')}
                                className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                title="Citação (>)"
                            >
                                <Quote size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormatting('```\n', '\n```', '// Código aqui')}
                                className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                title="Bloco de Código"
                            >
                                <Code size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormatting('| Coluna 1 | Coluna 2 |\n|---|---|\n| Item 1 | Valor 1 |\n', '')}
                                className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                title="Tabela Markdown"
                            >
                                <Table size={14} />
                            </button>

                            <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-400 font-mono pr-2">
                                <span>{metrics.words} palavras</span>
                                <span>•</span>
                                <span>{metrics.chars} caracteres</span>
                                <span>•</span>
                                <span>~{metrics.readTimeMinutes} min de leitura</span>
                            </div>
                        </div>

                        {/* ÁREA DE ESCRITA & PRÉ-VISUALIZAÇÃO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* EDITOR DE TEXTO (Visível em Edit e Split) */}
                            {editorViewMode !== 'preview' && (
                                <div className={`${editorViewMode === 'edit' ? 'md:col-span-2' : 'md:col-span-1'} space-y-1`}>
                                    <textarea
                                        id="brain-markdown-editor"
                                        value={noteContent}
                                        onChange={handleContentChange}
                                        className="w-full h-[420px] bg-[#0A0D18] border border-white/10 rounded-2xl p-4 text-slate-200 outline-none focus:border-purple-500/50 transition-colors resize-none font-mono text-xs leading-relaxed"
                                        placeholder="Comece a escrever em Markdown... Digite [[Nome da Nota]] para conectar teias ou #tag para categorizar!"
                                    />
                                </div>
                            )}

                            {/* PREVIEW RENDERIZADO (Visível em Preview e Split) */}
                            {editorViewMode !== 'edit' && (
                                <div className={`${editorViewMode === 'preview' ? 'md:col-span-2' : 'md:col-span-1'} h-[420px] overflow-y-auto bg-[#0A0D18] border border-white/10 rounded-2xl p-4`}>
                                    <MarkdownRenderer
                                        content={noteContent}
                                        onWikiLinkClick={handleWikiLinkClick}
                                        onTagClick={(tag) => { setSelectedTag(tag); setSidebarTab('tags'); }}
                                        onToggleCheckbox={handleToggleCheckbox}
                                    />
                                </div>
                            )}
                        </div>

                        {/* AÇÕES ADICIONAIS & COPILOT */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                            <button
                                onClick={handleTriggerCopilot}
                                disabled={loadingCopilot}
                                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-purple-300 rounded-xl text-xs font-bold border border-purple-500/20 transition-all cursor-pointer"
                            >
                                <Sparkles size={14} className={loadingCopilot ? 'animate-spin' : ''} />
                                <span>{loadingCopilot ? 'Gerando ideias com IA...' : 'Acionar Co-piloto de IA 🤖'}</span>
                            </button>

                            <div className="text-[11px] text-slate-500 italic">
                                Dica: Use <kbd className="font-mono bg-black/40 px-1 py-0.5 rounded border border-white/5">Ctrl+S</kbd> para salvar e alimentar o bot do WhatsApp.
                            </div>
                        </div>

                        {/* PAINEL DE SUGESTÕES DO COPILOT */}
                        {copilotSuggestions && (
                            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl animate-fade-in space-y-2">
                                <h4 className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                                    <Sparkles size={14} />
                                    Sugestões e Conexões do Co-piloto de IA:
                                </h4>
                                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-[#0F172A]/80 p-3.5 rounded-xl border border-white/5">
                                    {copilotSuggestions}
                                </div>
                            </div>
                        )}

                        {/* ── PAINEL DE BACKLINKS REVERSOS (NOTAS QUE CITAM ESTA NOTA) ── */}
                        <div className="border border-white/5 bg-white/5 rounded-2xl p-3.5 space-y-2">
                            <button
                                onClick={() => setShowBacklinks(prev => !prev)}
                                className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <ArrowUpRight size={14} className="text-purple-400" />
                                    <span>Backlinks ({currentBacklinks.length})</span>
                                    <span className="text-[10px] text-slate-500 font-normal">Notas que citam [[{noteTitle}]]</span>
                                </div>
                                {showBacklinks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>

                            {showBacklinks && (
                                <div className="pt-2 space-y-1.5 border-t border-white/5">
                                    {currentBacklinks.length === 0 ? (
                                        <p className="text-[11px] text-slate-500 italic py-1">Nenhuma outra nota referencia esta nota ainda.</p>
                                    ) : (
                                        currentBacklinks.map(({ note: bNote, context }) => (
                                            <div
                                                key={bNote.id}
                                                onClick={() => openNoteInTab(bNote)}
                                                className="p-2 rounded-xl bg-black/30 hover:bg-black/50 border border-white/5 flex items-center justify-between cursor-pointer transition-all group"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-xs font-bold text-purple-300 group-hover:text-purple-200 truncate">
                                                        {bNote.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                                                        {context}
                                                    </p>
                                                </div>
                                                <ExternalLink size={12} className="text-slate-500 group-hover:text-white shrink-0" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* ── TEIA GRÁFICA EMBUTIDA (CANVAS GRAPH) ── */}
                    <div className="glass-panel p-4 border-white/5 bg-[#090D1A] space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Network size={16} className="text-cyan-400" />
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">
                                    Teia de Conexões Interativas 🕸️
                                </h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 italic hidden sm:inline">
                                    Arraste os nós • Scroll para Zoom
                                </span>
                                <button
                                    onClick={resetGraphView}
                                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 font-bold border border-white/5 transition-all cursor-pointer"
                                    title="Recentralizar Grafo"
                                >
                                    Resetar
                                </button>
                                <button
                                    onClick={() => setShowGraphModal(true)}
                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer"
                                    title="Expandir para tela cheia"
                                >
                                    <Maximize2 size={13} />
                                </button>
                            </div>
                        </div>

                        <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-white/5 bg-[#060810]">
                            <canvas
                                ref={canvasRef}
                                onMouseDown={(e) => handleCanvasMouseDown(e, false)}
                                onMouseMove={(e) => handleCanvasMouseMove(e, false)}
                                onMouseUp={handleCanvasMouseUp}
                                onMouseLeave={handleCanvasMouseUp}
                                onWheel={handleCanvasWheel}
                                className="absolute inset-0 cursor-grab active:cursor-grabbing w-full h-full"
                            />
                        </div>
                    </div>

                </div>

            </div>

            {/* ── MODAL: TEIA EM TELA CHEIA (FULLSCREEN GRAPH VIEW) ── */}
            {showGraphModal && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-6 animate-fade-in">
                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                            <Network size={22} className="text-cyan-400" />
                            <h3 className="text-lg font-black text-white">Visualizador da Teia de Conhecimento</h3>
                            <span className="text-xs text-slate-400">({notes.length} notas • {links.length} conexões)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={resetGraphView}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer"
                            >
                                Centralizar
                            </button>
                            <button
                                onClick={() => setShowGraphModal(false)}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative mt-4 rounded-2xl overflow-hidden border border-white/10 bg-[#05070E]">
                        <canvas
                            ref={modalCanvasRef}
                            onMouseDown={(e) => handleCanvasMouseDown(e, true)}
                            onMouseMove={(e) => handleCanvasMouseMove(e, true)}
                            onMouseUp={handleCanvasMouseUp}
                            onMouseLeave={handleCanvasMouseUp}
                            onWheel={handleCanvasWheel}
                            className="absolute inset-0 cursor-grab active:cursor-grabbing w-full h-full"
                        />
                    </div>
                </div>
            )}

            {/* ── MODAL: PALETA DE COMANDOS (CTRL+P) ── */}
            {showCommandPalette && (
                <div
                    onClick={() => setShowCommandPalette(false)}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-24 p-4 animate-fade-in"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-xl bg-[#0E1322] border border-white/15 rounded-2xl shadow-2xl p-4 space-y-3"
                    >
                        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3 px-1">
                            <Search className="text-purple-400" size={18} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Digite para buscar uma nota ou executar comando..."
                                className="w-full bg-transparent border-none text-white outline-none text-sm placeholder:text-slate-500"
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <kbd className="text-[10px] bg-white/10 text-slate-400 px-2 py-0.5 rounded border border-white/10 font-mono">
                                ESC
                            </kbd>
                        </div>

                        <div className="max-h-80 overflow-y-auto space-y-1">
                            <div className="text-[10px] font-black uppercase text-slate-500 px-2 py-1">Ações Rápidas</div>
                            <div
                                onClick={() => { handleCreateNewNote(); setShowCommandPalette(false); }}
                                className="p-2.5 rounded-xl hover:bg-purple-500/20 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-all text-xs font-semibold"
                            >
                                <Plus size={14} className="text-purple-400" />
                                <span>Criar Nova Nota</span>
                            </div>
                            <div
                                onClick={() => { setShowGraphModal(true); setShowCommandPalette(false); }}
                                className="p-2.5 rounded-xl hover:bg-cyan-500/20 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-all text-xs font-semibold"
                            >
                                <Network size={14} className="text-cyan-400" />
                                <span>Abrir Teia Gráfica em Tela Cheia</span>
                            </div>
                            <div
                                onClick={() => { handleTriggerCopilot(); setShowCommandPalette(false); }}
                                className="p-2.5 rounded-xl hover:bg-purple-500/20 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-all text-xs font-semibold"
                            >
                                <Sparkles size={14} className="text-purple-400" />
                                <span>Acionar Co-piloto de IA</span>
                            </div>

                            <div className="text-[10px] font-black uppercase text-slate-500 px-2 py-1 mt-2">Navegar para Nota</div>
                            {filteredNotes.slice(0, 8).map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => { openNoteInTab(n); setShowCommandPalette(false); }}
                                    className="p-2.5 rounded-xl hover:bg-white/10 text-slate-200 hover:text-white flex items-center justify-between cursor-pointer transition-all text-xs"
                                >
                                    <div className="flex items-center gap-2">
                                        <FileText size={13} className="text-slate-400" />
                                        <span className="font-semibold">{n.title}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">Abrir</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
