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

const ContentHandler: React.FC<ImageHandlerProps> = ({ title, description, imageId, className }) => {
  const [isContentInfoVisible, setContentInfoVisibility] = useState(false);

  const handleClick = () => {
    console.log('title');
    setContentInfoVisibility(!isContentInfoVisible);
  };

  return (
    <div className="content">
      <div className="content-info" hidden aria-hidden="true">
        <h3 className="content-info__title">{title}</h3>
        <p className="content-info__desc">{description}</p>
        <div className="content-info__overlay" hidden aria-hidden="true" />
      </div>
      <img
        className={className}
        src={`${cld.image(imageId).quality('auto').format('auto').resize(scale().width(1000)).toURL()}`}
        alt="card preview"
      />
    </div>
  );
};
export default ContentHandler;
