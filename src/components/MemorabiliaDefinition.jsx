import ScrollableOverlay from './ScrollableOverlay';
import { isYearMenuSelected, isDialogOpen } from '../functionalityStore.js';
import { useStore } from '@nanostores/react';
import * as Dialog from '@radix-ui/react-dialog';

const MemorabiliaDefinition = ({ years, favoriteTypes }) => {
  const $isYearMenuSelected = useStore(isYearMenuSelected);
  const $isDialogOpen = useStore(isDialogOpen);

  const handleYearsClick = (years) => {
    console.log('handling years click');
    isYearMenuSelected.set(!$isYearMenuSelected);

    handleDialogChange($isYearMenuSelected, years);
  };

  const handleDialogChange = (menuSelection, options) => {
    console.log('menuSelection:', menuSelection);
    console.log('options:', options);

    isDialogOpen.set(!$isDialogOpen);
  };

  return (
    <div>
      <Dialog.Root open={$isDialogOpen} onOpenChange={handleDialogChange}>
        <h1>
          my favorite{' '}
          <button
            onClick={() => {
              console.log('hello');
            }}
            className="overlay-menu-handler"
          >
            things
          </button>{' '}
          of{' '}
          <Dialog.Trigger asChild>
            <span onClick={() => handleYearsClick(years)} className="overlay-menu-handler">
              all time
            </span>
          </Dialog.Trigger>
        </h1>
        <Dialog.Portal>
          <Dialog.Overlay
            className="DialogOverlay"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.7)', // You can adjust the alpha value for opacity
              backdropFilter: 'blur(10px)' // You can adjust the pixel value for blur intensity
            }}
          />
          <Dialog.Content
            className="DialogContent"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <Dialog.Close asChild>
              <button
                className="IconButton"
                aria-label="Close"
                style={{
                  position: 'absolute', // This will take the button out of the normal flow
                  top: '-40vh', // Adjust as needed
                  right: '-45vw' // Adjust as needed
                }}
              >
                close
              </button>
            </Dialog.Close>
            <ScrollableOverlay options={years} client:load />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default MemorabiliaDefinition;
