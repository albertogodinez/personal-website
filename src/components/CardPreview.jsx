import './styles.css';

const CardPreview = ({ title, children }) => {
  const handleClick = (title) => {
    console.log(title);
  };

  return (
    <div onClick={() => handleClick(title)} className="card-preview-container">
      {children}
    </div>
  );
};
export default CardPreview;
