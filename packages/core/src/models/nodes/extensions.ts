/**
 * Multiplex Political-Institutional Network - Extension Nodes
 * 
 * Optional extension nodes for future expansion
 */

import { z } from 'zod';
import { BaseNodeSchema, createNode, type CreateNodeOptions } from './base.js';

// ============================================================================
// Temporal Window
// ============================================================================

export const TemporalWindowTypeSchema = z.enum([
    'CONGRESS',
    'FISCAL_YEAR',
    'ELECTION_CYCLE',
    'REGULATORY_PERIOD',
    'CUSTOM',
]);
export type TemporalWindowType = z.infer<typeof TemporalWindowTypeSchema>;

export const TemporalWindowSchema = BaseNodeSchema.extend({
    type: z.literal('TEMPORAL_WINDOW'),
    windowType: TemporalWindowTypeSchema,
    startDate: z.date(),
    endDate: z.date(),
    congress: z.number().int().optional(),
    fiscalYear: z.number().int().optional(),
    isCurrentWindow: z.boolean().default(false),
});

export type TemporalWindow = z.infer<typeof TemporalWindowSchema>;

export function createTemporalWindow(
    options: Omit<CreateNodeOptions, 'type'> & {
        windowType: TemporalWindowType;
        startDate: Date;
        endDate: Date;
        congress?: number;
        fiscalYear?: number;
        isCurrentWindow?: boolean;
    }
): TemporalWindow {
    const base = createNode({ ...options, type: 'TEMPORAL_WINDOW' });
    return {
        ...base,
        type: 'TEMPORAL_WINDOW',
        windowType: options.windowType,
        startDate: options.startDate,
        endDate: options.endDate,
        congress: options.congress,
        fiscalYear: options.fiscalYear,
        isCurrentWindow: options.isCurrentWindow ?? false,
    };
}

// ============================================================================
// Risk Threshold
// ============================================================================

export const RiskThresholdSchema = BaseNodeSchema.extend({
    type: z.literal('RISK_THRESHOLD'),
    riskCategoryId: z.string().uuid(),
    thresholdValue: z.number(),
    unit: z.string(),
    direction: z.enum(['ABOVE', 'BELOW', 'EQUAL']),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    triggerAction: z.string().optional(),
    lastBreached: z.date().optional(),
});

export type RiskThreshold = z.infer<typeof RiskThresholdSchema>;

export function createRiskThreshold(
    options: Omit<CreateNodeOptions, 'type'> & {
        riskCategoryId: string;
        thresholdValue: number;
        unit: string;
        direction: RiskThreshold['direction'];
        severity: RiskThreshold['severity'];
        triggerAction?: string;
        lastBreached?: Date;
    }
): RiskThreshold {
    const base = createNode({ ...options, type: 'RISK_THRESHOLD' });
    return {
        ...base,
        type: 'RISK_THRESHOLD',
        riskCategoryId: options.riskCategoryId,
        thresholdValue: options.thresholdValue,
        unit: options.unit,
        direction: options.direction,
        severity: options.severity,
        triggerAction: options.triggerAction,
        lastBreached: options.lastBreached,
    };
}

// ============================================================================
// Budget Constraint
// ============================================================================

export const BudgetConstraintSchema = BaseNodeSchema.extend({
    type: z.literal('BUDGET_CONSTRAINT'),
    constraintType: z.enum([
        'DISCRETIONARY_CAP',
        'MANDATORY_SPENDING',
        'PAYGO',
        'SEQUESTRATION',
        'DEBT_LIMIT',
        'APPROPRIATION_LIMIT',
    ]),
    amount: z.number(),
    fiscalYear: z.number().int(),
    affectedAccounts: z.array(z.string()).default([]),
    legalBasis: z.string().optional(),
    waiverMechanism: z.string().optional(),
});

export type BudgetConstraint = z.infer<typeof BudgetConstraintSchema>;

export function createBudgetConstraint(
    options: Omit<CreateNodeOptions, 'type'> & {
        constraintType: BudgetConstraint['constraintType'];
        amount: number;
        fiscalYear: number;
        affectedAccounts?: string[];
        legalBasis?: string;
        waiverMechanism?: string;
    }
): BudgetConstraint {
    const base = createNode({ ...options, type: 'BUDGET_CONSTRAINT' });
    return {
        ...base,
        type: 'BUDGET_CONSTRAINT',
        constraintType: options.constraintType,
        amount: options.amount,
        fiscalYear: options.fiscalYear,
        affectedAccounts: options.affectedAccounts ?? [],
        legalBasis: options.legalBasis,
        waiverMechanism: options.waiverMechanism,
    };
}

// ============================================================================
// Precedent
// ============================================================================

export const PrecedentTypeSchema = z.enum([
    'JUDICIAL',
    'LEGISLATIVE',
    'EXECUTIVE',
    'ADMINISTRATIVE',
    'PROCEDURAL',
]);
export type PrecedentType = z.infer<typeof PrecedentTypeSchema>;

export const PrecedentSchema = BaseNodeSchema.extend({
    type: z.literal('PRECEDENT'),
    precedentType: PrecedentTypeSchema,
    citation: z.string(),
    decidingBody: z.string(),
    dateEstablished: z.date(),
    bindingStrength: z.enum(['BINDING', 'PERSUASIVE', 'INFORMATIVE']),
    jurisdictionScope: z.string().optional(),
    overruledBy: z.string().uuid().optional(),
    relatedIssues: z.array(z.string().uuid()).default([]),
});

export type Precedent = z.infer<typeof PrecedentSchema>;

export function createPrecedent(
    options: Omit<CreateNodeOptions, 'type'> & {
        precedentType: PrecedentType;
        citation: string;
        decidingBody: string;
        dateEstablished: Date;
        bindingStrength: Precedent['bindingStrength'];
        jurisdictionScope?: string;
        overruledBy?: string;
        relatedIssues?: string[];
    }
): Precedent {
    const base = createNode({ ...options, type: 'PRECEDENT' });
    return {
        ...base,
        type: 'PRECEDENT',
        precedentType: options.precedentType,
        citation: options.citation,
        decidingBody: options.decidingBody,
        dateEstablished: options.dateEstablished,
        bindingStrength: options.bindingStrength,
        jurisdictionScope: options.jurisdictionScope,
        overruledBy: options.overruledBy,
        relatedIssues: options.relatedIssues ?? [],
    };
}

// ============================================================================
// Institutional Memory Marker
// ============================================================================

export const InstitutionalMemoryMarkerSchema = BaseNodeSchema.extend({
    type: z.literal('INSTITUTIONAL_MEMORY_MARKER'),
    markerType: z.enum([
        'LESSON_LEARNED',
        'BEST_PRACTICE',
        'FAILURE_CASE',
        'SUCCESS_CASE',
        'TACIT_KNOWLEDGE',
    ]),
    originEvent: z.string(),
    originDate: z.date(),
    carriers: z.array(z.string().uuid()).default([]).describe('People/orgs that carry this knowledge'),
    atRiskOfLoss: z.boolean().default(false),
    documentationRefs: z.array(z.string()).default([]),
});

export type InstitutionalMemoryMarker = z.infer<typeof InstitutionalMemoryMarkerSchema>;

export function createInstitutionalMemoryMarker(
    options: Omit<CreateNodeOptions, 'type'> & {
        markerType: InstitutionalMemoryMarker['markerType'];
        originEvent: string;
        originDate: Date;
        carriers?: string[];
        atRiskOfLoss?: boolean;
        documentationRefs?: string[];
    }
): InstitutionalMemoryMarker {
    const base = createNode({ ...options, type: 'INSTITUTIONAL_MEMORY_MARKER' });
    return {
        ...base,
        type: 'INSTITUTIONAL_MEMORY_MARKER',
        markerType: options.markerType,
        originEvent: options.originEvent,
        originDate: options.originDate,
        carriers: options.carriers ?? [],
        atRiskOfLoss: options.atRiskOfLoss ?? false,
        documentationRefs: options.documentationRefs ?? [],
    };
}

// ============================================================================
// Visibility/Salience Indicator
// ============================================================================

export const VisibilitySalienceIndicatorSchema = BaseNodeSchema.extend({
    type: z.literal('VISIBILITY_SALIENCE_INDICATOR'),
    targetNodeId: z.string().uuid(),
    mediaAttention: z.number().min(0).max(1).default(0),
    publicInterest: z.number().min(0).max(1).default(0),
    politicalSalience: z.number().min(0).max(1).default(0),
    measurementDate: z.date(),
    dataSource: z.string(),
    trendDirection: z.enum(['RISING', 'STABLE', 'FALLING']).optional(),
});

export type VisibilitySalienceIndicator = z.infer<typeof VisibilitySalienceIndicatorSchema>;

export function createVisibilitySalienceIndicator(
    options: Omit<CreateNodeOptions, 'type'> & {
        targetNodeId: string;
        measurementDate: Date;
        dataSource: string;
        mediaAttention?: number;
        publicInterest?: number;
        politicalSalience?: number;
        trendDirection?: VisibilitySalienceIndicator['trendDirection'];
    }
): VisibilitySalienceIndicator {
    const base = createNode({ ...options, type: 'VISIBILITY_SALIENCE_INDICATOR' });
    return {
        ...base,
        type: 'VISIBILITY_SALIENCE_INDICATOR',
        targetNodeId: options.targetNodeId,
        mediaAttention: options.mediaAttention ?? 0,
        publicInterest: options.publicInterest ?? 0,
        politicalSalience: options.politicalSalience ?? 0,
        measurementDate: options.measurementDate,
        dataSource: options.dataSource,
        trendDirection: options.trendDirection,
    };
}
