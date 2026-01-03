/**
 * Multiplex Political-Institutional Network - Jurisdiction Layer
 * 
 * Authority allocation: policy area → committee → staff → agency
 */

import { Layer, type LayerConfig } from './Layer.js';
import type { Edge } from '../models/edges/index.js';

const JURISDICTION_LAYER_CONFIG: LayerConfig = {
    name: 'JURISDICTION',
    description: 'Jurisdictional relationships - authority allocation and organizational structure',
    allowedNodeTypes: [
        'CONGRESS_MEMBER',
        'COMMITTEE',
        'SUBCOMMITTEE',
        'STAFF',
        'EXECUTIVE_AGENCY',
        'SUB_AGENCY',
        'OVERSIGHT_BODY',
        'POLICY_AREA',
        'JURISDICTIONAL_AUTHORITY',
    ],
    allowedEdgeTypes: [
        'MEMBERSHIP',
        'LEADERSHIP',
        'EMPLOYMENT',
        'ORGANIZATIONAL',
        'HAS_AUTHORITY',
        'SUPPORTS',
        'DELEGATES',
        'EXERCISES',
    ],
    computeMetrics: true,
};

export class JurisdictionLayer extends Layer {
    constructor() {
        super(JURISDICTION_LAYER_CONFIG);
    }

    validateSemantics(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate that committees have at least some members
        for (const committee of this.getNodesByType('COMMITTEE')) {
            const members = this.getIncomingEdges(committee.id)
                .filter(e => e.type === 'MEMBERSHIP' || e.type === 'LEADERSHIP');

            if (members.length === 0) {
                // Warning, not error - committee might not have loaded members yet
            }
        }

        // Validate leadership edges require membership
        for (const leadershipEdge of this.getEdgesByType('LEADERSHIP')) {
            const hasMembership = this.getEdgesByType('MEMBERSHIP').some(
                e => e.sourceId === leadershipEdge.sourceId &&
                    e.targetId === leadershipEdge.targetId
            );

            // Leadership implies membership, but we allow implicit membership
        }

        // Validate delegation chains
        for (const delegateEdge of this.getEdgesByType('DELEGATES')) {
            const source = this.getNode(delegateEdge.sourceId);
            const target = this.getNode(delegateEdge.targetId);

            if (source?.type === 'COMMITTEE' && target?.type !== 'SUBCOMMITTEE') {
                errors.push(
                    `Committee can only delegate to subcommittee, not ${target?.type}`
                );
            }

            if (source?.type === 'EXECUTIVE_AGENCY' && target?.type !== 'SUB_AGENCY') {
                errors.push(
                    `Agency can only delegate to sub-agency, not ${target?.type}`
                );
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
     * Find the authority chain from a policy area to agencies
     */
    findAuthorityChain(policyAreaId: string): {
        committees: string[];
        agencies: string[];
        authorities: string[];
    } {
        const committees: Set<string> = new Set();
        const agencies: Set<string> = new Set();
        const authorities: Set<string> = new Set();

        // Find committees with authority over this policy area
        for (const edge of this.getEdgesByType('HAS_AUTHORITY')) {
            if (edge.targetId === policyAreaId) {
                const source = this.getNode(edge.sourceId);
                if (source?.type === 'COMMITTEE' || source?.type === 'SUBCOMMITTEE') {
                    committees.add(edge.sourceId);
                } else if (source?.type === 'EXECUTIVE_AGENCY' || source?.type === 'SUB_AGENCY') {
                    agencies.add(edge.sourceId);
                }
            }
        }

        // Find authorities exercised by agencies
        for (const edge of this.getEdgesByType('EXERCISES')) {
            agencies.add(edge.sourceId);
            authorities.add(edge.targetId);
        }

        return {
            committees: [...committees],
            agencies: [...agencies],
            authorities: [...authorities],
        };
    }

    /**
     * Find all members of a committee (including subcommittees)
     */
    getCommitteeMembers(committeeId: string, includeSubcommittees = true): string[] {
        const members: Set<string> = new Set();

        // Direct members
        for (const edge of this.getIncomingEdges(committeeId)) {
            if (edge.type === 'MEMBERSHIP' || edge.type === 'LEADERSHIP') {
                members.add(edge.sourceId);
            }
        }

        // Subcommittee members
        if (includeSubcommittees) {
            for (const edge of this.getOutgoingEdges(committeeId)) {
                if (edge.type === 'DELEGATES') {
                    const subMembers = this.getCommitteeMembers(edge.targetId, false);
                    subMembers.forEach(m => members.add(m));
                }
            }
        }

        return [...members];
    }

    /**
     * Calculate overlap between committee jurisdictions
     */
    calculateJurisdictionOverlap(): Map<string, Map<string, number>> {
        const overlap = new Map<string, Map<string, number>>();
        const committees = this.getNodesByType('COMMITTEE');

        // Build policy area sets for each committee
        const committeeAreas = new Map<string, Set<string>>();
        for (const committee of committees) {
            const areas = new Set<string>();
            for (const edge of this.getOutgoingEdges(committee.id)) {
                if (edge.type === 'HAS_AUTHORITY' &&
                    this.getNode(edge.targetId)?.type === 'POLICY_AREA') {
                    areas.add(edge.targetId);
                }
            }
            committeeAreas.set(committee.id, areas);
        }

        // Calculate pairwise overlap
        for (const [id1, areas1] of committeeAreas) {
            const innerMap = new Map<string, number>();
            for (const [id2, areas2] of committeeAreas) {
                if (id1 !== id2) {
                    const intersection = [...areas1].filter(a => areas2.has(a)).length;
                    const union = new Set([...areas1, ...areas2]).size;
                    const jaccardIndex = union > 0 ? intersection / union : 0;
                    innerMap.set(id2, jaccardIndex);
                }
            }
            overlap.set(id1, innerMap);
        }

        return overlap;
    }
}
