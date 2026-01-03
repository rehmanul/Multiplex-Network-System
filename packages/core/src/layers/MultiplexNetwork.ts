/**
 * Multiplex Political-Institutional Network - Multiplex Network Coordinator
 * 
 * Manages all network layers and inter-layer connections
 */

import { Layer, type LayerMetrics } from './Layer.js';
import { CapabilityLayer } from './CapabilityLayer.js';
import { IssueSurfaceLayer } from './IssueSurfaceLayer.js';
import { PolicyAreaLayer } from './PolicyAreaLayer.js';
import { JurisdictionLayer } from './JurisdictionLayer.js';
import { ProceduralLayer } from './ProceduralLayer.js';
import { CoalitionLayer } from './CoalitionLayer.js';
import { InformationFlowLayer } from './InformationFlowLayer.js';
import type { NetworkNode } from '../models/nodes/index.js';
import type { Edge, InterLayerEdge } from '../models/edges/index.js';
import type { NetworkLayer } from '../types.js';

// ============================================================================
// Multiplex Network Metrics
// ============================================================================

export interface MultiplexMetrics {
    totalNodes: number;
    totalEdges: number;
    totalInterLayerEdges: number;
    layerMetrics: Record<NetworkLayer, LayerMetrics>;
    versatility: Map<string, number>; // Node versatility across layers
    multiplexParticipation: Map<string, number>; // How many layers each node participates in
}

export interface CrossLayerPath {
    nodes: string[];
    layers: NetworkLayer[];
    edges: string[];
    totalWeight: number;
}

// ============================================================================
// Multiplex Network Class
// ============================================================================

export class MultiplexNetwork {
    readonly layers: Map<NetworkLayer, Layer>;
    private interLayerEdges: Map<string, InterLayerEdge> = new Map();

    constructor() {
        this.layers = new Map([
            ['CAPABILITY', new CapabilityLayer()],
            ['ISSUE_SURFACE', new IssueSurfaceLayer()],
            ['POLICY_AREA', new PolicyAreaLayer()],
            ['JURISDICTION', new JurisdictionLayer()],
            ['PROCEDURAL', new ProceduralLayer()],
            ['COALITION', new CoalitionLayer()],
            ['INFORMATION_FLOW', new InformationFlowLayer()],
        ]);
    }

    // ============================================================================
    // Layer Access
    // ============================================================================

    getLayer(name: NetworkLayer): Layer {
        const layer = this.layers.get(name);
        if (!layer) {
            throw new Error(`Layer '${name}' not found`);
        }
        return layer;
    }

    getCapabilityLayer(): CapabilityLayer {
        return this.getLayer('CAPABILITY') as CapabilityLayer;
    }

    getIssueSurfaceLayer(): IssueSurfaceLayer {
        return this.getLayer('ISSUE_SURFACE') as IssueSurfaceLayer;
    }

    getPolicyAreaLayer(): PolicyAreaLayer {
        return this.getLayer('POLICY_AREA') as PolicyAreaLayer;
    }

    getJurisdictionLayer(): JurisdictionLayer {
        return this.getLayer('JURISDICTION') as JurisdictionLayer;
    }

    getProceduralLayer(): ProceduralLayer {
        return this.getLayer('PROCEDURAL') as ProceduralLayer;
    }

    getCoalitionLayer(): CoalitionLayer {
        return this.getLayer('COALITION') as CoalitionLayer;
    }

    getInformationFlowLayer(): InformationFlowLayer {
        return this.getLayer('INFORMATION_FLOW') as InformationFlowLayer;
    }

    // ============================================================================
    // Cross-Layer Node Operations
    // ============================================================================

    /**
     * Add a node to all appropriate layers based on its type
     */
    addNodeToLayers(node: NetworkNode): void {
        for (const layer of this.layers.values()) {
            if (layer['allowedNodeTypes'].has(node.type)) {
                layer.addNode(node);
            }
        }
    }

    /**
     * Find a node across all layers
     */
    findNode(nodeId: string): { node: NetworkNode; layers: NetworkLayer[] } | undefined {
        const layers: NetworkLayer[] = [];
        let foundNode: NetworkNode | undefined;

        for (const [layerName, layer] of this.layers) {
            const node = layer.getNode(nodeId);
            if (node) {
                foundNode = node;
                layers.push(layerName);
            }
        }

        if (foundNode) {
            return { node: foundNode, layers };
        }
        return undefined;
    }

    /**
     * Get all layers a node participates in
     */
    getNodeLayers(nodeId: string): NetworkLayer[] {
        const layers: NetworkLayer[] = [];

        for (const [layerName, layer] of this.layers) {
            if (layer.hasNode(nodeId)) {
                layers.push(layerName);
            }
        }

        return layers;
    }

    // ============================================================================
    // Inter-Layer Edge Operations
    // ============================================================================

    /**
     * Add an inter-layer edge connecting the same node across layers
     */
    addInterLayerEdge(edge: InterLayerEdge): void {
        // Validate both layers exist and node exists in both
        const sourceLayer = this.getLayer(edge.sourceLayer);
        const targetLayer = this.getLayer(edge.targetLayer);

        if (!sourceLayer.hasNode(edge.nodeId)) {
            throw new Error(`Node '${edge.nodeId}' not found in layer '${edge.sourceLayer}'`);
        }
        if (!targetLayer.hasNode(edge.nodeId)) {
            throw new Error(`Node '${edge.nodeId}' not found in layer '${edge.targetLayer}'`);
        }

        this.interLayerEdges.set(edge.id, edge);
        sourceLayer.addInterLayerEdge(edge);
        targetLayer.addInterLayerEdge(edge);
    }

    /**
     * Get all inter-layer edges for a node
     */
    getInterLayerEdges(nodeId: string): InterLayerEdge[] {
        return [...this.interLayerEdges.values()].filter(e => e.nodeId === nodeId);
    }

    /**
     * Automatically create inter-layer edges for nodes that exist in multiple layers
     */
    autoGenerateInterLayerEdges(couplingStrength = 1): void {
        const nodeLayerMap = new Map<string, NetworkLayer[]>();

        // Find all nodes and their layers
        for (const [layerName, layer] of this.layers) {
            for (const node of layer.getAllNodes()) {
                const layers = nodeLayerMap.get(node.id) ?? [];
                layers.push(layerName);
                nodeLayerMap.set(node.id, layers);
            }
        }

        // Create inter-layer edges for nodes in multiple layers
        for (const [nodeId, nodeLayers] of nodeLayerMap) {
            for (let i = 0; i < nodeLayers.length; i++) {
                for (let j = i + 1; j < nodeLayers.length; j++) {
                    const edge: InterLayerEdge = {
                        id: `${nodeId}-${nodeLayers[i]}-${nodeLayers[j]}`,
                        nodeId,
                        sourceLayer: nodeLayers[i]!,
                        targetLayer: nodeLayers[j]!,
                        couplingStrength,
                        metadata: {},
                    };

                    if (!this.interLayerEdges.has(edge.id)) {
                        this.addInterLayerEdge(edge);
                    }
                }
            }
        }
    }

    // ============================================================================
    // Cross-Layer Path Finding
    // ============================================================================

    /**
     * Find paths across multiple layers
     */
    findCrossLayerPaths(
        fromId: string,
        toId: string,
        options: {
            maxDepth?: number;
            allowedLayers?: NetworkLayer[];
            requireLayerTransition?: boolean;
        } = {}
    ): CrossLayerPath[] {
        const maxDepth = options.maxDepth ?? 10;
        const allowedLayers = options.allowedLayers ?? [...this.layers.keys()];
        const paths: CrossLayerPath[] = [];

        const dfs = (
            currentId: string,
            currentLayer: NetworkLayer,
            path: { node: string; layer: NetworkLayer; edge?: string }[],
            depth: number
        ) => {
            if (depth > maxDepth) return;

            if (currentId === toId) {
                paths.push({
                    nodes: path.map(p => p.node),
                    layers: path.map(p => p.layer),
                    edges: path.filter(p => p.edge).map(p => p.edge!),
                    totalWeight: 1, // Simplified
                });
                return;
            }

            const layer = this.getLayer(currentLayer);

            // Explore within current layer
            for (const edge of layer.getOutgoingEdges(currentId)) {
                if (path.some(p => p.node === edge.targetId && p.layer === currentLayer)) continue;

                path.push({ node: edge.targetId, layer: currentLayer, edge: edge.id });
                dfs(edge.targetId, currentLayer, path, depth + 1);
                path.pop();
            }

            // Explore layer transitions via inter-layer edges
            for (const interEdge of this.getInterLayerEdges(currentId)) {
                const nextLayer = interEdge.sourceLayer === currentLayer
                    ? interEdge.targetLayer
                    : interEdge.sourceLayer;

                if (!allowedLayers.includes(nextLayer)) continue;

                // Stay on same node but transition to different layer
                path.push({ node: currentId, layer: nextLayer, edge: interEdge.id });
                dfs(currentId, nextLayer, path, depth + 1);
                path.pop();
            }
        };

        // Start from all layers the source node is in
        const startLayers = this.getNodeLayers(fromId).filter(l => allowedLayers.includes(l));
        for (const startLayer of startLayers) {
            dfs(fromId, startLayer, [{ node: fromId, layer: startLayer }], 0);
        }

        return paths;
    }

    // ============================================================================
    // Multiplex Metrics
    // ============================================================================

    /**
     * Compute comprehensive multiplex network metrics
     */
    computeMetrics(): MultiplexMetrics {
        const layerMetrics: Partial<Record<NetworkLayer, LayerMetrics>> = {};
        let totalNodes = 0;
        let totalEdges = 0;

        const nodeLayerCounts = new Map<string, number>();

        for (const [layerName, layer] of this.layers) {
            const metrics = layer.computeMetrics();
            layerMetrics[layerName] = metrics;
            totalNodes += metrics.nodeCount;
            totalEdges += metrics.edgeCount;

            // Track node participation
            for (const node of layer.getAllNodes()) {
                nodeLayerCounts.set(node.id, (nodeLayerCounts.get(node.id) ?? 0) + 1);
            }
        }

        // Calculate versatility (nodes in multiple layers)
        const versatility = new Map<string, number>();
        for (const [nodeId, layerCount] of nodeLayerCounts) {
            versatility.set(nodeId, layerCount / this.layers.size);
        }

        return {
            totalNodes,
            totalEdges,
            totalInterLayerEdges: this.interLayerEdges.size,
            layerMetrics: layerMetrics as Record<NetworkLayer, LayerMetrics>,
            versatility,
            multiplexParticipation: nodeLayerCounts,
        };
    }

    /**
     * Calculate node versatility score
     */
    calculateVersatility(nodeId: string): number {
        const layers = this.getNodeLayers(nodeId);
        return layers.length / this.layers.size;
    }

    /**
     * Calculate multiplex centrality (aggregated across layers)
     */
    calculateMultiplexCentrality(nodeId: string): number {
        let totalCentrality = 0;
        let layerCount = 0;

        for (const layer of this.layers.values()) {
            if (!layer.hasNode(nodeId)) continue;

            // Simplified degree centrality per layer
            const degree = layer.getAdjacentEdges(nodeId).length;
            const maxDegree = layer.getAllNodes().length - 1;

            if (maxDegree > 0) {
                totalCentrality += degree / maxDegree;
                layerCount++;
            }
        }

        return layerCount > 0 ? totalCentrality / layerCount : 0;
    }

    // ============================================================================
    // Validation
    // ============================================================================

    /**
     * Validate all layers
     */
    validateAll(): { valid: boolean; errors: Map<NetworkLayer, string[]> } {
        const errors = new Map<NetworkLayer, string[]>();
        let valid = true;

        for (const [layerName, layer] of this.layers) {
            const result = layer.validateSemantics();
            if (!result.valid) {
                valid = false;
                errors.set(layerName, result.errors);
            }
        }

        return { valid, errors };
    }

    // ============================================================================
    // Serialization
    // ============================================================================

    toJSON(): {
        layers: Record<NetworkLayer, ReturnType<Layer['toJSON']>>;
        interLayerEdges: InterLayerEdge[];
        metrics: MultiplexMetrics;
    } {
        const layers: Partial<Record<NetworkLayer, ReturnType<Layer['toJSON']>>> = {};

        for (const [name, layer] of this.layers) {
            layers[name] = layer.toJSON();
        }

        return {
            layers: layers as Record<NetworkLayer, ReturnType<Layer['toJSON']>>,
            interLayerEdges: [...this.interLayerEdges.values()],
            metrics: this.computeMetrics(),
        };
    }
}
