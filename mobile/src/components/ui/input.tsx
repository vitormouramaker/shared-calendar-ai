import * as React from "react";
import { TextInput, type TextInputProps, View, Text } from "react-native";
import { cn } from "../../lib/utils";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  InputProps
>(({ className, containerClassName, label, error, ...props }, ref) => {
  return (
    <View className={cn("flex flex-col gap-1 w-full", containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-foreground">{label}</Text>
      )}
      <TextInput
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:border-ring",
          error && "border-destructive focus:border-destructive",
          className
        )}
        placeholderTextColor="#808080"
        {...props}
      />
      {error && (
        <Text className="text-sm font-medium text-destructive mt-1">
          {error}
        </Text>
      )}
    </View>
  );
});
Input.displayName = "Input";
