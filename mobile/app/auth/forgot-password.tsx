import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Lock, Mail, ShieldCheck } from "lucide-react-native";
import { useForgotPassword, useResetPassword } from "../../src/hooks/useAuth";

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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { mutate: requestResetCode, isPending: isRequesting } =
    useForgotPassword();
  const { mutate: resetPassword, isPending: isResetting } = useResetPassword();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const handleRequestCode = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert("Atencao", "Informe o e-mail da conta.");
      return;
    }

    requestResetCode(
      { email: normalizedEmail },
      {
        onSuccess: (response) => {
          setEmail(normalizedEmail);
          setRequestSent(true);
          Alert.alert("Codigo enviado", response.message);
        },
        onError: (err: any) => {
          Alert.alert(
            "Erro",
            err.message ?? "Nao foi possivel solicitar o codigo."
          );
        },
      }
    );
  };

  const handleResetPassword = () => {
    if (!email.trim() || !code.trim() || !password) {
      Alert.alert("Atencao", "Preencha e-mail, codigo e nova senha.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Atencao", "A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    resetPassword(
      {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
      },
      {
        onSuccess: (response) => {
          Alert.alert("Senha redefinida", response.message, [
            {
              text: "Entrar",
              onPress: () => {
                router.replace("/auth/login");
              },
            },
          ]);
        },
        onError: (err: any) => {
          Alert.alert(
            "Erro",
            err.message ?? "Nao foi possivel redefinir a senha."
          );
        },
      }
    );
  };

  const isPending = isRequesting || isResetting;

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
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
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
                  Recuperar acesso
                </Text>
                <Text className="mt-3 text-base leading-7 text-gray-500">
                  Solicite um código e defina uma nova senha para a sua conta.
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
                    editable={!requestSent}
                    className="ml-3 flex-1 py-4 text-base font-medium text-gray-900"
                  />
                </InputRow>

                {!requestSent ? (
                  <TouchableOpacity
                    onPress={handleRequestCode}
                    disabled={isPending}
                    className="mt-4 w-full items-center justify-center rounded-full py-4"
                    style={{
                      backgroundColor: "#7C3AED",
                      opacity: isPending ? 0.7 : 1,
                    }}
                    activeOpacity={0.85}
                  >
                    {isRequesting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-lg font-bold text-white">
                        Enviar código
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <>
                    <View className="rounded-[24px] border border-violet-100 bg-violet-50/45 px-4 py-4">
                      <View className="flex-row items-start">
                        <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-white">
                          <ShieldCheck size={18} color="#7C3AED" />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-sm font-bold text-gray-900">
                            Verifique o codigo de recuperacao
                          </Text>
                          <Text className="mt-1 text-sm leading-6 text-gray-500">
                            Em ambiente de desenvolvimento, o codigo pode
                            aparecer no log do backend.
                          </Text>
                        </View>
                      </View>
                    </View>

                    <InputRow icon={<ShieldCheck size={20} color="#9CA3AF" />}>
                      <TextInput
                        placeholder="Codigo de 6 digitos"
                        placeholderTextColor="#9CA3AF"
                        value={code}
                        onChangeText={setCode}
                        keyboardType="number-pad"
                        className="ml-3 flex-1 py-4 text-base font-medium text-gray-900"
                      />
                    </InputRow>

                    <InputRow icon={<Lock size={20} color="#9CA3AF" />}>
                      <TextInput
                        placeholder="Nova senha"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        className="ml-3 flex-1 py-4 text-base font-medium text-gray-900"
                      />
                    </InputRow>

                    <TouchableOpacity
                      onPress={handleResetPassword}
                      disabled={isPending}
                      className="mt-4 w-full items-center justify-center rounded-full py-4"
                      style={{
                        backgroundColor: "#7C3AED",
                        opacity: isPending ? 0.7 : 1,
                      }}
                      activeOpacity={0.85}
                    >
                      {isResetting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text className="text-lg font-bold text-white">
                          Redefinir senha
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
