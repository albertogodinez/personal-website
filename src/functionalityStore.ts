import { type WritableAtom, atom } from 'nanostores';

import { FAVORITE_TYPES } from './constants/memorabilia';

export const isDialogOpen: WritableAtom<boolean> = atom(false);
export const selectedYear: WritableAtom<string> = atom('');
export const selectedFavoriteType: WritableAtom<FAVORITE_TYPES | string> = atom('');
export const currentSelectionStore = atom(undefined);
export const storeMap: WritableAtom<Map<string, WritableAtom<string>>> = atom(
  new Map([
    ['SELECTED_YEAR', selectedYear],
    ['SELECTED_TYPE', selectedFavoriteType]
  ])
);
