import * as Select from '@radix-ui/react-select';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import './styles.css';
import { forwardRef } from 'react';

const SelectWrapper = ({ placeholder, options, selectionStore }) => {
  if (!options || !selectionStore) {
    return null;
  }

  const handleValueChange = (option) => {
    console.log(option);
    selectionStore.set(option);
  };

  return (
    <Select.Root onValueChange={handleValueChange}>
      <Select.Trigger aria-label={placeholder}>
        <Select.Value placeholder={placeholder} />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content sideOffset={50}>
          <Select.Viewport>
            <ScrollArea.Root className="ScrollAreaRoot">
              <ScrollArea.Viewport className="ScrollAreaViewport">
                <Select.Group>
                  {options.map((option) => (
                    <Select.Item className="Tag" key={option} value={option} style={{ cursor: 'pointer' }}>
                      <Select.ItemText onClick={() => handleClick(option)}>{option}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Group>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar className="ScrollAreaScrollbar" orientation="vertical">
                <ScrollArea.Thumb className="ScrollAreaThumb" />
              </ScrollArea.Scrollbar>
              <ScrollArea.Scrollbar className="ScrollAreaScrollbar" orientation="horizontal">
                <ScrollArea.Thumb className="ScrollAreaThumb" />
              </ScrollArea.Scrollbar>
              <ScrollArea.Corner className="ScrollAreaCorner" />
            </ScrollArea.Root>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

export default SelectWrapper;
