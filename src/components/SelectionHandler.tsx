import { useStore } from '@nanostores/react';
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';

import SelectWrapper from '../components/SelectWrapper';
import { SELECTION_TYPES, YEARS } from '../constants/memorabilia';
import { FAVORITE_TYPES } from '../constants/memorabilia';
import { selectedFavoriteType, selectedYear } from '../functionalityStore';
import './gradient-bg.css';

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
          <div className="text-container">
            <SelectWrapper
              placeholder={activePlaceholder}
              options={activeOptions}
              selectionStoreKey={activeSelectionStoreKey}
            />
          </div>
          <div className="gradient-bg">
            <svg xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="goo">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                  <feColorMatrix
                    in="blur"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
                    result="goo"
                  />
                  <feBlend in="SourceGraphic" in2="goo" />
                </filter>
              </defs>
            </svg>
            <div className="gradients-container">
              <div className="g1"></div>
              <div className="g2"></div>
              <div className="g3"></div>
              <div className="g4"></div>
              <div className="g5"></div>
              <div className="interactive"></div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SelectionHandler;
