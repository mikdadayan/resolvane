import { vi } from "vitest";
import { runtimeConfig } from "@/lib/runtime-config";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("uses runtime settings ahead of development environment values", () => {
  vi.stubEnv("VITE_SERVER_BASE_URL", "http://localhost:3000");
  vi.stubGlobal("APP_CONFIG", {
    apiBaseUrl: "https://api.test.example/",
    sentryDsn: "https://public@example.com/1",
    sentryEnvironment: "staging",
  });

  expect(runtimeConfig.apiBaseUrl).toBe("https://api.test.example");
  expect(runtimeConfig.sentryDsn).toBe("https://public@example.com/1");
  expect(runtimeConfig.sentryEnvironment).toBe("staging");
});

it("keeps local environment defaults during development", () => {
  vi.stubEnv("DEV", true);
  vi.stubGlobal("APP_CONFIG", {});
  vi.stubEnv("VITE_SERVER_BASE_URL", "http://localhost:3001");
  vi.stubEnv("VITE_SENTRY_DSN", "local-dsn");
  vi.stubEnv("VITE_SENTRY_ENVIRONMENT", "development");

  expect(runtimeConfig.apiBaseUrl).toBe("http://localhost:3001");
  expect(runtimeConfig.sentryDsn).toBe("local-dsn");
  expect(runtimeConfig.sentryEnvironment).toBe("development");
});

it("ignores build-time environment settings in production", () => {
  vi.stubEnv("DEV", false);
  vi.stubGlobal("APP_CONFIG", {});
  vi.stubEnv("VITE_SERVER_BASE_URL", "https://wrong-api.example");
  vi.stubEnv("VITE_SENTRY_DSN", "wrong-dsn");
  vi.stubEnv("VITE_SENTRY_ENVIRONMENT", "wrong-environment");

  expect(runtimeConfig.apiBaseUrl).toBe(window.location.origin);
  expect(runtimeConfig.sentryDsn).toBe("");
  expect(runtimeConfig.sentryEnvironment).toBe(import.meta.env.MODE);
});

it("supports same-origin APIs with an empty runtime API URL", () => {
  vi.stubGlobal("APP_CONFIG", { apiBaseUrl: "" });
  expect(runtimeConfig.apiBaseUrl).toBe(window.location.origin);
});

it("allows runtime configuration to explicitly disable Sentry", () => {
  vi.stubEnv("VITE_SENTRY_DSN", "local-dsn");
  vi.stubGlobal("APP_CONFIG", { sentryDsn: "" });
  expect(runtimeConfig.sentryDsn).toBe("");
});
