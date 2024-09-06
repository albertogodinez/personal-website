import { useStore } from '@nanostores/react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Select from '@radix-ui/react-select';

import type { SELECTION_TYPES } from '../constants/memorabilia';
import { storeMap } from '../functionalityStore';
import '../styles/global.css';
import '../styles/select.css';

export interface SelectWrapperProps {
  placeholder: string;
  options?: string[];
  selectionStoreKey?: SELECTION_TYPES;
  // callback function to be called when a selection is made
  onSelectionMade: () => void;
  onEscapeKeyDownCallback?: () => void;
}

const SelectWrapper: React.FC<SelectWrapperProps> = ({
  placeholder,
  options,
  selectionStoreKey,
  onSelectionMade,
  onEscapeKeyDownCallback
}) => {
  if (!options || !selectionStoreKey) {
    return null;
  }

  const $storeMap = useStore(storeMap);
  const selectionStore = $storeMap.get(selectionStoreKey);

  const handleValueChange = (option: string) => {
    if (selectionStore) {
      selectionStore.set(option);
      onSelectionMade();
    }
  };

  // TODO: Update mobile styles so that select items fit well
  // TODO: fix styling of select component
  // TODO: Remove unused css
  // TODO: Update background color
  // todo: fix aria issues
  return (
    <Select.Root open={true} onValueChange={handleValueChange}>
      <Select.Portal>
        <div
          id="select-wrapper"
          style={{
            position: 'absolute',
            inset: 0,
            margin: 'auto',
            width: '100vw',
            height: 'auto'
          }}
        >
          <Select.Content
            onEscapeKeyDown={() => {
              if (onEscapeKeyDownCallback) onEscapeKeyDownCallback();
            }}
            className="select__content"
          >
            <Select.Viewport>
              <ScrollArea.Root className="scroll-area__root">
                <ScrollArea.Viewport className="scroll-area__viewport">
                  <Select.Group>
                    {options.map((option) => (
                      <Select.Item
                        className="select__item"
                        key={option}
                        value={option}
                        disabled={selectionStore?.get() === option}
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
        </div>
      </Select.Portal>
    </Select.Root>
  );
};

export default SelectWrapper;
