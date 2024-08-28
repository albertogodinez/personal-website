import { Cloudinary } from '@cloudinary/url-gen';
import { scale } from '@cloudinary/url-gen/actions/resize';

import CardPreview from '../components/CardPreview';
import './styles.css';

export interface FavoritesProps {
  collection: any;
}

const cld = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME
  }
});

const Favorites: React.FC<FavoritesProps> = ({ collection }) => {
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

export default Favorites;
