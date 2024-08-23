import './styles.css';

export interface CardPreviewInterface {
  title: string;
  children: React.ReactNode;
}

const CardPreview: React.FC<CardPreviewInterface> = ({ title, children }) => {
  const handleClick = (title: string) => {
    console.log(title);
  };

  return (
    <div onClick={() => handleClick(title)} className="card-preview-container">
      {children}
    </div>
  );
};
export default CardPreview;
