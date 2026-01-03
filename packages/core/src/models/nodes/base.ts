/**
 * Multiplex Political-Institutional Network - Base Node
 * 
 * Abstract base class for all network nodes
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
    DataProvenanceSchema,
    TimestampSchema,
    NodeTypeSchema,
    type DataProvenance,
    type Timestamp,
    type NodeType,
} from '../../types.js';

// ============================================================================
// Base Node Schema
// ============================================================================

export const BaseNodeSchema = z.object({
    id: z.string().uuid(),
    type: NodeTypeSchema,
    name: z.string().min(1),
    description: z.string().optional(),
    externalIds: z.record(z.string(), z.string()).default({}),
    metadata: z.record(z.string(), z.unknown()).default({}),
    provenance: DataProvenanceSchema,
    timestamps: TimestampSchema,
    isActive: z.boolean().default(true),
    tags: z.array(z.string()).default([]),
});

export type BaseNode = z.infer<typeof BaseNodeSchema>;

// ============================================================================
// Node Factory
// ============================================================================

export interface CreateNodeOptions {
    id?: string;
    name: string;
    type: NodeType;
    description?: string;
    externalIds?: Record<string, string>;
    metadata?: Record<string, unknown>;
    provenance: Omit<DataProvenance, 'retrievedAt'> & { retrievedAt?: Date };
    validFrom?: Date;
    validTo?: Date;
    tags?: string[];
}

/**
 * Creates a new node with proper defaults
 */
export function createNode(options: CreateNodeOptions): BaseNode {
    const now = new Date();

    return {
        id: options.id ?? uuidv4(),
        type: options.type,
        name: options.name,
        description: options.description,
        externalIds: options.externalIds ?? {},
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
        tags: options.tags ?? [],
    };
}
