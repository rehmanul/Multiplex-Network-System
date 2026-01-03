/**
 * Multiplex Political-Institutional Network - Network Layer Base
 * 
 * Abstract base class for network layers implementing multiplex semantics
 */

import type { NetworkNode } from '../models/nodes/index.js';
import type { Edge, InterLayerEdge } from '../models/edges/index.js';
import type { NetworkLayer } from '../types.js';

// ============================================================================
// Layer Interface
// ============================================================================

export interface LayerMetrics {
    nodeCount: number;
    edgeCount: number;
    density: number;
    averageDegree: number;
    clusteringCoefficient: number;
    signBalance: {
        positive: number;
        negative: number;
        neutral: number;
    };
}

export interface LayerConfig {
    name: NetworkLayer;
    description: string;
    allowedNodeTypes: string[];
    allowedEdgeTypes: string[];
    computeMetrics: boolean;
}

// ============================================================================
// Abstract Layer Class
// ============================================================================

export abstract class Layer {
    readonly name: NetworkLayer;
    readonly description: string;
    readonly allowedNodeTypes: Set<string>;
    readonly allowedEdgeTypes: Set<string>;

    protected nodes: Map<string, NetworkNode> = new Map();
    protected edges: Map<string, Edge> = new Map();
    protected interLayerEdges: Map<string, InterLayerEdge> = new Map();

    constructor(config: LayerConfig) {
        this.name = config.name;
        this.description = config.description;
        this.allowedNodeTypes = new Set(config.allowedNodeTypes);
        this.allowedEdgeTypes = new Set(config.allowedEdgeTypes);
    }

    // ============================================================================
    // Node Operations
    // ============================================================================

    addNode(node: NetworkNode): void {
        if (!this.allowedNodeTypes.has(node.type)) {
            throw new Error(
                `Node type '${node.type}' not allowed in layer '${this.name}'. ` +
                `Allowed types: ${[...this.allowedNodeTypes].join(', ')}`
            );
        }
        this.nodes.set(node.id, node);
    }

    getNode(id: string): NetworkNode | undefined {
        return this.nodes.get(id);
    }

    hasNode(id: string): boolean {
        return this.nodes.has(id);
    }

    removeNode(id: string): boolean {
        // Also remove associated edges
        for (const [edgeId, edge] of this.edges) {
            if (edge.sourceId === id || edge.targetId === id) {
                this.edges.delete(edgeId);
            }
        }
        return this.nodes.delete(id);
    }

    getAllNodes(): NetworkNode[] {
        return [...this.nodes.values()];
    }

    getNodesByType(type: string): NetworkNode[] {
        return [...this.nodes.values()].filter(n => n.type === type);
    }

    // ============================================================================
    // Edge Operations
    // ============================================================================

    addEdge(edge: Edge): void {
        if (edge.layer !== this.name) {
            throw new Error(
                `Edge layer '${edge.layer}' does not match layer '${this.name}'`
            );
        }
        if (!this.allowedEdgeTypes.has(edge.type)) {
            throw new Error(
                `Edge type '${edge.type}' not allowed in layer '${this.name}'. ` +
                `Allowed types: ${[...this.allowedEdgeTypes].join(', ')}`
            );
        }
        this.edges.set(edge.id, edge);
    }

    getEdge(id: string): Edge | undefined {
        return this.edges.get(id);
    }

    hasEdge(id: string): boolean {
        return this.edges.has(id);
    }

    removeEdge(id: string): boolean {
        return this.edges.delete(id);
    }

    getAllEdges(): Edge[] {
        return [...this.edges.values()];
    }

    getEdgesByType(type: string): Edge[] {
        return [...this.edges.values()].filter(e => e.type === type);
    }

    getEdgesBySign(sign: Edge['sign']): Edge[] {
        return [...this.edges.values()].filter(e => e.sign === sign);
    }

    getOutgoingEdges(nodeId: string): Edge[] {
        return [...this.edges.values()].filter(e => e.sourceId === nodeId);
    }

    getIncomingEdges(nodeId: string): Edge[] {
        return [...this.edges.values()].filter(e => e.targetId === nodeId);
    }

    getAdjacentEdges(nodeId: string): Edge[] {
        return [...this.edges.values()].filter(
            e => e.sourceId === nodeId || e.targetId === nodeId
        );
    }

    // ============================================================================
    // Inter-Layer Operations
    // ============================================================================

    addInterLayerEdge(edge: InterLayerEdge): void {
        if (edge.sourceLayer !== this.name && edge.targetLayer !== this.name) {
            throw new Error(
                `Inter-layer edge must connect to layer '${this.name}'`
            );
        }
        this.interLayerEdges.set(edge.id, edge);
    }

    getInterLayerEdges(): InterLayerEdge[] {
        return [...this.interLayerEdges.values()];
    }

    getInterLayerEdgesForNode(nodeId: string): InterLayerEdge[] {
        return [...this.interLayerEdges.values()].filter(e => e.nodeId === nodeId);
    }

    // ============================================================================
    // Metrics
    // ============================================================================

    computeMetrics(): LayerMetrics {
        const nodeCount = this.nodes.size;
        const edgeCount = this.edges.size;

        // Density: 2E / (N * (N-1)) for directed graphs
        const maxEdges = nodeCount * (nodeCount - 1);
        const density = maxEdges > 0 ? (2 * edgeCount) / maxEdges : 0;

        // Average degree
        const averageDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;

        // Sign distribution
        const signCounts = { positive: 0, negative: 0, neutral: 0 };
        for (const edge of this.edges.values()) {
            if (edge.sign === 'POSITIVE') signCounts.positive++;
            else if (edge.sign === 'NEGATIVE') signCounts.negative++;
            else signCounts.neutral++;
        }

        // Clustering coefficient (simplified - local average)
        let totalClusteringCoeff = 0;
        for (const nodeId of this.nodes.keys()) {
            const neighbors = this.getNeighbors(nodeId);
            if (neighbors.length < 2) continue;

            let triangles = 0;
            const possibleTriangles = (neighbors.length * (neighbors.length - 1)) / 2;

            for (let i = 0; i < neighbors.length; i++) {
                for (let j = i + 1; j < neighbors.length; j++) {
                    if (this.areConnected(neighbors[i]!, neighbors[j]!)) {
                        triangles++;
                    }
                }
            }

            totalClusteringCoeff += triangles / possibleTriangles;
        }

        const clusteringCoefficient = nodeCount > 0
            ? totalClusteringCoeff / nodeCount
            : 0;

        return {
            nodeCount,
            edgeCount,
            density,
            averageDegree,
            clusteringCoefficient,
            signBalance: signCounts,
        };
    }

    // ============================================================================
    // Helper Methods
    // ============================================================================

    protected getNeighbors(nodeId: string): string[] {
        const neighbors = new Set<string>();
        for (const edge of this.edges.values()) {
            if (edge.sourceId === nodeId) neighbors.add(edge.targetId);
            if (edge.targetId === nodeId) neighbors.add(edge.sourceId);
        }
        return [...neighbors];
    }

    protected areConnected(nodeA: string, nodeB: string): boolean {
        for (const edge of this.edges.values()) {
            if (
                (edge.sourceId === nodeA && edge.targetId === nodeB) ||
                (edge.sourceId === nodeB && edge.targetId === nodeA)
            ) {
                return true;
            }
        }
        return false;
    }

    // ============================================================================
    // Serialization
    // ============================================================================

    toJSON(): {
        name: NetworkLayer;
        nodes: NetworkNode[];
        edges: Edge[];
        interLayerEdges: InterLayerEdge[];
        metrics: LayerMetrics;
    } {
        return {
            name: this.name,
            nodes: this.getAllNodes(),
            edges: this.getAllEdges(),
            interLayerEdges: this.getInterLayerEdges(),
            metrics: this.computeMetrics(),
        };
    }

    // ============================================================================
    // Abstract Methods
    // ============================================================================

    /**
     * Layer-specific validation rules
     */
    abstract validateSemantics(): { valid: boolean; errors: string[] };

    /**
     * Layer-specific path finding algorithm
     */
    abstract findPaths(
        fromId: string,
        toId: string,
        options?: { maxDepth?: number; signFilter?: Edge['sign'] }
    ): string[][];
}
