import { Cloudinary } from '@cloudinary/url-gen';
import { scale } from '@cloudinary/url-gen/actions/resize';
import { useState } from 'react';

export interface ImageHandlerProps {
  imageId: string;
  title: string;
  description?: string;
  className?: string;
}

const cld = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME
  }
});

const Card: React.FC<ImageHandlerProps> = ({ title, description, imageId, className }) => {
  const [isContentInfoVisible, setContentInfoVisibility] = useState(false);

  const handleClick = () => {
    setContentInfoVisibility(!isContentInfoVisible);
  };

  return (
    <div className="content" onClick={handleClick} onFocus={handleClick} onBlur={handleClick}>
      <div className={`content-info ${isContentInfoVisible ? 'visible' : ''}`} aria-hidden={!isContentInfoVisible}>
        <h3 className="content-info__title">{title}</h3>
        <p className="content-info__desc">{description}</p>
        <div className="content-info__overlay" aria-hidden={!isContentInfoVisible} />
      </div>
      <img
        className="content-image"
        src={`${cld.image(imageId).quality('auto').format('auto').resize(scale().width(1000)).toURL()}`}
        alt={title}
      />
    </div>
  );
};

export default Card;
