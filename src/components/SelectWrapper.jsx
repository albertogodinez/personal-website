import * as Select from '@radix-ui/react-select';
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
        <Select.Content position="popper" sideOffset={50}>
          <Select.Viewport>
            <Select.Group>
              {options.map((option) => (
                <Select.Item key={option} value={option} style={{ cursor: 'pointer' }}>
                  <Select.ItemText onClick={() => handleClick(option)}>{option}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

export default SelectWrapper;
