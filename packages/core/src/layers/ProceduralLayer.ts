/**
 * Multiplex Political-Institutional Network - Procedural Layer
 * 
 * Non-statutory policy instruments (report language, guidance, vehicles)
 */

import { Layer, type LayerConfig } from './Layer.js';
import type { Edge } from '../models/edges/index.js';

const PROCEDURAL_LAYER_CONFIG: LayerConfig = {
    name: 'PROCEDURAL',
    description: 'Procedural relationships - legislative vehicles, report language, agency guidance',
    allowedNodeTypes: [
        'COMMITTEE',
        'SUBCOMMITTEE',
        'EXECUTIVE_AGENCY',
        'SUB_AGENCY',
        'POLICY_EXPRESSION',
        'PROCEDURAL_VEHICLE',
        'JURISDICTIONAL_AUTHORITY',
        'PRECEDENT',
    ],
    allowedEdgeTypes: [
        'PRODUCES',
        'REFERENCES',
        'ENABLES',
    ],
    computeMetrics: true,
};

export class ProceduralLayer extends Layer {
    constructor() {
        super(PROCEDURAL_LAYER_CONFIG);
    }

    validateSemantics(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate that enabled expressions have valid vehicles
        for (const edge of this.getEdgesByType('ENABLES')) {
            const vehicle = this.getNode(edge.sourceId);
            const expression = this.getNode(edge.targetId);

            if (vehicle?.type !== 'PROCEDURAL_VEHICLE') {
                errors.push(`ENABLES edge source must be PROCEDURAL_VEHICLE`);
            }
            if (expression?.type !== 'POLICY_EXPRESSION') {
                errors.push(`ENABLES edge target must be POLICY_EXPRESSION`);
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
     * Find all available procedural vehicles for a policy expression
     */
    findAvailableVehicles(policyExpressionId: string): string[] {
        const vehicles: string[] = [];

        for (const edge of this.getEdgesByType('ENABLES')) {
            if (edge.targetId === policyExpressionId) {
                vehicles.push(edge.sourceId);
            }
        }

        return vehicles;
    }

    /**
     * Find expressions that can be attached to a vehicle
     */
    findAttachableExpressions(vehicleId: string): string[] {
        const expressions: string[] = [];

        for (const edge of this.getOutgoingEdges(vehicleId)) {
            if (edge.type === 'ENABLES') {
                expressions.push(edge.targetId);
            }
        }

        return expressions;
    }

    /**
     * Build the production chain for a policy expression
     */
    buildProductionChain(expressionId: string): {
        producers: string[];
        vehicles: string[];
        references: string[];
    } {
        const producers: string[] = [];
        const vehicles: string[] = [];
        const references: string[] = [];

        // Find who produces this expression
        for (const edge of this.getIncomingEdges(expressionId)) {
            if (edge.type === 'PRODUCES') {
                producers.push(edge.sourceId);
            }
            if (edge.type === 'ENABLES') {
                vehicles.push(edge.sourceId);
            }
        }

        // Find what this expression references
        for (const edge of this.getOutgoingEdges(expressionId)) {
            if (edge.type === 'REFERENCES') {
                references.push(edge.targetId);
            }
        }

        return { producers, vehicles, references };
    }
}
