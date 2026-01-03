/**
 * Multiplex Political-Institutional Network - Artifact Nodes
 * 
 * Definitions for all artifact node types (objects that are acted upon)
 */

import { z } from 'zod';
import { BaseNodeSchema, createNode, type CreateNodeOptions } from './base.js';

// ============================================================================
// Capability
// ============================================================================

export const CapabilityCategorySchema = z.enum([
    'TECHNOLOGY',
    'PROCESS',
    'INFRASTRUCTURE',
    'HUMAN_CAPITAL',
    'REGULATORY',
    'FINANCIAL',
    'OPERATIONAL',
]);
export type CapabilityCategory = z.infer<typeof CapabilityCategorySchema>;

export const CapabilitySchema = BaseNodeSchema.extend({
    type: z.literal('CAPABILITY'),
    category: CapabilityCategorySchema,
    isExogenous: z.literal(true).default(true).describe('Capabilities are immutable/exogenous'),
    maturityLevel: z.number().int().min(1).max(9).optional().describe('Technology Readiness Level'),
    failureModesAddressed: z.array(z.string()).default([]),
    dependencies: z.array(z.string().uuid()).default([]).describe('Other capability IDs'),
    technologyDomain: z.string().optional(),
});

export type Capability = z.infer<typeof CapabilitySchema>;

export function createCapability(
    options: Omit<CreateNodeOptions, 'type'> & {
        category: CapabilityCategory;
        maturityLevel?: number;
        failureModesAddressed?: string[];
        dependencies?: string[];
        technologyDomain?: string;
    }
): Capability {
    const base = createNode({ ...options, type: 'CAPABILITY' });
    return {
        ...base,
        type: 'CAPABILITY',
        category: options.category,
        isExogenous: true,
        maturityLevel: options.maturityLevel,
        failureModesAddressed: options.failureModesAddressed ?? [],
        dependencies: options.dependencies ?? [],
        technologyDomain: options.technologyDomain,
    };
}

// ============================================================================
// Capability Implementation
// ============================================================================

export const ImplementationStatusSchema = z.enum([
    'PROPOSED',
    'IN_DEVELOPMENT',
    'PILOT',
    'DEPLOYED',
    'DEPRECATED',
]);
export type ImplementationStatus = z.infer<typeof ImplementationStatusSchema>;

export const CapabilityImplementationSchema = BaseNodeSchema.extend({
    type: z.literal('CAPABILITY_IMPLEMENTATION'),
    capabilityId: z.string().uuid(),
    implementingAgencyId: z.string().uuid().optional(),
    status: ImplementationStatusSchema,
    deploymentScale: z.enum(['LOCAL', 'REGIONAL', 'NATIONAL', 'INTERNATIONAL']).optional(),
    budgetAllocation: z.number().optional(),
    performanceMetrics: z.record(z.string(), z.number()).default({}),
});

export type CapabilityImplementation = z.infer<typeof CapabilityImplementationSchema>;

export function createCapabilityImplementation(
    options: Omit<CreateNodeOptions, 'type'> & {
        capabilityId: string;
        status: ImplementationStatus;
        implementingAgencyId?: string;
        deploymentScale?: CapabilityImplementation['deploymentScale'];
        budgetAllocation?: number;
        performanceMetrics?: Record<string, number>;
    }
): CapabilityImplementation {
    const base = createNode({ ...options, type: 'CAPABILITY_IMPLEMENTATION' });
    return {
        ...base,
        type: 'CAPABILITY_IMPLEMENTATION',
        capabilityId: options.capabilityId,
        implementingAgencyId: options.implementingAgencyId,
        status: options.status,
        deploymentScale: options.deploymentScale,
        budgetAllocation: options.budgetAllocation,
        performanceMetrics: options.performanceMetrics ?? {},
    };
}

// ============================================================================
// Issue Surface
// ============================================================================

export const IssueSurfaceSchema = BaseNodeSchema.extend({
    type: z.literal('ISSUE_SURFACE'),
    semanticVector: z.array(z.number()).optional().describe('Embedding for semantic similarity'),
    keywords: z.array(z.string()).default([]),
    relatedCapabilities: z.array(z.string().uuid()).default([]),
    salience: z.number().min(0).max(1).default(0.5).describe('Public salience score'),
    volatility: z.number().min(0).max(1).default(0.5).describe('Issue volatility'),
});

export type IssueSurface = z.infer<typeof IssueSurfaceSchema>;

export function createIssueSurface(
    options: Omit<CreateNodeOptions, 'type'> & {
        keywords?: string[];
        relatedCapabilities?: string[];
        salience?: number;
        volatility?: number;
        semanticVector?: number[];
    }
): IssueSurface {
    const base = createNode({ ...options, type: 'ISSUE_SURFACE' });
    return {
        ...base,
        type: 'ISSUE_SURFACE',
        semanticVector: options.semanticVector,
        keywords: options.keywords ?? [],
        relatedCapabilities: options.relatedCapabilities ?? [],
        salience: options.salience ?? 0.5,
        volatility: options.volatility ?? 0.5,
    };
}

// ============================================================================
// Policy Area
// ============================================================================

export const PolicyAreaSchema = BaseNodeSchema.extend({
    type: z.literal('POLICY_AREA'),
    code: z.string().describe('Policy area code'),
    parentAreaId: z.string().uuid().optional(),
    committeesWithJurisdiction: z.array(z.string().uuid()).default([]),
    relatedStatutes: z.array(z.string()).default([]),
    cfrTitles: z.array(z.number().int()).default([]).describe('Related CFR titles'),
});

export type PolicyArea = z.infer<typeof PolicyAreaSchema>;

export function createPolicyArea(
    options: Omit<CreateNodeOptions, 'type'> & {
        code: string;
        parentAreaId?: string;
        committeesWithJurisdiction?: string[];
        relatedStatutes?: string[];
        cfrTitles?: number[];
    }
): PolicyArea {
    const base = createNode({ ...options, type: 'POLICY_AREA' });
    return {
        ...base,
        type: 'POLICY_AREA',
        code: options.code,
        parentAreaId: options.parentAreaId,
        committeesWithJurisdiction: options.committeesWithJurisdiction ?? [],
        relatedStatutes: options.relatedStatutes ?? [],
        cfrTitles: options.cfrTitles ?? [],
    };
}

// ============================================================================
// Jurisdictional Authority
// ============================================================================

export const AuthorityTypeSchema = z.enum([
    'STATUTORY',
    'REGULATORY',
    'CONSTITUTIONAL',
    'EXECUTIVE_ORDER',
    'DELEGATED',
]);
export type AuthorityType = z.infer<typeof AuthorityTypeSchema>;

export const JurisdictionalAuthoritySchema = BaseNodeSchema.extend({
    type: z.literal('JURISDICTIONAL_AUTHORITY'),
    authorityType: AuthorityTypeSchema,
    legalCitation: z.string(),
    grantingInstrument: z.string().optional(),
    delegatedFrom: z.string().uuid().optional(),
    scope: z.string().optional(),
    limitations: z.array(z.string()).default([]),
    exercisingAgencies: z.array(z.string().uuid()).default([]),
});

export type JurisdictionalAuthority = z.infer<typeof JurisdictionalAuthoritySchema>;

export function createJurisdictionalAuthority(
    options: Omit<CreateNodeOptions, 'type'> & {
        authorityType: AuthorityType;
        legalCitation: string;
        grantingInstrument?: string;
        delegatedFrom?: string;
        scope?: string;
        limitations?: string[];
        exercisingAgencies?: string[];
    }
): JurisdictionalAuthority {
    const base = createNode({ ...options, type: 'JURISDICTIONAL_AUTHORITY' });
    return {
        ...base,
        type: 'JURISDICTIONAL_AUTHORITY',
        authorityType: options.authorityType,
        legalCitation: options.legalCitation,
        grantingInstrument: options.grantingInstrument,
        delegatedFrom: options.delegatedFrom,
        scope: options.scope,
        limitations: options.limitations ?? [],
        exercisingAgencies: options.exercisingAgencies ?? [],
    };
}

// ============================================================================
// Policy Expression
// ============================================================================

export const PolicyExpressionTypeSchema = z.enum([
    'BILL',
    'RESOLUTION',
    'AMENDMENT',
    'REGULATION',
    'EXECUTIVE_ORDER',
    'GUIDANCE',
    'MEMORANDUM',
]);
export type PolicyExpressionType = z.infer<typeof PolicyExpressionTypeSchema>;

export const PolicyExpressionStatusSchema = z.enum([
    'INTRODUCED',
    'IN_COMMITTEE',
    'PASSED_CHAMBER',
    'PASSED_BOTH',
    'SIGNED',
    'VETOED',
    'ENACTED',
    'PROPOSED',
    'FINAL',
    'WITHDRAWN',
]);
export type PolicyExpressionStatus = z.infer<typeof PolicyExpressionStatusSchema>;

export const PolicyExpressionSchema = BaseNodeSchema.extend({
    type: z.literal('POLICY_EXPRESSION'),
    expressionType: PolicyExpressionTypeSchema,
    status: PolicyExpressionStatusSchema,
    officialId: z.string().describe('Bill number, FR citation, EO number, etc.'),
    congress: z.number().int().optional(),
    introducedDate: z.date().optional(),
    sponsors: z.array(z.string().uuid()).default([]),
    cosponsors: z.array(z.string().uuid()).default([]),
    policyAreas: z.array(z.string().uuid()).default([]),
    fullTextUrl: z.string().url().optional(),
});

export type PolicyExpression = z.infer<typeof PolicyExpressionSchema>;

export function createPolicyExpression(
    options: Omit<CreateNodeOptions, 'type'> & {
        expressionType: PolicyExpressionType;
        status: PolicyExpressionStatus;
        officialId: string;
        congress?: number;
        introducedDate?: Date;
        sponsors?: string[];
        cosponsors?: string[];
        policyAreas?: string[];
        fullTextUrl?: string;
    }
): PolicyExpression {
    const base = createNode({ ...options, type: 'POLICY_EXPRESSION' });
    return {
        ...base,
        type: 'POLICY_EXPRESSION',
        expressionType: options.expressionType,
        status: options.status,
        officialId: options.officialId,
        congress: options.congress,
        introducedDate: options.introducedDate,
        sponsors: options.sponsors ?? [],
        cosponsors: options.cosponsors ?? [],
        policyAreas: options.policyAreas ?? [],
        fullTextUrl: options.fullTextUrl,
    };
}

// ============================================================================
// Procedural Vehicle
// ============================================================================

export const VehicleTypeSchema = z.enum([
    'AUTHORIZATION',
    'APPROPRIATION',
    'RECONCILIATION',
    'CONTINUING_RESOLUTION',
    'OMNIBUS',
    'MUST_PASS',
    'RIDER',
    'CONFERENCE_REPORT',
]);
export type VehicleType = z.infer<typeof VehicleTypeSchema>;

export const ProceduralVehicleSchema = BaseNodeSchema.extend({
    type: z.literal('PROCEDURAL_VEHICLE'),
    vehicleType: VehicleTypeSchema,
    fiscalYear: z.number().int().optional(),
    chamber: z.enum(['HOUSE', 'SENATE', 'BOTH']).optional(),
    deadline: z.date().optional(),
    attachedExpressions: z.array(z.string().uuid()).default([]),
});

export type ProceduralVehicle = z.infer<typeof ProceduralVehicleSchema>;

export function createProceduralVehicle(
    options: Omit<CreateNodeOptions, 'type'> & {
        vehicleType: VehicleType;
        fiscalYear?: number;
        chamber?: ProceduralVehicle['chamber'];
        deadline?: Date;
        attachedExpressions?: string[];
    }
): ProceduralVehicle {
    const base = createNode({ ...options, type: 'PROCEDURAL_VEHICLE' });
    return {
        ...base,
        type: 'PROCEDURAL_VEHICLE',
        vehicleType: options.vehicleType,
        fiscalYear: options.fiscalYear,
        chamber: options.chamber,
        deadline: options.deadline,
        attachedExpressions: options.attachedExpressions ?? [],
    };
}

// ============================================================================
// Procurement Pathway
// ============================================================================

export const ProcurementMethodSchema = z.enum([
    'FULL_AND_OPEN',
    'SMALL_BUSINESS',
    'SOLE_SOURCE',
    'GSA_SCHEDULE',
    'OTHER_TRANSACTION',
    'SBIR_STTR',
    'COOPERATIVE_AGREEMENT',
]);
export type ProcurementMethod = z.infer<typeof ProcurementMethodSchema>;

export const ProcurementPathwaySchema = BaseNodeSchema.extend({
    type: z.literal('PROCUREMENT_PATHWAY'),
    method: ProcurementMethodSchema,
    naicsCode: z.string().optional(),
    contractType: z.string().optional(),
    typicalDuration: z.number().optional().describe('Months'),
    thresholdAmount: z.number().optional(),
    regulatoryAuthority: z.string().optional(),
});

export type ProcurementPathway = z.infer<typeof ProcurementPathwaySchema>;

export function createProcurementPathway(
    options: Omit<CreateNodeOptions, 'type'> & {
        method: ProcurementMethod;
        naicsCode?: string;
        contractType?: string;
        typicalDuration?: number;
        thresholdAmount?: number;
        regulatoryAuthority?: string;
    }
): ProcurementPathway {
    const base = createNode({ ...options, type: 'PROCUREMENT_PATHWAY' });
    return {
        ...base,
        type: 'PROCUREMENT_PATHWAY',
        method: options.method,
        naicsCode: options.naicsCode,
        contractType: options.contractType,
        typicalDuration: options.typicalDuration,
        thresholdAmount: options.thresholdAmount,
        regulatoryAuthority: options.regulatoryAuthority,
    };
}

// ============================================================================
// Insurable Risk Category
// ============================================================================

export const RiskDomainSchema = z.enum([
    'CYBER',
    'CLIMATE',
    'HEALTH',
    'FINANCIAL',
    'OPERATIONAL',
    'REPUTATIONAL',
    'REGULATORY',
    'GEOPOLITICAL',
]);
export type RiskDomain = z.infer<typeof RiskDomainSchema>;

export const InsurableRiskCategorySchema = BaseNodeSchema.extend({
    type: z.literal('INSURABLE_RISK_CATEGORY'),
    domain: RiskDomainSchema,
    naicClassification: z.string().optional(),
    isoClassification: z.string().optional(),
    marketSize: z.number().optional().describe('Annual premium volume USD'),
    growthRate: z.number().optional().describe('Annual growth percentage'),
    lossRatio: z.number().optional(),
    relatedPerils: z.array(z.string()).default([]),
});

export type InsurableRiskCategory = z.infer<typeof InsurableRiskCategorySchema>;

export function createInsurableRiskCategory(
    options: Omit<CreateNodeOptions, 'type'> & {
        domain: RiskDomain;
        naicClassification?: string;
        isoClassification?: string;
        marketSize?: number;
        growthRate?: number;
        lossRatio?: number;
        relatedPerils?: string[];
    }
): InsurableRiskCategory {
    const base = createNode({ ...options, type: 'INSURABLE_RISK_CATEGORY' });
    return {
        ...base,
        type: 'INSURABLE_RISK_CATEGORY',
        domain: options.domain,
        naicClassification: options.naicClassification,
        isoClassification: options.isoClassification,
        marketSize: options.marketSize,
        growthRate: options.growthRate,
        lossRatio: options.lossRatio,
        relatedPerils: options.relatedPerils ?? [],
    };
}

// ============================================================================
// Constituent Exposure Category
// ============================================================================

export const ExposureTypeSchema = z.enum([
    'ECONOMIC',
    'ENVIRONMENTAL',
    'HEALTH',
    'SAFETY',
    'RIGHTS',
    'ACCESS',
    'COST',
]);
export type ExposureType = z.infer<typeof ExposureTypeSchema>;

export const ConstituentExposureCategorySchema = BaseNodeSchema.extend({
    type: z.literal('CONSTITUENT_EXPOSURE_CATEGORY'),
    exposureType: ExposureTypeSchema,
    demographicSegments: z.array(z.string()).default([]),
    geographicScope: z.enum(['LOCAL', 'STATE', 'REGIONAL', 'NATIONAL']).optional(),
    estimatedPopulationAffected: z.number().int().optional(),
    severityScore: z.number().min(0).max(10).optional(),
});

export type ConstituentExposureCategory = z.infer<typeof ConstituentExposureCategorySchema>;

export function createConstituentExposureCategory(
    options: Omit<CreateNodeOptions, 'type'> & {
        exposureType: ExposureType;
        demographicSegments?: string[];
        geographicScope?: ConstituentExposureCategory['geographicScope'];
        estimatedPopulationAffected?: number;
        severityScore?: number;
    }
): ConstituentExposureCategory {
    const base = createNode({ ...options, type: 'CONSTITUENT_EXPOSURE_CATEGORY' });
    return {
        ...base,
        type: 'CONSTITUENT_EXPOSURE_CATEGORY',
        exposureType: options.exposureType,
        demographicSegments: options.demographicSegments ?? [],
        geographicScope: options.geographicScope,
        estimatedPopulationAffected: options.estimatedPopulationAffected,
        severityScore: options.severityScore,
    };
}

// ============================================================================
// Industry Segment
// ============================================================================

export const IndustrySegmentSchema = BaseNodeSchema.extend({
    type: z.literal('INDUSTRY_SEGMENT'),
    naicsCode: z.string(),
    sicCode: z.string().optional(),
    marketCapitalization: z.number().optional(),
    employmentCount: z.number().int().optional(),
    lobbyingExpenditures: z.number().optional(),
    tradeAssociations: z.array(z.string()).default([]),
    majorCompanies: z.array(z.string()).default([]),
});

export type IndustrySegment = z.infer<typeof IndustrySegmentSchema>;

export function createIndustrySegment(
    options: Omit<CreateNodeOptions, 'type'> & {
        naicsCode: string;
        sicCode?: string;
        marketCapitalization?: number;
        employmentCount?: number;
        lobbyingExpenditures?: number;
        tradeAssociations?: string[];
        majorCompanies?: string[];
    }
): IndustrySegment {
    const base = createNode({ ...options, type: 'INDUSTRY_SEGMENT' });
    return {
        ...base,
        type: 'INDUSTRY_SEGMENT',
        naicsCode: options.naicsCode,
        sicCode: options.sicCode,
        marketCapitalization: options.marketCapitalization,
        employmentCount: options.employmentCount,
        lobbyingExpenditures: options.lobbyingExpenditures,
        tradeAssociations: options.tradeAssociations ?? [],
        majorCompanies: options.majorCompanies ?? [],
    };
}
