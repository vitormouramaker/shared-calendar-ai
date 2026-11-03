import { z } from "zod";

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().optional(),
});

// Variável vazia no .env conta como "não definida".
const _env = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL?.trim() || undefined,
});

if (!_env.success) {
  console.error("❌ Variáveis de ambiente inválidas", _env.error.format());
  throw new Error("Variáveis de ambiente inválidas");
}

export const env = _env.data;
