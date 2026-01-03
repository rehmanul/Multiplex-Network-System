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

    const { data: nodesData, isLoading: nodesLoading } = useQuery({
        queryKey: ['nodes', 'all'],
        queryFn: () => api.getNodes('CONGRESS_MEMBER'),
    });

    const { data: edgesData, isLoading: edgesLoading } = useQuery({
        queryKey: ['edges', selectedLayer],
        queryFn: () => api.getEdges(selectedLayer),
    });

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
                {(nodesLoading || edgesLoading) ? (
                    <div className="loading">Loading network data...</div>
                ) : (
                    <NetworkVisualizer
                        nodes={nodesData?.data ?? []}
                        edges={edgesData?.data ?? []}
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
