/**
 * Multiplex Network - Neo4j Graph Database Client
 * 
 * Production-grade Neo4j integration with connection pooling,
 * transaction support, and schema management
 */

import neo4j, { Driver, Session, Transaction, QueryResult } from 'neo4j-driver';
import type { NetworkNode, Edge, NetworkLayer } from '@multiplex/core';

// ============================================================================
// Configuration
// ============================================================================

export interface Neo4jConfig {
    uri: string;
    username: string;
    password: string;
    database?: string;
    maxConnectionPoolSize?: number;
    connectionAcquisitionTimeout?: number;
    connectionTimeout?: number;
    maxTransactionRetryTime?: number;
}

// ============================================================================
// Neo4j Client
// ============================================================================

export class Neo4jClient {
    private driver: Driver;
    private database: string;

    constructor(config: Neo4jConfig) {
        this.driver = neo4j.driver(
            config.uri,
            neo4j.auth.basic(config.username, config.password),
            {
                maxConnectionPoolSize: config.maxConnectionPoolSize ?? 50,
                connectionAcquisitionTimeout: config.connectionAcquisitionTimeout ?? 60000,
                connectionTimeout: config.connectionTimeout ?? 30000,
                maxTransactionRetryTime: config.maxTransactionRetryTime ?? 30000,
                logging: {
                    level: 'info',
                    logger: (level, message) => console.log(`[Neo4j ${level}] ${message}`),
                },
            }
        );
        this.database = config.database ?? 'neo4j';
    }

    // ============================================================================
    // Connection Management
    // ============================================================================

    async verifyConnectivity(): Promise<void> {
        await this.driver.verifyConnectivity();
    }

    async close(): Promise<void> {
        await this.driver.close();
    }

    getSession(mode: 'READ' | 'WRITE' = 'WRITE'): Session {
        return this.driver.session({
            database: this.database,
            defaultAccessMode: mode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE,
        });
    }

    // ============================================================================
    // Schema Management
    // ============================================================================

    async initializeSchema(): Promise<void> {
        const session = this.getSession('WRITE');
        try {
            await session.executeWrite(async (tx) => {
                // Node constraints - ensure unique identifiers
                await tx.run(`
          CREATE CONSTRAINT congress_member_bioguide IF NOT EXISTS
          FOR (n:CongressMember) REQUIRE n.bioguideId IS UNIQUE
        `);

                await tx.run(`
          CREATE CONSTRAINT committee_thomas IF NOT EXISTS
          FOR (n:Committee) REQUIRE n.thomasId IS UNIQUE
        `);

                await tx.run(`
          CREATE CONSTRAINT agency_abbreviation IF NOT EXISTS
          FOR (n:ExecutiveAgency) REQUIRE n.abbreviation IS UNIQUE
        `);

                await tx.run(`
          CREATE CONSTRAINT node_uuid IF NOT EXISTS
          FOR (n:Node) REQUIRE n.id IS UNIQUE
        `);

                // Edge indexes for efficient queries
                await tx.run(`
          CREATE INDEX edge_layer IF NOT EXISTS
          FOR ()-[e:EDGE]-() ON (e.layer)
        `);

                await tx.run(`
          CREATE INDEX edge_sign IF NOT EXISTS
          FOR ()-[e:EDGE]-() ON (e.sign)
        `);

                await tx.run(`
          CREATE INDEX edge_type IF NOT EXISTS
          FOR ()-[e:EDGE]-() ON (e.type)
        `);

                // Full-text search indexes
                await tx.run(`
          CREATE FULLTEXT INDEX node_name_search IF NOT EXISTS
          FOR (n:Node) ON EACH [n.name, n.description]
        `);
            });

            console.log('Neo4j schema initialized successfully');
        } finally {
            await session.close();
        }
    }

    // ============================================================================
    // Node Operations
    // ============================================================================

    async createNode(node: NetworkNode): Promise<void> {
        const session = this.getSession('WRITE');
        try {
            await session.executeWrite(async (tx) => {
                const labels = ['Node', node.type];
                const labelString = labels.map(l => `:\`${l}\``).join('');

                await tx.run(
                    `
          CREATE (n${labelString} $props)
          RETURN n
          `,
                    {
                        props: {
                            ...node,
                            provenance: JSON.stringify(node.provenance),
                            timestamps: JSON.stringify(node.timestamps),
                            metadata: JSON.stringify(node.metadata),
                            externalIds: JSON.stringify(node.externalIds),
                        },
                    }
                );
            });
        } finally {
            await session.close();
        }
    }

    async createNodes(nodes: NetworkNode[]): Promise<void> {
        const session = this.getSession('WRITE');
        try {
            await session.executeWrite(async (tx) => {
                for (const node of nodes) {
                    const labels = ['Node', node.type];
                    const labelString = labels.map(l => `:\`${l}\``).join('');

                    await tx.run(
                        `
            MERGE (n:Node {id: $id})
            ON CREATE SET n${labelString.slice(5)}, n += $props
            ON MATCH SET n += $props
            `,
                        {
                            id: node.id,
                            props: {
                                ...node,
                                provenance: JSON.stringify(node.provenance),
                                timestamps: JSON.stringify(node.timestamps),
                                metadata: JSON.stringify(node.metadata),
                                externalIds: JSON.stringify(node.externalIds),
                            },
                        }
                    );
                }
            });
        } finally {
            await session.close();
        }
    }

    async getNode(id: string): Promise<NetworkNode | null> {
        const session = this.getSession('READ');
        try {
            const result = await session.executeRead((tx) =>
                tx.run('MATCH (n:Node {id: $id}) RETURN n', { id })
            );

            if (result.records.length === 0) return null;

            return this.parseNodeRecord(result.records[0]!.get('n'));
        } finally {
            await session.close();
        }
    }

    async getNodesByType(type: string): Promise<NetworkNode[]> {
        const session = this.getSession('READ');
        try {
            const result = await session.executeRead((tx) =>
                tx.run(`MATCH (n:\`${type}\`) RETURN n`)
            );

            return result.records.map((r) => this.parseNodeRecord(r.get('n')));
        } finally {
            await session.close();
        }
    }

    async searchNodes(query: string, limit = 50): Promise<NetworkNode[]> {
        const session = this.getSession('READ');
        try {
            const result = await session.executeRead((tx) =>
                tx.run(
                    `
          CALL db.index.fulltext.queryNodes('node_name_search', $query)
          YIELD node, score
          RETURN node
          ORDER BY score DESC
          LIMIT $limit
          `,
                    { query: `${query}~`, limit: neo4j.int(limit) }
                )
            );

            return result.records.map((r) => this.parseNodeRecord(r.get('node')));
        } finally {
            await session.close();
        }
    }

    // ============================================================================
    // Edge Operations
    // ============================================================================

    async createEdge(edge: Edge): Promise<void> {
        const session = this.getSession('WRITE');
        try {
            await session.executeWrite(async (tx) => {
                await tx.run(
                    `
          MATCH (source:Node {id: $sourceId})
          MATCH (target:Node {id: $targetId})
          CREATE (source)-[e:EDGE $props]->(target)
          RETURN e
          `,
                    {
                        sourceId: edge.sourceId,
                        targetId: edge.targetId,
                        props: {
                            id: edge.id,
                            type: edge.type,
                            direction: edge.direction,
                            sign: edge.sign,
                            layer: edge.layer,
                            weight: edge.weight,
                            confidence: edge.confidence,
                            metadata: JSON.stringify(edge.metadata),
                            provenance: JSON.stringify(edge.provenance),
                            timestamps: JSON.stringify(edge.timestamps),
                            isActive: edge.isActive,
                        },
                    }
                );
            });
        } finally {
            await session.close();
        }
    }

    async createEdges(edges: Edge[]): Promise<void> {
        const session = this.getSession('WRITE');
        try {
            await session.executeWrite(async (tx) => {
                for (const edge of edges) {
                    await tx.run(
                        `
            MATCH (source:Node {id: $sourceId})
            MATCH (target:Node {id: $targetId})
            MERGE (source)-[e:EDGE {id: $edgeId}]->(target)
            ON CREATE SET e += $props
            ON MATCH SET e += $props
            `,
                        {
                            sourceId: edge.sourceId,
                            targetId: edge.targetId,
                            edgeId: edge.id,
                            props: {
                                type: edge.type,
                                direction: edge.direction,
                                sign: edge.sign,
                                layer: edge.layer,
                                weight: edge.weight,
                                confidence: edge.confidence,
                                metadata: JSON.stringify(edge.metadata),
                                provenance: JSON.stringify(edge.provenance),
                                timestamps: JSON.stringify(edge.timestamps),
                                isActive: edge.isActive,
                            },
                        }
                    );
                }
            });
        } finally {
            await session.close();
        }
    }

    async getEdgesByLayer(layer: NetworkLayer): Promise<Edge[]> {
        const session = this.getSession('READ');
        try {
            const result = await session.executeRead((tx) =>
                tx.run(
                    `
          MATCH (s)-[e:EDGE {layer: $layer}]->(t)
          RETURN e, s.id as sourceId, t.id as targetId
          `,
                    { layer }
                )
            );

            return result.records.map((r) => this.parseEdgeRecord(r));
        } finally {
            await session.close();
        }
    }

    async getEdgesBySign(sign: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'): Promise<Edge[]> {
        const session = this.getSession('READ');
        try {
            const result = await session.executeRead((tx) =>
                tx.run(
                    `
          MATCH (s)-[e:EDGE {sign: $sign}]->(t)
          RETURN e, s.id as sourceId, t.id as targetId
          `,
                    { sign }
                )
            );

            return result.records.map((r) => this.parseEdgeRecord(r));
        } finally {
            await session.close();
        }
    }

    // ============================================================================
    // Path Queries
    // ============================================================================

    async findPaths(
        fromId: string,
        toId: string,
        options: {
            maxDepth?: number;
            layer?: NetworkLayer;
            signFilter?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
        } = {}
    ): Promise<Array<{ nodes: string[]; edges: string[] }>> {
        const session = this.getSession('READ');
        try {
            let whereClause = '';
            const params: Record<string, unknown> = {
                fromId,
                toId,
                maxDepth: neo4j.int(options.maxDepth ?? 5),
            };

            if (options.layer) {
                whereClause += ' AND ALL(e IN edges WHERE e.layer = $layer)';
                params['layer'] = options.layer;
            }

            if (options.signFilter) {
                whereClause += ' AND ALL(e IN edges WHERE e.sign = $sign)';
                params['sign'] = options.signFilter;
            }

            const result = await session.executeRead((tx) =>
                tx.run(
                    `
          MATCH path = shortestPath((start:Node {id: $fromId})-[*1..$maxDepth]->(end:Node {id: $toId}))
          WITH path, relationships(path) as edges, nodes(path) as nodes
          WHERE true ${whereClause}
          RETURN [n IN nodes | n.id] as nodeIds, [e IN edges | e.id] as edgeIds
          LIMIT 100
          `,
                    params
                )
            );

            return result.records.map((r) => ({
                nodes: r.get('nodeIds') as string[],
                edges: r.get('edgeIds') as string[],
            }));
        } finally {
            await session.close();
        }
    }

    /**
     * Find capability → policy area → committee paths with signed edges
     */
    async findCapabilityToCommitteePaths(
        capabilityId: string
    ): Promise<Array<{ path: string[]; sign: string }>> {
        const session = this.getSession('READ');
        try {
            const result = await session.executeRead((tx) =>
                tx.run(
                    `
          MATCH path = (cap:Capability {id: $capabilityId})
            -[:EDGE*1..3]->(:IssueSurface)
            -[:EDGE*1..2]->(:PolicyArea)
            <-[:EDGE*1..2]-(com:Committee)
          WITH path, relationships(path) as edges
          RETURN 
            [n IN nodes(path) | n.id] as nodeIds,
            CASE
              WHEN ANY(e IN edges WHERE e.sign = 'NEGATIVE') THEN 'NEGATIVE'
              WHEN ALL(e IN edges WHERE e.sign = 'POSITIVE') THEN 'POSITIVE'
              ELSE 'MIXED'
            END as pathSign
          LIMIT 100
          `,
                    { capabilityId }
                )
            );

            return result.records.map((r) => ({
                path: r.get('nodeIds') as string[],
                sign: r.get('pathSign') as string,
            }));
        } finally {
            await session.close();
        }
    }

    // ============================================================================
    // Analytics Queries
    // ============================================================================

    async computeDegreeCentrality(layer?: NetworkLayer): Promise<Map<string, number>> {
        const session = this.getSession('READ');
        try {
            let query = `
        MATCH (n:Node)
        OPTIONAL MATCH (n)-[e:EDGE]->()
      `;

            if (layer) {
                query = `
          MATCH (n:Node)
          OPTIONAL MATCH (n)-[e:EDGE {layer: $layer}]->()
        `;
            }

            query += `
        WITH n, count(e) as degree
        RETURN n.id as nodeId, degree
        ORDER BY degree DESC
      `;

            const result = await session.executeRead((tx) =>
                tx.run(query, layer ? { layer } : {})
            );

            const centrality = new Map<string, number>();
            for (const record of result.records) {
                centrality.set(
                    record.get('nodeId') as string,
                    (record.get('degree') as { toNumber: () => number }).toNumber()
                );
            }

            return centrality;
        } finally {
            await session.close();
        }
    }

    async countTriangles(): Promise<number> {
        const session = this.getSession('READ');
        try {
            const result = await session.executeRead((tx) =>
                tx.run(`
          MATCH (a:Node)-[:EDGE]-(b:Node)-[:EDGE]-(c:Node)-[:EDGE]-(a)
          RETURN count(*) / 6 as triangleCount
        `)
            );

            const count = result.records[0]?.get('triangleCount');
            return count ? (count as { toNumber: () => number }).toNumber() : 0;
        } finally {
            await session.close();
        }
    }

    /**
     * Count frustrated triangles (odd number of negative edges)
     */
    async countFrustratedTriangles(): Promise<{ total: number; frustrated: number }> {
        const session = this.getSession('READ');
        try {
            const result = await session.executeRead((tx) =>
                tx.run(`
          MATCH (a:Node)-[e1:EDGE]-(b:Node)-[e2:EDGE]-(c:Node)-[e3:EDGE]-(a)
          WITH a, b, c, e1, e2, e3,
               CASE WHEN e1.sign = 'NEGATIVE' THEN 1 ELSE 0 END +
               CASE WHEN e2.sign = 'NEGATIVE' THEN 1 ELSE 0 END +
               CASE WHEN e3.sign = 'NEGATIVE' THEN 1 ELSE 0 END as negCount
          WITH count(*) / 6 as totalTriangles,
               sum(CASE WHEN negCount % 2 = 1 THEN 1 ELSE 0 END) / 6 as frustratedTriangles
          RETURN totalTriangles, frustratedTriangles
        `)
            );

            const record = result.records[0];
            return {
                total: record ? (record.get('totalTriangles') as { toNumber: () => number }).toNumber() : 0,
                frustrated: record ? (record.get('frustratedTriangles') as { toNumber: () => number }).toNumber() : 0,
            };
        } finally {
            await session.close();
        }
    }

    // ============================================================================
    // Helpers
    // ============================================================================

    private parseNodeRecord(record: Record<string, unknown>): NetworkNode {
        const props = record as Record<string, unknown>;
        return {
            ...props,
            provenance: JSON.parse(props['provenance'] as string),
            timestamps: JSON.parse(props['timestamps'] as string),
            metadata: JSON.parse(props['metadata'] as string),
            externalIds: JSON.parse(props['externalIds'] as string),
        } as NetworkNode;
    }

    private parseEdgeRecord(record: { get: (key: string) => unknown }): Edge {
        const edge = record.get('e') as Record<string, unknown>;
        return {
            ...edge,
            sourceId: record.get('sourceId') as string,
            targetId: record.get('targetId') as string,
            metadata: JSON.parse(edge['metadata'] as string),
            provenance: JSON.parse(edge['provenance'] as string),
            timestamps: JSON.parse(edge['timestamps'] as string),
        } as Edge;
    }
}

// ============================================================================
// Factory
// ============================================================================

export function createNeo4jClient(config?: Partial<Neo4jConfig>): Neo4jClient {
    const defaultConfig: Neo4jConfig = {
        uri: process.env['NEO4J_URI'] ?? 'bolt://localhost:7687',
        username: process.env['NEO4J_USER'] ?? 'neo4j',
        password: process.env['NEO4J_PASSWORD'] ?? '',
        database: process.env['NEO4J_DATABASE'] ?? 'neo4j',
        maxConnectionPoolSize: 50,
    };

    return new Neo4jClient({ ...defaultConfig, ...config });
}
