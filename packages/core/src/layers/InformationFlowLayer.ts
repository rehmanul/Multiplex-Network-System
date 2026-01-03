/**
 * Multiplex Political-Institutional Network - Information Flow Layer
 * 
 * Information transmission paths between actors
 */

import { Layer, type LayerConfig } from './Layer.js';
import type { Edge } from '../models/edges/index.js';

const INFORMATION_FLOW_LAYER_CONFIG: LayerConfig = {
    name: 'INFORMATION_FLOW',
    description: 'Information flow relationships - transmission paths and coordination',
    allowedNodeTypes: [
        'CONGRESS_MEMBER',
        'COMMITTEE',
        'SUBCOMMITTEE',
        'STAFF',
        'EXECUTIVE_AGENCY',
        'SUB_AGENCY',
        'OVERSIGHT_BODY',
    ],
    allowedEdgeTypes: [
        'INFORMS',
        'COORDINATES',
        'ROUTES_THROUGH',
    ],
    computeMetrics: true,
};

export class InformationFlowLayer extends Layer {
    constructor() {
        super(INFORMATION_FLOW_LAYER_CONFIG);
    }

    validateSemantics(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        return { valid: errors.length === 0, errors };
    }

    findPaths(
        fromId: string,
        toId: string,
        options: { maxDepth?: number; signFilter?: Edge['sign'] } = {}
    ): string[][] {
        const maxDepth = options.maxDepth ?? 10;
        const paths: string[][] = [];

        const dfs = (current: string, target: string, path: string[], depth: number) => {
            if (depth > maxDepth) return;
            if (current === target) {
                paths.push([...path]);
                return;
            }

            for (const edge of this.getAdjacentEdges(current)) {
                let nextNode: string;
                if (edge.direction === 'UNDIRECTED') {
                    nextNode = edge.sourceId === current ? edge.targetId : edge.sourceId;
                } else {
                    if (edge.sourceId !== current) continue;
                    nextNode = edge.targetId;
                }

                if (path.includes(nextNode)) continue;

                path.push(nextNode);
                dfs(nextNode, target, path, depth + 1);
                path.pop();
            }
        };

        dfs(fromId, toId, [fromId], 0);
        return paths;
    }

    /**
     * Calculate information reach from a node
     */
    calculateReach(nodeId: string, maxHops = 3): Map<string, number> {
        const reach = new Map<string, number>();
        const queue: Array<{ id: string; hops: number }> = [{ id: nodeId, hops: 0 }];
        const visited = new Set<string>([nodeId]);

        while (queue.length > 0) {
            const { id, hops } = queue.shift()!;

            if (hops >= maxHops) continue;

            for (const edge of this.getAdjacentEdges(id)) {
                let nextId: string;
                if (edge.sourceId === id) {
                    nextId = edge.targetId;
                } else if (edge.direction === 'UNDIRECTED') {
                    nextId = edge.sourceId;
                } else {
                    continue;
                }

                if (visited.has(nextId)) continue;
                visited.add(nextId);

                reach.set(nextId, hops + 1);
                queue.push({ id: nextId, hops: hops + 1 });
            }
        }

        return reach;
    }

    /**
     * Find bottlenecks in information flow
     */
    findBottlenecks(): Array<{ nodeId: string; betweenness: number }> {
        // Simplified betweenness centrality
        const betweenness = new Map<string, number>();
        const nodes = this.getAllNodes();

        for (const node of nodes) {
            betweenness.set(node.id, 0);
        }

        for (const source of nodes) {
            for (const target of nodes) {
                if (source.id === target.id) continue;

                const paths = this.findPaths(source.id, target.id, { maxDepth: 5 });
                if (paths.length === 0) continue;

                // Count how often each node appears in shortest paths
                const shortestLength = Math.min(...paths.map(p => p.length));
                const shortestPaths = paths.filter(p => p.length === shortestLength);

                for (const path of shortestPaths) {
                    for (let i = 1; i < path.length - 1; i++) {
                        const nodeId = path[i]!;
                        betweenness.set(nodeId, (betweenness.get(nodeId) ?? 0) + 1 / shortestPaths.length);
                    }
                }
            }
        }

        return [...betweenness.entries()]
            .map(([nodeId, score]) => ({ nodeId, betweenness: score }))
            .sort((a, b) => b.betweenness - a.betweenness);
    }

    /**
     * Detect information silos
     */
    detectSilos(): string[][] {
        const visited = new Set<string>();
        const silos: string[][] = [];

        for (const node of this.getAllNodes()) {
            if (visited.has(node.id)) continue;

            const silo: string[] = [];
            const queue = [node.id];

            while (queue.length > 0) {
                const current = queue.shift()!;
                if (visited.has(current)) continue;

                visited.add(current);
                silo.push(current);

                for (const edge of this.getAdjacentEdges(current)) {
                    const next = edge.sourceId === current ? edge.targetId : edge.sourceId;
                    if (!visited.has(next)) {
                        queue.push(next);
                    }
                }
            }

            if (silo.length > 0) {
                silos.push(silo);
            }
        }

        return silos;
    }
}
