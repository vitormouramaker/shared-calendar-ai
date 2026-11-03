import axios from "axios";
import { useAuthStore } from "../store/auth-store";
import { queryClient } from "./query-client";
import {
  getApiBaseUrlCandidates,
  getInitialApiBaseUrl,
  getPreferredApiBaseUrl,
  setPreferredApiBaseUrl,
} from "./api-base-url";

type RetryableAxiosConfig = {
  _baseUrlCandidateIndex?: number;
  _didLogBaseUrlCandidates?: boolean;
  headers?: Record<string, string>;
  baseURL?: string;
  url?: string;
 };

export const api = axios.create({
  baseURL: getInitialApiBaseUrl(),
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const candidates = getApiBaseUrlCandidates();
  const retryableConfig = config as typeof config & RetryableAxiosConfig;
  const preferredBaseUrl = getPreferredApiBaseUrl();

  if (preferredBaseUrl) {
    retryableConfig.baseURL = preferredBaseUrl;
  } else if (!retryableConfig.baseURL) {
    retryableConfig.baseURL = candidates[0];
  }

  if (!retryableConfig._didLogBaseUrlCandidates) {
    console.log("[api] request candidates", {
      url: retryableConfig.url,
      selectedBaseURL: retryableConfig.baseURL,
      candidates,
    });
    retryableConfig._didLogBaseUrlCandidates = true;
  }

  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.config.baseURL) {
      setPreferredApiBaseUrl(response.config.baseURL);
      api.defaults.baseURL = response.config.baseURL;
    }

    return response;
  },
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && error.config) {
      const authHeader =
        (error.config.headers as Record<string, string> | undefined)?.Authorization ??
        (error.config.headers as Record<string, string> | undefined)?.authorization;

      if (authHeader) {
        queryClient.clear();
        useAuthStore
          .getState()
          .clearAuth("Sua sessao expirou ou nao e mais valida. Entre novamente.");
      }
    }

    if (!axios.isAxiosError(error) || error.response || !error.config) {
      return Promise.reject(error);
    }

    const config = error.config as typeof error.config & RetryableAxiosConfig;
    const candidates = getApiBaseUrlCandidates();
    const currentIndex =
      config._baseUrlCandidateIndex ??
      Math.max(candidates.indexOf(config.baseURL ?? ""), 0);

    const nextCandidate = candidates[currentIndex + 1];

    if (!nextCandidate) {
      return Promise.reject(error);
    }

    config.baseURL = nextCandidate;
    config._baseUrlCandidateIndex = currentIndex + 1;
    api.defaults.baseURL = nextCandidate;

    console.log("[api] retrying request with fallback baseURL", {
      url: config.url,
      from: candidates[currentIndex] ?? error.config.baseURL,
      to: nextCandidate,
    });

    return api.request(config);
  }
);
