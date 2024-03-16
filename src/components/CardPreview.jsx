import React from 'react';
import * as AspectRatio from '@radix-ui/react-aspect-ratio';
import './styles.css';

const CardPreview = ({ title }) => {
  const handleClick = (title) => {
    console.log(title);
  };

  return (
    <div onClick={() => handleClick(title)} className="card-preview-container">
      <AspectRatio.Root ratio={2 / 3}>
        <img src="https://picsum.photos/200/300" className="image" alt="card preview" />
      </AspectRatio.Root>
    </div>
  );
};
export default CardPreview;
