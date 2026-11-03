import { useStore } from '@nanostores/react';
import { $mode } from './stores';

export default function ModeSwitch() {
  const mode = useStore($mode);

  return (
    <div className="glass-ui">
      <button
        type="button"
        className={mode === 'infinite' ? 'active' : ''}
        onClick={() => $mode.set('infinite')}
      >
        infinite
      </button>
      <button
        type="button"
        className={mode === 'clustered' ? 'active' : ''}
        onClick={() => $mode.set('clustered')}
      >
        clustered
      </button>
      <button
        type="button"
        className={mode === 'timeline' ? 'active' : ''}
        onClick={() => $mode.set('timeline')}
      >
        timeline
      </button>
    </div>
  );
}
