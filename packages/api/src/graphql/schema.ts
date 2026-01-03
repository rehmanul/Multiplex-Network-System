/**
 * Multiplex Network API - GraphQL Schema
 */

export const schema = `
  scalar DateTime
  scalar JSON

  type Query {
    # Node queries
    node(id: ID!): Node
    nodes(type: NodeType!, filter: NodeFilter, limit: Int, offset: Int): NodeConnection!
    searchNodes(query: String!, limit: Int): [Node!]!
    
    # Edge queries
    edges(layer: NetworkLayer, type: EdgeType, sign: EdgeSign): [Edge!]!
    
    # Path queries
    findPaths(fromId: ID!, toId: ID!, options: PathOptions): [Path!]!
    capabilityToCommitteePaths(capabilityId: ID!): [SignedPath!]!
    
    # Analytics
    frustrationIndex(layer: NetworkLayer!): FrustrationResult!
    triangleAnalysis(layer: NetworkLayer!): TriangleResult!
    multiplexCentrality(method: CentralityMethod): CentralityResult!
    nodeCentrality(nodeId: ID!): NodeCentralityResult!
    multiplexPageRank(interLayerWeight: Float): CentralityResult!
    constraintDominance(constraintNodes: [ID!]!): ConstraintDominanceResult!
    metaStability: MetaStabilityResult!
    informationAsymmetry: InformationAsymmetryResult!
    
    # Layer queries
    layers: [LayerInfo!]!
    layerMetrics(layer: NetworkLayer!): LayerMetrics!
  }

  type Mutation {
    # Node operations
    createNode(input: CreateNodeInput!): Node!
    updateNode(id: ID!, input: UpdateNodeInput!): Node!
    deleteNode(id: ID!): Boolean!
    
    # Edge operations
    createEdge(input: CreateEdgeInput!): Edge!
    updateEdge(id: ID!, input: UpdateEdgeInput!): Edge!
    deleteEdge(id: ID!): Boolean!
    
    # Authentication
    login(credentials: LoginInput!): AuthPayload!
    refreshToken: AuthPayload!
  }

  # ============================================================================
  # Enums
  # ============================================================================

  enum NodeType {
    CONGRESS_MEMBER
    COMMITTEE
    SUBCOMMITTEE
    STAFF
    EXECUTIVE_AGENCY
    SUB_AGENCY
    OVERSIGHT_BODY
    CAPABILITY
    CAPABILITY_IMPLEMENTATION
    ISSUE_SURFACE
    POLICY_AREA
    JURISDICTIONAL_AUTHORITY
    POLICY_EXPRESSION
    PROCEDURAL_VEHICLE
    PROCUREMENT_PATHWAY
    INSURABLE_RISK_CATEGORY
    CONSTITUENT_EXPOSURE_CATEGORY
    INDUSTRY_SEGMENT
    TEMPORAL_WINDOW
    RISK_THRESHOLD
    BUDGET_CONSTRAINT
    PRECEDENT
    INSTITUTIONAL_MEMORY_MARKER
    VISIBILITY_SALIENCE_INDICATOR
  }

  enum NetworkLayer {
    CAPABILITY
    ISSUE_SURFACE
    POLICY_AREA
    JURISDICTION
    PROCEDURAL
    COALITION
    INFORMATION_FLOW
  }

  enum EdgeType {
    MEMBERSHIP
    LEADERSHIP
    EMPLOYMENT
    ORGANIZATIONAL
    REDUCES_FAILURE_MODE
    IMPLEMENTS
    PROJECTS_TO
    MAPS_TO
    ROUTES_THROUGH
    HAS_AUTHORITY
    SUPPORTS
    DELEGATES
    EXERCISES
    PRODUCES
    REFERENCES
    ENABLES
    INCENTIVIZES
    REDUCES_RISK
    AFFECTS_EXPOSURE
    BENEFITS
    ALLIES_WITH
    OPPOSES
    INFORMS
    COORDINATES
    COMPATIBLE
    INCOMPATIBLE
  }

  enum EdgeSign {
    POSITIVE
    NEGATIVE
    NEUTRAL
  }

  enum CentralityMethod {
    AGGREGATE
    MAX
    HARMONIC
  }

  # ============================================================================
  # Types
  # ============================================================================

  type Node {
    id: ID!
    type: NodeType!
    name: String!
    description: String
    metadata: JSON
    provenance: Provenance!
    timestamps: Timestamps!
    isActive: Boolean!
    layers: [NetworkLayer!]!
    edges: [Edge!]!
  }

  type Edge {
    id: ID!
    type: EdgeType!
    sourceId: ID!
    targetId: ID!
    source: Node
    target: Node
    direction: String!
    sign: EdgeSign!
    layer: NetworkLayer!
    weight: Float!
    confidence: Float!
    metadata: JSON
  }

  type Path {
    nodes: [ID!]!
    edges: [ID!]!
    length: Int!
  }

  type SignedPath {
    path: [ID!]!
    sign: String!
    nodes: [Node!]!
  }

  type Provenance {
    sourceId: String!
    sourceName: String!
    sourceUrl: String
    retrievedAt: DateTime!
    confidence: Float!
  }

  type Timestamps {
    createdAt: DateTime!
    updatedAt: DateTime!
    validFrom: DateTime
    validTo: DateTime
  }

  type NodeConnection {
    nodes: [Node!]!
    totalCount: Int!
    hasMore: Boolean!
  }

  type LayerInfo {
    name: NetworkLayer!
    description: String!
    nodeCount: Int!
    edgeCount: Int!
  }

  type LayerMetrics {
    nodeCount: Int!
    edgeCount: Int!
    density: Float!
    averageDegree: Float!
    clusteringCoefficient: Float!
    signBalance: SignBalance!
  }

  type SignBalance {
    positive: Int!
    negative: Int!
    neutral: Int!
  }

  # ============================================================================
  # Analytics Results
  # ============================================================================

  type FrustrationResult {
    frustrationIndex: Int!
    isBalanced: Boolean!
    frustratedEdges: [[ID!]!]!
    balanceRatio: Float!
  }

  type TriangleResult {
    totalTriangles: Int!
    balancedTriangles: Int!
    frustratedTriangles: Int!
    balanceRatio: Float!
  }

  type CentralityResult {
    centralities: JSON!
    method: String!
    topNodes: [CentralityNode!]!
  }

  type CentralityNode {
    nodeId: ID!
    score: Float!
    node: Node
  }

  type NodeCentralityResult {
    nodeId: ID!
    layerCentralities: JSON!
    aggregateCentrality: Float!
    versatility: Float!
    participationCoefficient: Float!
  }

  type ConstraintDominanceResult {
    dominantConstraints: [ID!]!
    dominanceScores: JSON!
    switchLikelihood: Float!
  }

  type MetaStabilityResult {
    metaStability: Float!
    interpretation: String!
  }

  type InformationAsymmetryResult {
    giniCoefficient: Float!
    informationHubs: [ID!]!
    informationPeriphery: [ID!]!
  }

  # ============================================================================
  # Inputs
  # ============================================================================

  input NodeFilter {
    isActive: Boolean
    search: String
    layers: [NetworkLayer!]
  }

  input PathOptions {
    maxDepth: Int
    layer: NetworkLayer
    signFilter: EdgeSign
  }

  input CreateNodeInput {
    type: NodeType!
    name: String!
    description: String
    metadata: JSON
  }

  input UpdateNodeInput {
    name: String
    description: String
    metadata: JSON
    isActive: Boolean
  }

  input CreateEdgeInput {
    type: EdgeType!
    sourceId: ID!
    targetId: ID!
    layer: NetworkLayer!
    sign: EdgeSign
    weight: Float
  }

  input UpdateEdgeInput {
    sign: EdgeSign
    weight: Float
    isActive: Boolean
  }

  input LoginInput {
    username: String!
    password: String!
  }

  type AuthPayload {
    token: String!
    expiresIn: Int!
    user: User!
  }

  type User {
    id: ID!
    username: String!
    role: String!
  }
`;
