import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check, Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import { useLogin } from "../../src/hooks/useAuth";

const REMEMBER_EMAIL_KEY = "@calendo/remembered_email";

function InputRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4">
      {icon}
      {children}
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { mutate: login, isPending } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_EMAIL_KEY)
      .then((storedEmail) => {
        if (!storedEmail) {
          return;
        }

        setEmail(storedEmail);
        setRememberEmail(true);
      })
      .catch(() => {
        console.warn("[login] failed to read remembered email");
      });
  }, []);

  const handleLogin = () => {
    if (!email.trim() || !password) {
      Alert.alert("Atencao", "Preencha e-mail e senha.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    login(
      { email: normalizedEmail, password },
      {
        onSuccess: async () => {
          try {
            if (rememberEmail) {
              await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, normalizedEmail);
            } else {
              await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
            }
          } catch {
            console.warn("[login] failed to persist remembered email");
          }

          router.replace("/(tabs)");
        },
        onError: (err: any) => Alert.alert("Erro ao entrar", err.message ?? "Tente novamente."),
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 64 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-6 py-10">
            <View className="mx-auto w-full max-w-[360px]">
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
                  <View className="h-4 w-4 rounded-full bg-white" />
                </View>
                <Text className="ml-3 text-2xl font-bold text-gray-900">Calendo</Text>
              </View>

              <View className="mt-10">
                <Text className="text-3xl font-bold leading-tight text-gray-900">
                  Bem-vindo de volta
                </Text>
                <Text className="mt-3 text-base leading-7 text-gray-500">
                  Entre para continuar acompanhando seus compromissos.
                </Text>
              </View>

              <View className="mt-8 gap-4">
                <InputRow icon={<Mail size={20} color="#9CA3AF" />}>
                  <TextInput
                    placeholder="E-mail"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="ml-3 flex-1 py-4 text-base font-medium text-gray-900"
                  />
                </InputRow>

                <InputRow icon={<Lock size={20} color="#9CA3AF" />}>
                  <TextInput
                    placeholder="Senha"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    className="ml-3 flex-1 py-4 text-base font-medium text-gray-900"
                  />
                  <TouchableOpacity onPress={() => setShowPass((value) => !value)} className="p-1">
                    {showPass ? (
                      <EyeOff size={20} color="#9CA3AF" />
                    ) : (
                      <Eye size={20} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                </InputRow>

                <View className="mt-1 flex-row items-center justify-between">
                  <TouchableOpacity
                    onPress={() => setRememberEmail((value) => !value)}
                    activeOpacity={0.8}
                    className="flex-row items-center"
                  >
                    <View
                      className="h-5 w-5 items-center justify-center rounded-md border"
                      style={{
                        borderColor: rememberEmail ? "#7C3AED" : "#D1D5DB",
                        backgroundColor: rememberEmail ? "#7C3AED" : "#FFFFFF",
                      }}
                    >
                      {rememberEmail ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                    </View>
                    <Text className="ml-3 text-sm font-medium text-gray-600">Lembrar e-mail</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push("/auth/forgot-password")}
                    activeOpacity={0.8}
                  >
                    <Text className="text-sm font-semibold text-violet-700">Esqueci minha senha</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isPending}
                  className="mt-4 w-full items-center justify-center rounded-full py-4"
                  style={{ backgroundColor: "#7C3AED", opacity: isPending ? 0.7 : 1 }}
                  activeOpacity={0.85}
                >
                  {isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-lg font-bold text-white">Entrar</Text>
                  )}
                </TouchableOpacity>

                <View className="my-1 flex-row items-center">
                  <View className="h-px flex-1 bg-gray-100" />
                  <Text className="mx-4 text-sm font-medium text-gray-400">ou</Text>
                  <View className="h-px flex-1 bg-gray-100" />
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/auth/register")}
                  className="w-full items-center justify-center rounded-full border border-violet-200 bg-violet-50 py-4"
                  activeOpacity={0.85}
                >
                  <Text className="text-lg font-bold text-violet-700">Criar conta</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
