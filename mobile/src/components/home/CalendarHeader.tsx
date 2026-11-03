import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { formatAppDate } from "../../lib/app-time";

interface CalendarHeaderProps {
  currentDate: Date;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

export function CalendarHeader({ currentDate, onPrevMonth, onNextMonth }: CalendarHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-6 py-4">
      <TouchableOpacity onPress={onPrevMonth} className="p-1">
        <ChevronLeft size={20} color="#1F2937" />
      </TouchableOpacity>

      <View className="items-center">
        <Text className="text-xl font-bold capitalize text-gray-900">
          {formatAppDate(currentDate, "MMMM")}
        </Text>
        <Text className="text-sm font-medium text-gray-400">{formatAppDate(currentDate, "yyyy")}</Text>
      </View>

      <TouchableOpacity onPress={onNextMonth} className="p-1">
        <ChevronRight size={20} color="#1F2937" />
      </TouchableOpacity>
    </View>
  );
}
