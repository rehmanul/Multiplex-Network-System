/**
 * Multiplex Network - API Client
 */

// Primary API is the analytics service
const API_BASE = import.meta.env.VITE_API_URL ?? 'https://multiplex-analytics.onrender.com';

interface NetworkData {
    nodes: Array<{
        id: string;
        name: string;
        type: string;
    }>;
    edges: Array<{
        source: string;
        target: string;
        type: string;
        layer?: string;
        sign?: number;
    }>;
}

interface ApiResponse<T> {
    data: T;
    pagination?: {
        total: number;
        hasMore: boolean;
    };
}

type NetworkLayer = 'CAPABILITY' | 'ISSUE_SURFACE' | 'POLICY_AREA' | 'JURISDICTION' | 'PROCEDURAL' | 'COALITION' | 'INFORMATION_FLOW';

interface Node {
    id: string;
    type: string;
    name: string;
    description?: string;
    metadata?: Record<string, unknown>;
}

interface Edge {
    id: string;
    source: string;
    target: string;
    type: string;
    sign: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    layer: string;
    weight?: number;
}

interface FrustrationResult {
    frustrationIndex: number;
    isBalanced: boolean;
    frustratedEdges: string[][];
    balanceRatio: number;
}

interface MetaStabilityResult {
    metaStability: number;
    interpretation: string;
}

interface CentralityResult {
    centralities: Record<string, number>;
    method: string;
}

interface MetricsResult {
    nodes: number;
    triangles: number;
    frustratedTriangles: number;
    frustrationRatio: number;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}

export const api = {
    // Nodes
    getNodes: (type: string): Promise<ApiResponse<Node[]>> =>
        fetchApi(`/nodes/${type}`),

    getNode: (id: string): Promise<ApiResponse<Node>> =>
        fetchApi(`/nodes/any/${id}`),

    searchNodes: (query: string): Promise<ApiResponse<Node[]>> =>
        fetchApi(`/search?q=${encodeURIComponent(query)}`),

    // Edges
    getEdges: (layer?: NetworkLayer): Promise<ApiResponse<Edge[]>> =>
        fetchApi(layer ? `/edges?layer=${layer}` : '/edges'),

    // Paths
    findPaths: (from: string, to: string, options?: { maxDepth?: number; layer?: NetworkLayer }) =>
        fetchApi(`/paths?from=${from}&to=${to}${options?.maxDepth ? `&maxDepth=${options.maxDepth}` : ''}${options?.layer ? `&layer=${options.layer}` : ''}`),

    getCapabilityToCommitteePaths: (capabilityId: string) =>
        fetchApi(`/paths/capability-to-committee/${capabilityId}`),

    // Analytics
    getFrustration: (layer: NetworkLayer): Promise<FrustrationResult> =>
        fetchApi<ApiResponse<FrustrationResult>>(`/analytics/frustration/${layer}`).then(r => r.data),

    getTriangleAnalysis: (layer: NetworkLayer) =>
        fetchApi(`/analytics/triangles/${layer}`),

    getCentrality: (method: 'aggregate' | 'max' | 'harmonic' = 'aggregate'): Promise<CentralityResult> =>
        fetchApi<ApiResponse<CentralityResult>>(`/analytics/centrality?method=${method}`).then(r => r.data),

    getNodeCentrality: (nodeId: string) =>
        fetchApi(`/analytics/centrality/${nodeId}`),

    getPageRank: (interLayerWeight = 0.5) =>
        fetchApi(`/analytics/pagerank?interLayerWeight=${interLayerWeight}`),

    getConstraintDominance: (constraintNodes: string[]) =>
        fetchApi('/analytics/constraint-dominance', {
            method: 'POST',
            body: JSON.stringify(constraintNodes),
        }),

    getMetaStability: (): Promise<MetaStabilityResult> =>
        fetchApi<ApiResponse<MetaStabilityResult>>('/analytics/meta-stability').then(r => r.data),

    getInformationAsymmetry: () =>
        fetchApi('/analytics/information-asymmetry'),

    // Metrics
    getMetrics: (): Promise<MetricsResult> =>
        fetchApi<ApiResponse<MetricsResult>>('/metrics').then(r => r.data),

    // Layers
    getLayers: () =>
        fetchApi('/layers'),

    getLayerMetrics: (layer: NetworkLayer) =>
        fetchApi(`/layers/${layer}/metrics`),

    // Network Graph Data
    getNetworkData: (): Promise<NetworkData> =>
        fetchApi<NetworkData>('/analytics/network'),

    // Data Ingestion
    ingestCongressData: (congress = 119, billType = 'hr', limit = 30) =>
        fetchApi<{ success: boolean; nodes_created: number; edges_created: number }>(`/analytics/ingest-congress-data?congress=${congress}&bill_type=${billType}&limit=${limit}`, {
            method: 'POST',
        }),
};
