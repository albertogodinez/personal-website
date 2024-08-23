import * as Select from '@radix-ui/react-select';
import './styles.css';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { storeMap } from '../functionalityStore';

import { useStore } from '@nanostores/react';

export interface SelectionWrapperProps {
  placeholder: string;
  options: string[];
  selectionStoreKey: string;
}

const SelectionWrapper: React.FC<SelectionWrapperProps> = ({ placeholder, options, selectionStoreKey }) => {
  if (!options || !selectionStoreKey) {
    return null;
  }

  const $storeMap = useStore(storeMap);
  const selectionStore = $storeMap.get(selectionStoreKey);

  const handleValueChange = (option: string) => {
    if (selectionStore) {
      selectionStore.set(option);
    }
  };

  return (
    <Select.Root onValueChange={handleValueChange}>
      <Select.Trigger aria-label={placeholder}>
        <Select.Value placeholder={placeholder} />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            <ScrollArea.Root className="ScrollAreaRoot">
              <ScrollArea.Viewport className="ScrollAreaViewport">
                <Select.Group>
                  {options.map((option) => (
                    <Select.Item className="Tag" key={option} value={option} style={{ cursor: 'pointer' }}>
                      <Select.ItemText>{option}</Select.ItemText>
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

export default SelectionWrapper;
