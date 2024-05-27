import ScrollableOverlay from './ScrollableOverlay';
import {
  menuOptions,
  isDialogOpen,
  selectedFavoriteType,
  selectedYear,
  currentSelectionStore
} from '../functionalityStore.js';
import { useStore } from '@nanostores/react';
import * as Dialog from '@radix-ui/react-dialog';

const MemorabiliaDefinition = ({ years, favoriteTypes }) => {
  const $menuOptions = useStore(menuOptions);
  const $isDialogOpen = useStore(isDialogOpen);
  const $selectedYear = useStore(selectedYear);
  const $selectedFavoriteType = useStore(selectedFavoriteType);
  const selectionStoreMap = new Map([
    ['years', selectedYear],
    ['favoriteTypes', selectedFavoriteType]
  ]);
  const $currentSelectionStore = useStore(currentSelectionStore);

  const setStore = (type) => {
    currentSelectionStore.set(selectionStoreMap.get(type));

    if (type === 'years') {
      menuOptions.set(years);
    }
    if (type === 'favoriteTypes') {
      menuOptions.set(favoriteTypes);
    }
    handleDialogChange(true);
  };

  const handleDialogChange = (isOpen) => {
    isDialogOpen.set(isOpen);
  };

  return (
    <div id="test">
      <Dialog.Root open={$isDialogOpen} onOpenChange={handleDialogChange}>
        <h1>
          my favorite{' '}
          <span style={{ cursor: 'pointer' }} onClick={() => setStore('favoriteTypes')}>
            {$selectedFavoriteType ? $selectedFavoriteType : 'things'}
          </span>{' '}
          of{' '}
          <Dialog.Trigger asChild>
            <span style={{ cursor: 'pointer' }} onClick={() => setStore('years')}>
              {$selectedYear ? $selectedYear : 'all time'}
            </span>
          </Dialog.Trigger>
        </h1>
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.7)', // You can adjust the alpha value for opacity
              backdropFilter: 'blur(10px)' // You can adjust the pixel value for blur intensity
            }}
          />
          <Dialog.Content
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '90vw',
              height: '600px',
              overflow: 'auto'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '0.5em',
                right: '0.5em',
                display: 'flex',
                justifyContent: 'flex-end',
                width: 'auto'
              }}
            >
              <Dialog.Close asChild>
                <button aria-label="Close">close</button>
              </Dialog.Close>
            </div>
            <ScrollableOverlay options={$menuOptions} selectionStore={$currentSelectionStore} client:load />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default MemorabiliaDefinition;
