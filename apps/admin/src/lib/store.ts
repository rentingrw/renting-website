import { create } from 'zustand';

type AppState = {
  locale: string;
  activeBookingId: string | null;
  chatOpen: boolean;
  setLocale: (locale: string) => void;
  setActiveBookingId: (activeBookingId: string | null) => void;
  setChatOpen: (chatOpen: boolean) => void;
};

export const useStore = create<AppState>((set) => ({
  locale: 'en',
  activeBookingId: null,
  chatOpen: false,
  setLocale: (locale) => set({ locale }),
  setActiveBookingId: (activeBookingId) => set({ activeBookingId }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
}));
