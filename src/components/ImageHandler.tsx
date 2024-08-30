import { Cloudinary } from '@cloudinary/url-gen';
import { scale } from '@cloudinary/url-gen/actions/resize';
import { useState } from 'react';

export interface ImageHandlerProps {
  title: string;
  imageId: string;
  className?: string;
}

const cld = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME
  }
});

const ImageHandler: React.FC<ImageHandlerProps> = ({ title, imageId, className }) => {
  const [isOpen, setOpen] = useState(false);

  const handleClick = (title: string) => {
    console.log(title);
    setOpen(!isOpen);
  };

  return (
    <div>
      <img
        className={className}
        src={`${cld.image(imageId).quality('auto').format('auto').resize(scale().width(1000)).toURL()}`}
        alt="card preview"
      />
    </div>
  );
};
export default ImageHandler;
