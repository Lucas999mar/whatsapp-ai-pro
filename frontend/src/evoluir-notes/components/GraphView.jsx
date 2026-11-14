import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  X,
  Search,
  Share2,
  Link2,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Layers,
  Zap
} from 'lucide-react';
import { useNoteStore } from '../store/noteStore';

export function GraphView({ onClose }) {
  const {
    notes = [],
    activeNoteId,
    setActiveNote,
    openTab,
    toggleGraphView,
    getLinkGraph,
    updateNote,
    connectNotes,
    connectAllDemoNotes,
  } = useNoteStore();

  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Modal & Helper state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [sourceNoteId, setSourceNoteId] = useState(activeNoteId || '');
  const [targetNoteId, setTargetNoteId] = useState('');
  const [connectSuccessMsg, setConnectSuccessMsg] = useState('');
  const [showTipBanner, setShowTipBanner] = useState(true);

  // Physics parameters state (Obsidian circular galaxy physics)
  const [physics, setPhysics] = useState({
    linkDistance: 48,
    chargeStrength: -140,
    centerStrength: 0.75,
  });

  // Calculate nodes and links from notes
  const graphData = useMemo(() => {
    if (getLinkGraph) {
      try {
        const storeGraph = getLinkGraph();
        if (storeGraph?.nodes?.length) {
          return {
            nodes: storeGraph.nodes.map((n) => ({
              ...n,
              radius: Math.max(8, Math.min(22, 8 + (n.connections || 0) * 2.5)),
            })),
            links: storeGraph.links.map((l) => ({
              source: typeof l.source === 'object' ? l.source.id : l.source,
              target: typeof l.target === 'object' ? l.target.id : l.target,
            })),
          };
        }
      } catch (err) {
        console.warn('Fallback to local graph computation:', err);
      }
    }

    const validNotes = notes.filter((n) => !n.isTrash && !n.deletedAt);
    const titleMap = new Map();
    validNotes.forEach((n) => {
      if (n.title) titleMap.set(n.title.trim().toLowerCase(), n.id);
      titleMap.set(n.id, n.id);
    });

    const links = [];
    const linkSet = new Set();
    const connectionCounts = {};

    validNotes.forEach((note) => {
      connectionCounts[note.id] = connectionCounts[note.id] || 0;
      if (!note.content) return;

      const matches = note.content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
      for (const match of matches) {
        const targetTitle = match[1].trim().toLowerCase();
        const targetId = titleMap.get(targetTitle);

        if (targetId && targetId !== note.id) {
          const key = [note.id, targetId].sort().join('->');
          if (!linkSet.has(key)) {
            linkSet.add(key);
            links.push({
              source: note.id,
              target: targetId,
            });
            connectionCounts[note.id] = (connectionCounts[note.id] || 0) + 1;
            connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
          }
        }
      }
    });

    const graphNodes = validNotes.map((n) => {
      const count = connectionCounts[n.id] || 0;
      // Proporção de raio idêntica à do Obsidian:
      // Hubs com 3+ conexões são esferas maiores, 1-2 são intermediárias e 0 são satélites menores
      let radius = 4.5;
      if (count >= 3) {
        radius = Math.min(18, 10 + count * 1.5);
      } else if (count >= 1) {
        radius = Math.min(9, 6 + count * 1.2);
      }
      return {
        id: n.id,
        title: n.title || 'Sem título',
        starred: !!n.starred,
        content: n.content || '',
        connections: count,
        radius,
      };
    });

    return { nodes: graphNodes, links };
  }, [notes, getLinkGraph]);

  // Main D3 force simulation setup
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 650;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Explicit dimensions and viewBox
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Deep clone data to avoid reference mutation collisions
    const nodeMap = new Map();
    const nodes = graphData.nodes.map((d) => {
      const node = {
        ...d,
        x: width / 2 + (Math.random() - 0.5) * 120,
        y: height / 2 + (Math.random() - 0.5) * 120,
      };
      nodeMap.set(node.id, node);
      return node;
    });

    // Sanitize links: ensure both endpoints exist in nodeMap
    const links = graphData.links
      .filter((l) => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return nodeMap.has(s) && nodeMap.has(t);
      })
      .map((l) => ({
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
      }));

    // Setup main container group for zoom & pan
    const g = svg.append('g').attr('class', 'graph-root');

    // Zoom behavior
    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.15, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    // Forces
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(physics.linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(physics.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(physics.centerStrength))
      .force('collision', d3.forceCollide().radius((d) => d.radius + 5));

    simulationRef.current = simulation;

    // Render Edges (Links estilo Obsidian)
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.16)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.1);

    // Render Nodes (Group containing glow ring + circle + label)
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-item')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Outer glow ring for active note
    node
      .filter((d) => d.id === activeNoteId)
      .append('circle')
      .attr('r', (d) => d.radius + 6)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8)
      .attr('stroke-dasharray', '4,3')
      .attr('class', 'active-glow-ring');

    // Main Node circle (Cores idênticas ao Obsidian da foto: Verde vibrante para hubs, cinza para comuns)
    node
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => {
        if (d.id === activeNoteId) return '#10b981'; // Ativa: Verde Esmeralda Obsidian
        if (d.connections >= 2) return '#10b981'; // Hub (2+ conexões): Verde Esmeralda Vivo
        if (d.connections === 1) return '#34d399'; // 1 conexão: Verde Menta suave
        if (d.starred) return '#cba6f7'; // Favorita: Mauve
        return '#94a3b8'; // Nós comuns: Prata/Cinza elegante (efeito nuvem de estrelas)
      })
      .attr('stroke', '#0d0f12')
      .attr('stroke-width', (d) => (d.connections >= 2 ? 2.5 : 1.5))
      .attr('filter', (d) => (d.connections >= 2 ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'));

    // Center pulse dot para nós com conexões
    node
      .filter((d) => d.connections >= 2)
      .append('circle')
      .attr('r', 2)
      .attr('fill', '#ffffff')
      .attr('opacity', 0.8);

    // Node labels with stroke halo for contrast
    node
      .append('text')
      .text((d) => d.title)
      .attr('x', 0)
      .attr('y', (d) => d.radius + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('stroke', '#0d0f12')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke fill')
      .attr('font-size', (d) => (d.connections >= 2 ? '11px' : '9px'))
      .attr('font-weight', (d) => (d.connections >= 2 ? '700' : '500'))
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('pointer-events', 'none')
      .attr('opacity', (d) => (d.connections >= 1 || d.id === activeNoteId ? 0.95 : 0.65));

    // Interactive Hover & Click
    node
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        setTooltipPos({ x: event.clientX, y: event.clientY });

        // Identify connected nodes
        const connectedNodeIds = new Set();
        connectedNodeIds.add(d.id);

        link
          .attr('stroke', (l) => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            if (sId === d.id || tId === d.id) {
              connectedNodeIds.add(sId);
              connectedNodeIds.add(tId);
              return '#10b981'; // Fios conectados acendem em verde esmeralda vibrante!
            }
            return 'rgba(255, 255, 255, 0.04)';
          })
          .attr('stroke-opacity', (l) => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            return sId === d.id || tId === d.id ? 1 : 0.08;
          })
          .attr('stroke-width', (l) => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            return sId === d.id || tId === d.id ? 2.2 : 0.8;
          });

        node.attr('opacity', (n) => (connectedNodeIds.has(n.id) ? 1 : 0.15));
      })
      .on('mousemove', (event) => {
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        link
          .attr('stroke', 'rgba(255, 255, 255, 0.16)')
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', 1.1);
        node.attr('opacity', 1);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        if (setActiveNote) setActiveNote(d.id);
        if (openTab) openTab(d.id);
        if (onClose) onClose();
      });

    // Pre-warm the simulation so nodes render in position immediately
    for (let i = 0; i < 40; ++i) {
      simulation.tick();
    }

    // Set initial layout coordinates immediately
    link
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);

    node.attr('transform', (d) => `translate(${d.x},${d.y})`);

    // Dynamic tick updates
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // ResizeObserver to dynamically update viewport
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          svg
            .attr('width', newW)
            .attr('height', newH)
            .attr('viewBox', [0, 0, newW, newH]);
          simulation.force('center', d3.forceCenter(newW / 2, newH / 2).strength(physics.centerStrength));
          simulation.alpha(0.15).restart();
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      simulation.stop();
    };
  }, [graphData, activeNoteId, physics, onClose, openTab, setActiveNote]);

  // Handle Search Filtering highlight
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const nodes = svg.selectAll('.node-item');

    if (!searchFilter.trim()) {
      nodes.attr('opacity', 1);
      return;
    }

    const q = searchFilter.toLowerCase();
    nodes.attr('opacity', (d) =>
      d.title.toLowerCase().includes(q) ? 1 : 0.15
    );
  }, [searchFilter]);

  // Handle Zoom In/Out
  const handleZoom = useCallback((scaleMultiplier) => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(250).call(zoomRef.current.scaleBy, scaleMultiplier);
  }, []);

  // Reset View
  const handleReset = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);

    svg
      .transition()
      .duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity);

    if (simulationRef.current) {
      simulationRef.current.alpha(0.35).restart();
    }
  }, []);

  const handleClose = () => {
    if (onClose) onClose();
    else if (toggleGraphView) toggleGraphView();
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-[#111114] select-none overflow-hidden relative flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#0d0d10]' : ''
      }`}
    >
      {/* Top Header Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 shadow-2xl">
          <Share2 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-white tracking-wide">
            Grafo Interativo
          </h2>
          <span className="text-[11px] text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 font-mono font-bold">
            {graphData.nodes.length} notas • {graphData.links.length} conexões
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-end">
          {/* Botão Conectar Notas */}
          <button
            onClick={() => {
              setSourceNoteId(activeNoteId || (notes[0]?.id || ''));
              setIsConnectModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            title="Ligar e conectar duas notas com uma linha no grafo"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>+ Conectar Notas</span>
          </button>

          {/* Botão Interligar Teia */}
          <button
            onClick={async () => {
              if (connectAllDemoNotes) {
                const res = await connectAllDemoNotes();
                if (res?.success) {
                  setConnectSuccessMsg(`Teia gerada com sucesso! ${res.count} conexões criadas.`);
                  setTimeout(() => setConnectSuccessMsg(''), 3000);
                }
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-xs font-semibold shadow-lg transition-all cursor-pointer"
            title="Interligar notas existentes para formar a teia densa do Obsidian"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Gerar Teia</span>
          </button>

          {/* Search in Graph */}
          <div className="relative flex items-center bg-slate-900/90 backdrop-blur-md rounded-xl border border-white/10 px-2.5 py-1.5 shadow-xl">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <input
              type="text"
              placeholder="Filtrar notas..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-transparent text-xs text-white placeholder:text-slate-400 outline-none w-24 focus:w-40 transition-all"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="text-slate-400 hover:text-white ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Physics Toggle */}
          <button
            onClick={() => setShowControls(!showControls)}
            title="Controles de Física"
            className={`p-2 rounded-xl border shadow-xl transition-colors bg-slate-900/90 backdrop-blur-md ${
              showControls
                ? 'border-emerald-500 text-emerald-400'
                : 'border-white/10 text-slate-400 hover:text-white hover:border-emerald-500/40'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Zoom In */}
          <button
            onClick={() => handleZoom(1.3)}
            title="Aproximar (+)"
            className="p-2 rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-md text-slate-400 hover:text-white hover:border-emerald-500/40 shadow-xl transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => handleZoom(0.7)}
            title="Afastar (-)"
            className="p-2 rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-md text-slate-400 hover:text-white hover:border-emerald-500/40 shadow-xl transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            title="Resetar Visualização"
            className="p-2 rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-md text-slate-400 hover:text-white hover:border-emerald-500/40 shadow-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            className="p-2 rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-md text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 shadow-xl transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            title="Fechar Grafo"
            className="p-2 rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-md text-slate-400 hover:text-red-400 hover:border-red-500/40 shadow-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dica didática do Obsidian no topo */}
      {showTipBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 text-slate-200 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-xs pointer-events-auto animate-fade-in max-w-lg">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold flex-shrink-0">
            <Sparkles size={14} />
            <span>Como conectar notas:</span>
          </span>
          <span className="text-slate-300 leading-tight">
            Digite <code className="bg-black/50 text-emerald-300 px-1 py-0.5 rounded font-mono font-semibold">[[Nome da Nota]]</code> no texto de uma nota, ou clique no botão <strong className="text-white">+ Conectar Notas</strong>!
          </span>
          <button
            onClick={() => setShowTipBanner(false)}
            className="text-slate-400 hover:text-white p-0.5 ml-1 flex-shrink-0"
            title="Fechar dica"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Physics Settings Drawer */}
      {showControls && (
        <div className="absolute top-16 right-4 z-30 w-72 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl text-xs space-y-4 animate-scale-in text-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white">Física da Teia (Obsidian)</span>
            <button
              onClick={() => setShowControls(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Distância dos Links</span>
                <span className="font-mono text-emerald-400 font-semibold">{physics.linkDistance}px</span>
              </div>
              <input
                type="range"
                min="25"
                max="200"
                value={physics.linkDistance}
                onChange={(e) =>
                  setPhysics({ ...physics, linkDistance: Number(e.target.value) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Força de Repulsão</span>
                <span className="font-mono text-purple-400 font-semibold">{physics.chargeStrength}</span>
              </div>
              <input
                type="range"
                min="-500"
                max="-40"
                value={physics.chargeStrength}
                onChange={(e) =>
                  setPhysics({ ...physics, chargeStrength: Number(e.target.value) })
                }
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Gravidade Central (Esfera)</span>
                <span className="font-mono text-teal-400 font-semibold">
                  {Math.round(physics.centerStrength * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={physics.centerStrength}
                onChange={(e) =>
                  setPhysics({ ...physics, centerStrength: Number(e.target.value) })
                }
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* D3 SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing block"
      />

      {/* Floating Hover Tooltip */}
      {hoveredNode && (
        <div
          style={{
            top: `${tooltipPos.y + 16}px`,
            left: `${tooltipPos.x + 16}px`,
          }}
          className="fixed z-50 pointer-events-none max-w-xs bg-slate-900/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 animate-scale-in"
        >
          <div className="flex items-center gap-1.5 font-bold text-white">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
              style={{
                backgroundColor:
                  hoveredNode.id === activeNoteId
                    ? '#10b981'
                    : hoveredNode.connections >= 2
                    ? '#10b981'
                    : hoveredNode.starred
                    ? '#cba6f7'
                    : '#94a3b8',
              }}
            />
            <span className="truncate">{hoveredNode.title}</span>
          </div>

          <div className="text-[11px] text-emerald-400 font-semibold font-mono">
            {hoveredNode.connections} conexão(ões) na rede
          </div>

          {hoveredNode.content && (
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {hoveredNode.content.replace(/[#*`[\]]/g, '').slice(0, 100)}
            </p>
          )}

          <div className="text-[10px] text-emerald-400 pt-1 border-t border-white/10 font-medium">
            Clique para abrir • Conecte usando [[ ]]
          </div>
        </div>
      )}

      {/* Bottom Legend (Estilo Obsidian) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-[11px] text-slate-300 shadow-xl pointer-events-none">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
          <span>Hub Principal (Verde)</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-[#34d399] inline-block shadow-sm" />
          <span>Conectada</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8] inline-block shadow-sm" />
          <span>Nó Comum</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-[#cba6f7] inline-block shadow-sm" />
          <span>Favorita</span>
        </div>
      </div>

      {/* Modal Conectar Duas Notas */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181825] border border-emerald-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in text-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shadow-md">
                  <Link2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Conectar Notas no Grafo</h3>
                  <p className="text-[11px] text-slate-400">Cria um link wiki [[ ]] interligando os nós</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsConnectModalOpen(false);
                  setConnectSuccessMsg('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  1. Nota de Origem (Onde o link será inserido):
                </label>
                <select
                  value={sourceNoteId}
                  onChange={(e) => setSourceNoteId(e.target.value)}
                  className="w-full bg-[#11111b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Selecione a nota de origem...</option>
                  {notes
                    .filter((n) => !n.isTrash && !n.deletedAt)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title || 'Sem título'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  2. Conectar com (Nota de Destino):
                </label>
                <select
                  value={targetNoteId}
                  onChange={(e) => setTargetNoteId(e.target.value)}
                  className="w-full bg-[#11111b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Selecione a nota para conectar...</option>
                  {notes
                    .filter((n) => !n.isTrash && !n.deletedAt && n.id !== sourceNoteId)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title || 'Sem título'}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Dica */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] text-slate-300 leading-relaxed">
              💡 No Obsidian, ligar duas notas adiciona a sintaxe <code className="text-emerald-400 font-mono bg-black/40 px-1 py-0.5 rounded">[[Nome da Nota]]</code>. Ao salvar, a linha no grafo aparece imediatamente conectando os dois nós!
            </div>

            {/* Feedback */}
            {connectSuccessMsg && (
              <div className="p-2.5 rounded-xl text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 size={16} />
                <span>{connectSuccessMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={async () => {
                  if (connectAllDemoNotes) {
                    const res = await connectAllDemoNotes();
                    if (res?.success) {
                      setConnectSuccessMsg(`Teia gerada com sucesso! ${res.count} conexões criadas.`);
                      setTimeout(() => setIsConnectModalOpen(false), 1400);
                    }
                  }
                }}
                className="text-[11px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                title="Conecta as notas existentes entre si para formar a teia completa"
              >
                ⚡ Interligar Todas as Notas
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!sourceNoteId || !targetNoteId || sourceNoteId === targetNoteId}
                  onClick={async () => {
                    if (connectNotes) {
                      const res = await connectNotes(sourceNoteId, targetNoteId);
                      if (res?.success) {
                        setConnectSuccessMsg(`Conectado: "${res.sourceTitle}" ➔ "${res.targetTitle}"!`);
                        setTimeout(() => {
                          setIsConnectModalOpen(false);
                          setConnectSuccessMsg('');
                        }, 1200);
                      } else {
                        setConnectSuccessMsg(res?.message || 'Já estão conectadas ou erro.');
                      }
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Link2 size={14} />
                  <span>Criar Conexão 🔗</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphView;
