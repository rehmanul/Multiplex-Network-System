/**
 * Multiplex Network - Metric Card Component
 */

import { clsx } from 'clsx';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon?: string;
    variant?: 'normal' | 'success' | 'warning' | 'danger';
    description?: string;
    loading?: boolean;
}

export function MetricCard({
    title,
    value,
    variant = 'normal',
    description,
    loading,
}: MetricCardProps) {
    return (
        <div className={clsx('metric-card', variant)}>
            <div className="metric-card-header">
                <span className="metric-card-title">{title}</span>
            </div>

            {loading ? (
                <div className="metric-card-value" style={{ color: 'var(--color-text-muted)' }}>
                    Loading...
                </div>
            ) : (
                <div className="metric-card-value">{value}</div>
            )}

            {description && (
                <p className="metric-card-description">{description}</p>
            )}
        </div>
    );
}
