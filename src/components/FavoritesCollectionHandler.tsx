import { Cloudinary } from '@cloudinary/url-gen';
import { scale } from '@cloudinary/url-gen/actions/resize';

import { type FavoritesCollection } from '../content/config';
import CardPreview from './CardPreview';
import './styles.css';

export interface FavoritesCollectionHandlerProps {
  collection: FavoritesCollection;
}

const cld = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME
  }
});

const FavoritesCollectionHandler: React.FC<FavoritesCollectionHandlerProps> = ({ collection }) => {
  return (
    <div className="grid">
      {collection.map((favorite: any, index: number) => (
        <CardPreview key={index} title={favorite.data.title}>
          <img
            key={index}
            className="image"
            src={`${cld.image(favorite.data.imageId).quality('auto').format('auto').resize(scale().width(1000)).toURL()}`}
            alt="card preview"
          />
        </CardPreview>
      ))}
    </div>
  );
};

export default FavoritesCollectionHandler;
