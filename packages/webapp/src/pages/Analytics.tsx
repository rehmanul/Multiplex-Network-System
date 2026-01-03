/**
 * Multiplex Network - Analytics Page
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function Analytics() {
    const { data: centrality } = useQuery({
        queryKey: ['centrality'],
        queryFn: () => api.getCentrality('aggregate'),
    });

    const topNodes = Object.entries(centrality?.centralities ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    return (
        <div className="analytics-page">
            <header className="page-header">
                <h1>Network Analytics</h1>
                <p>Advanced metrics and structural analysis</p>
            </header>

            <div className="analytics-grid">
                <div className="panel">
                    <h2>Top Nodes by Centrality</h2>
                    <div className="centrality-list">
                        {topNodes.map(([nodeId, score], index) => (
                            <div key={nodeId} className="centrality-item">
                                <span className="rank">#{index + 1}</span>
                                <span className="node-id">{nodeId.slice(0, 20)}...</span>
                                <span className="score">{(score * 100).toFixed(2)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
        .analytics-page {
          max-width: 1600px;
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
        
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }
        
        .centrality-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .centrality-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
        }
        
        .centrality-item .rank {
          font-weight: 600;
          color: var(--color-accent);
          width: 32px;
        }
        
        .centrality-item .node-id {
          flex: 1;
          font-family: monospace;
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        
        .centrality-item .score {
          font-weight: 600;
          color: var(--color-success);
        }
      `}</style>
        </div>
    );
}
