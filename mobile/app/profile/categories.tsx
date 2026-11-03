import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check, ChevronLeft, Pencil, Tag, Trash2 } from "lucide-react-native";
import { CATEGORY_COLOR_OPTIONS } from "../../src/lib/category-colors";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  type Category,
} from "../../src/hooks/useCategories";
import { useAppDialogStore } from "../../src/store/app-dialog-store";

function CategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  return (
    <View className="border-b border-gray-100 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center pr-4">
          <View
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-gray-900">{category.name}</Text>
            <Text className="mt-1 text-sm text-gray-500">{category.color}</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => onEdit(category)} activeOpacity={0.82} className="p-1">
            <Pencil size={18} color="#7C3AED" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(category)} activeOpacity={0.82} className="p-1">
            <Trash2 size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function CategoriesScreen() {
  const router = useRouter();
  const showDialog = useAppDialogStore((state) => state.showDialog);
  const { data: categories, isLoading } = useCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();

  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(CATEGORY_COLOR_OPTIONS[0]);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  const isSaving = isCreating || isUpdating;
  const hasCategories = (categories?.length ?? 0) > 0;
  const submitLabel = editingCategoryId ? "Salvar categoria" : "Adicionar categoria";

  const editingCategory = useMemo(
    () => categories?.find((item) => item.id === editingCategoryId) ?? null,
    [categories, editingCategoryId]
  );

  const resetForm = () => {
    setName("");
    setSelectedColor(CATEGORY_COLOR_OPTIONS[0]);
    setEditingCategoryId(null);
  };

  const handleSubmit = () => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      showDialog({
        title: "Atencao",
        message: "Informe um nome para a categoria.",
      });
      return;
    }

    if (editingCategoryId) {
      updateCategory(
        {
          id: editingCategoryId,
          payload: { name: normalizedName, color: selectedColor },
        },
        {
          onSuccess: () => {
            resetForm();
          },
          onError: (error: any) => {
            showDialog({
              title: "Erro",
              message: error?.message ?? "Nao foi possivel atualizar a categoria.",
              tone: "danger",
            });
          },
        }
      );
      return;
    }

    createCategory(
      { name: normalizedName, color: selectedColor },
      {
        onSuccess: () => {
          resetForm();
        },
        onError: (error: any) => {
          showDialog({
            title: "Erro",
            message: error?.message ?? "Nao foi possivel criar a categoria.",
            tone: "danger",
          });
        },
      }
    );
  };

  const handleEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setName(category.name);
    setSelectedColor(category.color);
  };

  const handleDelete = (category: Category) => {
    showDialog({
      title: "Apagar categoria",
      message: `Deseja remover a categoria ${category.name}?`,
      confirmText: "Apagar",
      cancelText: "Cancelar",
      tone: "danger",
      onConfirm: () => deleteCategory(category.id),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ChevronLeft size={22} color="#000000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Categorias</Text>
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
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={{ paddingBottom: 180 }}
        >
          <View className="px-1 pb-1 pt-2">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-violet-500">
            Eventos
          </Text>
          <Text className="mt-3 text-3xl font-bold leading-tight text-gray-900">
            Organize suas categorias
          </Text>
          <Text className="mt-3 text-sm leading-6 text-gray-500">
            Cadastre nomes e cores para reutilizar na criacao e edicao dos seus eventos.
          </Text>
        </View>

        <View className="mt-6">
          <View className="border-b border-gray-100 py-4">
            <View className="flex-row items-center">
              <Tag size={20} color="#7C3AED" />
              <Text className="ml-2 text-xs font-bold uppercase tracking-[1.5px] text-gray-400">
                Nome da categoria
              </Text>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex.: Reuniao, Trabalho, Pessoal"
              placeholderTextColor="#9CA3AF"
              className="mt-3 text-base font-medium text-gray-900"
            />
          </View>

          <View className="py-4">
            <Text className="text-xs font-bold uppercase tracking-[1.5px] text-gray-400">
              Cor
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {CATEGORY_COLOR_OPTIONS.map((color) => {
                const isSelected = selectedColor === color;

                return (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    activeOpacity={0.88}
                    className="h-14 w-14 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: isSelected ? "#111827" : "#E5E7EB",
                      backgroundColor: isSelected ? "#F5F3FF" : "#FFFFFF",
                    }}
                  >
                    <View
                      className="h-9 w-9 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {isSelected ? (
                      <View className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-gray-900">
                        <Check size={14} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="mt-2 flex-row gap-3">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSaving}
              activeOpacity={0.88}
              className="flex-1 items-center justify-center rounded-full py-4"
              style={{ backgroundColor: "#7C3AED", opacity: isSaving ? 0.7 : 1 }}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-bold text-white">{submitLabel}</Text>
              )}
            </TouchableOpacity>

            {editingCategoryId ? (
              <TouchableOpacity
                onPress={resetForm}
                activeOpacity={0.88}
                className="items-center justify-center rounded-full border border-gray-200 px-5 py-4"
              >
                <Text className="text-base font-bold text-gray-700">Cancelar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

          <View className="mt-8">
          <Text className="text-xs font-bold uppercase tracking-[1.5px] text-gray-400">
            Categorias cadastradas
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#7C3AED" className="mt-6" />
          ) : hasCategories ? (
            <View className="mt-3">
              {categories?.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          ) : (
            <View className="mt-4 rounded-[26px] border border-gray-200 bg-gray-50/70 px-5 py-6">
              <Text className="text-base font-bold text-gray-900">Nenhuma categoria ainda</Text>
              <Text className="mt-2 text-sm leading-6 text-gray-500">
                Crie sua primeira categoria para aparecer na tela de novo evento.
              </Text>
            </View>
          )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
