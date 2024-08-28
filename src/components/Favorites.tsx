import { Image } from 'astro:assets';

import CardPreview from '../components/CardPreview';
import './styles.css';

export interface FavoritesProps {
  collection: any;
}

const Favorites: React.FC<FavoritesProps> = ({ collection }) => {
  console.log('collection');
  console.log(collection);
  console.log(typeof collection);
  return (
    <div className="grid">
      {collection.map((favorite: any, index: number) => (
        // <a href={p.slug}>{p.data.title}</a>
        <CardPreview key={index} title={'test1'}>
          <Image slot="image" class="image" src={favorite.data.image} alt="card preview" />
        </CardPreview>
      ))}
    </div>
  );
};

export default Favorites;
