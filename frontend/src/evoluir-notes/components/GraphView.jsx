import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  X,
  Sparkles,
  Search,
  Share2
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
  } = useNoteStore();

  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Physics parameters state
  const [physics, setPhysics] = useState({
    linkDistance: 85,
    chargeStrength: -240,
    centerStrength: 0.08,
  });

  // Calculate nodes and links from notes
  const graphData = useMemo(() => {
    // If store provides getLinkGraph(), we can use it or compute directly
    if (getLinkGraph) {
      try {
        const storeGraph = getLinkGraph();
        if (storeGraph?.nodes?.length) return storeGraph;
      } catch (err) {
        // Fallback to local computation
      }
    }

    const validNotes = notes.filter((n) => !n.deletedAt);
    const titleMap = new Map();
    validNotes.forEach((n) => {
      if (n.title) titleMap.set(n.title.trim().toLowerCase(), n.id);
    });

    const links = [];
    const linkSet = new Set();
    const connectionCounts = {};

    validNotes.forEach((note) => {
      connectionCounts[note.id] = connectionCounts[note.id] || 0;
      if (!note.content) return;

      const matches = note.content.matchAll(/\[\[(.*?)\]\]/g);
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

    const graphNodes = validNotes.map((n) => ({
      id: n.id,
      title: n.title || 'Sem título',
      starred: n.starred || false,
      content: n.content || '',
      connections: connectionCounts[n.id] || 0,
      radius: Math.max(7, Math.min(22, 7 + (connectionCounts[n.id] || 0) * 2.5)),
    }));

    return { nodes: graphNodes, links };
  }, [notes, getLinkGraph]);

  // Main D3 force simulation setup
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Deep copy data for D3 mutation
    const nodes = graphData.nodes.map((d) => ({ ...d }));
    const links = graphData.links.map((d) => ({ ...d }));

    // Setup main container group for zoom & pan
    const g = svg.append('g').attr('class', 'graph-root');

    // Zoom behavior
    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.15, 6])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Initial center transform
    svg.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85).translate(-width / 2, -height / 2)
    );

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
      .force('collision', d3.forceCollide().radius((d) => d.radius + 14));

    simulationRef.current = simulation;

    // Render Edges (Links)
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#313244')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5);

    // Render Nodes (Group containing circle + text)
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-item')
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
      .attr('stroke', '#a6e3a1')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', '3,3');

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => {
        if (d.id === activeNoteId) return '#a6e3a1'; // ev-green
        if (d.starred) return '#cba6f7'; // ev-mauve
        return '#89b4fa'; // ev-accent
      })
      .attr('stroke', '#11111b')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer');

    // Node labels
    node
      .append('text')
      .text((d) => d.title)
      .attr('x', 0)
      .attr('y', (d) => d.radius + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cdd6f4')
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('pointer-events', 'none')
      .attr('opacity', 0.85);

    // Interactive Hover & Click
    node
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        setTooltipPos({ x: event.clientX, y: event.clientY });

        // Highlight connected links and nodes
        const connectedNodeIds = new Set();
        connectedNodeIds.add(d.id);

        link
          .attr('stroke', (l) => {
            if (l.source.id === d.id || l.target.id === d.id) {
              connectedNodeIds.add(l.source.id);
              connectedNodeIds.add(l.target.id);
              return '#89b4fa';
            }
            return '#313244';
          })
          .attr('stroke-opacity', (l) =>
            l.source.id === d.id || l.target.id === d.id ? 1 : 0.08
          )
          .attr('stroke-width', (l) =>
            l.source.id === d.id || l.target.id === d.id ? 2.5 : 1
          );

        node.attr('opacity', (n) => (connectedNodeIds.has(n.id) ? 1 : 0.15));
      })
      .on('mousemove', (event) => {
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        link
          .attr('stroke', '#313244')
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', 1.5);
        node.attr('opacity', 1);
      })
      .on('click', (event, d) => {
        if (setActiveNote) setActiveNote(d.id);
        if (openTab) openTab(d.id);
        if (onClose) onClose();
      });

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
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
      d.title.toLowerCase().includes(q) ? 1 : 0.2
    );
  }, [searchFilter]);

  // Handle Zoom In/Out
  const handleZoom = (scaleMultiplier) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(250).call(d3.zoom().scaleBy, scaleMultiplier);
  };

  // Reset View
  const handleReset = () => {
    if (!svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    const svg = d3.select(svgRef.current);

    svg
      .transition()
      .duration(400)
      .call(
        d3.zoom().transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85).translate(-width / 2, -height / 2)
      );

    if (simulationRef.current) {
      simulationRef.current.alpha(0.5).restart();
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    else if (toggleGraphView) toggleGraphView();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-ev-bg-tertiary select-none overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Top Header Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-ev-bg-secondary/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-ev-border shadow-lg">
          <Share2 className="w-4 h-4 text-ev-accent" />
          <h2 className="text-xs font-bold text-ev-text-primary tracking-wide">
            Grafo Interativo
          </h2>
          <span className="text-[11px] text-ev-text-muted px-1.5 py-0.2 bg-ev-bg-surface rounded-full border border-ev-border">
            {graphData.nodes.length} notas • {graphData.links.length} conexões
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Search in Graph */}
          <div className="relative flex items-center bg-ev-bg-secondary/90 backdrop-blur-md rounded-xl border border-ev-border px-2.5 py-1.5 shadow-lg">
            <Search className="w-3.5 h-3.5 text-ev-text-muted mr-1.5" />
            <input
              type="text"
              placeholder="Filtrar notas..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-transparent text-xs text-ev-text-primary placeholder:text-ev-text-muted outline-none w-28 focus:w-40 transition-all"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="text-ev-text-muted hover:text-ev-text-primary ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Physics Toggle */}
          <button
            onClick={() => setShowControls(!showControls)}
            title="Controles de Física"
            className={`p-2 rounded-xl border shadow-lg transition-colors bg-ev-bg-secondary/90 backdrop-blur-md ${
              showControls
                ? 'border-ev-accent text-ev-accent'
                : 'border-ev-border text-ev-text-secondary hover:text-ev-text-primary'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Zoom In */}
          <button
            onClick={() => handleZoom(1.3)}
            title="Aproximar (+)"
            className="p-2 rounded-xl border border-ev-border bg-ev-bg-secondary/90 backdrop-blur-md text-ev-text-secondary hover:text-ev-text-primary shadow-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => handleZoom(0.7)}
            title="Afastar (-)"
            className="p-2 rounded-xl border border-ev-border bg-ev-bg-secondary/90 backdrop-blur-md text-ev-text-secondary hover:text-ev-text-primary shadow-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            title="Resetar Visualização"
            className="p-2 rounded-xl border border-ev-border bg-ev-bg-secondary/90 backdrop-blur-md text-ev-text-secondary hover:text-ev-text-primary shadow-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            className="p-2 rounded-xl border border-ev-border bg-ev-bg-secondary/90 backdrop-blur-md text-ev-text-secondary hover:text-ev-accent shadow-lg transition-colors"
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
            className="p-2 rounded-xl border border-ev-border bg-ev-bg-secondary/90 backdrop-blur-md text-ev-text-secondary hover:text-ev-red shadow-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Physics Settings Drawer */}
      {showControls && (
        <div className="absolute top-16 right-4 z-20 w-72 bg-ev-bg-surface/95 backdrop-blur-md border border-ev-border rounded-2xl p-4 shadow-2xl text-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-ev-border/60">
            <span className="font-bold text-ev-text-primary">Física da Simulação</span>
            <button
              onClick={() => setShowControls(false)}
              className="text-ev-text-muted hover:text-ev-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-ev-text-secondary mb-1">
                <span>Distância dos Links</span>
                <span className="font-mono text-ev-accent">{physics.linkDistance}px</span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                value={physics.linkDistance}
                onChange={(e) =>
                  setPhysics({ ...physics, linkDistance: Number(e.target.value) })
                }
                className="w-full accent-ev-accent cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-ev-text-secondary mb-1">
                <span>Força de Repulsão</span>
                <span className="font-mono text-ev-mauve">{physics.chargeStrength}</span>
              </div>
              <input
                type="range"
                min="-600"
                max="-50"
                value={physics.chargeStrength}
                onChange={(e) =>
                  setPhysics({ ...physics, chargeStrength: Number(e.target.value) })
                }
                className="w-full accent-ev-mauve cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-ev-text-secondary mb-1">
                <span>Força de Centro</span>
                <span className="font-mono text-ev-teal">
                  {Math.round(physics.centerStrength * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.3"
                step="0.01"
                value={physics.centerStrength}
                onChange={(e) =>
                  setPhysics({ ...physics, centerStrength: Number(e.target.value) })
                }
                className="w-full accent-ev-teal cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* D3 SVG Canvas */}
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Hover Tooltip */}
      {hoveredNode && (
        <div
          style={{
            top: `${tooltipPos.y + 16}px`,
            left: `${tooltipPos.x + 16}px`,
          }}
          className="fixed z-50 pointer-events-none max-w-xs bg-ev-bg-surface/95 backdrop-blur-md border border-ev-border p-3 rounded-xl shadow-2xl text-xs space-y-1.5 animate-scale-in"
        >
          <div className="flex items-center gap-1.5 font-bold text-ev-text-primary">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{
                backgroundColor:
                  hoveredNode.id === activeNoteId
                    ? '#a6e3a1'
                    : hoveredNode.starred
                    ? '#cba6f7'
                    : '#89b4fa',
              }}
            />
            <span className="truncate">{hoveredNode.title}</span>
          </div>

          <div className="text-[11px] text-ev-accent font-medium">
            {hoveredNode.connections} conexão(ões)
          </div>

          {hoveredNode.content && (
            <p className="text-[11px] text-ev-text-muted line-clamp-2 leading-relaxed">
              {hoveredNode.content.replace(/[#*`[\]]/g, '').slice(0, 80)}
            </p>
          )}

          <div className="text-[10px] text-ev-teal pt-1 border-t border-ev-border/40 font-medium">
            Clique para abrir esta nota
          </div>
        </div>
      )}

      {/* Bottom Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 bg-ev-bg-secondary/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-ev-border text-[11px] text-ev-text-secondary shadow-md pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ev-green" />
          <span>Nota Ativa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ev-mauve" />
          <span>Favorita</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ev-accent" />
          <span>Nota Comum</span>
        </div>
      </div>
    </div>
  );
}

export default GraphView;
