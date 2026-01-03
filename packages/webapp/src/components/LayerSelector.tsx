/**
 * Multiplex Network - Layer Selector Component
 */

type NetworkLayer = 'CAPABILITY' | 'ISSUE_SURFACE' | 'POLICY_AREA' | 'JURISDICTION' | 'PROCEDURAL' | 'COALITION' | 'INFORMATION_FLOW';

interface LayerSelectorProps {
    selectedLayer: NetworkLayer | undefined;
    onLayerChange: (layer: NetworkLayer | undefined) => void;
}

const LAYERS: { value: NetworkLayer; label: string; description: string }[] = [
    { value: 'CAPABILITY', label: 'Capability', description: 'Technical capabilities and failure modes' },
    { value: 'ISSUE_SURFACE', label: 'Issue Surface', description: 'Semantic issue projections' },
    { value: 'POLICY_AREA', label: 'Policy Area', description: 'Policy domain categorization' },
    { value: 'JURISDICTION', label: 'Jurisdiction', description: 'Authority allocation chains' },
    { value: 'PROCEDURAL', label: 'Procedural', description: 'Legislative vehicles and guidance' },
    { value: 'COALITION', label: 'Coalition', description: 'Ally/opponent relationships' },
    { value: 'INFORMATION_FLOW', label: 'Information Flow', description: 'Information transmission paths' },
];

export function LayerSelector({ selectedLayer, onLayerChange }: LayerSelectorProps) {
    return (
        <div className="layer-selector">
            <button
                className={`layer-btn ${!selectedLayer ? 'active' : ''}`}
                onClick={() => onLayerChange(undefined)}
            >
                All Layers
            </button>

            {LAYERS.map((layer) => (
                <button
                    key={layer.value}
                    className={`layer-btn ${selectedLayer === layer.value ? 'active' : ''}`}
                    onClick={() => onLayerChange(layer.value)}
                    title={layer.description}
                >
                    {layer.label}
                </button>
            ))}

            <style>{`
        .layer-selector {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .layer-btn {
          text-align: left;
          padding: 10px 12px;
          background: var(--color-bg-secondary);
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .layer-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-text-primary);
        }
        
        .layer-btn.active {
          background: var(--color-accent);
          color: white;
          border-color: var(--color-accent);
        }
      `}</style>
        </div>
    );
}
