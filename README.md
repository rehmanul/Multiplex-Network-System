# Multiplex Political-Institutional Network Modelling System

A production-grade system that models institutional decision-making as a heterogeneous, multiplex, signed network.

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose

### Development Setup

```bash
# Install dependencies
npm install

# Start database services
docker-compose up -d neo4j postgres redis

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev        # Webapp on http://localhost:3000
npm run dev:api    # API on http://localhost:3001
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Data source API keys
CONGRESS_API_KEY=your-congress-gov-api-key

# Database credentials (defaults work with docker-compose)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=multiplexnetwork2024

POSTGRES_URL=postgresql://multiplex:multiplexdb2024@localhost:5432/multiplex_metadata
REDIS_URL=redis://:multiplexcache2024@localhost:6379

# Security
JWT_SECRET=your-secure-jwt-secret
```

## Architecture

```
packages/
├── core/        # Shared models, layers, types
├── ingestion/   # Data connectors for authoritative sources
├── database/    # Neo4j + PostgreSQL integrations
├── analytics/   # Python-based network analytics
├── api/         # REST + GraphQL API
└── webapp/      # React visualization dashboard
```

## Documentation

- [Data Model](./docs/data-model.md)
- [API Reference](./docs/api.md)
- [Analytics Guide](./docs/analytics.md)
- [Deployment](./docs/deployment.md)

## License

Proprietary - All rights reserved
