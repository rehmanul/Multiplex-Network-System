/**
 * Multiplex Network - Network Visualization Component
 * 
 * Interactive D3-based multiplex network visualization
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

interface Node {
    id: string;
    type: string;
    name: string;
    layer?: string;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

interface Edge {
    id: string;
    source: string | Node;
    target: string | Node;
    type: string;
    sign: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    layer: string;
    weight?: number;
}

interface NetworkVisualizerProps {
    nodes: Node[];
    edges: Edge[];
    selectedLayer?: string;
    onNodeClick?: (node: Node) => void;
    onEdgeClick?: (edge: Edge) => void;
    width?: number;
    height?: number;
    showLabels?: boolean;
    colorByType?: boolean;
}

const NODE_TYPE_COLORS: Record<string, string> = {
    CONGRESS_MEMBER: '#3b82f6',
    COMMITTEE: '#8b5cf6',
    SUBCOMMITTEE: '#a78bfa',
    STAFF: '#6366f1',
    EXECUTIVE_AGENCY: '#ef4444',
    SUB_AGENCY: '#f87171',
    OVERSIGHT_BODY: '#f59e0b',
    CAPABILITY: '#10b981',
    CAPABILITY_IMPLEMENTATION: '#34d399',
    ISSUE_SURFACE: '#06b6d4',
    POLICY_AREA: '#0891b2',
    JURISDICTIONAL_AUTHORITY: '#7c3aed',
    POLICY_EXPRESSION: '#ec4899',
    PROCEDURAL_VEHICLE: '#f43f5e',
    PROCUREMENT_PATHWAY: '#84cc16',
    INSURABLE_RISK_CATEGORY: '#eab308',
    CONSTITUENT_EXPOSURE_CATEGORY: '#14b8a6',
    INDUSTRY_SEGMENT: '#64748b',
};

const EDGE_SIGN_COLORS = {
    POSITIVE: '#22c55e',
    NEGATIVE: '#ef4444',
    NEUTRAL: '#94a3b8',
};

export function NetworkVisualizer({
    nodes,
    edges,
    selectedLayer,
    onNodeClick,
    onEdgeClick,
    width = 1200,
    height = 800,
    showLabels = true,
    colorByType = true,
}: NetworkVisualizerProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
    const simulationRef = useRef<d3.Simulation<Node, Edge> | null>(null);

    const filteredEdges = selectedLayer
        ? edges.filter((e) => e.layer === selectedLayer)
        : edges;

    const connectedNodeIds = new Set<string>();
    filteredEdges.forEach((e) => {
        const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
        const targetId = typeof e.target === 'string' ? e.target : e.target.id;
        connectedNodeIds.add(sourceId);
        connectedNodeIds.add(targetId);
    });

    const filteredNodes = selectedLayer
        ? nodes.filter((n) => connectedNodeIds.has(n.id))
        : nodes;

    useEffect(() => {
        if (!svgRef.current || filteredNodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Create zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
            });

        svg.call(zoom);

        const container = svg.append('g');

        // Create arrow markers for directed edges
        const defs = svg.append('defs');

        ['POSITIVE', 'NEGATIVE', 'NEUTRAL'].forEach((sign) => {
            defs.append('marker')
                .attr('id', `arrow-${sign}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 25)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('fill', EDGE_SIGN_COLORS[sign as keyof typeof EDGE_SIGN_COLORS])
                .attr('d', 'M0,-5L10,0L0,5');
        });

        // Create force simulation
        const simulation = d3.forceSimulation<Node>(filteredNodes)
            .force('link', d3.forceLink<Node, Edge>(filteredEdges)
                .id((d) => d.id)
                .distance(100)
                .strength((d) => d.weight ?? 0.5))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30));

        simulationRef.current = simulation;

        // Draw edges
        const link = container.append('g')
            .attr('class', 'edges')
            .selectAll('line')
            .data(filteredEdges)
            .join('line')
            .attr('stroke', (d) => EDGE_SIGN_COLORS[d.sign])
            .attr('stroke-width', (d) => Math.max(1, (d.weight ?? 1) * 2))
            .attr('stroke-opacity', 0.6)
            .attr('marker-end', (d) => `url(#arrow-${d.sign})`)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                onEdgeClick?.(d);
            });

        // Draw nodes
        const node = container.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(filteredNodes)
            .join('g')
            .style('cursor', 'pointer')
            .call(d3.drag<SVGGElement, Node>()
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
                }) as any);

        node.append('circle')
            .attr('r', 12)
            .attr('fill', (d) => colorByType ? (NODE_TYPE_COLORS[d.type] ?? '#64748b') : '#3b82f6')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2);

        if (showLabels) {
            node.append('text')
                .text((d) => d.name.length > 20 ? d.name.slice(0, 20) + '...' : d.name)
                .attr('x', 16)
                .attr('y', 4)
                .attr('font-size', '12px')
                .attr('fill', '#e2e8f0')
                .attr('font-family', 'Inter, sans-serif');
        }

        node.on('click', (event, d) => {
            event.stopPropagation();
            onNodeClick?.(d);
        })
            .on('mouseenter', (event, d) => setHoveredNode(d))
            .on('mouseleave', () => setHoveredNode(null));

        // Update positions on simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', (d) => (d.source as Node).x ?? 0)
                .attr('y1', (d) => (d.source as Node).y ?? 0)
                .attr('x2', (d) => (d.target as Node).x ?? 0)
                .attr('y2', (d) => (d.target as Node).y ?? 0);

            node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
        });

        return () => {
            simulation.stop();
        };
    }, [filteredNodes, filteredEdges, width, height, showLabels, colorByType, onNodeClick, onEdgeClick]);

    return (
        <div className="network-visualizer">
            <svg
                ref={svgRef}
                width={width}
                height={height}
                style={{ background: '#0f172a', borderRadius: '8px' }}
            />

            {hoveredNode && (
                <div className="node-tooltip" style={{
                    position: 'absolute',
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    pointerEvents: 'none',
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{hoveredNode.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>{hoveredNode.type}</div>
                </div>
            )}
        </div>
    );
}
