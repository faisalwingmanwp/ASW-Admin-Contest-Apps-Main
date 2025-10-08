import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type SongEntry = {
  title: string;
  link: string;
  categories: string[];
  coWriters: string;
  artistName: string;
};

type CheckoutState = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userName: string;
  smsConsent: boolean;
  fanContestOptIn: boolean;
  songs: SongEntry[];
  membershipSelected: boolean;
  selectedCompetitionId: string;
  
  // Actions
  setField: (field: keyof CheckoutState, value: any) => void;
  addSong: () => void;
  removeSong: (index: number) => void;
  updateSong: (index: number, field: keyof SongEntry, value: any) => void;
  handleCategoryChange: (songIndex: number, value: string) => void;
  reset: () => void;
  initializeFromUserData: (userData: any) => void;
};

const initialState = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  userName: '',
  smsConsent: true,
  fanContestOptIn: false,
  songs: [{ title: '', link: 'https://', categories: [], coWriters: '', artistName: '' }],
  membershipSelected: false,
  selectedCompetitionId: '',
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setField: (field, value) => set({ [field]: value }),
      
      addSong: () => set((state) => ({
        songs: [...state.songs, { title: '', link: 'https://', categories: [], coWriters: '', artistName: '' }],
      })),

      removeSong: (index) => set((state) => ({
        songs: state.songs.filter((_, i) => i !== index),
      })),

      updateSong: (index, field, value) => set((state) => {
        const newSongs = [...state.songs];
        newSongs[index] = { ...newSongs[index], [field]: value };
        return { songs: newSongs };
      }),
      
      handleCategoryChange: (songIndex, value) => set((state) => {
        const newSongs = [...state.songs];
        const song = newSongs[songIndex];
        if (song.categories.includes(value)) {
          song.categories = song.categories.filter((id) => id !== value);
        } else {
          song.categories = [...song.categories, value];
        }
        return { songs: newSongs };
      }),
      
      reset: () => set(initialState),

      initializeFromUserData: (userData) => {
        // Always prefer server-provided values to avoid stale local storage
        if (userData) {
          set({
            email: userData.email ?? '',
            firstName: userData.firstName ?? '',
            lastName: userData.lastName ?? '',
            userName: userData.userName ?? '',
            membershipSelected: get().membershipSelected && !userData.hasMembership,
          });
        }
      },
    }),
    {
      name: 'checkout-storage', 
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Clear potentially incorrect name/email fields from older persisted state
      migrate: (persistedState: any, version: number) => {
        if (version < 1 && persistedState) {
          return {
            ...persistedState,
            email: '',
            firstName: '',
            lastName: '',
            userName: '',
          };
        }
        return persistedState as any;
      },
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => !['actions'].includes(key))
      ),
    }
  )
); 
