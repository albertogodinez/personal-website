import { useStore } from '@nanostores/react';
import { $activeFilter, type FilterValue } from './stores';

const FILTERS: FilterValue[] = ['all', 'image', 'gif', 'video', 'link'];

export default function FilterBar() {
  const activeFilter = useStore($activeFilter);

  return (
    <div className="glass-ui">
      {FILTERS.map((filter) => (
        <button
          type="button"
          key={filter}
          className={activeFilter === filter ? 'active' : ''}
          onClick={() => $activeFilter.set(filter)}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
