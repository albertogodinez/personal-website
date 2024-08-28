import { Cloudinary } from '@cloudinary/url-gen';
import { scale } from '@cloudinary/url-gen/actions/resize';

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
  const handleClick = (title: string) => {
    console.log(title);
  };

  return (
    <img
      className={className}
      src={`${cld.image(imageId).quality('auto').format('auto').resize(scale().width(1000)).toURL()}`}
      alt="card preview"
    />
  );
};
export default ImageHandler;
