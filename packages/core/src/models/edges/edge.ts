/**
 * Multiplex Political-Institutional Network - Edge Definitions
 * 
 * All edge types with direction, sign, and layer semantics
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
    DataProvenanceSchema,
    TimestampSchema,
    EdgeTypeSchema,
    EdgeSignSchema,
    EdgeDirectionSchema,
    NetworkLayerSchema,
    type DataProvenance,
    type EdgeType,
    type EdgeSign,
    type EdgeDirection,
    type NetworkLayer,
} from '../../types.js';

// ============================================================================
// Edge Schema
// ============================================================================

export const EdgeSchema = z.object({
    id: z.string().uuid(),
    type: EdgeTypeSchema,
    sourceId: z.string().uuid(),
    targetId: z.string().uuid(),
    sourceType: z.string(),
    targetType: z.string(),
    direction: EdgeDirectionSchema,
    sign: EdgeSignSchema,
    layer: NetworkLayerSchema,
    weight: z.number().min(0).max(1).default(1),
    confidence: z.number().min(0).max(1).default(1),
    metadata: z.record(z.string(), z.unknown()).default({}),
    provenance: DataProvenanceSchema,
    timestamps: TimestampSchema,
    isActive: z.boolean().default(true),
});

export type Edge = z.infer<typeof EdgeSchema>;

// ============================================================================
// Edge Factory
// ============================================================================

export interface CreateEdgeOptions {
    id?: string;
    type: EdgeType;
    sourceId: string;
    targetId: string;
    sourceType: string;
    targetType: string;
    direction?: EdgeDirection;
    sign?: EdgeSign;
    layer: NetworkLayer;
    weight?: number;
    confidence?: number;
    metadata?: Record<string, unknown>;
    provenance: Omit<DataProvenance, 'retrievedAt'> & { retrievedAt?: Date };
    validFrom?: Date;
    validTo?: Date;
}

/**
 * Creates a new edge with proper defaults
 */
export function createEdge(options: CreateEdgeOptions): Edge {
    const now = new Date();

    return {
        id: options.id ?? uuidv4(),
        type: options.type,
        sourceId: options.sourceId,
        targetId: options.targetId,
        sourceType: options.sourceType,
        targetType: options.targetType,
        direction: options.direction ?? 'DIRECTED',
        sign: options.sign ?? 'NEUTRAL',
        layer: options.layer,
        weight: options.weight ?? 1,
        confidence: options.confidence ?? 1,
        metadata: options.metadata ?? {},
        provenance: {
            ...options.provenance,
            retrievedAt: options.provenance.retrievedAt ?? now,
        },
        timestamps: {
            createdAt: now,
            updatedAt: now,
            validFrom: options.validFrom,
            validTo: options.validTo,
        },
        isActive: true,
    };
}

// ============================================================================
// Edge Type Definitions with Semantics
// ============================================================================

/**
 * Edge type metadata defining valid source/target types, default direction, sign, and layer
 */
export const EdgeTypeMetadata: Record<EdgeType, {
    defaultDirection: EdgeDirection;
    defaultSign: EdgeSign;
    primaryLayer: NetworkLayer;
    validSourceTypes: string[];
    validTargetTypes: string[];
    description: string;
}> = {
    // Structural/Intrinsic relations
    MEMBERSHIP: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'JURISDICTION',
        validSourceTypes: ['CONGRESS_MEMBER'],
        validTargetTypes: ['COMMITTEE', 'SUBCOMMITTEE'],
        description: 'Member serves on committee',
    },
    LEADERSHIP: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'JURISDICTION',
        validSourceTypes: ['CONGRESS_MEMBER'],
        validTargetTypes: ['COMMITTEE', 'SUBCOMMITTEE'],
        description: 'Member leads committee (chair/ranking)',
    },
    EMPLOYMENT: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'JURISDICTION',
        validSourceTypes: ['STAFF'],
        validTargetTypes: ['CONGRESS_MEMBER', 'COMMITTEE'],
        description: 'Staff works for member/committee',
    },
    ORGANIZATIONAL: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'NEUTRAL',
        primaryLayer: 'JURISDICTION',
        validSourceTypes: ['SUB_AGENCY', 'SUBCOMMITTEE'],
        validTargetTypes: ['EXECUTIVE_AGENCY', 'COMMITTEE'],
        description: 'Organizational hierarchy',
    },

    // Capability relations
    REDUCES_FAILURE_MODE: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'CAPABILITY',
        validSourceTypes: ['CAPABILITY'],
        validTargetTypes: ['INSURABLE_RISK_CATEGORY', 'CONSTITUENT_EXPOSURE_CATEGORY'],
        description: 'Capability reduces specific failure mode',
    },
    IMPLEMENTS: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'CAPABILITY',
        validSourceTypes: ['CAPABILITY_IMPLEMENTATION'],
        validTargetTypes: ['CAPABILITY'],
        description: 'Implementation realizes capability',
    },

    // Relevance-routing relations
    PROJECTS_TO: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'NEUTRAL',
        primaryLayer: 'ISSUE_SURFACE',
        validSourceTypes: ['CAPABILITY'],
        validTargetTypes: ['ISSUE_SURFACE'],
        description: 'Capability projects to issue surface',
    },
    MAPS_TO: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'NEUTRAL',
        primaryLayer: 'POLICY_AREA',
        validSourceTypes: ['ISSUE_SURFACE'],
        validTargetTypes: ['POLICY_AREA'],
        description: 'Issue surface maps to policy area',
    },
    ROUTES_THROUGH: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'NEUTRAL',
        primaryLayer: 'INFORMATION_FLOW',
        validSourceTypes: ['POLICY_EXPRESSION', 'ISSUE_SURFACE'],
        validTargetTypes: ['COMMITTEE', 'EXECUTIVE_AGENCY'],
        description: 'Generic routing through institution',
    },

    // Jurisdictional relations
    HAS_AUTHORITY: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'JURISDICTION',
        validSourceTypes: ['COMMITTEE', 'EXECUTIVE_AGENCY'],
        validTargetTypes: ['POLICY_AREA', 'JURISDICTIONAL_AUTHORITY'],
        description: 'Entity has authority over area',
    },
    SUPPORTS: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'JURISDICTION',
        validSourceTypes: ['STAFF', 'SUB_AGENCY'],
        validTargetTypes: ['COMMITTEE', 'EXECUTIVE_AGENCY', 'CONGRESS_MEMBER'],
        description: 'Support relationship (not authority)',
    },
    DELEGATES: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'NEUTRAL',
        primaryLayer: 'JURISDICTION',
        validSourceTypes: ['COMMITTEE', 'EXECUTIVE_AGENCY'],
        validTargetTypes: ['SUBCOMMITTEE', 'SUB_AGENCY'],
        description: 'Delegation of authority',
    },
    EXERCISES: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'JURISDICTION',
        validSourceTypes: ['EXECUTIVE_AGENCY', 'SUB_AGENCY'],
        validTargetTypes: ['JURISDICTIONAL_AUTHORITY'],
        description: 'Agency exercises authority',
    },

    // Procedural relations
    PRODUCES: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'NEUTRAL',
        primaryLayer: 'PROCEDURAL',
        validSourceTypes: ['COMMITTEE', 'EXECUTIVE_AGENCY'],
        validTargetTypes: ['POLICY_EXPRESSION'],
        description: 'Entity produces policy instrument',
    },
    REFERENCES: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'NEUTRAL',
        primaryLayer: 'PROCEDURAL',
        validSourceTypes: ['POLICY_EXPRESSION'],
        validTargetTypes: ['JURISDICTIONAL_AUTHORITY', 'PRECEDENT'],
        description: 'Policy references authority/precedent',
    },
    ENABLES: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'PROCEDURAL',
        validSourceTypes: ['PROCEDURAL_VEHICLE'],
        validTargetTypes: ['POLICY_EXPRESSION'],
        description: 'Vehicle enables policy expression',
    },

    // Incentive-translation relations
    INCENTIVIZES: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'COALITION',
        validSourceTypes: ['POLICY_EXPRESSION', 'POLICY_AREA'],
        validTargetTypes: ['CONGRESS_MEMBER'],
        description: 'Policy creates incentive for member',
    },
    REDUCES_RISK: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'CAPABILITY',
        validSourceTypes: ['CAPABILITY', 'POLICY_EXPRESSION'],
        validTargetTypes: ['INSURABLE_RISK_CATEGORY'],
        description: 'Reduces insurable risk',
    },
    AFFECTS_EXPOSURE: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'NEUTRAL', // Can be positive (reducing) or negative (increasing)
        primaryLayer: 'CAPABILITY',
        validSourceTypes: ['POLICY_EXPRESSION', 'CAPABILITY'],
        validTargetTypes: ['CONSTITUENT_EXPOSURE_CATEGORY'],
        description: 'Affects constituent exposure',
    },
    BENEFITS: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'COALITION',
        validSourceTypes: ['POLICY_EXPRESSION'],
        validTargetTypes: ['INDUSTRY_SEGMENT'],
        description: 'Policy benefits industry',
    },

    // Coalition/Information relations
    ALLIES_WITH: {
        defaultDirection: 'UNDIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'COALITION',
        validSourceTypes: ['CONGRESS_MEMBER'],
        validTargetTypes: ['CONGRESS_MEMBER'],
        description: 'Members allied in coalition',
    },
    OPPOSES: {
        defaultDirection: 'UNDIRECTED',
        defaultSign: 'NEGATIVE',
        primaryLayer: 'COALITION',
        validSourceTypes: ['CONGRESS_MEMBER'],
        validTargetTypes: ['CONGRESS_MEMBER'],
        description: 'Members in opposition',
    },
    INFORMS: {
        defaultDirection: 'DIRECTED',
        defaultSign: 'NEUTRAL',
        primaryLayer: 'INFORMATION_FLOW',
        validSourceTypes: ['CONGRESS_MEMBER', 'STAFF', 'EXECUTIVE_AGENCY', 'OVERSIGHT_BODY'],
        validTargetTypes: ['CONGRESS_MEMBER', 'STAFF', 'EXECUTIVE_AGENCY', 'COMMITTEE'],
        description: 'Information transmission',
    },
    COORDINATES: {
        defaultDirection: 'UNDIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'INFORMATION_FLOW',
        validSourceTypes: ['CONGRESS_MEMBER', 'COMMITTEE', 'EXECUTIVE_AGENCY'],
        validTargetTypes: ['CONGRESS_MEMBER', 'COMMITTEE', 'EXECUTIVE_AGENCY'],
        description: 'Coordination relationship',
    },

    // Compatibility edges
    COMPATIBLE: {
        defaultDirection: 'UNDIRECTED',
        defaultSign: 'POSITIVE',
        primaryLayer: 'COALITION',
        validSourceTypes: ['POLICY_EXPRESSION', 'CAPABILITY', 'CONGRESS_MEMBER'],
        validTargetTypes: ['POLICY_EXPRESSION', 'CAPABILITY', 'CONGRESS_MEMBER'],
        description: 'Entities are compatible',
    },
    INCOMPATIBLE: {
        defaultDirection: 'UNDIRECTED',
        defaultSign: 'NEGATIVE',
        primaryLayer: 'COALITION',
        validSourceTypes: ['POLICY_EXPRESSION', 'CAPABILITY', 'CONGRESS_MEMBER'],
        validTargetTypes: ['POLICY_EXPRESSION', 'CAPABILITY', 'CONGRESS_MEMBER'],
        description: 'Entities are incompatible',
    },
};

// ============================================================================
// Edge Validation
// ============================================================================

/**
 * Validates that an edge conforms to its type metadata
 */
export function validateEdge(edge: Edge): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const metadata = EdgeTypeMetadata[edge.type];

    if (!metadata.validSourceTypes.includes(edge.sourceType)) {
        errors.push(
            `Invalid source type '${edge.sourceType}' for edge type '${edge.type}'. ` +
            `Valid types: ${metadata.validSourceTypes.join(', ')}`
        );
    }

    if (!metadata.validTargetTypes.includes(edge.targetType)) {
        errors.push(
            `Invalid target type '${edge.targetType}' for edge type '${edge.type}'. ` +
            `Valid types: ${metadata.validTargetTypes.join(', ')}`
        );
    }

    return { valid: errors.length === 0, errors };
}

// ============================================================================
// Inter-Layer Edge
// ============================================================================

/**
 * Special edge type for connecting the same node across layers (multiplex coupling)
 */
export const InterLayerEdgeSchema = z.object({
    id: z.string().uuid(),
    nodeId: z.string().uuid(),
    sourceLayer: NetworkLayerSchema,
    targetLayer: NetworkLayerSchema,
    couplingStrength: z.number().min(0).max(1).default(1),
    metadata: z.record(z.string(), z.unknown()).default({}),
});

export type InterLayerEdge = z.infer<typeof InterLayerEdgeSchema>;

export function createInterLayerEdge(options: {
    id?: string;
    nodeId: string;
    sourceLayer: NetworkLayer;
    targetLayer: NetworkLayer;
    couplingStrength?: number;
    metadata?: Record<string, unknown>;
}): InterLayerEdge {
    return {
        id: options.id ?? uuidv4(),
        nodeId: options.nodeId,
        sourceLayer: options.sourceLayer,
        targetLayer: options.targetLayer,
        couplingStrength: options.couplingStrength ?? 1,
        metadata: options.metadata ?? {},
    };
}
