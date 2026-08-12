import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import {
    Database, Sparkles, Plus, Trash2, Edit3, Search, Play, HelpCircle,
    ChevronRight, BrainCircuit, Network, BookOpen, Clock, Lightbulb, Save, Info
} from 'lucide-react';

export default function BrainPage() {
    const [notes, setNotes] = useState([]);
    const [links, setLinks] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Editor States
    const [currentNote, setCurrentNote] = useState(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [saving, setSaving] = useState(false);

    // Copilot State
    const [copilotSuggestions, setCopilotSuggestions] = useState('');
    const [loadingCopilot, setLoadingCopilot] = useState(false);

    // Canvas / Efeito Teia Ref
    const canvasRef = useRef(null);
    const nodesRef = useRef([]);
    const linksRef = useRef([]);
    const requestRef = useRef(null);

    // Layout configurations (split, graph-focus, editor-focus)
    const [layoutMode, setLayoutMode] = useState('split');

    // Zoom and Pan configurations for the Obsidian Graph Canvas
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const zoomRef = useRef(1);
    const panRef = useRef({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });

    // Physics Configuration
    const [draggedNode, setDraggedNode] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const mousePos = useRef({ x: 0, y: 0 });

    // Life Cycle: Fetch data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/brain');
            setNotes(res.data.notes || []);
            setLinks(res.data.links || []);

            if (res.data.notes?.length > 0 && !currentNote) {
                handleSelectNote(res.data.notes[0]);
            }
        } catch (err) {
            console.error('Error fetching brain data:', err);
        }
    };

    const handleSelectNote = (note) => {
        setCurrentNote(note);
        setNoteTitle(note.title);
        setNoteContent(note.content);
        setCopilotSuggestions('');
    };

    const handleSaveNote = async () => {
        if (!noteTitle.trim()) return alert('Dê um título para a nota antes de salvar!');
        setSaving(true);
        try {
            const { data } = await api.post('/brain', {
                id: currentNote?.id || null,
                title: noteTitle,
                content: noteContent
            });

            const saved = data.note;

            // Update list
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

            // Update links
            setLinks(data.links || []);
            setCurrentNote(saved);
            alert('Nota salva com sucesso! O Cérebro da IA foi sincronizado com este conhecimento.');
        } catch (err) {
            console.error('Erro ao salvar nota:', err);
            alert('Erro ao salvar nota.');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateNewNote = () => {
        const tempNote = {
            id: null,
            title: 'Nova Nota',
            content: '# Nova Nota\n\nEscreva os tópicos do seu negócio aqui. Você pode linkar outras notas digitando o nome delas entre colchetes duplos. Exemplo: [[Script de Vendas]] ou [[Instruções do Bot]] para criar conexões de teia.'
        };
        handleSelectNote(tempNote);
    };

    const handleDeleteNote = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Tem certeza que deseja excluir esta nota do seu cérebro? A conexão com a IA também será desfeita.')) return;

        try {
            await api.delete(`/brain/${id}`);
            setNotes(prev => prev.filter(n => n.id !== id));
            setLinks(prev => prev.filter(l => l.source_note_id !== id && l.target_note_id !== id));

            if (currentNote?.id === id) {
                setCurrentNote(null);
                setNoteTitle('');
                setNoteContent('');
            }
        } catch (err) {
            console.error('Erro ao excluir:', err);
        }
    };

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

    // ── GRAPH PHYSICS ENGINE (Pure HTML5 Canvas) ──
    useEffect(() => {
        // Transforma notas e conexões em nós físicos do Canvas
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Adapta nodes
        const graphNodes = notes.map((note) => {
            // Mantém coordenadas anteriores para não reiniciar a física ao digitar
            const existing = nodesRef.current.find(n => n.id === note.id);
            return {
                id: note.id,
                title: note.title,
                x: existing ? existing.x : Math.random() * 300 + 100,
                y: existing ? existing.y : Math.random() * 300 + 100,
                vx: existing ? existing.vx : 0,
                vy: existing ? existing.vy : 0,
                radius: 12 + Math.min(note.content.length / 80, 20), // tamanho cresce com o conteúdo
                color: note.id === currentNote?.id ? '#a855f7' : '#3b82f6',
            };
        });

        nodesRef.current = graphNodes;
        linksRef.current = links;

    }, [notes, links, currentNote]);

    // Main Loop da Física do Gráfico
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const updatePhysics = () => {
            const nodes = nodesRef.current;
            const linksData = linksRef.current;
            const width = canvas.width;
            const height = canvas.height;

            // 1. Força de Gravidade/Centro de atração
            const centerX = width / 2;
            const centerY = height / 2;

            nodes.forEach(node => {
                // Atração magnética simples para o meio
                const dx = centerX - node.x;
                const dy = centerY - node.y;
                node.vx += dx * 0.0003;
                node.vy += dy * 0.0003;

                // 2. Colisão/Repulsão entre nós (para que bolinhas não fiquem coladas)
                nodes.forEach(other => {
                    if (node.id === other.id) return;
                    const kx = node.x - other.x;
                    const ky = node.y - other.y;
                    const dist = Math.sqrt(kx * kx + ky * ky) || 1;
                    const minDist = node.radius + other.radius + 40; // distância ideal

                    if (dist < minDist) {
                        const force = (minDist - dist) * 0.03;
                        const forceX = (kx / dist) * force;
                        const forceY = (ky / dist) * force;
                        node.vx += forceX;
                        node.vy += forceY;
                        other.vx -= forceX;
                        other.vy -= forceY;
                    }
                });

                // 3. Força de tração de links (mola elástica entre notas conexas)
                linksData.forEach(link => {
                    const source = nodes.find(n => n.id === link.source_note_id);
                    const target = nodes.find(n => n.id === link.target_note_id);

                    if (source && target) {
                        const lx = target.x - source.x;
                        const ly = target.y - source.y;
                        const lDist = Math.sqrt(lx * lx + ly * ly) || 1;
                        const targetDist = 100; // tamanho ideal da corda

                        const force = (lDist - targetDist) * 0.002;
                        const fx = (lx / lDist) * force;
                        const fy = (ly / lDist) * force;

                        source.vx += fx;
                        source.vy += fy;
                        target.vx -= fx;
                        target.vy -= fy;
                    }
                });

                // Atualiza posição + fricção
                node.x += node.vx;
                node.y += node.vy;
                node.vx *= 0.85; // fricção
                node.vy *= 0.85;

                // Limites da tela
                if (node.x < 30) node.x = 30;
                if (node.x > width - 30) node.x = width - 30;
                if (node.y < 30) node.y = 30;
                if (node.y > height - 30) node.y = height - 30;
            });

            // Detecção de Hover
            const mx = mousePos.current.x;
            const my = mousePos.current.y;
            let foundHover = null;
            nodes.forEach(node => {
                const dx = node.x - mx;
                const dy = node.y - my;
                if (dx * dx + dy * dy < node.radius * node.radius) {
                    foundHover = node;
                }
            });
            setHoveredNode(foundHover);
        };

        const drawGraph = () => {
            if (!canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const nodes = nodesRef.current;
            const linksData = linksRef.current;

            ctx.save();
            ctx.translate(panRef.current.x, panRef.current.y);
            ctx.scale(zoomRef.current, zoomRef.current);

            // 1. Desenha as conexões (Teias)
            ctx.lineWidth = 1.5;
            linksData.forEach(link => {
                const source = nodes.find(n => n.id === link.source_note_id);
                const target = nodes.find(n => n.id === link.target_note_id);

                if (source && target) {
                    // Gradiente linear translúcido entre pontos
                    const grad = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
                    grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)'); // Púrpura
                    grad.addColorStop(1, 'rgba(59, 130, 246, 0.4)');  // Azul

                    ctx.strokeStyle = grad;
                    ctx.beginPath();
                    ctx.moveTo(source.x, source.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.stroke();
                }
            });

            // 2. Desenha os nós (Notas)
            nodes.forEach(node => {
                const isCurrent = node.id === currentNote?.id;
                const isHovered = hoveredNode && hoveredNode.id === node.id;

                // Sombra brilhante de neon nos pontos ativos ou sob o cursor
                ctx.shadowBlur = (isCurrent || isHovered) ? 15 : 4;
                ctx.shadowColor = isCurrent ? '#a855f7' : '#3b82f6';

                // Estilo de preenchimento
                ctx.fillStyle = isCurrent
                    ? 'rgba(168, 85, 247, 0.9)' // roxo neon
                    : isHovered
                        ? 'rgba(59, 130, 246, 0.9)' // azul forte
                        : 'rgba(30, 41, 59, 0.8)';   // cinza escuro translúcido

                ctx.strokeStyle = isCurrent ? '#d8b4fe' : '#60a5fa';
                ctx.lineWidth = (isCurrent || isHovered) ? 3 : 1.5;

                // Círculo
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // 3. Texto da Nota
                ctx.shadowBlur = 0; // Desativa sombra para desenhar texto limpo
                ctx.fillStyle = (isCurrent || isHovered) ? '#ffffff' : '#94a3b8';
                ctx.font = (isCurrent || isHovered) ? 'bold 11px Inter' : '10px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(node.title, node.x, node.y - node.radius - 6);
            });

            ctx.restore();
        };

        const animateLoop = () => {
            // Se tiver arrastando, atualiza nó para posição da mira do mouse
            if (draggedNode) {
                const target = nodesRef.current.find(n => n.id === draggedNode.id);
                if (target) {
                    target.x = mousePos.current.x;
                    target.y = mousePos.current.y;
                    target.vx = 0;
                    target.vy = 0;
                }
            }

            updatePhysics();
            drawGraph();
            requestRef.current = requestAnimationFrame(animateLoop);
        };

        animateLoop();

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [currentNote, draggedNode, hoveredNode]);

    // Redimensionamento do canvas dinâmico
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (canvas && canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight || 450;
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // trigger inicial

        return () => window.removeEventListener('resize', handleResize);
    }, [searchQuery]);

    // Click Canvas & Pan & Zoom
    const handleCanvasMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        // Transforma coordenadas reais do mouse baseado no zoom e pan atuais
        const x = (clientX - panRef.current.x) / zoomRef.current;
        const y = (clientY - panRef.current.y) / zoomRef.current;

        const clickedNode = nodesRef.current.find(node => {
            const dx = node.x - x;
            const dy = node.y - y;
            return dx * dx + dy * dy < node.radius * node.radius;
        });

        if (clickedNode) {
            setDraggedNode(clickedNode);
            // Se clicou, seleciona a nota correspondente
            const found = notes.find(n => n.id === clickedNode.id);
            if (found) {
                handleSelectNote(found);
                // Retorna ao modo dividido automaticamente se o usuário focar em uma nota e estiver no modo tela cheia
                if (layoutMode === 'graph-focus') {
                    setLayoutMode('split');
                }
            }
        } else {
            // Se clicou no fundo, ativa o arrasto de tela (Pan)
            isPanningRef.current = true;
            panStartRef.current = {
                x: clientX - panRef.current.x,
                y: clientY - panRef.current.y
            };
        }
    };

    const handleCanvasMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        // Se estiver fazendo Pan (arrastando o fundo)
        if (isPanningRef.current) {
            const newPan = {
                x: clientX - panStartRef.current.x,
                y: clientY - panStartRef.current.y
            };
            panRef.current = newPan;
            setPan(newPan);
        }

        // Transforma coordenadas do mouse para o espaço do canvas
        const x = (clientX - panRef.current.x) / zoomRef.current;
        const y = (clientY - panRef.current.y) / zoomRef.current;
        mousePos.current = { x, y };
    };

    const handleCanvasMouseUp = () => {
        setDraggedNode(null);
        isPanningRef.current = false;
    };

    const handleCanvasWheel = (e) => {
        e.preventDefault();
        const zoomFactor = 1.08;
        let newZoom = zoomRef.current;
        if (e.deltaY < 0) {
            newZoom *= zoomFactor;
        } else {
            newZoom /= zoomFactor;
        }
        // Limita o zoom entre 0.15x e 4.0x
        newZoom = Math.max(0.15, Math.min(newZoom, 4.0));
        zoomRef.current = newZoom;
        setZoom(newZoom);
    };

    // Zoom Buttons
    const handleZoomIn = () => {
        const newZoom = Math.min(zoomRef.current * 1.25, 4.0);
        zoomRef.current = newZoom;
        setZoom(newZoom);
    };

    const handleZoomOut = () => {
        const newZoom = Math.max(zoomRef.current / 1.25, 0.15);
        zoomRef.current = newZoom;
        setZoom(newZoom);
    };

    const handleResetView = () => {
        zoomRef.current = 1;
        panRef.current = { x: 0, y: 0 };
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Filtragem de Busca
    const filteredNotes = notes.filter(note => {
        return note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-20">

            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-6">
                <div>
                    <h2 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                        <BrainCircuit className="text-purple-400" size={36} />
                        Segundo Cérebro
                    </h2>
                    <p className="text-slate-400 mt-2 text-lg">
                        Crie sua teia de anotações interconectadas com links bidirecionais [[Nota]]. A IA aprende tudo instantaneamente!
                    </p>
                </div>

                <div className="flex items-center gap-3 self-stretch md:self-auto justify-between sm:justify-start">
                    {/* Seletor visual do modo de Layout para Obsidian Obsidian-Style Workspace */}
                    <div className="flex bg-[#1E293B] border border-white/5 p-1 rounded-xl shrink-0">
                        <button
                            onClick={() => setLayoutMode('split')}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${layoutMode === 'split' ? 'bg-purple-500 text-white shadow-md shadow-purple-550/20' : 'text-slate-400 hover:text-white'}`}
                            title="Ver editor e teia divididos"
                        >
                            Dividido 📝🕸️
                        </button>
                        <button
                            onClick={() => setLayoutMode('graph-focus')}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${layoutMode === 'graph-focus' ? 'bg-purple-500 text-white shadow-md shadow-purple-555/20' : 'text-slate-400 hover:text-white'}`}
                            title="Foco total na teia gráfica interativa"
                        >
                            Teia Cheia 🕸️
                        </button>
                        <button
                            onClick={() => setLayoutMode('editor-focus')}
                            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${layoutMode === 'editor-focus' ? 'bg-purple-500 text-white shadow-md shadow-purple-555/20' : 'text-slate-400 hover:text-white'}`}
                            title="Visualização expandida para escrita e leitura"
                        >
                            Escrita ✍️
                        </button>
                    </div>

                    <button
                        onClick={handleCreateNewNote}
                        className="flex items-center gap-2 px-5 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl text-white font-bold shadow-lg shadow-purple-500/25 transition-all cursor-pointer whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Nova Nota 📝
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* COL 1: SIDEBAR NOTES (Visível no modo Split e Editor-Focus) */}
                {layoutMode !== 'graph-focus' && (
                    <div className="lg:col-span-1 space-y-4 animate-fade-in shrink-0">
                        <div className="glass-panel p-4 border-white/5 flex items-center gap-2">
                            <Search className="text-slate-500 shrink-0" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar no cérebro..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-none text-slate-200 outline-none text-sm placeholder:text-slate-600"
                            />
                        </div>

                        <div className="glass-panel p-4 max-h-[500px] overflow-y-auto space-y-2 border-white/5">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2 mb-3">Anotações ({filteredNotes.length})</h4>
                            {filteredNotes.length === 0 ? (
                                <p className="text-xs text-slate-600 italic text-center py-6">Nenhuma nota encontrada.</p>
                            ) : (
                                filteredNotes.map(note => {
                                    const isActive = currentNote?.id === note.id;
                                    return (
                                        <div
                                            key={note.id || 'new'}
                                            onClick={() => handleSelectNote(note)}
                                            className={`p-3 rounded-lg cursor-pointer transition-all flex justify-between items-center group ${isActive
                                                ? 'bg-purple-500/10 border border-purple-500/30 text-purple-300'
                                                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-transparent'
                                                }`}
                                        >
                                            <div className="flex-1 min-w-0 pr-2">
                                                <p className="text-sm font-bold truncate">{note.title}</p>
                                                <p className="text-[10px] text-slate-600 truncate mt-0.5">
                                                    {note.content?.replace(/[#*`[\]]/g, '') || 'Sem conteúdo'}
                                                </p>
                                            </div>
                                            {note.id && (
                                                <button
                                                    onClick={(e) => handleDeleteNote(note.id, e)}
                                                    className="p-1 px-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                                                    title="Deletar Nota"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-2 text-xs text-purple-300/80 leading-snug">
                            <h5 className="font-bold flex items-center gap-1 text-white">
                                <Info size={12} />
                                Dica Pro:
                            </h5>
                            Para criar conexões de teia, digite o nome de outra nota cercado por colchetes duplos, por exemplo: <strong>[[FAQ Central]]</strong>.
                        </div>
                    </div>
                )}

                {/* COL 2 & 3: EDITOR (Visível em Split e Editor-Focus) */}
                {layoutMode !== 'graph-focus' && (
                    <div className={`${layoutMode === 'editor-focus' ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6 animate-fade-in`}>
                        <div className="glass-panel p-6 border-white/5 space-y-4 text-left">

                            {/* Título */}
                            <div className="space-y-1">
                                <input
                                    type="text"
                                    value={noteTitle}
                                    onChange={e => setNoteTitle(e.target.value)}
                                    className="w-full bg-transparent border-none text-2xl font-black text-white outline-none focus:border-b focus:border-white/10 pb-2 placeholder:text-slate-600"
                                    placeholder="Título da Nota"
                                />
                                <span className="text-[10px] text-slate-600 block italic leading-tight">
                                    {currentNote?.id ? `Última edição: ${new Date(currentNote.updated_at).toLocaleString()}` : 'Nova Nota (Não salva)'}
                                </span>
                            </div>

                            {/* Note Content */}
                            <div className="space-y-2">
                                <textarea
                                    value={noteContent}
                                    onChange={e => setNoteContent(e.target.value)}
                                    className="w-full h-80 bg-[#0F172A] border border-white/10 rounded-2xl p-4 text-slate-200 outline-none focus:border-purple-500/50 transition-colors resize-none font-mono text-sm leading-relaxed"
                                    placeholder="Escreva em Markdown... Use [[Nome da Nota]] para conectar!"
                                />
                            </div>

                            {/* Editor Actions */}
                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                <button
                                    onClick={handleTriggerCopilot}
                                    disabled={loadingCopilot}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-purple-300 rounded-xl text-xs font-bold border border-purple-500/20 transition-all cursor-pointer"
                                >
                                    <Sparkles size={14} className={loadingCopilot ? 'animate-spin' : ''} />
                                    {loadingCopilot ? 'Co-piloto pensando...' : 'Acionar Co-piloto de IA 🤖'}
                                </button>

                                <button
                                    onClick={handleSaveNote}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 cursor-pointer"
                                >
                                    <Save size={14} />
                                    {saving ? 'Sincronizando...' : 'Salvar Nota & Alimentar IA'}
                                </button>
                            </div>
                        </div>

                        {/* COPILOT SUGGESTIONS PANEL */}
                        {copilotSuggestions && (
                            <div className="glass-panel p-6 bg-purple-500/5 border-purple-500/20 animate-fade-in space-y-3">
                                <h4 className="text-sm font-black text-purple-400 flex items-center gap-2">
                                    <Sparkles size={16} />
                                    Insights do Co-piloto de IA
                                </h4>
                                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-[#0F172A]/70 p-4 rounded-xl border border-white/5 text-left">
                                    {copilotSuggestions}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* COL 4: VIZ GRAPH / EFEITO TEIA (Visível no modo Split e Graph-Focus) */}
                {layoutMode !== 'editor-focus' && (
                    <div className={`${layoutMode === 'graph-focus' ? 'lg:col-span-4 min-h-[650px]' : 'lg:col-span-1 min-h-[450px]'} flex flex-col h-full animate-fade-in`}>
                        <div className="glass-panel p-4 border-white/5 flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Network size={14} className="text-purple-400" />
                                Teia de Conexões 🕸️
                            </h4>
                            <span className="text-[10px] text-slate-500 italic">Mouse-drag para mover nós / Scroll para Zoom / Fundo-drag para Pan</span>
                        </div>

                        <div className="glass-panel flex-1 bg-[#090D1A] border-white/5 relative overflow-hidden rounded-b-2xl" style={{ height: layoutMode === 'graph-focus' ? '600px' : '400px' }}>
                            <canvas
                                ref={canvasRef}
                                onMouseDown={handleCanvasMouseDown}
                                onMouseMove={handleCanvasMouseMove}
                                onMouseUp={handleCanvasMouseUp}
                                onMouseLeave={handleCanvasMouseUp}
                                onWheel={handleCanvasWheel}
                                className="absolute inset-0 cursor-grab active:cursor-grabbing w-full h-full"
                            />

                            {/* Botoes Flutuantes de Controle do Canvas */}
                            <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl">
                                <button
                                    onClick={handleZoomIn}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/15 text-white active:scale-95 transition-all text-base font-bold border border-white/5 cursor-pointer"
                                    title="Aumentar Zoom"
                                >
                                    ＋
                                </button>
                                <button
                                    onClick={handleZoomOut}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/15 text-white active:scale-95 transition-all text-base font-bold border border-white/5 cursor-pointer"
                                    title="Reduzir Zoom"
                                >
                                    －
                                </button>
                                <button
                                    onClick={handleResetView}
                                    className="px-2.5 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/15 text-[10px] font-black uppercase text-slate-300 hover:text-white transition-all border border-white/5 cursor-pointer"
                                    title="Resetar Visão Geral"
                                >
                                    Reset
                                </button>
                            </div>

                            {nodesRef.current.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-10 pointer-events-none">
                                    <p className="text-xs text-slate-600 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">Escreva e salve a sua primeira nota para iniciar o mapa de teia...</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
