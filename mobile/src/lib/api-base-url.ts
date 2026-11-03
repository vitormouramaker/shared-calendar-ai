import * as Device from "expo-device";
import { env } from "../config/env";
import { NativeModules, Platform } from "react-native";

const DEFAULT_BACKEND_PORT = 4444;
let preferredApiBaseUrl: string | null = null;

function parseUrlSafe(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getConfiguredBackendPort() {
  const configuredUrl = parseUrlSafe(env.EXPO_PUBLIC_API_URL);

  if (!configuredUrl) {
    return DEFAULT_BACKEND_PORT;
  }

  return configuredUrl.port ? Number(configuredUrl.port) : DEFAULT_BACKEND_PORT;
}

function getMetroHostname() {
  const scriptUrl: string | undefined =
    NativeModules.SourceCode?.scriptURL ?? NativeModules.SourceCode?.getConstants?.().scriptURL;

  const parsedScriptUrl = parseUrlSafe(scriptUrl);
  return parsedScriptUrl?.hostname ?? null;
}

function buildHttpUrl(hostname: string, port: number) {
  return `http://${hostname}:${port}`;
}

function pushUnique(list: string[], value?: string | null) {
  if (!value || list.includes(value)) {
    return;
  }

  list.push(value);
}

export function getApiBaseUrlCandidates() {
  const candidates: string[] = [];
  const configuredUrl = parseUrlSafe(env.EXPO_PUBLIC_API_URL);
  const backendPort = getConfiguredBackendPort();
  const metroHostname = getMetroHostname();

  pushUnique(candidates, preferredApiBaseUrl);

  if (__DEV__) {
    if (Platform.OS === "android" && !Device.isDevice) {
      pushUnique(candidates, buildHttpUrl("10.0.2.2", backendPort));
      pushUnique(candidates, buildHttpUrl("127.0.0.1", backendPort));
      pushUnique(candidates, buildHttpUrl("localhost", backendPort));
    }

    if (Platform.OS === "android" && Device.isDevice && metroHostname) {
      pushUnique(candidates, buildHttpUrl(metroHostname, backendPort));
    }

    if (metroHostname) {
      pushUnique(candidates, buildHttpUrl(metroHostname, backendPort));
    }

    if (Platform.OS === "ios" && !Device.isDevice) {
      pushUnique(candidates, buildHttpUrl("127.0.0.1", backendPort));
      pushUnique(candidates, buildHttpUrl("localhost", backendPort));
    }
  }

  pushUnique(candidates, configuredUrl?.toString());
  pushUnique(candidates, buildHttpUrl("localhost", backendPort));

  return candidates;
}

export function getInitialApiBaseUrl() {
  const candidates = getApiBaseUrlCandidates();
  return candidates[0] ?? buildHttpUrl("localhost", DEFAULT_BACKEND_PORT);
}

export function setPreferredApiBaseUrl(baseUrl: string) {
  preferredApiBaseUrl = baseUrl;
}

export function getPreferredApiBaseUrl() {
  return preferredApiBaseUrl;
}
