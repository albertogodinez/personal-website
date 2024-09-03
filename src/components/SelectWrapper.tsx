import { useStore } from '@nanostores/react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Select from '@radix-ui/react-select';

import type { SELECTION_TYPES } from '../constants/memorabilia';
import { storeMap } from '../functionalityStore';
import './styles.css';

export interface SelectWrapperProps {
  placeholder: string;
  options?: string[];
  selectionStoreKey?: SELECTION_TYPES;
}

const SelectWrapper: React.FC<SelectWrapperProps> = ({ placeholder, options, selectionStoreKey }) => {
  if (!options || !selectionStoreKey) {
    return null;
  }

  const $storeMap = useStore(storeMap);
  const selectionStore = $storeMap.get(selectionStoreKey);

  const handleValueChange = (option: string) => {
    if (selectionStore) {
      console.log(`Setting ${selectionStoreKey} to ${option}`);
      selectionStore.set(option);
    }
  };

  return (
    <Select.Root open={true} onValueChange={handleValueChange}>
      {/* <Select.Trigger aria-label={placeholder}><Select.Value placeholder={placeholder} /></Select.Trigger> */}
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            <ScrollArea.Root className="scroll-area__root">
              <ScrollArea.Viewport>
                <Select.Group>
                  {options.map((option) => (
                    <Select.Item
                      className="scroll-area__item"
                      key={option}
                      value={option}
                      style={{ cursor: 'pointer' }}
                    >
                      <Select.ItemText>{option}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Group>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="vertical">
                <ScrollArea.Thumb className="ScrollAreaThumb" />
              </ScrollArea.Scrollbar>
              <ScrollArea.Scrollbar orientation="horizontal">
                <ScrollArea.Thumb className="ScrollAreaThumb" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

export default SelectWrapper;
