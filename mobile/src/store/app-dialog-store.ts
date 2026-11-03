import { create } from "zustand";

export type AppDialogTone = "primary" | "danger" | "success";

export interface AppDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: AppDialogTone;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}

interface AppDialogState {
  dialog: AppDialogOptions | null;
  showDialog: (dialog: AppDialogOptions) => void;
  hideDialog: () => void;
}

export const useAppDialogStore = create<AppDialogState>((set) => ({
  dialog: null,
  showDialog: (dialog) => set({ dialog }),
  hideDialog: () => set({ dialog: null }),
}));
