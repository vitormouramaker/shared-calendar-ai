import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { markOnboardingSeen } from "../src/lib/onboarding";

const { width, height } = Dimensions.get("window");
const STAGE_HEIGHT = Math.min(height * 0.46, 430);

const SLIDES = [
  {
    id: "1",
    eyebrow: "BEM-VINDO",
    title: "Hora de organizar\no seu dia",
    description:
      "Monte blocos de horario, acompanhe o que vem a seguir e deixe a agenda mais clara no dia a dia.",
    accent: "#EDE9FE",
    frame: "#DDD6FE",
    image: require("../assets/images/onboarding-1.png"),
  },
  {
    id: "2",
    eyebrow: "PRATICIDADE",
    title: "Sua rotina mais perto\nda sua mao",
    description:
      "Crie eventos rapido, ajuste horario com precisao e acompanhe tudo em um fluxo continuo.",
    accent: "#F3E8FF",
    frame: "#C4B5FD",
    image: require("../assets/images/onboarding-2.png"),
  },
  {
    id: "3",
    eyebrow: "SEGURANCA",
    title: "Compartilhe quando\nfizer sentido",
    description:
      "Mantenha sua agenda privada ou libere acesso para convidados de forma controlada.",
    accent: "#F5F3FF",
    frame: "#A78BFA",
    image: require("../assets/images/onboarding-3.png"),
  },
];

export default function OnboardingScreen() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const finishOnboarding = async () => {
    await markOnboardingSeen();
    router.replace("/auth/login");
  };

  const updateCurrentSlideIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentSlideIndex(currentIndex);
  };

  const goToNextSlide = async () => {
    const nextSlideIndex = currentSlideIndex + 1;

    if (nextSlideIndex < SLIDES.length) {
      flatListRef.current?.scrollToOffset({ offset: nextSlideIndex * width, animated: true });
      setCurrentSlideIndex(nextSlideIndex);
      return;
    }

    await finishOnboarding();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-5 pb-4">
        <View className="flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
            <View className="h-4 w-4 rounded-full bg-white" />
          </View>
          <Text className="ml-3 text-xl font-bold text-gray-900">Calendo</Text>
        </View>

        <TouchableOpacity onPress={() => void finishOnboarding()} className="px-1 py-1">
          <Text className="text-sm font-bold uppercase tracking-[1px] text-violet-500">Pular</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        onMomentumScrollEnd={updateCurrentSlideIndex}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={{ width, paddingHorizontal: 24, paddingTop: 8 }}>
            <View className="rounded-[32px] px-5 py-6" style={{ backgroundColor: "#6D28D9" }}>
              <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-100">
                {item.eyebrow}
              </Text>
              <Text className="mt-3 text-3xl font-bold leading-tight text-white">{item.title}</Text>
              <Text className="mt-3 text-sm leading-6 text-violet-100">{item.description}</Text>
            </View>

            <View
              className="mt-6 overflow-hidden rounded-[34px] border p-5"
              style={{ backgroundColor: item.accent, borderColor: item.frame, height: STAGE_HEIGHT }}
            >
              <View className="absolute left-5 top-5 rounded-full border border-white/70 bg-white/70 px-3 py-2">
                <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-violet-700">
                  Etapa {index + 1}
                </Text>
              </View>

              <View
                className="absolute right-5 top-5 rounded-full border bg-white/75 px-3 py-2"
                style={{ borderColor: item.frame }}
              >
                <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-violet-700">
                  Agenda visual
                </Text>
              </View>

              <View className="flex-1 items-center justify-end">
                <View
                  className="w-full flex-1 items-center justify-end overflow-hidden rounded-[30px] border bg-white px-4 pt-8"
                  style={{ borderColor: item.frame }}
                >
                  <View className="mb-4 flex-row gap-2 self-stretch">
                    <View className="h-2.5 flex-1 rounded-full bg-violet-100" />
                    <View className="h-2.5 w-20 rounded-full bg-violet-200" />
                  </View>

                  <Image
                    source={item.image}
                    style={{ width: "100%", height: "88%", resizeMode: "contain" }}
                  />
                </View>
              </View>
            </View>
          </View>
        )}
      />

      <View className="px-6 pb-12 pt-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            {SLIDES.map((slide, index) => (
              <View
                key={slide.id}
                className={`mr-2 h-2.5 rounded-full ${
                  currentSlideIndex === index ? "w-10 bg-primary" : "w-2.5 bg-violet-100"
                }`}
              />
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => void goToNextSlide()}
            className="flex-row items-center rounded-full bg-primary px-5 py-4"
          >
            <Text className="mr-2 text-sm font-bold uppercase tracking-[1px] text-white">
              {currentSlideIndex === SLIDES.length - 1 ? "Entrar" : "Proximo"}
            </Text>
            <ChevronRight color="#FFFFFF" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
