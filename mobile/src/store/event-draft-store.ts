import { create } from "zustand";
import { getAppNow } from "../lib/app-time";

interface EventDraftState {
  initialized: boolean;
  title: string;
  description: string;
  selectedStart: Date;
  selectedEnd: Date;
  remindMe: boolean;
  remindBeforeMinutes: number;
  selectedCategory: string;
  initializeDraft: () => void;
  resetDraft: () => void;
  hydrateDraft: (draft: {
    title: string;
    description?: string;
    selectedStart: Date;
    selectedEnd: Date;
    remindMe: boolean;
    remindBeforeMinutes: number;
    selectedCategory: string;
  }) => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setSelectedStart: (date: Date) => void;
  setSelectedEnd: (date: Date) => void;
  setSchedule: (start: Date, end: Date) => void;
  setRemindMe: (value: boolean) => void;
  setRemindBeforeMinutes: (value: number) => void;
  setSelectedCategory: (category: string) => void;
}

function startOfCurrentHour(date: Date) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  return next;
}

function createInitialState() {
  const selectedStart = startOfCurrentHour(getAppNow());
  const selectedEnd = new Date(selectedStart.getTime() + 60 * 60 * 1000);

  return {
    initialized: true,
    title: "",
    description: "",
    selectedStart,
    selectedEnd,
    remindMe: false,
    remindBeforeMinutes: 15,
    selectedCategory: "Brainstorm",
  };
}

const initialNow = getAppNow();

const initialState = {
  initialized: false,
  title: "",
  description: "",
  selectedStart: initialNow,
  selectedEnd: new Date(initialNow.getTime() + 60 * 60 * 1000),
  remindMe: false,
  remindBeforeMinutes: 15,
  selectedCategory: "Brainstorm",
};

export const useEventDraftStore = create<EventDraftState>((set) => ({
  ...initialState,
  initializeDraft: () => set(createInitialState()),
  resetDraft: () => set(initialState),
  hydrateDraft: (draft) =>
    set({
      initialized: true,
      title: draft.title,
      description: draft.description ?? "",
      selectedStart: draft.selectedStart,
      selectedEnd: draft.selectedEnd,
      remindMe: draft.remindMe,
      remindBeforeMinutes: draft.remindBeforeMinutes,
      selectedCategory: draft.selectedCategory,
    }),
  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setSelectedStart: (selectedStart) => set({ selectedStart }),
  setSelectedEnd: (selectedEnd) => set({ selectedEnd }),
  setSchedule: (selectedStart, selectedEnd) => set({ selectedStart, selectedEnd }),
  setRemindMe: (remindMe) => set({ remindMe }),
  setRemindBeforeMinutes: (remindBeforeMinutes) => set({ remindBeforeMinutes }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
}));
