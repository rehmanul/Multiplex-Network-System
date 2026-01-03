"""
Multiplex Network Analytics - Advanced Institutional Metrics

Implements advanced analysis metrics for institutional networks:
- Constraint dominance analysis
- Latent subgraph activation
- Legibility loss measurement
- Path dependence detection
- Equifinality analysis
- Temporal misalignment
- Meta-stability computation
- Endogenous risk creation
- Structural optionality
- Information asymmetry
"""

from dataclasses import dataclass
from typing import Dict, List, Set, Tuple, Optional
import networkx as nx
import numpy as np
from scipy.stats import entropy


@dataclass
class ConstraintDominanceResult:
    """Results from constraint dominance analysis."""
    dominant_constraints: List[str]
    dominance_scores: Dict[str, float]
    constraint_hierarchy: List[Tuple[str, str]]  # (dominant, subordinate) pairs
    switch_likelihood: float  # Probability of dominance switch


@dataclass
class LatentSubgraphResult:
    """Results from latent subgraph activation analysis."""
    latent_subgraphs: List[Set[str]]
    activation_thresholds: Dict[str, float]
    trigger_nodes: List[str]
    activation_cascades: List[List[str]]


@dataclass
class PathDependenceResult:
    """Results from path dependence analysis."""
    path_dependent_nodes: List[str]
    critical_junctions: List[str]
    alternative_histories: int
    lock_in_score: float


@dataclass
class InformationAsymmetryResult:
    """Results from information asymmetry analysis."""
    asymmetric_pairs: List[Tuple[str, str, float]]
    information_hubs: List[str]
    information_periphery: List[str]
    gini_coefficient: float


class AdvancedInstitutionalMetrics:
    """
    Computes advanced institutional network metrics.
    """
    
    def __init__(self, graph: nx.DiGraph, layers: Optional[Dict[str, nx.Graph]] = None):
        """
        Initialize with a directed graph and optional layer structure.
        """
        self.graph = graph
        self.layers = layers or {}
    
    def analyze_constraint_dominance(
        self,
        constraint_nodes: List[str]
    ) -> ConstraintDominanceResult:
        """
        Analyze which constraints dominate decision-making paths.
        
        Constraint dominance measures how often a constraint node
        lies on paths between decision nodes and outcome nodes.
        """
        dominance_scores: Dict[str, float] = {c: 0.0 for c in constraint_nodes}
        
        # Find all decision nodes (high out-degree) and outcome nodes (high in-degree)
        decision_nodes = [n for n in self.graph.nodes() 
                        if self.graph.out_degree(n) > self.graph.in_degree(n)]
        outcome_nodes = [n for n in self.graph.nodes() 
                        if self.graph.in_degree(n) > self.graph.out_degree(n)]
        
        # Count constraint appearances on paths
        path_count = 0
        for decision in decision_nodes[:50]:  # Limit for performance
            for outcome in outcome_nodes[:50]:
                try:
                    paths = list(nx.all_simple_paths(
                        self.graph, decision, outcome, cutoff=5
                    ))
                    for path in paths:
                        path_count += 1
                        for constraint in constraint_nodes:
                            if constraint in path:
                                dominance_scores[constraint] += 1
                except nx.NetworkXNoPath:
                    continue
        
        # Normalize scores
        if path_count > 0:
            dominance_scores = {k: v / path_count for k, v in dominance_scores.items()}
        
        # Build constraint hierarchy
        hierarchy = []
        sorted_constraints = sorted(dominance_scores.items(), key=lambda x: -x[1])
        for i, (c1, s1) in enumerate(sorted_constraints[:-1]):
            c2, s2 = sorted_constraints[i + 1]
            if s1 > s2:
                hierarchy.append((c1, c2))
        
        # Dominant constraints (top 20%)
        threshold = np.percentile(list(dominance_scores.values()), 80)
        dominant = [c for c, s in dominance_scores.items() if s >= threshold]
        
        # Switch likelihood based on score distribution
        scores = list(dominance_scores.values())
        if len(scores) > 1 and max(scores) > 0:
            switch_likelihood = 1 - (max(scores) - np.median(scores)) / max(scores)
        else:
            switch_likelihood = 0.0
        
        return ConstraintDominanceResult(
            dominant_constraints=dominant,
            dominance_scores=dominance_scores,
            constraint_hierarchy=hierarchy,
            switch_likelihood=max(0, min(1, switch_likelihood))
        )
    
    def detect_latent_subgraphs(
        self,
        activation_threshold: float = 0.5
    ) -> LatentSubgraphResult:
        """
        Detect latent (inactive) subgraphs that could activate
        under certain conditions.
        
        A latent subgraph is a cluster of nodes with weak connections
        to the main graph that could strengthen under stimulus.
        """
        # Find weakly connected components
        if self.graph.is_directed():
            components = list(nx.weakly_connected_components(self.graph))
        else:
            components = list(nx.connected_components(self.graph))
        
        main_component = max(components, key=len) if components else set()
        latent_subgraphs = [c for c in components if c != main_component and len(c) > 2]
        
        # Find trigger nodes (boundary nodes that could activate subgraphs)
        trigger_nodes = []
        for subgraph in latent_subgraphs:
            for node in subgraph:
                neighbors = set(self.graph.predecessors(node)) | set(self.graph.successors(node))
                if neighbors & main_component:
                    trigger_nodes.append(node)
        
        # Activation thresholds based on edge weights
        thresholds: Dict[str, float] = {}
        for subgraph in latent_subgraphs:
            subgraph_id = str(list(subgraph)[0])
            edges_to_main = []
            for node in subgraph:
                for pred in self.graph.predecessors(node):
                    if pred in main_component:
                        weight = self.graph[pred][node].get('weight', 1.0)
                        edges_to_main.append(weight)
            
            if edges_to_main:
                thresholds[subgraph_id] = 1 - np.mean(edges_to_main)
            else:
                thresholds[subgraph_id] = 1.0
        
        # Simulate activation cascades
        cascades = []
        for trigger in trigger_nodes[:5]:
            cascade = self._simulate_cascade(trigger, activation_threshold)
            if len(cascade) > 1:
                cascades.append(cascade)
        
        return LatentSubgraphResult(
            latent_subgraphs=latent_subgraphs,
            activation_thresholds=thresholds,
            trigger_nodes=trigger_nodes,
            activation_cascades=cascades
        )
    
    def _simulate_cascade(
        self,
        start_node: str,
        threshold: float,
        max_steps: int = 10
    ) -> List[str]:
        """Simulate activation cascade from a starting node."""
        activated = [start_node]
        current = {start_node}
        
        for _ in range(max_steps):
            next_wave = set()
            for node in current:
                for successor in self.graph.successors(node):
                    if successor not in activated:
                        # Check if activation threshold met
                        active_predecessors = sum(
                            1 for p in self.graph.predecessors(successor) if p in activated
                        )
                        all_predecessors = self.graph.in_degree(successor)
                        
                        if all_predecessors > 0 and active_predecessors / all_predecessors >= threshold:
                            next_wave.add(successor)
            
            if not next_wave:
                break
            
            activated.extend(next_wave)
            current = next_wave
        
        return activated
    
    def analyze_path_dependence(self) -> PathDependenceResult:
        """
        Analyze path dependence in the network structure.
        
        Identifies nodes where historical path choices lock in
        future outcomes.
        """
        # Find critical junctions (nodes with multiple outgoing paths)
        critical_junctions = [
            n for n in self.graph.nodes()
            if self.graph.out_degree(n) >= 2
        ]
        
        # Path-dependent nodes: nodes reachable through only one junction
        path_dependent: Dict[str, Set[str]] = {}
        
        for junction in critical_junctions:
            successors = list(self.graph.successors(junction))
            for succ in successors:
                reachable = nx.descendants(self.graph, succ)
                for node in reachable:
                    if node not in path_dependent:
                        path_dependent[node] = set()
                    path_dependent[node].add(junction)
        
        # Nodes dependent on single junction
        single_path_dependent = [
            n for n, junctions in path_dependent.items()
            if len(junctions) == 1
        ]
        
        # Count alternative histories
        alternative_histories = 0
        for junction in critical_junctions[:10]:
            paths_from_junction = list(nx.single_source_shortest_path(
                self.graph, junction, cutoff=3
            ))
            alternative_histories += max(0, len(paths_from_junction) - 1)
        
        # Lock-in score: fraction of nodes with single-path dependency
        lock_in = len(single_path_dependent) / len(self.graph.nodes()) if self.graph.nodes() else 0
        
        return PathDependenceResult(
            path_dependent_nodes=single_path_dependent,
            critical_junctions=critical_junctions,
            alternative_histories=alternative_histories,
            lock_in_score=lock_in
        )
    
    def measure_information_asymmetry(self) -> InformationAsymmetryResult:
        """
        Measure information asymmetry in the network.
        
        Information asymmetry exists when some nodes have much better
        access to network information than others.
        """
        # Compute information access via closeness centrality
        if self.graph.is_directed():
            # Use both in and out closeness
            in_closeness = nx.closeness_centrality(self.graph.reverse())
            out_closeness = nx.closeness_centrality(self.graph)
            
            access_scores = {
                n: (in_closeness.get(n, 0) + out_closeness.get(n, 0)) / 2
                for n in self.graph.nodes()
            }
        else:
            access_scores = nx.closeness_centrality(self.graph)
        
        # Find asymmetric pairs
        asymmetric_pairs = []
        nodes = list(self.graph.nodes())
        
        for i, n1 in enumerate(nodes[:100]):
            for n2 in nodes[i+1:100]:
                score_diff = abs(access_scores.get(n1, 0) - access_scores.get(n2, 0))
                if score_diff > 0.3:  # Significant asymmetry
                    asymmetric_pairs.append((n1, n2, score_diff))
        
        # Sort by asymmetry
        asymmetric_pairs.sort(key=lambda x: -x[2])
        
        # Information hubs (top 10%)
        threshold = np.percentile(list(access_scores.values()), 90) if access_scores else 0
        hubs = [n for n, s in access_scores.items() if s >= threshold]
        
        # Information periphery (bottom 10%)
        periphery_threshold = np.percentile(list(access_scores.values()), 10) if access_scores else 0
        periphery = [n for n, s in access_scores.items() if s <= periphery_threshold]
        
        # Gini coefficient of information access
        scores = sorted(access_scores.values())
        n = len(scores)
        if n > 0 and sum(scores) > 0:
            numerator = sum((2 * i - n + 1) * s for i, s in enumerate(scores))
            gini = numerator / (n * sum(scores))
        else:
            gini = 0.0
        
        return InformationAsymmetryResult(
            asymmetric_pairs=asymmetric_pairs[:50],
            information_hubs=hubs,
            information_periphery=periphery,
            gini_coefficient=max(0, min(1, gini))
        )
    
    def compute_meta_stability(self) -> float:
        """
        Compute meta-stability of the network configuration.
        
        Meta-stability measures how likely the current configuration
        is to persist vs. transition to a different stable state.
        
        Higher values indicate more meta-stable (less stable) configurations.
        """
        # Based on network entropy and degree distribution
        degrees = [d for n, d in self.graph.degree()]
        if not degrees:
            return 0.0
        
        # Degree distribution entropy
        degree_dist = np.bincount(degrees) / len(degrees)
        degree_dist = degree_dist[degree_dist > 0]
        degree_entropy = entropy(degree_dist)
        
        # Clustering variability
        try:
            clustering = list(nx.clustering(self.graph).values())
            clustering_std = np.std(clustering) if clustering else 0
        except:
            clustering_std = 0
        
        # Combine into meta-stability score
        max_entropy = np.log(len(self.graph.nodes())) if self.graph.nodes() else 1
        normalized_entropy = degree_entropy / max_entropy if max_entropy > 0 else 0
        
        meta_stability = (normalized_entropy + clustering_std) / 2
        
        return max(0, min(1, meta_stability))
    
    def analyze_structural_optionality(self) -> Dict[str, float]:
        """
        Compute structural optionality for each node.
        
        Optionality measures how many alternative paths/outcomes
        are available from a node, weighted by their viability.
        """
        optionality: Dict[str, float] = {}
        
        for node in self.graph.nodes():
            # Count reachable nodes at different depths
            reachable_1 = len(list(self.graph.successors(node)))
            reachable_2 = len(list(nx.descendants_at_distance(self.graph, node, 2)))
            reachable_3 = len(list(nx.descendants_at_distance(self.graph, node, 3)))
            
            # Weight by depth (closer options are more valuable)
            total = self.graph.number_of_nodes() - 1
            if total > 0:
                optionality[node] = (
                    3 * reachable_1 + 2 * reachable_2 + reachable_3
                ) / (6 * total)
            else:
                optionality[node] = 0.0
        
        return optionality
    
    def detect_endogenous_risk(self) -> Dict[str, float]:
        """
        Detect endogenous risk creation in the network.
        
        Endogenous risk arises from network structure itself,
        particularly from cycles and feedback loops.
        """
        risk_scores: Dict[str, float] = {}
        
        # Find cycles
        try:
            cycles = list(nx.simple_cycles(self.graph))
        except:
            cycles = []
        
        # Nodes in more cycles have higher endogenous risk
        cycle_participation: Dict[str, int] = {}
        for cycle in cycles[:1000]:  # Limit for performance
            for node in cycle:
                cycle_participation[node] = cycle_participation.get(node, 0) + 1
        
        max_participation = max(cycle_participation.values()) if cycle_participation else 1
        
        for node in self.graph.nodes():
            participation = cycle_participation.get(node, 0)
            
            # Also consider in-degree (concentrated risk)
            in_degree = self.graph.in_degree(node)
            max_in = max(d for n, d in self.graph.in_degree()) if self.graph.nodes() else 1
            
            risk_scores[node] = (
                0.7 * (participation / max_participation) +
                0.3 * (in_degree / max_in)
            )
        
        return risk_scores
