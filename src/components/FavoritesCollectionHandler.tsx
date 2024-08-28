import { useStore } from '@nanostores/react';
import type { WritableAtom } from 'nanostores';
import { useEffect, useState } from 'react';

import type { FavoritesCollection, FavoritesCollectionEntry } from '../content/config';
import { selectedFavoriteType, selectedYear } from '../functionalityStore';
import ImageHandler from './ImageHandler';
import './styles.css';

export interface FavoritesCollectionHandlerProps {
  favoritesCollection: FavoritesCollection;
}

const FavoritesCollectionHandler: React.FC<FavoritesCollectionHandlerProps> = ({ favoritesCollection }) => {
  const [filteredCollection, setFilteredCollection] = useState<FavoritesCollection>([]);

  const $selectedFavoriteType = useStore(selectedFavoriteType);
  const $selectedYear = useStore(selectedYear);

  useEffect(() => {
    // TODO: Fix the filter, currently not working
    let filtered = favoritesCollection;

    if ($selectedFavoriteType && $selectedYear) {
      filtered = filtered.filter(
        (favoriteEntry) =>
          favoriteEntry.data.favoriteType === $selectedFavoriteType &&
          favoriteEntry.data.year.toString() === $selectedYear
      );
    } else if ($selectedFavoriteType) {
      filtered = filtered.filter((favoriteEntry) => favoriteEntry.data.favoriteType === $selectedFavoriteType);
    } else if ($selectedYear) {
      // TODO: UPDATE THIS so we're not having to change the type
      filtered = filtered.filter((favoriteEntry) => favoriteEntry.data.year.toString() === $selectedYear);
    }

    setFilteredCollection(filtered);
  }, [favoritesCollection, $selectedFavoriteType, $selectedYear]);

  return (
    <div className="grid">
      {filteredCollection.map((favoriteEntry: FavoritesCollectionEntry, index: number) => (
        <ImageHandler
          className="image"
          key={index}
          title={favoriteEntry.data.title}
          imageId={favoriteEntry.data.imageId}
        />
      ))}
    </div>
  );
};

export default FavoritesCollectionHandler;
