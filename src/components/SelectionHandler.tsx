import { useStore } from '@nanostores/react';
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';

import SelectWrapper from '../components/SelectWrapper';
import { SELECTION_TYPES, YEARS } from '../constants/memorabilia';
import { FAVORITE_TYPES } from '../constants/memorabilia';
import { selectedFavoriteType, selectedYear } from '../functionalityStore';

const favoriteTypesArray = Object.values(FAVORITE_TYPES).map((type) => type.toLowerCase());

export const SelectionHandler: React.FC = () => {
  const $selectedFavoriteType = useStore(selectedFavoriteType);
  const $selectedYear = useStore(selectedYear);
  const [activeOptions, setActiveOptions] = useState<string[] | undefined>(undefined);
  const [activeSelectionStoreKey, setActiveSelectionStoreKey] = useState<SELECTION_TYPES | undefined>(undefined);
  const [activePlaceholder, setActivePlaceholder] = useState<string>('');

  const handleActiveSelection = (options: string[], selectionStoreKey: SELECTION_TYPES, placeholder: string) => {
    setActiveOptions(options);
    setActiveSelectionStoreKey(selectionStoreKey);
    setActivePlaceholder(placeholder);
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <h1>
          my favorite{' '}
          <span
            onClick={() =>
              handleActiveSelection(
                favoriteTypesArray,
                SELECTION_TYPES.SELECTED_TYPE,
                $selectedFavoriteType || 'things'
              )
            }
          >
            {` ${$selectedFavoriteType || 'things'} `}
          </span>
          of
          <span
            onClick={() => handleActiveSelection(YEARS, SELECTION_TYPES.SELECTED_YEAR, $selectedYear || 'all time')}
          >{` ${$selectedYear || 'all time'}`}</span>
        </h1>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <SelectWrapper
            placeholder={activePlaceholder}
            options={activeOptions}
            selectionStoreKey={activeSelectionStoreKey}
          />
          <Dialog.Close asChild>
            <button className="IconButton" aria-label="Close">
              x
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SelectionHandler;
