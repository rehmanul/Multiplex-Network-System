"""
Multiplex Network Analytics - Signed Network Analysis

Implements frustration index calculation and structural balance analysis
for signed multiplex networks as defined in academic literature.
"""

from dataclasses import dataclass
from typing import Dict, List, Set, Tuple
import networkx as nx
import numpy as np
from scipy.optimize import minimize


@dataclass
class StructuralBalanceResult:
    """Results from structural balance analysis."""
    is_balanced: bool
    frustration_index: int
    frustrated_edges: List[Tuple[str, str]]
    balance_ratio: float
    positive_clusters: List[Set[str]]
    negative_clusters: List[Set[str]]


@dataclass
class TriangleAnalysis:
    """Triangle-based balance analysis."""
    total_triangles: int
    balanced_triangles: int  # 0 or 2 negative edges
    frustrated_triangles: int  # 1 or 3 negative edges
    balance_ratio: float


class SignedNetworkAnalyzer:
    """
    Analyzer for signed networks implementing frustration index
    and structural balance metrics.
    
    The frustration index is the minimum number of edges to remove
    or sign-flip to make the network structurally balanced.
    Reference: https://cs.auckland.ac.nz (signed network literature)
    """
    
    def __init__(self, graph: nx.Graph):
        """
        Initialize with a NetworkX graph where edges have a 'sign' attribute.
        sign = 1 for positive edges, sign = -1 for negative edges.
        """
        self.graph = graph
        self._validate_graph()
    
    def _validate_graph(self) -> None:
        """Ensure all edges have valid sign attributes."""
        for u, v, data in self.graph.edges(data=True):
            if 'sign' not in data:
                raise ValueError(f"Edge ({u}, {v}) missing 'sign' attribute")
            if data['sign'] not in (-1, 1):
                raise ValueError(f"Edge ({u}, {v}) has invalid sign: {data['sign']}")
    
    def compute_frustration_index(self) -> int:
        """
        Compute the frustration index of the signed network.
        
        This is the minimum number of edges that need to be removed
        or have their sign flipped to achieve structural balance.
        
        Uses an approximation algorithm based on spectral clustering
        for large graphs.
        """
        if self.graph.number_of_nodes() == 0:
            return 0
        
        if self.graph.number_of_nodes() <= 20:
            # Exact computation for small graphs
            return self._compute_frustration_exact()
        else:
            # Approximation for larger graphs
            return self._compute_frustration_approximate()
    
    def _compute_frustration_exact(self) -> int:
        """
        Exact frustration index computation via enumeration.
        Exponential complexity - only for small graphs.
        """
        nodes = list(self.graph.nodes())
        n = len(nodes)
        min_frustration = float('inf')
        
        # Try all possible bipartitions
        for mask in range(2 ** n):
            partition = [nodes[i] for i in range(n) if mask & (1 << i)]
            frustration = self._count_frustrated_edges(set(partition))
            min_frustration = min(min_frustration, frustration)
        
        return int(min_frustration)
    
    def _count_frustrated_edges(self, partition: Set[str]) -> int:
        """
        Count frustrated edges given a bipartition.
        
        An edge is frustrated if:
        - It's positive and crosses the partition (different groups)
        - It's negative and doesn't cross (same group)
        """
        frustrated = 0
        
        for u, v, data in self.graph.edges(data=True):
            sign = data['sign']
            same_partition = (u in partition) == (v in partition)
            
            if sign == 1 and not same_partition:
                # Positive edge crosses partition
                frustrated += 1
            elif sign == -1 and same_partition:
                # Negative edge within same partition
                frustrated += 1
        
        return frustrated
    
    def _compute_frustration_approximate(self) -> int:
        """
        Approximate frustration index using spectral methods.
        
        Uses the signed Laplacian to find an approximate optimal partition.
        """
        nodes = list(self.graph.nodes())
        n = len(nodes)
        node_idx = {node: i for i, node in enumerate(nodes)}
        
        # Build signed adjacency matrix
        A = np.zeros((n, n))
        for u, v, data in self.graph.edges(data=True):
            i, j = node_idx[u], node_idx[v]
            A[i, j] = data['sign']
            A[j, i] = data['sign']
        
        # Signed Laplacian: L = D - A where D_ii = sum(|A_ij|)
        D = np.diag(np.abs(A).sum(axis=1))
        L = D - A
        
        # Find Fiedler vector (eigenvector of second smallest eigenvalue)
        eigenvalues, eigenvectors = np.linalg.eigh(L)
        
        # Use sign of Fiedler vector for partition
        fiedler = eigenvectors[:, 1]
        partition = set(nodes[i] for i in range(n) if fiedler[i] >= 0)
        
        return self._count_frustrated_edges(partition)
    
    def analyze_triangles(self) -> TriangleAnalysis:
        """
        Analyze structural balance through triangle enumeration.
        
        A triangle is balanced if it has 0 or 2 negative edges.
        A triangle is frustrated if it has 1 or 3 negative edges.
        """
        triangles = []
        
        for node in self.graph.nodes():
            neighbors = list(self.graph.neighbors(node))
            for i, n1 in enumerate(neighbors):
                for n2 in neighbors[i+1:]:
                    if self.graph.has_edge(n1, n2):
                        # Found a triangle
                        edges_signs = [
                            self.graph[node][n1]['sign'],
                            self.graph[node][n2]['sign'],
                            self.graph[n1][n2]['sign']
                        ]
                        triangles.append(edges_signs)
        
        # Each triangle counted 3 times (once per vertex)
        total = len(triangles) // 3
        
        frustrated_count = 0
        for signs in triangles:
            neg_count = sum(1 for s in signs if s == -1)
            if neg_count in (1, 3):
                frustrated_count += 1
        
        frustrated = frustrated_count // 3
        balanced = total - frustrated
        
        return TriangleAnalysis(
            total_triangles=total,
            balanced_triangles=balanced,
            frustrated_triangles=frustrated,
            balance_ratio=balanced / total if total > 0 else 1.0
        )
    
    def find_frustrated_edges(self) -> List[Tuple[str, str]]:
        """
        Identify the specific edges that cause frustration.
        
        Returns the edges that, if removed or flipped, would
        improve structural balance.
        """
        nodes = list(self.graph.nodes())
        n = len(nodes)
        node_idx = {node: i for i, node in enumerate(nodes)}
        
        # Use spectral partition
        A = np.zeros((n, n))
        for u, v, data in self.graph.edges(data=True):
            i, j = node_idx[u], node_idx[v]
            A[i, j] = data['sign']
            A[j, i] = data['sign']
        
        D = np.diag(np.abs(A).sum(axis=1))
        L = D - A
        
        eigenvalues, eigenvectors = np.linalg.eigh(L)
        fiedler = eigenvectors[:, 1]
        
        partition = set(nodes[i] for i in range(n) if fiedler[i] >= 0)
        
        frustrated_edges = []
        for u, v, data in self.graph.edges(data=True):
            sign = data['sign']
            same_partition = (u in partition) == (v in partition)
            
            if (sign == 1 and not same_partition) or (sign == -1 and same_partition):
                frustrated_edges.append((u, v))
        
        return frustrated_edges
    
    def compute_structural_balance(self) -> StructuralBalanceResult:
        """
        Comprehensive structural balance analysis.
        
        Returns full analysis including frustration index,
        frustrated edges, and cluster assignments.
        """
        frustration = self.compute_frustration_index()
        frustrated_edges = self.find_frustrated_edges()
        triangle_analysis = self.analyze_triangles()
        
        # Find positive and negative clusters using spectral clustering
        nodes = list(self.graph.nodes())
        n = len(nodes)
        
        if n == 0:
            return StructuralBalanceResult(
                is_balanced=True,
                frustration_index=0,
                frustrated_edges=[],
                balance_ratio=1.0,
                positive_clusters=[],
                negative_clusters=[]
            )
        
        node_idx = {node: i for i, node in enumerate(nodes)}
        
        A = np.zeros((n, n))
        for u, v, data in self.graph.edges(data=True):
            i, j = node_idx[u], node_idx[v]
            A[i, j] = data['sign']
            A[j, i] = data['sign']
        
        D = np.diag(np.abs(A).sum(axis=1))
        L = D - A
        
        eigenvalues, eigenvectors = np.linalg.eigh(L)
        fiedler = eigenvectors[:, 1]
        
        positive_cluster = {nodes[i] for i in range(n) if fiedler[i] >= 0}
        negative_cluster = {nodes[i] for i in range(n) if fiedler[i] < 0}
        
        return StructuralBalanceResult(
            is_balanced=frustration == 0,
            frustration_index=frustration,
            frustrated_edges=frustrated_edges,
            balance_ratio=triangle_analysis.balance_ratio,
            positive_clusters=[positive_cluster] if positive_cluster else [],
            negative_clusters=[negative_cluster] if negative_cluster else []
        )


def create_signed_graph_from_edges(
    edges: List[Dict]
) -> nx.Graph:
    """
    Create a NetworkX graph from edge data.
    
    edges: List of dicts with keys 'source', 'target', 'sign'
           where sign is 'POSITIVE', 'NEGATIVE', or 1/-1
    """
    G = nx.Graph()
    
    for edge in edges:
        sign_value = edge.get('sign', 'POSITIVE')
        if isinstance(sign_value, str):
            sign = 1 if sign_value == 'POSITIVE' else -1
        else:
            sign = int(sign_value)
        
        G.add_edge(
            edge['source'],
            edge['target'],
            sign=sign,
            **{k: v for k, v in edge.items() if k not in ('source', 'target', 'sign')}
        )
    
    return G
