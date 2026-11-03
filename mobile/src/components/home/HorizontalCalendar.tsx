import { View, Text, ScrollView, TouchableOpacity } from "react-native";

interface HorizontalCalendarProps {
  currentDate: Date;
}

export function HorizontalCalendar({ currentDate }: HorizontalCalendarProps) {
  // Simulando alguns dias
  const days = [
    { day: "Seg", date: "31", isSelected: false },
    { day: "Ter", date: "30", isSelected: false },
    { day: "Qua", date: "1", isSelected: false },
    { day: "Qui", date: "2", isSelected: true, hasEvent: true, eventColors: ["#7c3aed", "#10b981", "#3b82f6"] },
    { day: "Sex", date: "3", isSelected: false, hasEvent: true, eventColors: ["#3b82f6"] },
    { day: "Sab", date: "4", isSelected: false },
    { day: "Dom", date: "5", isSelected: false },
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      className="px-6 py-4"
    >
      <View className="flex-row gap-4">
        {days.map((item, index) => (
          <TouchableOpacity 
            key={index}
            className={`items-center justify-center p-3 rounded-2xl min-w-[50px]
              ${item.isSelected ? 'bg-primary' : 'bg-transparent'}
            `}
          >
            <Text className={`text-xs font-semibold mb-2
              ${item.isSelected ? 'text-white/80' : 'text-gray-400'}
            `}>
              {item.day}
            </Text>
            <Text className={`text-lg font-bold mb-1
              ${item.isSelected ? 'text-white' : 'text-gray-900'}
            `}>
              {item.date}
            </Text>
            
            {/* Dots under the date */}
            <View className="flex-row gap-1 h-1.5 items-center justify-center mt-1">
              {item.hasEvent && item.eventColors?.map((color, i) => (
                <View 
                  key={i} 
                  style={{ backgroundColor: color }}
                  className={`w-1.5 h-1.5 rounded-full`}
                />
              ))}
              {/* placeholder pro layout n quebrar quando ns tiver dot */}
              {!item.hasEvent && <View className="h-1.5" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
