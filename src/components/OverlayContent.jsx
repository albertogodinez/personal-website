import { useStore } from '@nanostores/react';

const OverlayContent = ({ options, selectionStore }) => {
  if (!options || !selectionStore) {
    return null;
  }
  const $selectionStore = useStore(selectionStore);

  const handleClick = (option) => {
    console.log(option);
    selectionStore.set(option);
  };

  return (
    <div id="test--scrollable">
      {options.map((option) => (
        <div key={option} onClick={() => handleClick(option)} style={{ cursor: 'pointer' }}>
          {option}
        </div>
      ))}
    </div>
  );
};

export default OverlayContent;
