import { atom, type WritableAtom } from 'nanostores';

export const menuOptions: WritableAtom<string[]> = atom([]);
export const isDialogOpen: WritableAtom<boolean> = atom(false);
export const selectedYear: WritableAtom<string> = atom('');
export const selectedFavoriteType: WritableAtom<string> = atom('');
export const currentSelectionStore = atom(undefined);
export const storeMap: WritableAtom<Map<string, WritableAtom<string>>> = atom(
  new Map([
    ['SELECTED_YEAR', selectedYear],
    ['SELECTED_TYPE', selectedFavoriteType]
  ])
);
