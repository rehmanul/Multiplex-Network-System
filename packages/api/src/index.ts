/**
 * Multiplex Network API - Main Entry Point
 * 
 * Production REST and GraphQL API server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import mercurius from 'mercurius';
import { createNeo4jClient, type Neo4jClient } from '@multiplex/database';
import { schema } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { registerRestRoutes } from './rest/routes.js';

// ============================================================================
// Configuration
// ============================================================================

interface ServerConfig {
    port: number;
    host: string;
    jwtSecret: string;
    neo4jUri: string;
    neo4jUser: string;
    neo4jPassword: string;
    analyticsUrl: string;
    environment: 'development' | 'production';
}

function loadConfig(): ServerConfig {
    return {
        port: parseInt(process.env['API_PORT'] ?? '3001', 10),
        host: process.env['API_HOST'] ?? '0.0.0.0',
        jwtSecret: process.env['JWT_SECRET'] ?? 'change-this-in-production',
        neo4jUri: process.env['NEO4J_URI'] ?? 'bolt://localhost:7687',
        neo4jUser: process.env['NEO4J_USER'] ?? 'neo4j',
        neo4jPassword: process.env['NEO4J_PASSWORD'] ?? '',
        analyticsUrl: process.env['ANALYTICS_URL'] ?? 'http://localhost:8001',
        environment: (process.env['NODE_ENV'] as 'development' | 'production') ?? 'development',
    };
}

// ============================================================================
// Server Factory
// ============================================================================

export async function createServer(config: ServerConfig) {
    const app = Fastify({
        logger: {
            level: config.environment === 'production' ? 'info' : 'debug',
            transport: config.environment === 'development'
                ? { target: 'pino-pretty' }
                : undefined,
        },
        trustProxy: true,
    });

    // Database client
    const db = createNeo4jClient({
        uri: config.neo4jUri,
        username: config.neo4jUser,
        password: config.neo4jPassword,
    });

    // Decorate with database client
    app.decorate('db', db);

    // Security middleware
    await app.register(helmet, {
        contentSecurityPolicy: config.environment === 'production',
    });

    await app.register(cors, {
        origin: config.environment === 'production'
            ? ['https://multiplex.example.com']
            : true,
        credentials: true,
    });

    await app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
    });

    // JWT authentication
    await app.register(jwt, {
        secret: config.jwtSecret,
    });

    // GraphQL
    await app.register(mercurius, {
        schema,
        resolvers,
        context: (request) => ({
            db,
            user: request.user,
            analyticsUrl: config.analyticsUrl,
        }),
        graphiql: config.environment === 'development',
        path: '/graphql',
    });

    // REST routes
    await registerRestRoutes(app, db, config.analyticsUrl);

    // Health endpoints
    app.get('/health', async () => ({ status: 'healthy' }));

    app.get('/health/ready', async () => {
        try {
            await db.verifyConnectivity();
            return { status: 'ready', database: 'connected' };
        } catch {
            throw { statusCode: 503, message: 'Database not ready' };
        }
    });

    // Graceful shutdown
    const shutdown = async () => {
        app.log.info('Shutting down...');
        await db.close();
        await app.close();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return app;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    const config = loadConfig();
    const app = await createServer(config);

    try {
        await app.listen({ port: config.port, host: config.host });
        app.log.info(`Server running on http://${config.host}:${config.port}`);
        app.log.info(`GraphQL endpoint: http://${config.host}:${config.port}/graphql`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

main();

// Type augmentation
declare module 'fastify' {
    interface FastifyInstance {
        db: Neo4jClient;
    }
}
