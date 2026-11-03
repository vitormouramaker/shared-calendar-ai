import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  AtSign,
  Camera,
  ChevronLeft,
  Mail,
  Shield,
  Trash2,
  User,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useProfile, useUpdateProfile } from "../../src/hooks/useProfile";
import { useAppDialogStore } from "../../src/store/app-dialog-store";
import { Avatar } from "../../src/components/ui/avatar";

function InputRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center border-b border-gray-100 py-1">
      <View className="w-7 items-start">{icon}</View>
      {children}
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const showDialog = useAppDialogStore((state) => state.showDialog);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(true);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setName(profile.name);
    setUsername(profile.username);
    setEmail(profile.email);
    setAvatarUrl(profile.avatar_url ?? null);
    setIsPrivate(profile.is_private);
  }, [profile]);

  const handlePickAvatar = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showDialog({
          title: "Permissao necessaria",
          message: "Permita acesso as fotos para definir sua foto de perfil.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (asset.base64) {
        setAvatarUrl(
          `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`
        );
        return;
      }

      if (asset.uri) {
        setAvatarUrl(asset.uri);
      }
    } catch {
      showDialog({
        title: "Erro",
        message: "Nao foi possivel selecionar a foto agora.",
        tone: "danger",
      });
    }
  };

  const handleSave = () => {
    const normalizedName = name.trim();
    const normalizedUsername = username.trim().replace(/^@/, "").toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedUsername || !normalizedEmail) {
      showDialog({
        title: "Atencao",
        message: "Nome, username e e-mail sao obrigatorios.",
        tone: "danger",
      });
      return;
    }

    updateProfile(
      {
        name: normalizedName,
        username: normalizedUsername,
        email: normalizedEmail,
        avatar_url: avatarUrl,
        is_private: isPrivate,
      },
      {
        onSuccess: () => {
          showDialog({
            title: "Perfil atualizado",
            message: "Suas informacoes foram salvas com sucesso.",
            confirmText: "Fechar",
            tone: "success",
            onConfirm: () => router.back(),
          });
        },
        onError: (err: any) => {
          showDialog({
            title: "Erro",
            message: err?.message ?? "Nao foi possivel atualizar o perfil.",
            tone: "danger",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#7C3AED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Editar perfil</Text>
        <View className="h-6 w-6" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          <View className="mt-2 px-1 pb-1">
            <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
              Atualize os dados do seu perfil
            </Text>
            <Text className="mt-3 text-sm leading-6 text-gray-500">
              Edite foto, nome, username, e-mail e o nível de privacidade da
              agenda.
            </Text>

            <View className="mt-5 flex-row items-center">
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <Avatar
                  name={name || profile?.name}
                  avatarUrl={null}
                  size={64}
                  backgroundColor="#EDE9FE"
                  textColor="#7C3AED"
                />
              )}

              <View className="ml-4 flex-1">
                <TouchableOpacity
                  onPress={() => void handlePickAvatar()}
                  activeOpacity={0.88}
                  className="flex-row items-center"
                >
                  <Camera size={18} color="#7C3AED" />
                  <Text className="ml-2 text-sm font-bold text-violet-700">
                    Alterar foto
                  </Text>
                </TouchableOpacity>

                {avatarUrl ? (
                  <TouchableOpacity
                    onPress={() => setAvatarUrl(null)}
                    activeOpacity={0.88}
                    className="mt-3 flex-row items-center"
                  >
                    <Trash2 size={18} color="#FCA5A5" />
                    <Text className="ml-2 text-sm font-bold text-rose-500">
                      Remover foto
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          <View className="mt-6 gap-4">
            <InputRow icon={<User size={20} color="#7C3AED" />}>
              <TextInput
                placeholder="Nome completo"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                className="ml-2 flex-1 py-4 text-base font-medium text-gray-900"
              />
            </InputRow>

            <InputRow icon={<AtSign size={20} color="#7C3AED" />}>
              <TextInput
                placeholder="username"
                placeholderTextColor="#9CA3AF"
                value={username}
                onChangeText={(value) => setUsername(value.replace(/\s/g, ""))}
                autoCapitalize="none"
                autoCorrect={false}
                className="ml-2 flex-1 py-4 text-base font-medium text-gray-900"
              />
            </InputRow>

            <InputRow icon={<Mail size={20} color="#7C3AED" />}>
              <TextInput
                placeholder="E-mail"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="ml-2 flex-1 py-4 text-base font-medium text-gray-900"
              />
            </InputRow>
          </View>

          <View className="mt-6 flex-row items-center justify-between border-b border-gray-100 py-4">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center">
                <Shield size={18} color="#7C3AED" />
                <Text className="ml-3 text-base font-bold text-gray-900">
                  Privacidade da agenda
                </Text>
              </View>
              <Text className="mt-3 text-sm leading-6 text-gray-500">
                {isPrivate
                  ? "Somente convidados podem ver a sua agenda."
                  : "Sua agenda fica aberta para quem buscar seu username."}
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#D1D5DB", true: "#C4B5FD" }}
              thumbColor={isPrivate ? "#7C3AED" : "#FFFFFF"}
              value={isPrivate}
              onValueChange={setIsPrivate}
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isPending}
            className="mt-8 w-full items-center justify-center rounded-full py-4"
            style={{ backgroundColor: "#7C3AED", opacity: isPending ? 0.7 : 1 }}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-lg font-bold text-white">
                Salvar alterações
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
