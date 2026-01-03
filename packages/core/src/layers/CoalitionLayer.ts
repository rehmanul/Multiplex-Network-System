/**
 * Multiplex Political-Institutional Network - Coalition Layer
 * 
 * Member coalitions, voting blocs, and alliance relationships
 */

import { Layer, type LayerConfig } from './Layer.js';
import type { Edge } from '../models/edges/index.js';

const COALITION_LAYER_CONFIG: LayerConfig = {
    name: 'COALITION',
    description: 'Coalition relationships - alliances, oppositions, and incentive mappings',
    allowedNodeTypes: [
        'CONGRESS_MEMBER',
        'COMMITTEE',
        'POLICY_EXPRESSION',
        'POLICY_AREA',
        'INDUSTRY_SEGMENT',
        'CAPABILITY',
    ],
    allowedEdgeTypes: [
        'ALLIES_WITH',
        'OPPOSES',
        'INCENTIVIZES',
        'BENEFITS',
        'COMPATIBLE',
        'INCOMPATIBLE',
    ],
    computeMetrics: true,
};

export class CoalitionLayer extends Layer {
    constructor() {
        super(COALITION_LAYER_CONFIG);
    }

    validateSemantics(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate sign consistency
        for (const edge of this.getAllEdges()) {
            if (edge.type === 'ALLIES_WITH' && edge.sign !== 'POSITIVE') {
                errors.push(`ALLIES_WITH edge ${edge.id} should have POSITIVE sign`);
            }
            if (edge.type === 'OPPOSES' && edge.sign !== 'NEGATIVE') {
                errors.push(`OPPOSES edge ${edge.id} should have NEGATIVE sign`);
            }
            if (edge.type === 'COMPATIBLE' && edge.sign !== 'POSITIVE') {
                errors.push(`COMPATIBLE edge ${edge.id} should have POSITIVE sign`);
            }
            if (edge.type === 'INCOMPATIBLE' && edge.sign !== 'NEGATIVE') {
                errors.push(`INCOMPATIBLE edge ${edge.id} should have NEGATIVE sign`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    findPaths(
        fromId: string,
        toId: string,
        options: { maxDepth?: number; signFilter?: Edge['sign'] } = {}
    ): string[][] {
        const maxDepth = options.maxDepth ?? 6;
        const paths: string[][] = [];

        const dfs = (current: string, target: string, path: string[], depth: number) => {
            if (depth > maxDepth) return;
            if (current === target) {
                paths.push([...path]);
                return;
            }

            // Coalition edges are often undirected, check both directions
            for (const edge of this.getAdjacentEdges(current)) {
                if (options.signFilter && edge.sign !== options.signFilter) continue;

                const nextNode = edge.sourceId === current ? edge.targetId : edge.sourceId;
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
     * Find all allies of a member (direct and transitive)
     */
    findAllies(memberId: string, maxDepth = 2): Map<string, number> {
        const allies = new Map<string, number>(); // memberId -> strength

        const bfs = (startId: string) => {
            const queue: Array<{ id: string; depth: number; strength: number }> = [
                { id: startId, depth: 0, strength: 1 }
            ];
            const visited = new Set<string>([startId]);

            while (queue.length > 0) {
                const { id, depth, strength } = queue.shift()!;

                if (depth >= maxDepth) continue;

                for (const edge of this.getAdjacentEdges(id)) {
                    if (edge.type !== 'ALLIES_WITH') continue;

                    const nextId = edge.sourceId === id ? edge.targetId : edge.sourceId;
                    if (visited.has(nextId)) continue;

                    visited.add(nextId);
                    const newStrength = strength * (edge.weight ?? 1) * 0.5; // Decay with depth

                    const existing = allies.get(nextId) ?? 0;
                    allies.set(nextId, Math.max(existing, newStrength));

                    queue.push({ id: nextId, depth: depth + 1, strength: newStrength });
                }
            }
        };

        bfs(memberId);
        allies.delete(memberId); // Remove self

        return allies;
    }

    /**
     * Find all opponents of a member
     */
    findOpponents(memberId: string): string[] {
        const opponents: string[] = [];

        for (const edge of this.getAdjacentEdges(memberId)) {
            if (edge.type === 'OPPOSES') {
                const opponent = edge.sourceId === memberId ? edge.targetId : edge.sourceId;
                opponents.push(opponent);
            }
        }

        return opponents;
    }

    /**
     * Detect potential coalition blocks using community detection
     */
    detectCoalitionBlocks(): Map<number, string[]> {
        // Simple label propagation for community detection
        const labels = new Map<string, number>();
        const members = this.getNodesByType('CONGRESS_MEMBER');

        // Initialize each node with unique label
        members.forEach((m, i) => labels.set(m.id, i));

        // Iterate until convergence
        let changed = true;
        let iterations = 0;
        const maxIterations = 100;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;

            for (const member of members) {
                const neighborLabels = new Map<number, number>();

                for (const edge of this.getAdjacentEdges(member.id)) {
                    if (edge.type === 'ALLIES_WITH') {
                        const neighbor = edge.sourceId === member.id ? edge.targetId : edge.sourceId;
                        const label = labels.get(neighbor);
                        if (label !== undefined) {
                            neighborLabels.set(label, (neighborLabels.get(label) ?? 0) + 1);
                        }
                    }
                }

                if (neighborLabels.size > 0) {
                    // Find most common neighbor label
                    let maxCount = 0;
                    let maxLabel = labels.get(member.id)!;

                    for (const [label, count] of neighborLabels) {
                        if (count > maxCount) {
                            maxCount = count;
                            maxLabel = label;
                        }
                    }

                    if (maxLabel !== labels.get(member.id)) {
                        labels.set(member.id, maxLabel);
                        changed = true;
                    }
                }
            }
        }

        // Group by label
        const blocks = new Map<number, string[]>();
        for (const [memberId, label] of labels) {
            const block = blocks.get(label) ?? [];
            block.push(memberId);
            blocks.set(label, block);
        }

        return blocks;
    }

    /**
     * Calculate coalition strength between two members
     */
    calculateCoalitionStrength(memberId1: string, memberId2: string): number {
        // Direct alliance
        for (const edge of this.getAdjacentEdges(memberId1)) {
            if (edge.type === 'ALLIES_WITH') {
                const other = edge.sourceId === memberId1 ? edge.targetId : edge.sourceId;
                if (other === memberId2) {
                    return edge.weight ?? 1;
                }
            }
        }

        // Transitive alliance (through shared allies)
        const allies1 = this.findAllies(memberId1, 1);
        const allies2 = this.findAllies(memberId2, 1);

        let sharedStrength = 0;
        for (const [ally, strength1] of allies1) {
            const strength2 = allies2.get(ally);
            if (strength2 !== undefined) {
                sharedStrength += strength1 * strength2;
            }
        }

        return Math.min(sharedStrength, 1);
    }
}
