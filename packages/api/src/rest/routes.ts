/**
 * Multiplex Network API - REST Routes
 */

import type { FastifyInstance } from 'fastify';
import type { Neo4jClient } from '@multiplex/database';
import { request } from 'undici';

export async function registerRestRoutes(
    app: FastifyInstance,
    db: Neo4jClient,
    analyticsUrl: string
) {
    // ============================================================================
    // Nodes
    // ============================================================================

    app.get('/api/nodes/:type', async (req, reply) => {
        const { type } = req.params as { type: string };
        const { limit = 50, offset = 0 } = req.query as { limit?: number; offset?: number };

        const nodes = await db.getNodesByType(type);
        const paginated = nodes.slice(offset, offset + limit);

        return {
            data: paginated,
            pagination: {
                total: nodes.length,
                limit,
                offset,
                hasMore: offset + limit < nodes.length,
            },
        };
    });

    app.get('/api/nodes/:type/:id', async (req, reply) => {
        const { id } = req.params as { id: string };
        const node = await db.getNode(id);

        if (!node) {
            return reply.code(404).send({ error: 'Node not found' });
        }

        return { data: node };
    });

    app.get('/api/search', async (req) => {
        const { q, limit = 20 } = req.query as { q: string; limit?: number };

        if (!q || q.length < 2) {
            return { data: [] };
        }

        const nodes = await db.searchNodes(q, limit);
        return { data: nodes };
    });

    // ============================================================================
    // Edges
    // ============================================================================

    app.get('/api/edges', async (req) => {
        const { layer, sign } = req.query as { layer?: string; sign?: string };

        let edges;
        if (layer) {
            edges = await db.getEdgesByLayer(layer as Parameters<typeof db.getEdgesByLayer>[0]);
        } else if (sign) {
            edges = await db.getEdgesBySign(sign as Parameters<typeof db.getEdgesBySign>[0]);
        } else {
            edges = [];
        }

        return { data: edges };
    });

    // ============================================================================
    // Paths
    // ============================================================================

    app.get('/api/paths', async (req) => {
        const { from, to, maxDepth = 5, layer } = req.query as {
            from: string;
            to: string;
            maxDepth?: number;
            layer?: string;
        };

        if (!from || !to) {
            return { error: 'from and to parameters required' };
        }

        const paths = await db.findPaths(from, to, {
            maxDepth,
            layer: layer as Parameters<typeof db.findPaths>[2]['layer'],
        });

        return { data: paths };
    });

    app.get('/api/paths/capability-to-committee/:capabilityId', async (req) => {
        const { capabilityId } = req.params as { capabilityId: string };
        const paths = await db.findCapabilityToCommitteePaths(capabilityId);
        return { data: paths };
    });

    // ============================================================================
    // Analytics
    // ============================================================================

    app.get('/api/analytics/frustration/:layer', async (req) => {
        const { layer } = req.params as { layer: string };

        const response = await request(`${analyticsUrl}/analytics/frustration/${layer}`);
        const data = await response.body.json();

        return { data };
    });

    app.get('/api/analytics/triangles/:layer', async (req) => {
        const { layer } = req.params as { layer: string };

        const response = await request(`${analyticsUrl}/analytics/triangles/${layer}`);
        const data = await response.body.json();

        return { data };
    });

    app.get('/api/analytics/centrality', async (req) => {
        const { method = 'aggregate' } = req.query as { method?: string };

        const response = await request(
            `${analyticsUrl}/analytics/centrality/multiplex?method=${method}`
        );
        const data = await response.body.json();

        return { data };
    });

    app.get('/api/analytics/centrality/:nodeId', async (req) => {
        const { nodeId } = req.params as { nodeId: string };

        const response = await request(`${analyticsUrl}/analytics/centrality/node/${nodeId}`);
        const data = await response.body.json();

        return { data };
    });

    app.get('/api/analytics/pagerank', async (req) => {
        const { interLayerWeight = 0.5 } = req.query as { interLayerWeight?: number };

        const response = await request(
            `${analyticsUrl}/analytics/pagerank/multiplex?inter_layer_weight=${interLayerWeight}`
        );
        const data = await response.body.json();

        return { data };
    });

    app.post('/api/analytics/constraint-dominance', async (req) => {
        const constraintNodes = req.body as string[];

        const response = await request(`${analyticsUrl}/analytics/constraint-dominance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(constraintNodes),
        });
        const data = await response.body.json();

        return { data };
    });

    app.get('/api/analytics/meta-stability', async () => {
        const response = await request(`${analyticsUrl}/analytics/meta-stability`);
        const data = await response.body.json();

        return { data };
    });

    app.get('/api/analytics/information-asymmetry', async () => {
        const response = await request(`${analyticsUrl}/analytics/information-asymmetry`);
        const data = await response.body.json();

        return { data };
    });

    // ============================================================================
    // Layers
    // ============================================================================

    app.get('/api/layers', async () => {
        return {
            data: [
                { name: 'CAPABILITY', description: 'Capability → failure mode reduction' },
                { name: 'ISSUE_SURFACE', description: 'Issue surface semantic projections' },
                { name: 'POLICY_AREA', description: 'Policy area categorization' },
                { name: 'JURISDICTION', description: 'Authority allocation chains' },
                { name: 'PROCEDURAL', description: 'Non-statutory policy instruments' },
                { name: 'COALITION', description: 'Member coalitions and alliances' },
                { name: 'INFORMATION_FLOW', description: 'Information transmission paths' },
            ],
        };
    });

    app.get('/api/layers/:layer/metrics', async (req) => {
        const { layer } = req.params as { layer: string };

        // Would compute from database
        return {
            data: {
                layer,
                nodeCount: 0,
                edgeCount: 0,
                density: 0,
                averageDegree: 0,
            },
        };
    });

    // ============================================================================
    // Metrics export
    // ============================================================================

    app.get('/api/metrics', async () => {
        const degreeCentrality = await db.computeDegreeCentrality();
        const triangles = await db.countFrustratedTriangles();

        return {
            data: {
                nodes: degreeCentrality.size,
                triangles: triangles.total,
                frustratedTriangles: triangles.frustrated,
                frustrationRatio: triangles.total > 0
                    ? triangles.frustrated / triangles.total
                    : 0,
            },
        };
    });
}
