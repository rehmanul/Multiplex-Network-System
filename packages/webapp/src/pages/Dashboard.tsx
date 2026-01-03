/**
 * Multiplex Network - Dashboard Page
 */

import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '../components/MetricCard';
import { AlertPanel } from '../components/AlertPanel';
import { api } from '../lib/api';

export function Dashboard() {
    const { data: metrics, isLoading } = useQuery({
        queryKey: ['metrics'],
        queryFn: () => api.getMetrics(),
    });

    const { data: stability } = useQuery({
        queryKey: ['meta-stability'],
        queryFn: () => api.getMetaStability(),
    });

    const { data: frustration } = useQuery({
        queryKey: ['frustration', 'COALITION'],
        queryFn: () => api.getFrustration('COALITION'),
    });

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>Multiplex Network Dashboard</h1>
                <p>Real-time monitoring of political-institutional network dynamics</p>
            </header>

            <div className="metrics-grid">
                <MetricCard
                    title="Total Nodes"
                    value={metrics?.nodes ?? 0}
                    icon="nodes"
                    loading={isLoading}
                />
                <MetricCard
                    title="Total Triangles"
                    value={metrics?.triangles ?? 0}
                    icon="triangles"
                    loading={isLoading}
                />
                <MetricCard
                    title="Frustrated Triangles"
                    value={metrics?.frustratedTriangles ?? 0}
                    icon="warning"
                    variant={metrics?.frustrationRatio > 0.3 ? 'danger' : 'normal'}
                    loading={isLoading}
                />
                <MetricCard
                    title="Frustration Index"
                    value={frustration?.frustrationIndex ?? 0}
                    icon="balance"
                    loading={!frustration}
                />
                <MetricCard
                    title="Meta-Stability"
                    value={`${((stability?.metaStability ?? 0) * 100).toFixed(1)}%`}
                    icon="stability"
                    variant={stability?.metaStability > 0.7 ? 'warning' : 'normal'}
                    description={stability?.interpretation}
                    loading={!stability}
                />
                <MetricCard
                    title="Balance Ratio"
                    value={`${((frustration?.balanceRatio ?? 0) * 100).toFixed(1)}%`}
                    icon="check"
                    variant={frustration?.isBalanced ? 'success' : 'normal'}
                    loading={!frustration}
                />
            </div>

            <div className="dashboard-panels">
                <div className="panel">
                    <h2>Network Layers</h2>
                    <div className="layer-list">
                        {['CAPABILITY', 'ISSUE_SURFACE', 'POLICY_AREA', 'JURISDICTION', 'PROCEDURAL', 'COALITION', 'INFORMATION_FLOW'].map((layer) => (
                            <div key={layer} className="layer-item">
                                <span className="layer-name">{layer.replace(/_/g, ' ')}</span>
                                <span className="layer-status active">Active</span>
                            </div>
                        ))}
                    </div>
                </div>

                <AlertPanel />
            </div>
        </div>
    );
}
