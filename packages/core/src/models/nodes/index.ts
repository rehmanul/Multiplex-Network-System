/**
 * Multiplex Political-Institutional Network - Node Exports
 */

// Base
export * from './base.js';

// Actor nodes
export * from './actors.js';

// Artifact nodes  
export * from './artifacts.js';

// Extension nodes
export * from './extensions.js';

// Union types for convenience
import type {
    CongressMember,
    Committee,
    Subcommittee,
    Staff,
    ExecutiveAgency,
    SubAgency,
    OversightBody
} from './actors.js';

import type {
    Capability,
    CapabilityImplementation,
    IssueSurface,
    PolicyArea,
    JurisdictionalAuthority,
    PolicyExpression,
    ProceduralVehicle,
    ProcurementPathway,
    InsurableRiskCategory,
    ConstituentExposureCategory,
    IndustrySegment,
} from './artifacts.js';

import type {
    TemporalWindow,
    RiskThreshold,
    BudgetConstraint,
    Precedent,
    InstitutionalMemoryMarker,
    VisibilitySalienceIndicator,
} from './extensions.js';

/**
 * Union of all actor node types
 */
export type ActorNode =
    | CongressMember
    | Committee
    | Subcommittee
    | Staff
    | ExecutiveAgency
    | SubAgency
    | OversightBody;

/**
 * Union of all artifact node types
 */
export type ArtifactNode =
    | Capability
    | CapabilityImplementation
    | IssueSurface
    | PolicyArea
    | JurisdictionalAuthority
    | PolicyExpression
    | ProceduralVehicle
    | ProcurementPathway
    | InsurableRiskCategory
    | ConstituentExposureCategory
    | IndustrySegment;

/**
 * Union of all extension node types
 */
export type ExtensionNode =
    | TemporalWindow
    | RiskThreshold
    | BudgetConstraint
    | Precedent
    | InstitutionalMemoryMarker
    | VisibilitySalienceIndicator;

/**
 * Union of all network node types
 */
export type NetworkNode = ActorNode | ArtifactNode | ExtensionNode;
