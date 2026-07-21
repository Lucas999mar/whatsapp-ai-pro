import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    BrainCircuit, Plus, Trash2, Save, Download, ArrowLeft,
    ZoomIn, ZoomOut, Maximize2, Palette, Type, Link2, Unlink,
    Copy, RotateCcw, ChevronDown, Sparkles, Search, X, Edit3,
    FileText, GitBranch, Target, Users, BarChart3, Map, Workflow
} from 'lucide-react';
import api from '../api/api';

// ── TEMPLATE DEFINITIONS (Mirror do backend para UI instantânea) ──
const TEMPLATES = {
    blank: { name: 'Mapa em Branco', description: 'Comece do zero', icon: '🧠', color: '#25D366' },
    brainstorming: { name: 'Brainstorming', description: 'Organize ideias em categorias', icon: '💡', color: '#F59E0B' },
    flowchart: { name: 'Fluxograma', description: 'Processos e decisões', icon: '🔄', color: '#3B82F6' },
    retrospective: { name: 'Retrospectiva', description: 'Equipe: bom, melhorar, ações', icon: '🔍', color: '#8B5CF6' },
    swot: { name: 'Análise SWOT', description: 'Forças, fraquezas, oportunidades', icon: '📊', color: '#EF4444' },
    projectPlan: { name: 'Planejamento', description: 'Fases e tarefas', icon: '📋', color: '#EC4899' },
    userJourney: { name: 'Jornada do Cliente', description: 'Experiência do usuário', icon: '🗺️', color: '#14B8A6' },
};

const NODE_COLORS = [
    '#25D366', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
    '#EC4899', '#14B8A6', '#6366F1', '#F97316', '#06B6D4',
    '#84CC16', '#A855F7', '#FBBF24', '#34D399', '#60A5FA',
];

// ── MINI COMPONENT: Color Picker ──
function ColorPicker({ currentColor, onSelect, onClose }) {
    return (
        <div className="absolute top-full left-0 mt-2 p-3 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl z-[100] animate-fadeIn">
            <div className="grid grid-cols-5 gap-2">
                {NODE_COLORS.map(c => (
                    <button
                        key={c}
                        onClick={() => { onSelect(c); onClose(); }}
                        className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-125 ${currentColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ──
export default function MindMapPage() {
    // State: Views
    const [view, setView] = useState('gallery'); // 'gallery' | 'editor'
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // State: Editor
    const [currentMap, setCurrentMap] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [draggingNode, setDraggingNode] = useState(null);
    const [connectingFrom, setConnectingFrom] = useState(null);
    const [editingNode, setEditingNode] = useState(null);
    const [editText, setEditText] = useState('');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [mapTitle, setMapTitle] = useState('');
    const [editingTitle, setEditingTitle] = useState(false);

    // State: Canvas
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Refs
    const canvasRef = useRef(null);
    const svgRef = useRef(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const saveTimeoutRef = useRef(null);
    const editInputRef = useRef(null);

    // ── LOAD MAPS ──
    useEffect(() => {
        loadMaps();
    }, []);

    const loadMaps = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/mindmaps');
            setMaps(data || []);
        } catch (err) {
            console.error('Erro ao carregar mapas:', err);
            setMaps([]);
        } finally {
            setLoading(false);
        }
    };

    // ── CREATE MAP ──
    const createMap = async (template = 'blank') => {
        try {
            const tpl = TEMPLATES[template];
            const { data } = await api.post('/mindmaps', {
                title: tpl.name,
                description: tpl.description,
                template
            });
            // Parse nodes/edges
            const parsedNodes = typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes;
            const parsedEdges = typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges;
            setCurrentMap(data);
            setNodes(parsedNodes);
            setEdges(parsedEdges);
            setMapTitle(data.title);
            setView('editor');
            setShowTemplateModal(false);
            setZoom(1);
            setPanOffset({ x: 0, y: 0 });
            loadMaps(); // Refresh list in background
        } catch (err) {
            alert('Erro ao criar mapa: ' + err.message);
        }
    };

    // ── OPEN MAP ──
    const openMap = async (mapId) => {
        try {
            setLoading(true);
            const { data } = await api.get(`/mindmaps/${mapId}`);
            const parsedNodes = typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes;
            const parsedEdges = typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges;
            setCurrentMap(data);
            setNodes(parsedNodes);
            setEdges(parsedEdges);
            setMapTitle(data.title);
            setView('editor');
            setZoom(1);
            setPanOffset({ x: 0, y: 0 });
        } catch (err) {
            alert('Erro ao abrir mapa: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── DELETE MAP ──
    const deleteMap = async (mapId, e) => {
        e?.stopPropagation();
        if (!confirm('Deseja excluir este mapa mental?')) return;
        try {
            await api.delete(`/mindmaps/${mapId}`);
            setMaps(prev => prev.filter(m => m.id !== mapId));
        } catch (err) {
            alert('Erro ao excluir: ' + err.message);
        }
    };

    // ── AUTO-SAVE (debounced) ──
    const triggerAutoSave = useCallback(() => {
        if (!currentMap) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                setSaving(true);
                await api.put(`/mindmaps/${currentMap.id}`, {
                    title: mapTitle,
                    nodes,
                    edges
                });
            } catch (err) {
                console.error('Erro auto-save:', err);
            } finally {
                setSaving(false);
            }
        }, 1500);
    }, [currentMap, nodes, edges, mapTitle]);

    useEffect(() => {
        if (view === 'editor' && currentMap) {
            triggerAutoSave();
        }
    }, [nodes, edges, mapTitle]);

    // ── MANUAL SAVE ──
    const saveMap = async () => {
        if (!currentMap) return;
        try {
            setSaving(true);
            await api.put(`/mindmaps/${currentMap.id}`, { title: mapTitle, nodes, edges });
        } catch (err) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── NODE OPERATIONS ──
    const addNode = (parentId = null) => {
        const id = 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const parentNode = parentId ? nodes.find(n => n.id === parentId) : null;

        const angle = Math.random() * Math.PI * 2;
        const dist = 150 + Math.random() * 80;

        const newNode = {
            id,
            text: 'Novo Nó',
            x: parentNode ? parentNode.x + Math.cos(angle) * dist : 400 + Math.random() * 200 - 100,
            y: parentNode ? parentNode.y + Math.sin(angle) * dist : 300 + Math.random() * 200 - 100,
            color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
            size: 'sm',
            shape: 'rounded'
        };

        setNodes(prev => [...prev, newNode]);

        if (parentId) {
            setEdges(prev => [...prev, { from: parentId, to: id }]);
        }

        setSelectedNode(id);
        // Enter edit mode
        setEditingNode(id);
        setEditText('Novo Nó');
    };

    const deleteNode = (nodeId) => {
        if (!nodeId) return;
        setNodes(prev => prev.filter(n => n.id !== nodeId));
        setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
        setSelectedNode(null);
        setEditingNode(null);
    };

    const duplicateNode = (nodeId) => {
        const original = nodes.find(n => n.id === nodeId);
        if (!original) return;
        const id = 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const newNode = {
            ...original,
            id,
            text: original.text + ' (Cópia)',
            x: original.x + 40,
            y: original.y + 40
        };
        setNodes(prev => [...prev, newNode]);
        setSelectedNode(id);
    };

    const updateNodeColor = (nodeId, color) => {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, color } : n));
    };

    const updateNodeText = (nodeId, text) => {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, text } : n));
        setEditingNode(null);
    };

    const cycleNodeSize = (nodeId) => {
        const sizes = ['sm', 'md', 'lg'];
        setNodes(prev => prev.map(n => {
            if (n.id !== nodeId) return n;
            const idx = sizes.indexOf(n.size || 'md');
            return { ...n, size: sizes[(idx + 1) % sizes.length] };
        }));
    };

    const cycleNodeShape = (nodeId) => {
        const shapes = ['rounded', 'pill', 'diamond'];
        setNodes(prev => prev.map(n => {
            if (n.id !== nodeId) return n;
            const idx = shapes.indexOf(n.shape || 'rounded');
            return { ...n, shape: shapes[(idx + 1) % shapes.length] };
        }));
    };

    // ── EDGE OPERATIONS ──
    const startConnect = (nodeId) => {
        setConnectingFrom(nodeId);
    };

    const finishConnect = (nodeId) => {
        if (connectingFrom && connectingFrom !== nodeId) {
            // Check if edge already exists
            const exists = edges.some(e =>
                (e.from === connectingFrom && e.to === nodeId) ||
                (e.from === nodeId && e.to === connectingFrom)
            );
            if (!exists) {
                setEdges(prev => [...prev, { from: connectingFrom, to: nodeId }]);
            }
        }
        setConnectingFrom(null);
    };

    const removeEdge = (from, to) => {
        setEdges(prev => prev.filter(e => !(e.from === from && e.to === to)));
    };

    // ── CANVAS HELPERS ──
    const screenToCanvas = (screenX, screenY) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: screenX, y: screenY };
        return {
            x: (screenX - rect.left - panOffset.x) / zoom,
            y: (screenY - rect.top - panOffset.y) / zoom
        };
    };

    const getNodeDimensions = (node) => {
        const sizeMap = { sm: { w: 120, h: 40 }, md: { w: 160, h: 50 }, lg: { w: 200, h: 60 } };
        return sizeMap[node.size] || sizeMap.md;
    };

    // ── MOUSE HANDLERS ──
    const handleCanvasMouseDown = (e) => {
        if (e.target === canvasRef.current || e.target === svgRef.current || e.target.tagName === 'svg') {
            setSelectedNode(null);
            setEditingNode(null);
            setShowColorPicker(false);
            if (connectingFrom) {
                setConnectingFrom(null);
                return;
            }
            setIsPanning(true);
            setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        }
    };

    const handleCanvasMouseMove = (e) => {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setMousePos(canvasPos);

        if (isPanning) {
            setPanOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
            return;
        }

        if (draggingNode) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const canvasX = (e.clientX - rect.left - panOffset.x) / zoom;
            const canvasY = (e.clientY - rect.top - panOffset.y) / zoom;
            setNodes(prev => prev.map(n =>
                n.id === draggingNode
                    ? { ...n, x: canvasX - dragOffsetRef.current.x, y: canvasY - dragOffsetRef.current.y }
                    : n
            ));
        }
    };

    const handleCanvasMouseUp = () => {
        setIsPanning(false);
        setDraggingNode(null);
    };

    const handleNodeMouseDown = (e, nodeId) => {
        e.stopPropagation();
        if (connectingFrom) {
            finishConnect(nodeId);
            return;
        }
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const canvasX = (e.clientX - rect.left - panOffset.x) / zoom;
        const canvasY = (e.clientY - rect.top - panOffset.y) / zoom;

        dragOffsetRef.current = { x: canvasX - node.x, y: canvasY - node.y };
        setDraggingNode(nodeId);
        setSelectedNode(nodeId);
    };

    const handleNodeDoubleClick = (e, nodeId) => {
        e.stopPropagation();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        setEditingNode(nodeId);
        setEditText(node.text);
        setTimeout(() => editInputRef.current?.focus(), 50);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setZoom(prev => Math.max(0.2, Math.min(3, prev + delta)));
    };

    // ── ZOOM CONTROLS ──
    const zoomIn = () => setZoom(prev => Math.min(3, prev + 0.2));
    const zoomOut = () => setZoom(prev => Math.max(0.2, prev - 0.2));
    const resetView = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

    // ── EXPORT AS PNG ──
    const exportAsPng = () => {
        const svgEl = svgRef.current;
        if (!svgEl) return;

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            const dim = getNodeDimensions(node);
            minX = Math.min(minX, node.x - dim.w / 2 - 20);
            minY = Math.min(minY, node.y - dim.h / 2 - 20);
            maxX = Math.max(maxX, node.x + dim.w / 2 + 20);
            maxY = Math.max(maxY, node.y + dim.h / 2 + 20);
        });

        const width = maxX - minX + 60;
        const height = maxY - minY + 60;

        // Create off-screen SVG
        const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - 30} ${minY - 30} ${width} ${height}">
        <rect x="${minX - 30}" y="${minY - 30}" width="${width}" height="${height}" fill="#0B0F19"/>
        ${svgEl.innerHTML}
      </svg>
    `;

        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        const img = new Image();
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `${mapTitle || 'mindmap'}.png`;
            a.click();
        };
        img.src = url;
    };

    // ── BACK TO GALLERY ──
    const backToGallery = async () => {
        if (currentMap) {
            try {
                await api.put(`/mindmaps/${currentMap.id}`, { title: mapTitle, nodes, edges });
            } catch (e) { /* silencioso */ }
        }
        setView('gallery');
        setCurrentMap(null);
        setSelectedNode(null);
        setEditingNode(null);
        setConnectingFrom(null);
        loadMaps();
    };

    // ── RENDER: EDGE SVG ──
    const renderEdge = (edge, idx) => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return null;

        const fromDim = getNodeDimensions(fromNode);
        const toDim = getNodeDimensions(toNode);

        // Calculate edge points (center of nodes)
        const x1 = fromNode.x + fromDim.w / 2;
        const y1 = fromNode.y + fromDim.h / 2;
        const x2 = toNode.x + toDim.w / 2;
        const y2 = toNode.y + toDim.h / 2;

        // Smooth curve
        const dx = x2 - x1;
        const dy = y2 - y1;
        const cx1 = x1 + dx * 0.4;
        const cy1 = y1;
        const cx2 = x2 - dx * 0.4;
        const cy2 = y2;

        const isSelected = selectedNode === edge.from || selectedNode === edge.to;

        return (
            <g key={`edge-${idx}`}>
                <path
                    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                    stroke={isSelected ? '#25D366' : 'rgba(148,163,184,0.3)'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    fill="none"
                    strokeDasharray={edge.label ? '6,4' : 'none'}
                    className="transition-all duration-300"
                />
                {/* Delete button on hover */}
                <circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r="8"
                    fill="#EF4444"
                    opacity="0"
                    className="edge-delete-btn"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); removeEdge(edge.from, edge.to); }}
                >
                    <title>Remover conexão</title>
                </circle>
                {edge.label && (
                    <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 - 12}
                        textAnchor="middle"
                        fill="rgba(148,163,184,0.7)"
                        fontSize="11"
                        fontWeight="500"
                    >
                        {edge.label}
                    </text>
                )}
            </g>
        );
    };

    // ── RENDER: NODE ──
    const renderNode = (node) => {
        const dim = getNodeDimensions(node);
        const isSelected = selectedNode === node.id;
        const isEditing = editingNode === node.id;
        const isConnecting = connectingFrom === node.id;

        let borderRadius;
        let clipPath;
        if (node.shape === 'pill') {
            borderRadius = '9999px';
        } else if (node.shape === 'diamond') {
            borderRadius = '8px';
            clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
        } else {
            borderRadius = '12px';
        }

        const diamondScale = node.shape === 'diamond' ? 1.3 : 1;

        return (
            <foreignObject
                key={node.id}
                x={node.x}
                y={node.y}
                width={dim.w * diamondScale}
                height={dim.h * diamondScale}
                style={{ overflow: 'visible' }}
            >
                <div
                    className={`group relative flex items-center justify-center text-center select-none transition-all duration-200 ${draggingNode === node.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{
                        width: dim.w * diamondScale,
                        height: dim.h * diamondScale,
                        borderRadius,
                        clipPath,
                        background: `linear-gradient(135deg, ${node.color}22, ${node.color}11)`,
                        border: `2px solid ${isSelected ? node.color : node.color + '55'}`,
                        boxShadow: isSelected
                            ? `0 0 20px ${node.color}40, 0 0 40px ${node.color}15`
                            : isConnecting
                                ? `0 0 25px ${node.color}60`
                                : `0 2px 8px rgba(0,0,0,0.3)`,
                        backdropFilter: 'blur(8px)',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
                >
                    {/* Pulse ring for connecting mode */}
                    {isConnecting && (
                        <div
                            className="absolute inset-0 rounded-full animate-ping"
                            style={{ border: `2px solid ${node.color}`, borderRadius, opacity: 0.4 }}
                        />
                    )}

                    {isEditing ? (
                        <input
                            ref={editInputRef}
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    updateNodeText(node.id, editText);
                                } else if (e.key === 'Escape') {
                                    setEditingNode(null);
                                }
                            }}
                            onBlur={() => updateNodeText(node.id, editText)}
                            className="bg-transparent text-white text-center w-full px-2 outline-none"
                            style={{ fontSize: node.size === 'lg' ? '15px' : node.size === 'md' ? '13px' : '11px' }}
                            autoFocus
                        />
                    ) : (
                        <span
                            className="text-white font-medium px-3 leading-tight pointer-events-none"
                            style={{
                                fontSize: node.size === 'lg' ? '15px' : node.size === 'md' ? '13px' : '11px',
                                textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                            }}
                        >
                            {node.text}
                        </span>
                    )}

                    {/* Quick-add child button */}
                    {isSelected && !isEditing && (
                        <button
                            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg hover:scale-125 transition-all z-50"
                            onClick={(e) => { e.stopPropagation(); addNode(node.id); }}
                            title="Adicionar nó filho"
                        >
                            <Plus size={14} />
                        </button>
                    )}
                </div>
            </foreignObject>
        );
    };

    // ── RENDER: CONNECTING LINE (Mouse Follow) ──
    const renderConnectingLine = () => {
        if (!connectingFrom) return null;
        const fromNode = nodes.find(n => n.id === connectingFrom);
        if (!fromNode) return null;
        const dim = getNodeDimensions(fromNode);
        return (
            <line
                x1={fromNode.x + dim.w / 2}
                y1={fromNode.y + dim.h / 2}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#25D366"
                strokeWidth="2"
                strokeDasharray="6,4"
                opacity="0.7"
            />
        );
    };

    // ── FILTERED MAPS ──
    const filteredMaps = maps.filter(m =>
        m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ══════════════════════════════════════════════════════════════
    // RENDER: GALLERY VIEW
    // ══════════════════════════════════════════════════════════════
    if (view === 'gallery') {
        return (
            <div className="min-h-[80vh] animate-fadeIn">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <BrainCircuit size={22} />
                            </div>
                            Mapas Mentais
                        </h1>
                        <p className="text-slate-400 mt-1">Crie diagramas, brainstorms e fluxogramas interativos</p>
                    </div>

                    <button
                        onClick={() => setShowTemplateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} />
                        Novo Mapa Mental
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar mapas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#1E293B]/60 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                </div>

                {/* Maps Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                ) : filteredMaps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center mb-6 border border-white/5">
                            <BrainCircuit size={40} className="text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Nenhum mapa mental criado</h3>
                        <p className="text-slate-400 mb-6 max-w-md">
                            Comece criando seu primeiro mapa mental. Escolha um template para agilizar!
                        </p>
                        <button
                            onClick={() => setShowTemplateModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105"
                        >
                            <Sparkles size={18} />
                            Criar Primeiro Mapa
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredMaps.map(map => (
                            <div
                                key={map.id}
                                onClick={() => openMap(map.id)}
                                className="group relative bg-[#1E293B]/60 border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1"
                            >
                                {/* Colored top bar */}
                                <div
                                    className="h-2 w-full"
                                    style={{ background: `linear-gradient(90deg, ${map.thumbnail_color || '#8B5CF6'}, ${map.thumbnail_color || '#8B5CF6'}88)` }}
                                />

                                {/* Preview area */}
                                <div className="px-5 pt-4 pb-2">
                                    <div
                                        className="w-full h-32 rounded-xl flex items-center justify-center relative overflow-hidden"
                                        style={{ background: `radial-gradient(circle at 30% 50%, ${map.thumbnail_color || '#8B5CF6'}15, transparent 70%)` }}
                                    >
                                        {/* Abstract node visualization */}
                                        <div className="relative w-full h-full">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute rounded-full"
                                                    style={{
                                                        width: 12 + i * 6 + 'px',
                                                        height: 12 + i * 6 + 'px',
                                                        left: 20 + i * 16 + '%',
                                                        top: 20 + (i % 3) * 25 + '%',
                                                        backgroundColor: map.thumbnail_color || '#8B5CF6',
                                                        opacity: 0.15 + i * 0.08,
                                                        border: `1px solid ${map.thumbnail_color || '#8B5CF6'}44`
                                                    }}
                                                />
                                            ))}
                                            {/* Abstract connection lines */}
                                            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.2 }}>
                                                <line x1="30%" y1="35%" x2="50%" y2="50%" stroke={map.thumbnail_color || '#8B5CF6'} strokeWidth="1" />
                                                <line x1="50%" y1="50%" x2="70%" y2="30%" stroke={map.thumbnail_color || '#8B5CF6'} strokeWidth="1" />
                                                <line x1="50%" y1="50%" x2="60%" y2="70%" stroke={map.thumbnail_color || '#8B5CF6'} strokeWidth="1" />
                                            </svg>
                                        </div>

                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-3xl">{TEMPLATES[map.template]?.icon || '🧠'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="px-5 pb-4">
                                    <h3 className="font-bold text-white text-lg truncate group-hover:text-purple-300 transition-colors">
                                        {map.title}
                                    </h3>
                                    <p className="text-slate-500 text-sm mt-1">
                                        {new Date(map.updated_at || map.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>

                                {/* Delete */}
                                <button
                                    onClick={(e) => deleteMap(map.id, e)}
                                    className="absolute top-5 right-3 p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                                    title="Excluir mapa"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── TEMPLATE MODAL ── */}
                {showTemplateModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
                            <div className="sticky top-0 bg-[#1E293B] border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
                                <h2 className="text-xl font-black text-white flex items-center gap-2">
                                    <Sparkles size={20} className="text-purple-400" />
                                    Escolha um Template
                                </h2>
                                <button
                                    onClick={() => setShowTemplateModal(false)}
                                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.entries(TEMPLATES).map(([key, tpl]) => (
                                    <button
                                        key={key}
                                        onClick={() => createMap(key)}
                                        className="group flex items-start gap-4 p-5 bg-[#0F172A]/60 border border-white/5 rounded-xl hover:border-purple-500/30 hover:bg-[#0F172A] transition-all text-left hover:shadow-lg hover:shadow-purple-500/5"
                                    >
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: tpl.color + '20' }}
                                        >
                                            {tpl.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors">{tpl.name}</h3>
                                            <p className="text-slate-400 text-sm mt-0.5">{tpl.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        `}</style>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════
    // RENDER: EDITOR VIEW
    // ══════════════════════════════════════════════════════════════
    const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

    return (
        <div className="fixed inset-0 lg:left-64 bg-[#0B0F19] flex flex-col z-20 animate-fadeIn">
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#0F172A]/90 backdrop-blur-xl border-b border-white/5 z-30">
                <div className="flex items-center gap-3">
                    <button
                        onClick={backToGallery}
                        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                        title="Voltar"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    {editingTitle ? (
                        <input
                            type="text"
                            value={mapTitle}
                            onChange={(e) => setMapTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                            onBlur={() => setEditingTitle(false)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-purple-500/50 w-52"
                            autoFocus
                        />
                    ) : (
                        <button
                            onClick={() => setEditingTitle(true)}
                            className="flex items-center gap-2 text-white font-bold hover:text-purple-300 transition-colors"
                        >
                            {mapTitle || 'Sem Título'}
                            <Edit3 size={14} className="text-slate-500" />
                        </button>
                    )}

                    {saving && (
                        <span className="text-xs text-purple-400 flex items-center gap-1 animate-pulse">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping" />
                            Salvando...
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Node Actions (when selected) */}
                    {selectedNodeData && (
                        <div className="flex items-center gap-1 mr-3 pr-3 border-r border-white/10">
                            <div className="relative">
                                <button
                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-all"
                                    title="Cor do nó"
                                >
                                    <div className="w-5 h-5 rounded-full border-2 border-white/30" style={{ backgroundColor: selectedNodeData.color }} />
                                </button>
                                {showColorPicker && (
                                    <ColorPicker
                                        currentColor={selectedNodeData.color}
                                        onSelect={(c) => updateNodeColor(selectedNode, c)}
                                        onClose={() => setShowColorPicker(false)}
                                    />
                                )}
                            </div>

                            <button
                                onClick={() => cycleNodeSize(selectedNode)}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                title="Mudar tamanho"
                            >
                                <Type size={16} />
                            </button>

                            <button
                                onClick={() => cycleNodeShape(selectedNode)}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                title="Mudar forma"
                            >
                                <Workflow size={16} />
                            </button>

                            <button
                                onClick={() => startConnect(selectedNode)}
                                className={`p-2 rounded-lg transition-all ${connectingFrom === selectedNode ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
                                title="Conectar a outro nó"
                            >
                                <Link2 size={16} />
                            </button>

                            <button
                                onClick={() => duplicateNode(selectedNode)}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                title="Duplicar nó"
                            >
                                <Copy size={16} />
                            </button>

                            <button
                                onClick={() => deleteNode(selectedNode)}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
                                title="Excluir nó"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}

                    {/* General Actions */}
                    <button
                        onClick={() => addNode()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-all text-sm font-medium"
                        title="Adicionar nó"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Nó</span>
                    </button>

                    <div className="h-6 w-px bg-white/5 mx-1" />

                    <button onClick={zoomOut} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all" title="Zoom Out">
                        <ZoomOut size={16} />
                    </button>
                    <span className="text-xs text-slate-500 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
                    <button onClick={zoomIn} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all" title="Zoom In">
                        <ZoomIn size={16} />
                    </button>
                    <button onClick={resetView} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all" title="Resetar Zoom">
                        <Maximize2 size={16} />
                    </button>

                    <div className="h-6 w-px bg-white/5 mx-1" />

                    <button
                        onClick={saveMap}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                        title="Salvar"
                    >
                        <Save size={16} />
                    </button>

                    <button
                        onClick={exportAsPng}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                        title="Exportar PNG"
                    >
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* Connecting Mode Banner */}
            {connectingFrom && (
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/20 text-green-400 text-sm font-medium animate-fadeIn">
                    <Link2 size={14} />
                    Clique em outro nó para conectar, ou clique no canvas para cancelar
                </div>
            )}

            {/* ── Canvas ── */}
            <div
                ref={canvasRef}
                className="flex-1 overflow-hidden relative"
                style={{ cursor: isPanning ? 'grabbing' : connectingFrom ? 'crosshair' : 'grab' }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleWheel}
            >
                {/* Grid Background */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(148,163,184,0.05) 1px, transparent 0)
            `,
                        backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
                        backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
                    }}
                />

                {/* Ambient glow */}
                <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] rounded-full bg-purple-500/3 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-blue-500/3 blur-[100px] pointer-events-none" />

                {/* SVG Layer */}
                <svg
                    ref={svgRef}
                    className="absolute inset-0 w-full h-full"
                    style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                        transformOrigin: '0 0'
                    }}
                >
                    {/* Edges */}
                    {edges.map((edge, idx) => renderEdge(edge, idx))}

                    {/* Connecting line preview */}
                    {renderConnectingLine()}

                    {/* Nodes */}
                    {nodes.map(node => renderNode(node))}
                </svg>

                {/* Node Count */}
                <div className="absolute bottom-4 left-4 flex items-center gap-3 text-xs text-slate-500 bg-[#0F172A]/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5">
                    <span>{nodes.length} nós</span>
                    <span>•</span>
                    <span>{edges.length} conexões</span>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .edge-delete-btn { transition: opacity 0.2s; }
        g:hover .edge-delete-btn { opacity: 0.9 !important; }
      `}</style>
        </div>
    );
}
