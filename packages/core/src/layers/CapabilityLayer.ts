/**
 * Multiplex Political-Institutional Network - Capability Layer
 * 
 * Handles capability → failure mode reduction relationships
 */

import { Layer, type LayerConfig } from './Layer.js';
import type { Edge } from '../models/edges/index.js';

const CAPABILITY_LAYER_CONFIG: LayerConfig = {
    name: 'CAPABILITY',
    description: 'Capability relationships - capabilities as exogenous, immutable entities that reduce failure modes',
    allowedNodeTypes: [
        'CAPABILITY',
        'CAPABILITY_IMPLEMENTATION',
        'INSURABLE_RISK_CATEGORY',
        'CONSTITUENT_EXPOSURE_CATEGORY',
    ],
    allowedEdgeTypes: [
        'REDUCES_FAILURE_MODE',
        'IMPLEMENTS',
        'REDUCES_RISK',
        'AFFECTS_EXPOSURE',
    ],
    computeMetrics: true,
};

export class CapabilityLayer extends Layer {
    constructor() {
        super(CAPABILITY_LAYER_CONFIG);
    }

    validateSemantics(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Ensure all capabilities are marked as exogenous
        for (const node of this.getNodesByType('CAPABILITY')) {
            if ('isExogenous' in node && !node.isExogenous) {
                errors.push(`Capability '${node.id}' must be exogenous (immutable)`);
            }
        }

        // Validate implementation chains
        for (const edge of this.getEdgesByType('IMPLEMENTS')) {
            const impl = this.getNode(edge.sourceId);
            const cap = this.getNode(edge.targetId);

            if (impl && cap) {
                if (impl.type !== 'CAPABILITY_IMPLEMENTATION') {
                    errors.push(`IMPLEMENTS edge source must be CAPABILITY_IMPLEMENTATION`);
                }
                if (cap.type !== 'CAPABILITY') {
                    errors.push(`IMPLEMENTS edge target must be CAPABILITY`);
                }
            }
        }

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

            for (const edge of this.getOutgoingEdges(current)) {
                if (options.signFilter && edge.sign !== options.signFilter) continue;
                if (path.includes(edge.targetId)) continue; // Avoid cycles

                path.push(edge.targetId);
                dfs(edge.targetId, target, path, depth + 1);
                path.pop();
            }
        };

        dfs(fromId, toId, [fromId], 0);
        return paths;
    }

    /**
     * Find all capabilities that reduce a specific risk category
     */
    findCapabilitiesForRisk(riskCategoryId: string): string[] {
        const capabilities: string[] = [];

        for (const edge of this.getEdgesByType('REDUCES_FAILURE_MODE')) {
            if (edge.targetId === riskCategoryId) {
                capabilities.push(edge.sourceId);
            }
        }

        for (const edge of this.getEdgesByType('REDUCES_RISK')) {
            if (edge.targetId === riskCategoryId) {
                capabilities.push(edge.sourceId);
            }
        }

        return [...new Set(capabilities)];
    }

    /**
     * Calculate capability coverage for a set of risk categories
     */
    calculateCoverage(riskCategoryIds: string[]): {
        covered: string[];
        uncovered: string[];
        coverageRatio: number;
    } {
        const covered: Set<string> = new Set();

        for (const riskId of riskCategoryIds) {
            const caps = this.findCapabilitiesForRisk(riskId);
            if (caps.length > 0) {
                covered.add(riskId);
            }
        }

        const uncovered = riskCategoryIds.filter(id => !covered.has(id));

        return {
            covered: [...covered],
            uncovered,
            coverageRatio: riskCategoryIds.length > 0
                ? covered.size / riskCategoryIds.length
                : 0,
        };
    }
}
