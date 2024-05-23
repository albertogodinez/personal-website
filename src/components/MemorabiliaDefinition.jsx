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
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className="DialogContent">
            <ScrollableOverlay options={years} client:load />
            <Dialog.Close asChild>
              <button className="IconButton" aria-label="Close">
                x
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default MemorabiliaDefinition;
