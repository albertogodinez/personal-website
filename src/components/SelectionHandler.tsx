import { useStore } from '@nanostores/react';
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';

import { SELECTION_TYPES, YEARS } from '../constants/memorabilia';
import { FAVORITE_TYPES } from '../constants/memorabilia';
import { selectedFavoriteType, selectedYear } from '../functionalityStore';
import '../styles/global.css';
import '../styles/gradient-bg.css';
import '../styles/text-gradient.css';
import GradientBackground from './GradientBackground';
import SelectWrapper from './SelectWrapper';

const favoriteTypesArray = Object.values(FAVORITE_TYPES).map((type) => type.toLowerCase());

export const SelectionHandler: React.FC = () => {
  const $selectedFavoriteType = useStore(selectedFavoriteType);
  const $selectedYear = useStore(selectedYear);
  const [activeOptions, setActiveOptions] = useState<string[] | undefined>(undefined);
  const [activeSelectionStoreKey, setActiveSelectionStoreKey] = useState<SELECTION_TYPES | undefined>(undefined);
  const [activePlaceholder, setActivePlaceholder] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const handleActiveSelection = (options: string[], selectionStoreKey: SELECTION_TYPES, placeholder: string) => {
    setActiveOptions(options);
    setActiveSelectionStoreKey(selectionStoreKey);
    setActivePlaceholder(placeholder);
  };

  return (
    <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <h1>
        my favorite{' '}
        <Dialog.Trigger asChild>
          <span
            className="selection-trigger"
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
        </Dialog.Trigger>
        of
        <Dialog.Trigger asChild>
          <span
            className="selection-trigger"
            onClick={() => handleActiveSelection(YEARS, SELECTION_TYPES.SELECTED_YEAR, $selectedYear || 'all time')}
          >{` ${$selectedYear || 'all time'}`}</span>
        </Dialog.Trigger>
      </h1>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="dialog__content">
          <div>
            <SelectWrapper
              placeholder={activePlaceholder}
              options={activeOptions}
              selectionStoreKey={activeSelectionStoreKey}
              onSelectionMade={() => setIsDialogOpen(!isDialogOpen)}
              onEscapeKeyDownCallback={() => setIsDialogOpen(false)}
            />
            <GradientBackground />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SelectionHandler;
