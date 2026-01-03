/**
 * Multiplex Network - Path Finder Page
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

type NetworkLayer = 'CAPABILITY' | 'ISSUE_SURFACE' | 'POLICY_AREA' | 'JURISDICTION' | 'PROCEDURAL' | 'COALITION' | 'INFORMATION_FLOW';

export function PathFinder() {
    const [fromNode, setFromNode] = useState('');
    const [toNode, setToNode] = useState('');
    const [layer, setLayer] = useState<NetworkLayer | ''>('');
    const [searching, setSearching] = useState(false);

    const { data: paths, refetch } = useQuery({
        queryKey: ['paths', fromNode, toNode, layer],
        queryFn: () => api.findPaths(fromNode, toNode, {
            layer: layer as NetworkLayer | undefined
        }),
        enabled: false,
    });

    const handleSearch = async () => {
        if (!fromNode || !toNode) return;
        setSearching(true);
        await refetch();
        setSearching(false);
    };

    return (
        <div className="path-finder-page">
            <header className="page-header">
                <h1>Path Finder</h1>
                <p>Discover paths between nodes across network layers</p>
            </header>

            <div className="search-form">
                <div className="form-row">
                    <div className="form-group">
                        <label>From Node ID</label>
                        <input
                            type="text"
                            value={fromNode}
                            onChange={(e) => setFromNode(e.target.value)}
                            placeholder="Enter source node ID"
                        />
                    </div>

                    <div className="form-group">
                        <label>To Node ID</label>
                        <input
                            type="text"
                            value={toNode}
                            onChange={(e) => setToNode(e.target.value)}
                            placeholder="Enter target node ID"
                        />
                    </div>

                    <div className="form-group">
                        <label>Layer (optional)</label>
                        <select value={layer} onChange={(e) => setLayer(e.target.value as NetworkLayer | '')}>
                            <option value="">All Layers</option>
                            <option value="CAPABILITY">Capability</option>
                            <option value="COALITION">Coalition</option>
                            <option value="JURISDICTION">Jurisdiction</option>
                            <option value="INFORMATION_FLOW">Information Flow</option>
                        </select>
                    </div>

                    <button className="btn btn-primary" onClick={handleSearch} disabled={searching}>
                        {searching ? 'Searching...' : 'Find Paths'}
                    </button>
                </div>
            </div>

            {paths && (
                <div className="results">
                    <h2>Found {(paths as { data: unknown[] }).data.length} path(s)</h2>
                    <div className="paths-list">
                        {(paths as { data: { nodes: string[] }[] }).data.map((path, index) => (
                            <div key={index} className="path-item">
                                <span className="path-number">Path {index + 1}</span>
                                <div className="path-nodes">
                                    {path.nodes.map((nodeId: string, i: number) => (
                                        <span key={i}>
                                            <span className="node-chip">{nodeId.slice(0, 12)}...</span>
                                            {i < path.nodes.length - 1 && <span className="arrow">→</span>}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
        .path-finder-page {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .page-header {
          margin-bottom: 32px;
        }
        
        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .page-header p {
          color: var(--color-text-secondary);
        }
        
        .search-form {
          background: var(--gradient-surface);
          border: 1px solid var(--color-bg-tertiary);
          border-radius: var(--radius-lg);
          padding: 24px;
          margin-bottom: 24px;
        }
        
        .form-row {
          display: flex;
          gap: 16px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        
        .form-group {
          flex: 1;
          min-width: 200px;
        }
        
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-bottom: 8px;
        }
        
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 14px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-size: 14px;
        }
        
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--color-accent);
        }
        
        .results {
          background: var(--gradient-surface);
          border: 1px solid var(--color-bg-tertiary);
          border-radius: var(--radius-lg);
          padding: 24px;
        }
        
        .results h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .paths-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .path-item {
          padding: 16px;
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
        }
        
        .path-number {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-accent);
          margin-bottom: 8px;
        }
        
        .path-nodes {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        
        .node-chip {
          padding: 4px 8px;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-sm);
          font-family: monospace;
          font-size: 12px;
        }
        
        .arrow {
          color: var(--color-text-muted);
          margin: 0 4px;
        }
      `}</style>
        </div>
    );
}
