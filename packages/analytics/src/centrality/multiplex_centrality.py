"""
Multiplex Network Analytics - Multi-layer Centrality Metrics

Implements centrality measures for multiplex networks as described
in multilayer network theory literature.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple
import networkx as nx
import numpy as np
from scipy import sparse
from scipy.sparse.linalg import eigs


@dataclass
class MultiplexCentralityResult:
    """Centrality scores across multiple layers."""
    node_id: str
    layer_centralities: Dict[str, float]
    aggregate_centrality: float
    versatility: float
    participation_coefficient: float


@dataclass
class LayerCentralities:
    """Centrality scores for a single layer."""
    degree: Dict[str, float]
    betweenness: Dict[str, float]
    closeness: Dict[str, float]
    eigenvector: Dict[str, float]
    pagerank: Dict[str, float]


class MultiplexCentralityAnalyzer:
    """
    Analyzer for computing centrality metrics across multiplex network layers.
    
    Implements:
    - Layer-specific centrality measures
    - Aggregate multiplex centrality
    - Versatility (participation across layers)
    - Multiplex PageRank
    
    Reference: Multiplex network literature (PMC)
    """
    
    def __init__(self, layers: Dict[str, nx.Graph]):
        """
        Initialize with a dictionary of layer name -> NetworkX graph.
        
        All layers should share the same node set (or subsets thereof).
        """
        self.layers = layers
        self.all_nodes = self._get_all_nodes()
    
    def _get_all_nodes(self) -> Set[str]:
        """Get union of all nodes across layers."""
        nodes: Set[str] = set()
        for graph in self.layers.values():
            nodes.update(graph.nodes())
        return nodes
    
    def compute_layer_centralities(self, layer_name: str) -> LayerCentralities:
        """
        Compute all standard centrality measures for a single layer.
        """
        if layer_name not in self.layers:
            raise ValueError(f"Layer '{layer_name}' not found")
        
        G = self.layers[layer_name]
        
        # Degree centrality
        degree = nx.degree_centrality(G)
        
        # Betweenness centrality
        betweenness = nx.betweenness_centrality(G)
        
        # Closeness centrality
        closeness = nx.closeness_centrality(G)
        
        # Eigenvector centrality
        try:
            eigenvector = nx.eigenvector_centrality(G, max_iter=1000)
        except (nx.NetworkXError, nx.PowerIterationFailedConvergence):
            eigenvector = {n: 0.0 for n in G.nodes()}
        
        # PageRank
        try:
            pagerank = nx.pagerank(G)
        except nx.NetworkXError:
            pagerank = {n: 1.0 / len(G.nodes()) for n in G.nodes()}
        
        return LayerCentralities(
            degree=degree,
            betweenness=betweenness,
            closeness=closeness,
            eigenvector=eigenvector,
            pagerank=pagerank
        )
    
    def compute_versatility(self, node: str) -> float:
        """
        Compute node versatility - the fraction of layers
        in which the node participates.
        """
        participating_layers = sum(
            1 for G in self.layers.values() if node in G.nodes()
        )
        return participating_layers / len(self.layers)
    
    def compute_participation_coefficient(self, node: str) -> float:
        """
        Compute participation coefficient - measures how evenly
        distributed a node's edges are across layers.
        
        P = 1 means perfectly even distribution across all layers.
        P = 0 means all edges in a single layer.
        """
        layer_degrees = []
        
        for G in self.layers.values():
            if node in G.nodes():
                layer_degrees.append(G.degree(node))
            else:
                layer_degrees.append(0)
        
        total_degree = sum(layer_degrees)
        if total_degree == 0:
            return 0.0
        
        L = len(self.layers)
        sum_squared = sum((d / total_degree) ** 2 for d in layer_degrees)
        
        # Participation coefficient formula
        P = (L / (L - 1)) * (1 - sum_squared) if L > 1 else 0.0
        
        return max(0.0, min(1.0, P))
    
    def compute_multiplex_centrality(
        self,
        method: str = "aggregate",
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, float]:
        """
        Compute aggregate centrality across all layers.
        
        Methods:
        - "aggregate": Weighted sum of layer centralities
        - "max": Maximum centrality across layers
        - "harmonic": Harmonic mean of layer centralities
        """
        if weights is None:
            weights = {layer: 1.0 for layer in self.layers}
        
        # Normalize weights
        total_weight = sum(weights.values())
        weights = {k: v / total_weight for k, v in weights.items()}
        
        centralities: Dict[str, float] = {node: 0.0 for node in self.all_nodes}
        
        if method == "aggregate":
            for layer_name, G in self.layers.items():
                layer_centrality = nx.degree_centrality(G)
                for node, cent in layer_centrality.items():
                    centralities[node] += weights.get(layer_name, 0) * cent
        
        elif method == "max":
            for node in self.all_nodes:
                max_cent = 0.0
                for G in self.layers.values():
                    if node in G.nodes():
                        cent = G.degree(node) / (len(G.nodes()) - 1) if len(G.nodes()) > 1 else 0
                        max_cent = max(max_cent, cent)
                centralities[node] = max_cent
        
        elif method == "harmonic":
            for node in self.all_nodes:
                layer_cents = []
                for G in self.layers.values():
                    if node in G.nodes() and len(G.nodes()) > 1:
                        cent = G.degree(node) / (len(G.nodes()) - 1)
                        if cent > 0:
                            layer_cents.append(cent)
                
                if layer_cents:
                    centralities[node] = len(layer_cents) / sum(1 / c for c in layer_cents)
                else:
                    centralities[node] = 0.0
        
        return centralities
    
    def compute_multiplex_pagerank(
        self,
        inter_layer_weight: float = 0.5,
        damping: float = 0.85,
        max_iter: int = 100,
        tol: float = 1e-6
    ) -> Dict[str, float]:
        """
        Compute PageRank across the multiplex network.
        
        Extends standard PageRank to handle multiple layers with
        inter-layer transitions.
        """
        nodes = sorted(self.all_nodes)
        n = len(nodes)
        L = len(self.layers)
        
        if n == 0:
            return {}
        
        node_idx = {node: i for i, node in enumerate(nodes)}
        
        # Build supra-adjacency matrix
        # Dimension: (n * L) x (n * L)
        supra_size = n * L
        supra_A = sparse.lil_matrix((supra_size, supra_size))
        
        for layer_idx, (layer_name, G) in enumerate(self.layers.items()):
            offset = layer_idx * n
            
            # Intra-layer edges
            for u, v in G.edges():
                if u in node_idx and v in node_idx:
                    i = offset + node_idx[u]
                    j = offset + node_idx[v]
                    supra_A[i, j] = 1
                    supra_A[j, i] = 1
            
            # Inter-layer edges (connect same node across layers)
            for other_idx in range(L):
                if other_idx != layer_idx:
                    other_offset = other_idx * n
                    for node in nodes:
                        if node in G.nodes():
                            i = offset + node_idx[node]
                            j = other_offset + node_idx[node]
                            supra_A[i, j] = inter_layer_weight
        
        # Convert to CSR for efficient computation
        supra_A = supra_A.tocsr()
        
        # Normalize rows to create transition matrix
        row_sums = np.array(supra_A.sum(axis=1)).flatten()
        row_sums[row_sums == 0] = 1  # Avoid division by zero
        
        # Create diagonal matrix of inverse row sums
        D_inv = sparse.diags(1.0 / row_sums)
        P = D_inv @ supra_A
        
        # Power iteration for PageRank
        pr = np.ones(supra_size) / supra_size
        
        for _ in range(max_iter):
            pr_new = damping * (P.T @ pr) + (1 - damping) / supra_size
            
            if np.linalg.norm(pr_new - pr, 1) < tol:
                break
            
            pr = pr_new
        
        # Aggregate PageRank across layers
        result: Dict[str, float] = {node: 0.0 for node in nodes}
        for layer_idx in range(L):
            offset = layer_idx * n
            for node, idx in node_idx.items():
                result[node] += pr[offset + idx]
        
        # Normalize
        total = sum(result.values())
        if total > 0:
            result = {k: v / total for k, v in result.items()}
        
        return result
    
    def compute_node_analysis(self, node: str) -> MultiplexCentralityResult:
        """
        Comprehensive centrality analysis for a single node.
        """
        layer_centralities: Dict[str, float] = {}
        
        for layer_name, G in self.layers.items():
            if node in G.nodes():
                degree = G.degree(node) / (len(G.nodes()) - 1) if len(G.nodes()) > 1 else 0
                layer_centralities[layer_name] = degree
            else:
                layer_centralities[layer_name] = 0.0
        
        aggregate = sum(layer_centralities.values()) / len(layer_centralities) if layer_centralities else 0.0
        
        return MultiplexCentralityResult(
            node_id=node,
            layer_centralities=layer_centralities,
            aggregate_centrality=aggregate,
            versatility=self.compute_versatility(node),
            participation_coefficient=self.compute_participation_coefficient(node)
        )
    
    def find_versatile_nodes(self, min_layers: int = 3) -> List[str]:
        """
        Find nodes that participate in at least min_layers.
        """
        versatile = []
        
        for node in self.all_nodes:
            layers_count = sum(1 for G in self.layers.values() if node in G.nodes())
            if layers_count >= min_layers:
                versatile.append(node)
        
        return versatile
    
    def compute_layer_correlation(self) -> np.ndarray:
        """
        Compute correlation matrix between layer centralities.
        
        Shows how similar centrality rankings are across layers.
        """
        nodes = sorted(self.all_nodes)
        L = len(self.layers)
        
        # Build centrality matrix: nodes x layers
        centrality_matrix = np.zeros((len(nodes), L))
        
        for layer_idx, (layer_name, G) in enumerate(self.layers.items()):
            centrality = nx.degree_centrality(G)
            for node_idx, node in enumerate(nodes):
                centrality_matrix[node_idx, layer_idx] = centrality.get(node, 0)
        
        # Compute correlation between layers
        if centrality_matrix.shape[0] > 1:
            correlation = np.corrcoef(centrality_matrix.T)
        else:
            correlation = np.eye(L)
        
        return correlation
