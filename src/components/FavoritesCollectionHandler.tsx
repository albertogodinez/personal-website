import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';

import type { FavoritesCollection, FavoritesCollectionEntry } from '../content/config';
import { selectedFavoriteType, selectedYear } from '../functionalityStore';
import '../styles/utilities.css';
import Card from './card/Card';

export interface FavoritesCollectionHandlerProps {
  favoritesCollection: FavoritesCollection;
}

const FavoritesCollectionHandler: React.FC<FavoritesCollectionHandlerProps> = ({ favoritesCollection }) => {
  const [filteredCollection, setFilteredCollection] = useState<FavoritesCollection>([]);

  const $selectedFavoriteType = useStore(selectedFavoriteType);
  const $selectedYear = useStore(selectedYear);

  useEffect(() => {
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
      // chose to not change the `year` to a number in the store since the selection component requires a string
      // changing it to a number would've overcomplicated the component, so rather than changing the store, I'm changing the comparison here
      filtered = filtered.filter((favoriteEntry) => favoriteEntry.data.year.toString() === $selectedYear);
    }

    setFilteredCollection(filtered);
  }, [favoritesCollection, $selectedFavoriteType, $selectedYear]);

  return (
    <section className="list">
      {filteredCollection.map((favoriteEntry: FavoritesCollectionEntry, index: number) => (
        <Card
          imageId={favoriteEntry.data.imageId}
          key={index}
          title={favoriteEntry.data.title}
          description={favoriteEntry.data.description}
        />
      ))}
    </section>
  );
};

export default FavoritesCollectionHandler;
