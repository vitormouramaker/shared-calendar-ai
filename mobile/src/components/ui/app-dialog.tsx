import React from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useAppDialogStore } from "../../store/app-dialog-store";

const toneMap = {
  primary: {
    buttonBackground: "#7C3AED",
    buttonText: "#FFFFFF",
    accent: "#E9D5FF",
  },
  danger: {
    buttonBackground: "#DC2626",
    buttonText: "#FFFFFF",
    accent: "#FECACA",
  },
  success: {
    buttonBackground: "#16A34A",
    buttonText: "#FFFFFF",
    accent: "#BBF7D0",
  },
} as const;

export function AppDialog() {
  const dialog = useAppDialogStore((state) => state.dialog);
  const hideDialog = useAppDialogStore((state) => state.hideDialog);

  if (!dialog) {
    return null;
  }

  const {
    title,
    message,
    confirmText = "Fechar",
    cancelText,
    tone = "primary",
    onConfirm,
    onCancel,
  } = dialog;

  const palette = toneMap[tone];

  const handleClose = () => {
    hideDialog();
  };

  const handleCancel = () => {
    handleClose();
    void onCancel?.();
  };

  const handleConfirm = () => {
    handleClose();
    void onConfirm?.();
  };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={cancelText ? handleCancel : handleClose}
    >
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "rgba(17,24,39,0.45)" }}>
        <Pressable className="absolute inset-0" onPress={cancelText ? handleCancel : handleClose} />

        <View className="w-full max-w-[360px] overflow-hidden rounded-[28px] border border-gray-200 bg-white">
          <View className="px-6 pt-6">
            <View
              className="mb-5 h-2 w-16 rounded-full"
              style={{ backgroundColor: palette.accent }}
            />

            <Text className="text-2xl font-bold text-gray-900">{title}</Text>
            <Text className="mt-3 text-base leading-7 text-gray-600">{message}</Text>
          </View>

          <View className="mt-6 flex-row gap-3 px-6 pb-6">
            {cancelText ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleCancel}
                className="flex-1 items-center justify-center rounded-full border border-gray-200 bg-gray-50 py-4"
              >
                <Text className="text-base font-bold text-gray-700">{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleConfirm}
              className="flex-1 items-center justify-center rounded-full py-4"
              style={{ backgroundColor: palette.buttonBackground }}
            >
              <Text className="text-base font-bold" style={{ color: palette.buttonText }}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
