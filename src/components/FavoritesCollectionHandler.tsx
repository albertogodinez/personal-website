import { type FavoritesCollection } from '../content/config';
import { selectedFavoriteType, selectedYear } from '../functionalityStore';
import ImageHandler from './ImageHandler';
import './styles.css';

export interface FavoritesCollectionHandlerProps {
  collection: FavoritesCollection;
}

const FavoritesCollectionHandler: React.FC<FavoritesCollectionHandlerProps> = ({ collection }) => {
  return (
    <div className="grid">
      {collection.map((favorite: any, index: number) => (
        <ImageHandler className="image" key={index} title={favorite.data.title} imageId={favorite.data.imageId} />
      ))}
    </div>
  );
};

export default FavoritesCollectionHandler;
