/**
 * Multiplex Network - Network Explorer Page
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NetworkVisualizer } from '../components/NetworkVisualizer';
import { LayerSelector } from '../components/LayerSelector';
import { NodeDetails } from '../components/NodeDetails';
import { api } from '../lib/api';

type NetworkLayer = 'CAPABILITY' | 'ISSUE_SURFACE' | 'POLICY_AREA' | 'JURISDICTION' | 'PROCEDURAL' | 'COALITION' | 'INFORMATION_FLOW';

interface Node {
    id: string;
    type: string;
    name: string;
    layer?: string;
}

export function NetworkExplorer() {
    const [selectedLayer, setSelectedLayer] = useState<NetworkLayer | undefined>(undefined);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [showLabels, setShowLabels] = useState(true);

    // Fetch network data from analytics API
    const { data: networkData, isLoading } = useQuery({
        queryKey: ['networkData'],
        queryFn: () => api.getNetworkData(),
        staleTime: 60000, // Cache for 1 minute
    });

    // Transform data for visualizer
    const nodes = networkData?.nodes?.map(n => ({
        id: n.id,
        type: n.type || 'Unknown',
        name: n.name || n.id,
        layer: selectedLayer,
    })) ?? [];

    const edges = networkData?.edges?.filter(e =>
        !selectedLayer || e.layer === selectedLayer
    ).map(e => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: e.type || 'EDGE',
        sign: e.sign === 1 ? 'POSITIVE' as const : e.sign === -1 ? 'NEGATIVE' as const : 'NEUTRAL' as const,
        layer: e.layer || 'default',
    })) ?? [];

    const handleNodeClick = (node: Node) => {
        setSelectedNode(node);
    };

    const handleLayerChange = (layer: NetworkLayer | undefined) => {
        setSelectedLayer(layer);
        setSelectedNode(null);
    };

    return (
        <div className="network-explorer">
            <div className="explorer-sidebar">
                <div className="sidebar-section">
                    <h3>Layers</h3>
                    <LayerSelector
                        selectedLayer={selectedLayer}
                        onLayerChange={handleLayerChange}
                    />
                </div>

                <div className="sidebar-section">
                    <h3>Display Options</h3>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={showLabels}
                            onChange={(e) => setShowLabels(e.target.checked)}
                        />
                        Show Labels
                    </label>
                </div>

                <div className="sidebar-section">
                    <h3>Legend</h3>
                    <div className="legend">
                        <div className="legend-item">
                            <span className="dot" style={{ background: '#22c55e' }} />
                            <span>Positive Edge</span>
                        </div>
                        <div className="legend-item">
                            <span className="dot" style={{ background: '#ef4444' }} />
                            <span>Negative Edge</span>
                        </div>
                        <div className="legend-item">
                            <span className="dot" style={{ background: '#94a3b8' }} />
                            <span>Neutral Edge</span>
                        </div>
                    </div>
                </div>

                {selectedNode && (
                    <NodeDetails
                        node={selectedNode}
                        onClose={() => setSelectedNode(null)}
                    />
                )}
            </div>

            <div className="explorer-main">
                {isLoading ? (
                    <div className="loading">Loading network data...</div>
                ) : nodes.length === 0 ? (
                    <div className="empty-state">
                        <p>No network data available.</p>
                        <p>Use the API to ingest Congress data first.</p>
                    </div>
                ) : (
                    <NetworkVisualizer
                        nodes={nodes}
                        edges={edges}
                        selectedLayer={selectedLayer}
                        onNodeClick={handleNodeClick}
                        showLabels={showLabels}
                        width={window.innerWidth - 320}
                        height={window.innerHeight - 100}
                    />
                )}
            </div>
        </div>
    );
}
