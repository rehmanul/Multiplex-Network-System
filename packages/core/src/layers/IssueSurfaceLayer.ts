/**
 * Multiplex Political-Institutional Network - Issue Surface Layer
 * 
 * Semantic projections from capabilities to issue surfaces
 */

import { Layer, type LayerConfig } from './Layer.js';
import type { Edge } from '../models/edges/index.js';

const ISSUE_SURFACE_LAYER_CONFIG: LayerConfig = {
    name: 'ISSUE_SURFACE',
    description: 'Issue surface relationships - semantic projections without endorsement',
    allowedNodeTypes: [
        'CAPABILITY',
        'ISSUE_SURFACE',
        'POLICY_AREA',
    ],
    allowedEdgeTypes: [
        'PROJECTS_TO',
        'MAPS_TO',
    ],
    computeMetrics: true,
};

export class IssueSurfaceLayer extends Layer {
    constructor() {
        super(ISSUE_SURFACE_LAYER_CONFIG);
    }

    validateSemantics(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Issue surfaces should map to at least one policy area
        for (const issueSurface of this.getNodesByType('ISSUE_SURFACE')) {
            const mappings = this.getOutgoingEdges(issueSurface.id)
                .filter(e => e.type === 'MAPS_TO');

            if (mappings.length === 0) {
                // Warning: unmapped issue surface
            }
        }

        return { valid: errors.length === 0, errors };
    }

    findPaths(
        fromId: string,
        toId: string,
        options: { maxDepth?: number; signFilter?: Edge['sign'] } = {}
    ): string[][] {
        const maxDepth = options.maxDepth ?? 5;
        const paths: string[][] = [];

        const dfs = (current: string, target: string, path: string[], depth: number) => {
            if (depth > maxDepth) return;
            if (current === target) {
                paths.push([...path]);
                return;
            }

            for (const edge of this.getOutgoingEdges(current)) {
                if (path.includes(edge.targetId)) continue;

                path.push(edge.targetId);
                dfs(edge.targetId, target, path, depth + 1);
                path.pop();
            }
        };

        dfs(fromId, toId, [fromId], 0);
        return paths;
    }

    /**
     * Find all issue surfaces that a capability projects to
     */
    getCapabilityProjections(capabilityId: string): string[] {
        return this.getOutgoingEdges(capabilityId)
            .filter(e => e.type === 'PROJECTS_TO')
            .map(e => e.targetId);
    }

    /**
     * Find all policy areas an issue surface maps to
     */
    getPolicyAreaMappings(issueSurfaceId: string): string[] {
        return this.getOutgoingEdges(issueSurfaceId)
            .filter(e => e.type === 'MAPS_TO')
            .map(e => e.targetId);
    }

    /**
     * Build full routing path: capability → issue surface → policy area
     */
    buildRoutingPath(capabilityId: string): Map<string, string[]> {
        const routing = new Map<string, string[]>();

        const issueSurfaces = this.getCapabilityProjections(capabilityId);

        for (const isId of issueSurfaces) {
            const policyAreas = this.getPolicyAreaMappings(isId);
            routing.set(isId, policyAreas);
        }

        return routing;
    }

    /**
     * Calculate semantic similarity between two issue surfaces
     * (placeholder for embedding-based similarity)
     */
    calculateSimilarity(is1Id: string, is2Id: string): number {
        const is1 = this.getNode(is1Id);
        const is2 = this.getNode(is2Id);

        if (!is1 || !is2) return 0;

        // Use keyword overlap as proxy for similarity
        if ('keywords' in is1 && 'keywords' in is2) {
            const keywords1 = new Set((is1 as { keywords: string[] }).keywords);
            const keywords2 = new Set((is2 as { keywords: string[] }).keywords);

            const intersection = [...keywords1].filter(k => keywords2.has(k)).length;
            const union = new Set([...keywords1, ...keywords2]).size;

            return union > 0 ? intersection / union : 0;
        }

        return 0;
    }
}
