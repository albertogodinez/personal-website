import { useStore } from '@nanostores/react';
import { $cameraChunk, $cameraPosition, $cardsRendered, $activeChunks, $debugMode } from './stores';

/**
 * Performance stats overlay for the moodboard canvas.
 * Displays:
 * - Cards rendered per frame
 * - Active chunks count
 * - Camera position
 * - Camera chunk coordinates
 */
export default function PerformanceStats() {
  const cameraPosition = useStore($cameraPosition);
  const cameraChunk = useStore($cameraChunk);
  const cardsRendered = useStore($cardsRendered);
  const activeChunks = useStore($activeChunks);
  const debugMode = useStore($debugMode);

  if (!debugMode) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.6',
        pointerEvents: 'none',
        zIndex: 100,
        minWidth: '220px',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        Performance Stats
      </div>
      <div>Cards: {cardsRendered}</div>
      <div>Chunks: {activeChunks}</div>
      <div>
        Camera: ({cameraPosition.x.toFixed(1)}, {cameraPosition.y.toFixed(1)},{' '}
        {cameraPosition.z.toFixed(1)})
      </div>
      <div>
        Chunk: ({cameraChunk.cx}, {cameraChunk.cy}, {cameraChunk.cz})
      </div>
    </div>
  );
}
