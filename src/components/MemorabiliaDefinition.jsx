import ScrollableOverlay from './ScrollableOverlay';
import { menuOptions, isDialogOpen } from '../functionalityStore.js';
import { useStore } from '@nanostores/react';
import * as Dialog from '@radix-ui/react-dialog';

const MemorabiliaDefinition = ({ years, favoriteTypes }) => {
  const $menuOptions = useStore(menuOptions);
  const $isDialogOpen = useStore(isDialogOpen);

  const handleDialogChange = (type) => {
    console.log('type:', type);
    console.log('isDialogOpen:', $isDialogOpen);

    if (!$isDialogOpen) {
      if (type === 'years') {
        menuOptions.set(years);
      }
      if (type === 'favoriteTypes') {
        menuOptions.set(favoriteTypes);
      }
    }
    isDialogOpen.set(!$isDialogOpen);
  };
  return (
    <div>
      <Dialog.Root open={$isDialogOpen} onOpenChange={handleDialogChange}>
        <h1>
          my favorite{' '}
          <span onClick={() => handleDialogChange('favoriteTypes')} className="overlay-menu-handler">
            things
          </span>{' '}
          of{' '}
          <Dialog.Trigger asChild>
            <span onClick={() => handleDialogChange('years')} className="overlay-menu-handler">
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
                <button className="IconButton" aria-label="Close">
                  close
                </button>
              </Dialog.Close>
            </div>
            <ScrollableOverlay options={$menuOptions} client:load />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default MemorabiliaDefinition;
