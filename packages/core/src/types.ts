/**
 * Multiplex Political-Institutional Network - Core Types
 * 
 * Base type definitions used throughout the system
 */

import { z } from 'zod';

// ============================================================================
// Data Provenance
// ============================================================================

/**
 * Tracks the origin and versioning of all data in the system
 */
export const DataProvenanceSchema = z.object({
    sourceId: z.string().describe('Identifier for the data source'),
    sourceName: z.string().describe('Human-readable source name'),
    sourceUrl: z.string().url().optional().describe('URL to the authoritative source'),
    retrievedAt: z.date().describe('When the data was retrieved'),
    version: z.string().optional().describe('Version of the data if applicable'),
    hash: z.string().optional().describe('Content hash for verification'),
    confidence: z.number().min(0).max(1).default(1).describe('Confidence in data accuracy'),
});

export type DataProvenance = z.infer<typeof DataProvenanceSchema>;

// ============================================================================
// Network Layer Types
// ============================================================================

/**
 * The seven fundamental network layers in the multiplex system
 */
export const NetworkLayerSchema = z.enum([
    'CAPABILITY',       // Capability → failure mode reduction relationships
    'ISSUE_SURFACE',    // Issue surface semantic projections
    'POLICY_AREA',      // Policy area categorization
    'JURISDICTION',     // Authority allocation chains
    'PROCEDURAL',       // Non-statutory policy instruments
    'COALITION',        // Member coalitions and alliances
    'INFORMATION_FLOW', // Information transmission paths
]);

export type NetworkLayer = z.infer<typeof NetworkLayerSchema>;

// ============================================================================
// Node Types
// ============================================================================

/**
 * Actor node types - entities that take actions
 */
export const ActorNodeTypeSchema = z.enum([
    'CONGRESS_MEMBER',
    'COMMITTEE',
    'SUBCOMMITTEE',
    'STAFF',
    'EXECUTIVE_AGENCY',
    'SUB_AGENCY',
    'OVERSIGHT_BODY',
]);

export type ActorNodeType = z.infer<typeof ActorNodeTypeSchema>;

/**
 * Artifact node types - objects that are acted upon or referenced
 */
export const ArtifactNodeTypeSchema = z.enum([
    'CAPABILITY',
    'CAPABILITY_IMPLEMENTATION',
    'ISSUE_SURFACE',
    'POLICY_AREA',
    'JURISDICTIONAL_AUTHORITY',
    'POLICY_EXPRESSION',
    'PROCEDURAL_VEHICLE',
    'PROCUREMENT_PATHWAY',
    'INSURABLE_RISK_CATEGORY',
    'CONSTITUENT_EXPOSURE_CATEGORY',
    'INDUSTRY_SEGMENT',
]);

export type ArtifactNodeType = z.infer<typeof ArtifactNodeTypeSchema>;

/**
 * Extension node types - for future expansion
 */
export const ExtensionNodeTypeSchema = z.enum([
    'TEMPORAL_WINDOW',
    'RISK_THRESHOLD',
    'BUDGET_CONSTRAINT',
    'PRECEDENT',
    'INSTITUTIONAL_MEMORY_MARKER',
    'VISIBILITY_SALIENCE_INDICATOR',
]);

export type ExtensionNodeType = z.infer<typeof ExtensionNodeTypeSchema>;

/**
 * All node types combined
 */
export const NodeTypeSchema = z.union([
    ActorNodeTypeSchema,
    ArtifactNodeTypeSchema,
    ExtensionNodeTypeSchema,
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

// ============================================================================
// Edge Types
// ============================================================================

/**
 * Edge direction
 */
export const EdgeDirectionSchema = z.enum(['DIRECTED', 'UNDIRECTED']);
export type EdgeDirection = z.infer<typeof EdgeDirectionSchema>;

/**
 * Edge sign for signed network analysis
 */
export const EdgeSignSchema = z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']);
export type EdgeSign = z.infer<typeof EdgeSignSchema>;

/**
 * Edge type categories
 */
export const EdgeTypeSchema = z.enum([
    // Structural/Intrinsic relations
    'MEMBERSHIP',           // Member → Committee
    'LEADERSHIP',           // Member → Committee (as chair/ranking)
    'EMPLOYMENT',           // Staff → Member/Committee
    'ORGANIZATIONAL',       // SubAgency → Agency

    // Capability relations
    'REDUCES_FAILURE_MODE', // Capability → Failure reduction
    'IMPLEMENTS',           // Implementation → Capability

    // Relevance-routing relations
    'PROJECTS_TO',          // Capability → Issue Surface
    'MAPS_TO',              // Issue Surface → Policy Area
    'ROUTES_THROUGH',       // Generic routing

    // Jurisdictional relations
    'HAS_AUTHORITY',        // Committee → Policy Area
    'SUPPORTS',             // Staff → Committee (support role)
    'DELEGATES',            // Committee → Subcommittee
    'EXERCISES',            // Agency → Authority

    // Procedural relations
    'PRODUCES',             // Committee → Report Language
    'REFERENCES',           // Guidance → Authority
    'ENABLES',              // Vehicle → Expression

    // Incentive-translation relations
    'INCENTIVIZES',         // Policy → Member incentive
    'REDUCES_RISK',         // Capability → Risk category
    'AFFECTS_EXPOSURE',     // Policy → Constituent exposure
    'BENEFITS',             // Policy → Industry segment

    // Coalition/Information relations
    'ALLIES_WITH',          // Member → Member (coalition)
    'OPPOSES',              // Member → Member (opposition)
    'INFORMS',              // Actor → Actor (information flow)
    'COORDINATES',          // Actor → Actor (coordination)

    // Compatibility edges
    'COMPATIBLE',           // Generic compatibility (+)
    'INCOMPATIBLE',         // Generic incompatibility (-)
]);

export type EdgeType = z.infer<typeof EdgeTypeSchema>;

// ============================================================================
// Timestamps
// ============================================================================

export const TimestampSchema = z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    validFrom: z.date().optional(),
    validTo: z.date().optional(),
});

export type Timestamp = z.infer<typeof TimestampSchema>;
