/**
 * Multiplex Political-Institutional Network - Actor Nodes
 * 
 * Definitions for all actor node types (entities that take actions)
 */

import { z } from 'zod';
import { BaseNodeSchema, createNode, type CreateNodeOptions } from './base.js';

// ============================================================================
// Congress Member
// ============================================================================

export const PartySchema = z.enum(['DEMOCRAT', 'REPUBLICAN', 'INDEPENDENT', 'OTHER']);
export type Party = z.infer<typeof PartySchema>;

export const ChamberSchema = z.enum(['HOUSE', 'SENATE']);
export type Chamber = z.infer<typeof ChamberSchema>;

export const CongressMemberSchema = BaseNodeSchema.extend({
    type: z.literal('CONGRESS_MEMBER'),
    bioguideId: z.string().describe('Official Bioguide ID'),
    thomasId: z.string().optional().describe('THOMAS/Congress.gov ID'),
    lisId: z.string().optional().describe('LIS ID for Senate members'),
    govtrackId: z.string().optional().describe('GovTrack ID'),
    party: PartySchema,
    state: z.string().length(2).describe('Two-letter state code'),
    district: z.number().int().min(0).optional().describe('Congressional district (House only)'),
    chamber: ChamberSchema,
    seniorityRank: z.number().int().optional(),
    leadershipPosition: z.string().optional(),
    termStart: z.date(),
    termEnd: z.date().optional(),
    previousTerms: z.array(z.object({
        congress: z.number().int(),
        chamber: ChamberSchema,
        termStart: z.date(),
        termEnd: z.date(),
    })).default([]),
});

export type CongressMember = z.infer<typeof CongressMemberSchema>;

export function createCongressMember(
    options: Omit<CreateNodeOptions, 'type'> & {
        bioguideId: string;
        party: Party;
        state: string;
        chamber: Chamber;
        termStart: Date;
        thomasId?: string;
        lisId?: string;
        govtrackId?: string;
        district?: number;
        seniorityRank?: number;
        leadershipPosition?: string;
        termEnd?: Date;
        previousTerms?: CongressMember['previousTerms'];
    }
): CongressMember {
    const base = createNode({ ...options, type: 'CONGRESS_MEMBER' });
    return {
        ...base,
        type: 'CONGRESS_MEMBER',
        bioguideId: options.bioguideId,
        thomasId: options.thomasId,
        lisId: options.lisId,
        govtrackId: options.govtrackId,
        party: options.party,
        state: options.state,
        district: options.district,
        chamber: options.chamber,
        seniorityRank: options.seniorityRank,
        leadershipPosition: options.leadershipPosition,
        termStart: options.termStart,
        termEnd: options.termEnd,
        previousTerms: options.previousTerms ?? [],
    };
}

// ============================================================================
// Committee
// ============================================================================

export const CommitteeTypeSchema = z.enum([
    'STANDING',
    'SELECT',
    'SPECIAL',
    'JOINT',
    'CONFERENCE',
]);
export type CommitteeType = z.infer<typeof CommitteeTypeSchema>;

export const CommitteeSchema = BaseNodeSchema.extend({
    type: z.literal('COMMITTEE'),
    thomasId: z.string().describe('THOMAS/Congress.gov committee ID'),
    systemCode: z.string().describe('System code (e.g., HSAG for House Agriculture)'),
    chamber: ChamberSchema.or(z.literal('JOINT')),
    committeeType: CommitteeTypeSchema,
    parentCommitteeId: z.string().uuid().optional().describe('Parent committee if subcommittee'),
    jurisdiction: z.array(z.string()).default([]).describe('Policy areas under jurisdiction'),
    website: z.string().url().optional(),
    roomNumber: z.string().optional(),
    phone: z.string().optional(),
});

export type Committee = z.infer<typeof CommitteeSchema>;

export function createCommittee(
    options: Omit<CreateNodeOptions, 'type'> & {
        thomasId: string;
        systemCode: string;
        chamber: Committee['chamber'];
        committeeType: CommitteeType;
        jurisdiction?: string[];
        parentCommitteeId?: string;
        website?: string;
        roomNumber?: string;
        phone?: string;
    }
): Committee {
    const base = createNode({ ...options, type: 'COMMITTEE' });
    return {
        ...base,
        type: 'COMMITTEE',
        thomasId: options.thomasId,
        systemCode: options.systemCode,
        chamber: options.chamber,
        committeeType: options.committeeType,
        parentCommitteeId: options.parentCommitteeId,
        jurisdiction: options.jurisdiction ?? [],
        website: options.website,
        roomNumber: options.roomNumber,
        phone: options.phone,
    };
}

// ============================================================================
// Subcommittee
// ============================================================================

export const SubcommitteeSchema = BaseNodeSchema.extend({
    type: z.literal('SUBCOMMITTEE'),
    systemCode: z.string(),
    parentCommitteeId: z.string().uuid(),
    parentCommitteeCode: z.string(),
    jurisdiction: z.array(z.string()).default([]),
});

export type Subcommittee = z.infer<typeof SubcommitteeSchema>;

export function createSubcommittee(
    options: Omit<CreateNodeOptions, 'type'> & {
        systemCode: string;
        parentCommitteeId: string;
        parentCommitteeCode: string;
        jurisdiction?: string[];
    }
): Subcommittee {
    const base = createNode({ ...options, type: 'SUBCOMMITTEE' });
    return {
        ...base,
        type: 'SUBCOMMITTEE',
        systemCode: options.systemCode,
        parentCommitteeId: options.parentCommitteeId,
        parentCommitteeCode: options.parentCommitteeCode,
        jurisdiction: options.jurisdiction ?? [],
    };
}

// ============================================================================
// Staff
// ============================================================================

export const StaffRoleSchema = z.enum([
    'CHIEF_OF_STAFF',
    'LEGISLATIVE_DIRECTOR',
    'POLICY_ADVISOR',
    'COMMUNICATIONS_DIRECTOR',
    'COUNSEL',
    'STAFF_DIRECTOR',
    'CLERK',
    'PROFESSIONAL_STAFF',
    'OTHER',
]);
export type StaffRole = z.infer<typeof StaffRoleSchema>;

export const StaffSchema = BaseNodeSchema.extend({
    type: z.literal('STAFF'),
    role: StaffRoleSchema,
    employerId: z.string().uuid().describe('Member or Committee ID'),
    employerType: z.enum(['MEMBER', 'COMMITTEE']),
    policyAreas: z.array(z.string()).default([]).describe('Policy specializations'),
    seniorityLevel: z.number().int().min(1).max(5).optional(),
});

export type Staff = z.infer<typeof StaffSchema>;

export function createStaff(
    options: Omit<CreateNodeOptions, 'type'> & {
        role: StaffRole;
        employerId: string;
        employerType: Staff['employerType'];
        policyAreas?: string[];
        seniorityLevel?: number;
    }
): Staff {
    const base = createNode({ ...options, type: 'STAFF' });
    return {
        ...base,
        type: 'STAFF',
        role: options.role,
        employerId: options.employerId,
        employerType: options.employerType,
        policyAreas: options.policyAreas ?? [],
        seniorityLevel: options.seniorityLevel,
    };
}

// ============================================================================
// Executive Agency
// ============================================================================

export const AgencyTypeSchema = z.enum([
    'CABINET_DEPARTMENT',
    'INDEPENDENT_AGENCY',
    'GOVERNMENT_CORPORATION',
    'REGULATORY_COMMISSION',
    'EXECUTIVE_OFFICE',
]);
export type AgencyType = z.infer<typeof AgencyTypeSchema>;

export const ExecutiveAgencySchema = BaseNodeSchema.extend({
    type: z.literal('EXECUTIVE_AGENCY'),
    abbreviation: z.string(),
    agencyType: AgencyTypeSchema,
    parentAgencyId: z.string().uuid().optional(),
    website: z.string().url().optional(),
    headquartersLocation: z.string().optional(),
    employeeCount: z.number().int().optional(),
    annualBudget: z.number().optional().describe('Annual budget in USD'),
    enablingStatute: z.string().optional().describe('Citation to enabling legislation'),
    jurisdictionalAuthorities: z.array(z.string()).default([]),
});

export type ExecutiveAgency = z.infer<typeof ExecutiveAgencySchema>;

export function createExecutiveAgency(
    options: Omit<CreateNodeOptions, 'type'> & {
        abbreviation: string;
        agencyType: AgencyType;
        parentAgencyId?: string;
        website?: string;
        headquartersLocation?: string;
        employeeCount?: number;
        annualBudget?: number;
        enablingStatute?: string;
        jurisdictionalAuthorities?: string[];
    }
): ExecutiveAgency {
    const base = createNode({ ...options, type: 'EXECUTIVE_AGENCY' });
    return {
        ...base,
        type: 'EXECUTIVE_AGENCY',
        abbreviation: options.abbreviation,
        agencyType: options.agencyType,
        parentAgencyId: options.parentAgencyId,
        website: options.website,
        headquartersLocation: options.headquartersLocation,
        employeeCount: options.employeeCount,
        annualBudget: options.annualBudget,
        enablingStatute: options.enablingStatute,
        jurisdictionalAuthorities: options.jurisdictionalAuthorities ?? [],
    };
}

// ============================================================================
// Sub-Agency
// ============================================================================

export const SubAgencySchema = BaseNodeSchema.extend({
    type: z.literal('SUB_AGENCY'),
    parentAgencyId: z.string().uuid(),
    abbreviation: z.string().optional(),
    organizationalLevel: z.number().int().min(1).describe('Depth in org hierarchy'),
    functionalArea: z.string().optional(),
});

export type SubAgency = z.infer<typeof SubAgencySchema>;

export function createSubAgency(
    options: Omit<CreateNodeOptions, 'type'> & {
        parentAgencyId: string;
        organizationalLevel: number;
        abbreviation?: string;
        functionalArea?: string;
    }
): SubAgency {
    const base = createNode({ ...options, type: 'SUB_AGENCY' });
    return {
        ...base,
        type: 'SUB_AGENCY',
        parentAgencyId: options.parentAgencyId,
        abbreviation: options.abbreviation,
        organizationalLevel: options.organizationalLevel,
        functionalArea: options.functionalArea,
    };
}

// ============================================================================
// Oversight Body
// ============================================================================

export const OversightTypeSchema = z.enum([
    'INSPECTOR_GENERAL',
    'GAO',
    'CBO',
    'CRS',
    'ETHICS_OFFICE',
    'OMBUDSMAN',
    'OTHER',
]);
export type OversightType = z.infer<typeof OversightTypeSchema>;

export const OversightBodySchema = BaseNodeSchema.extend({
    type: z.literal('OVERSIGHT_BODY'),
    oversightType: OversightTypeSchema,
    jurisdictionScope: z.enum(['GOVERNMENT_WIDE', 'AGENCY_SPECIFIC', 'DOMAIN_SPECIFIC']),
    reportingTo: z.array(z.string().uuid()).default([]).describe('Entities this body reports to'),
    targetAgencies: z.array(z.string().uuid()).default([]).describe('Agencies under oversight'),
});

export type OversightBody = z.infer<typeof OversightBodySchema>;

export function createOversightBody(
    options: Omit<CreateNodeOptions, 'type'> & {
        oversightType: OversightType;
        jurisdictionScope: OversightBody['jurisdictionScope'];
        reportingTo?: string[];
        targetAgencies?: string[];
    }
): OversightBody {
    const base = createNode({ ...options, type: 'OVERSIGHT_BODY' });
    return {
        ...base,
        type: 'OVERSIGHT_BODY',
        oversightType: options.oversightType,
        jurisdictionScope: options.jurisdictionScope,
        reportingTo: options.reportingTo ?? [],
        targetAgencies: options.targetAgencies ?? [],
    };
}
