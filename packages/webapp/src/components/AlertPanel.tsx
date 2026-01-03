/**
 * Multiplex Network - Alert Panel Component
 */

export function AlertPanel() {
    // In production, this would fetch from an alerts API
    const alerts = [
        {
            type: 'warning',
            title: 'High Coalition Frustration',
            message: 'Coalition layer frustration index exceeds threshold (>30% frustrated triangles)',
        },
        {
            type: 'info',
            title: 'Data Sync Complete',
            message: 'Latest Congress.gov data synchronized successfully',
        },
    ];

    return (
        <div className="panel alert-panel">
            <h2>System Alerts</h2>

            {alerts.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No active alerts</p>
            ) : (
                <div>
                    {alerts.map((alert, index) => (
                        <div key={index} className={`alert-item ${alert.type}`}>
                            <div className="alert-content">
                                <h4>{alert.title}</h4>
                                <p>{alert.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
