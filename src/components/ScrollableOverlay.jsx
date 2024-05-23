const ScrollableOverlay = ({ options }) => {
  const handleClick = (option) => {
    console.log(option);
  };

  return (
    <div className="scrollable-overlay">
      {options.map((option) => (
        <div key={option} onClick={() => handleClick(option)} className="scrollable-overlay-option">
          {option}
        </div>
      ))}
    </div>
  );
};

export default ScrollableOverlay;
