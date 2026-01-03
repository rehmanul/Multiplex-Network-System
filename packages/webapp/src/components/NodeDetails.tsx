/**
 * Multiplex Network - Node Details Component
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Node {
    id: string;
    type: string;
    name: string;
    description?: string;
    metadata?: Record<string, unknown>;
}

interface NodeDetailsProps {
    node: Node;
    onClose: () => void;
}

export function NodeDetails({ node, onClose }: NodeDetailsProps) {
    const { data: centrality } = useQuery({
        queryKey: ['node-centrality', node.id],
        queryFn: () => api.getNodeCentrality(node.id),
    });

    return (
        <div className="node-details">
            <div className="node-details-header">
                <h3>{node.name}</h3>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="node-details-content">
                <div className="detail-row">
                    <span className="detail-label">Type</span>
                    <span className="detail-value">{node.type.replace(/_/g, ' ')}</span>
                </div>

                <div className="detail-row">
                    <span className="detail-label">ID</span>
                    <span className="detail-value" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                        {node.id}
                    </span>
                </div>

                {node.description && (
                    <div className="detail-row">
                        <span className="detail-label">Description</span>
                        <span className="detail-value">{node.description}</span>
                    </div>
                )}

                {centrality && (
                    <>
                        <div className="detail-section">
                            <h4>Centrality Metrics</h4>
                            <div className="detail-row">
                                <span className="detail-label">Aggregate</span>
                                <span className="detail-value">
                                    {((centrality as { data: { aggregate_centrality: number } }).data.aggregate_centrality * 100).toFixed(2)}%
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Versatility</span>
                                <span className="detail-value">
                                    {((centrality as { data: { versatility: number } }).data.versatility * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Participation</span>
                                <span className="detail-value">
                                    {((centrality as { data: { participation_coefficient: number } }).data.participation_coefficient * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
        .node-details {
          margin-top: 16px;
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        
        .node-details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--color-bg-tertiary);
        }
        
        .node-details-header h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
        }
        
        .close-btn {
          background: none;
          border: none;
          color: var(--color-text-muted);
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        
        .close-btn:hover {
          color: var(--color-text-primary);
        }
        
        .node-details-content {
          padding: 16px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-bg-tertiary);
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-size: 12px;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .detail-value {
          font-size: 13px;
          color: var(--color-text-primary);
          text-align: right;
          max-width: 60%;
        }
        
        .detail-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--color-bg-tertiary);
        }
        
        .detail-section h4 {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
        </div>
    );
}
