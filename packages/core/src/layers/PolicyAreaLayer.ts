/**
 * Multiplex Political-Institutional Network - Policy Area Layer
 * 
 * Policy area categorization and relationships
 */

import { Layer, type LayerConfig } from './Layer.js';
import type { Edge } from '../models/edges/index.js';

const POLICY_AREA_LAYER_CONFIG: LayerConfig = {
    name: 'POLICY_AREA',
    description: 'Policy area relationships - categorical policy domains and jurisdictions',
    allowedNodeTypes: [
        'POLICY_AREA',
        'ISSUE_SURFACE',
        'COMMITTEE',
        'EXECUTIVE_AGENCY',
    ],
    allowedEdgeTypes: [
        'MAPS_TO',
        'HAS_AUTHORITY',
        'ROUTES_THROUGH',
    ],
    computeMetrics: true,
};

export class PolicyAreaLayer extends Layer {
    constructor() {
        super(POLICY_AREA_LAYER_CONFIG);
    }

    validateSemantics(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Policy areas should have at least one entity with authority
        for (const policyArea of this.getNodesByType('POLICY_AREA')) {
            const authorities = this.getIncomingEdges(policyArea.id)
                .filter(e => e.type === 'HAS_AUTHORITY');

            if (authorities.length === 0) {
                // Warning: no authority assigned
            }
        }

        return { valid: errors.length === 0, errors };
    }

    findPaths(
        fromId: string,
        toId: string,
        options: { maxDepth?: number; signFilter?: Edge['sign'] } = {}
    ): string[][] {
        const maxDepth = options.maxDepth ?? 8;
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
     * Build hierarchical policy area tree
     */
    buildPolicyHierarchy(): Map<string, string[]> {
        const hierarchy = new Map<string, string[]>();

        for (const policyArea of this.getNodesByType('POLICY_AREA')) {
            if ('parentAreaId' in policyArea && policyArea.parentAreaId) {
                const parentId = policyArea.parentAreaId as string;
                const children = hierarchy.get(parentId) ?? [];
                children.push(policyArea.id);
                hierarchy.set(parentId, children);
            }
        }

        return hierarchy;
    }

    /**
     * Find all root policy areas (no parent)
     */
    getRootPolicyAreas(): string[] {
        return this.getNodesByType('POLICY_AREA')
            .filter(pa => !('parentAreaId' in pa) || !pa.parentAreaId)
            .map(pa => pa.id);
    }
}
