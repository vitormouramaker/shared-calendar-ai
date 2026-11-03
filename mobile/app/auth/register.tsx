import React, { useState } from "react";
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
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AtSign,
  ChevronLeft,
} from "lucide-react-native";
import { useRegister } from "../../src/hooks/useAuth";

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

export default function RegisterScreen() {
  const router = useRouter();
  const { mutate: register, isPending } = useRegister();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleRegister = () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      Alert.alert("Atencao", "Preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Atencao", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const payload = {
      name: name.trim(),
      username: username.trim().toLowerCase().replace(/^@/, ""),
      email: email.trim().toLowerCase(),
      password,
    };

    console.log("[register-screen] submitting register", {
      nameLength: payload.name.length,
      username: payload.username,
      email: payload.email,
      passwordLength: payload.password.length,
    });

    register(payload, {
      onSuccess: () => {
        console.log("[register-screen] register success");
        router.replace("/(tabs)");
      },
      onError: (err: any) => {
        console.log("[register-screen] register error", {
          message: err?.message,
          name: err?.name,
        });
        Alert.alert("Erro ao cadastrar", err.message ?? "Tente novamente.");
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pt-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="self-start p-1"
        >
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>
      </View>

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
                <Text className="ml-3 text-2xl font-bold text-gray-900">
                  Calendo
                </Text>
              </View>

              <View className="mt-10">
                <Text className="text-3xl font-bold leading-tight text-gray-900">
                  Crie sua conta
                </Text>
                <Text className="mt-3 text-base leading-7 text-gray-500">
                  Organize seus compromissos e compartilhe sua agenda quando
                  fizer sentido.
                </Text>
              </View>

              <View className="mt-8 gap-4">
                <InputRow icon={<User size={20} color="#9CA3AF" />}>
                  <TextInput
                    placeholder="Nome completo"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    className="ml-3 flex-1 py-4 text-base font-medium text-gray-900"
                  />
                </InputRow>

                <InputRow icon={<AtSign size={20} color="#9CA3AF" />}>
                  <TextInput
                    placeholder="username"
                    placeholderTextColor="#9CA3AF"
                    value={username}
                    onChangeText={(value) =>
                      setUsername(value.replace(/\s/g, ""))
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="ml-3 flex-1 py-4 text-base font-medium text-gray-900"
                  />
                </InputRow>

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
                    placeholder="Senha (min. 6 caracteres)"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    className="ml-3 flex-1 py-4 text-base font-medium text-gray-900"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPass((value) => !value)}
                    className="p-1"
                  >
                    {showPass ? (
                      <EyeOff size={20} color="#9CA3AF" />
                    ) : (
                      <Eye size={20} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                </InputRow>

                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={isPending}
                  className="mt-4 w-full items-center justify-center rounded-full py-4"
                  style={{
                    backgroundColor: "#7C3AED",
                    opacity: isPending ? 0.7 : 1,
                  }}
                  activeOpacity={0.85}
                >
                  {isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-lg font-bold text-white">
                      Cadastrar
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.back()}
                  className="items-center py-3"
                  activeOpacity={0.7}
                >
                  <Text className="text-sm font-medium text-gray-500">
                    Ja tem conta?{" "}
                    <Text className="font-bold text-violet-700">Entrar</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
