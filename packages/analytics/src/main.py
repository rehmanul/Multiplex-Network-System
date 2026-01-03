"""
Multiplex Network Analytics - FastAPI Server

Production API for network analytics services.
"""

import os
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

import networkx as nx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase
from pydantic import BaseModel
from pydantic_settings import BaseSettings
from prometheus_client import Counter, Histogram, generate_latest
from starlette.responses import Response

from .balance.signed_network import (
    SignedNetworkAnalyzer,
    create_signed_graph_from_edges,
    StructuralBalanceResult,
    TriangleAnalysis,
)
from .centrality.multiplex_centrality import (
    MultiplexCentralityAnalyzer,
    MultiplexCentralityResult,
)
from .advanced.institutional_metrics import (
    AdvancedInstitutionalMetrics,
    ConstraintDominanceResult,
    LatentSubgraphResult,
    PathDependenceResult,
    InformationAsymmetryResult,
)


# ============================================================================
# Configuration
# ============================================================================

class Settings(BaseSettings):
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""
    redis_url: str = "redis://localhost:6379"
    analytics_port: int = 8001
    log_level: str = "info"
    
    class Config:
        env_file = ".env"


settings = Settings()


# ============================================================================
# Metrics
# ============================================================================

REQUEST_COUNT = Counter(
    "analytics_requests_total",
    "Total analytics requests",
    ["endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "analytics_request_latency_seconds",
    "Request latency in seconds",
    ["endpoint"]
)


# ============================================================================
# Database Client
# ============================================================================

class Neo4jClient:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
    
    def close(self):
        self.driver.close()
    
    def get_layer_edges(self, layer: str) -> List[Dict]:
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (s)-[e:EDGE {layer: $layer}]->(t)
                RETURN s.id as source, t.id as target, 
                       e.sign as sign, e.weight as weight
                """,
                layer=layer
            )
            return [dict(r) for r in result]
    
    def get_all_edges(self) -> List[Dict]:
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (s)-[e:EDGE]->(t)
                RETURN s.id as source, t.id as target,
                       e.sign as sign, e.layer as layer, e.weight as weight
                """
            )
            return [dict(r) for r in result]


# Global client
db_client: Optional[Neo4jClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client
    db_client = Neo4jClient(
        settings.neo4j_uri,
        settings.neo4j_user,
        settings.neo4j_password
    )
    yield
    if db_client:
        db_client.close()


# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="Multiplex Network Analytics API",
    description="Production analytics engine for multiplex political-institutional networks",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Response Models
# ============================================================================

class HealthResponse(BaseModel):
    status: str
    database: str


class FrustrationResponse(BaseModel):
    frustration_index: int
    is_balanced: bool
    frustrated_edges: List[List[str]]
    balance_ratio: float


class TriangleResponse(BaseModel):
    total_triangles: int
    balanced_triangles: int
    frustrated_triangles: int
    balance_ratio: float


class CentralityResponse(BaseModel):
    centralities: Dict[str, float]
    method: str


class NodeCentralityResponse(BaseModel):
    node_id: str
    layer_centralities: Dict[str, float]
    aggregate_centrality: float
    versatility: float
    participation_coefficient: float


class ConstraintDominanceResponse(BaseModel):
    dominant_constraints: List[str]
    dominance_scores: Dict[str, float]
    switch_likelihood: float


class MetaStabilityResponse(BaseModel):
    meta_stability: float
    interpretation: str


class InformationAsymmetryResponse(BaseModel):
    gini_coefficient: float
    information_hubs: List[str]
    information_periphery: List[str]


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    db_status = "connected"
    try:
        if db_client:
            with db_client.driver.session() as session:
                session.run("RETURN 1")
    except Exception:
        db_status = "disconnected"
    
    return HealthResponse(status="healthy", database=db_status)


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(generate_latest(), media_type="text/plain")


@app.get("/analytics/frustration/{layer}", response_model=FrustrationResponse)
async def compute_frustration(layer: str):
    """
    Compute frustration index for a network layer.
    
    The frustration index is the minimum number of edges to remove
    to achieve structural balance.
    """
    REQUEST_COUNT.labels(endpoint="frustration", status="started").inc()
    
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    edges = db_client.get_layer_edges(layer)
    
    if not edges:
        raise HTTPException(status_code=404, detail=f"No edges found in layer '{layer}'")
    
    graph = create_signed_graph_from_edges(edges)
    analyzer = SignedNetworkAnalyzer(graph)
    result = analyzer.compute_structural_balance()
    
    REQUEST_COUNT.labels(endpoint="frustration", status="success").inc()
    
    return FrustrationResponse(
        frustration_index=result.frustration_index,
        is_balanced=result.is_balanced,
        frustrated_edges=[list(e) for e in result.frustrated_edges],
        balance_ratio=result.balance_ratio
    )


@app.get("/analytics/triangles/{layer}", response_model=TriangleResponse)
async def analyze_triangles(layer: str):
    """
    Analyze structural balance through triangle enumeration.
    """
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    edges = db_client.get_layer_edges(layer)
    
    if not edges:
        raise HTTPException(status_code=404, detail=f"No edges found in layer '{layer}'")
    
    graph = create_signed_graph_from_edges(edges)
    analyzer = SignedNetworkAnalyzer(graph)
    result = analyzer.analyze_triangles()
    
    return TriangleResponse(
        total_triangles=result.total_triangles,
        balanced_triangles=result.balanced_triangles,
        frustrated_triangles=result.frustrated_triangles,
        balance_ratio=result.balance_ratio
    )


@app.get("/analytics/centrality/multiplex", response_model=CentralityResponse)
async def compute_multiplex_centrality(
    method: str = Query("aggregate", enum=["aggregate", "max", "harmonic"])
):
    """
    Compute aggregate centrality across all network layers.
    """
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    edges = db_client.get_all_edges()
    
    if not edges:
        raise HTTPException(status_code=404, detail="No edges found")
    
    # Build layer-separated graphs
    layers: Dict[str, nx.Graph] = {}
    for edge in edges:
        layer = edge.get('layer', 'default')
        if layer not in layers:
            layers[layer] = nx.Graph()
        layers[layer].add_edge(edge['source'], edge['target'])
    
    analyzer = MultiplexCentralityAnalyzer(layers)
    centralities = analyzer.compute_multiplex_centrality(method=method)
    
    return CentralityResponse(centralities=centralities, method=method)


@app.get("/analytics/centrality/node/{node_id}", response_model=NodeCentralityResponse)
async def compute_node_centrality(node_id: str):
    """
    Compute comprehensive centrality analysis for a single node.
    """
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    edges = db_client.get_all_edges()
    
    layers: Dict[str, nx.Graph] = {}
    for edge in edges:
        layer = edge.get('layer', 'default')
        if layer not in layers:
            layers[layer] = nx.Graph()
        layers[layer].add_edge(edge['source'], edge['target'])
    
    analyzer = MultiplexCentralityAnalyzer(layers)
    
    if node_id not in analyzer.all_nodes:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    
    result = analyzer.compute_node_analysis(node_id)
    
    return NodeCentralityResponse(
        node_id=result.node_id,
        layer_centralities=result.layer_centralities,
        aggregate_centrality=result.aggregate_centrality,
        versatility=result.versatility,
        participation_coefficient=result.participation_coefficient
    )


@app.get("/analytics/pagerank/multiplex", response_model=CentralityResponse)
async def compute_multiplex_pagerank(
    inter_layer_weight: float = Query(0.5, ge=0, le=1)
):
    """
    Compute PageRank across the multiplex network.
    """
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    edges = db_client.get_all_edges()
    
    layers: Dict[str, nx.Graph] = {}
    for edge in edges:
        layer = edge.get('layer', 'default')
        if layer not in layers:
            layers[layer] = nx.Graph()
        layers[layer].add_edge(edge['source'], edge['target'])
    
    analyzer = MultiplexCentralityAnalyzer(layers)
    pagerank = analyzer.compute_multiplex_pagerank(inter_layer_weight=inter_layer_weight)
    
    return CentralityResponse(centralities=pagerank, method="multiplex_pagerank")


@app.post("/analytics/constraint-dominance", response_model=ConstraintDominanceResponse)
async def analyze_constraint_dominance(constraint_nodes: List[str]):
    """
    Analyze which constraints dominate decision-making paths.
    """
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    edges = db_client.get_all_edges()
    
    G = nx.DiGraph()
    for edge in edges:
        G.add_edge(edge['source'], edge['target'])
    
    analyzer = AdvancedInstitutionalMetrics(G)
    result = analyzer.analyze_constraint_dominance(constraint_nodes)
    
    return ConstraintDominanceResponse(
        dominant_constraints=result.dominant_constraints,
        dominance_scores=result.dominance_scores,
        switch_likelihood=result.switch_likelihood
    )


@app.get("/analytics/meta-stability", response_model=MetaStabilityResponse)
async def compute_meta_stability():
    """
    Compute meta-stability of the network configuration.
    """
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    edges = db_client.get_all_edges()
    
    G = nx.DiGraph()
    for edge in edges:
        G.add_edge(edge['source'], edge['target'])
    
    analyzer = AdvancedInstitutionalMetrics(G)
    stability = analyzer.compute_meta_stability()
    
    interpretation = "stable"
    if stability > 0.7:
        interpretation = "highly meta-stable (likely to transition)"
    elif stability > 0.4:
        interpretation = "moderately meta-stable"
    
    return MetaStabilityResponse(
        meta_stability=stability,
        interpretation=interpretation
    )


@app.get("/analytics/information-asymmetry", response_model=InformationAsymmetryResponse)
async def analyze_information_asymmetry():
    """
    Measure information asymmetry in the network.
    """
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    edges = db_client.get_all_edges()
    
    G = nx.DiGraph()
    for edge in edges:
        G.add_edge(edge['source'], edge['target'])
    
    analyzer = AdvancedInstitutionalMetrics(G)
    result = analyzer.measure_information_asymmetry()
    
    return InformationAsymmetryResponse(
        gini_coefficient=result.gini_coefficient,
        information_hubs=result.information_hubs[:10],
        information_periphery=result.information_periphery[:10]
    )


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.analytics_port,
        reload=False,
        workers=4
    )
