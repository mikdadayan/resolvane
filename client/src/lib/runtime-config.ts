declare global {
  interface Window {
    APP_CONFIG?: {
      apiBaseUrl?: string;
      sentryDsn?: string;
      sentryEnvironment?: string;
    };
  }
}

export const runtimeConfig = {
  get apiBaseUrl(): string {
    const baseUrl = window.APP_CONFIG?.apiBaseUrl
      ?? (import.meta.env.DEV ? import.meta.env.VITE_SERVER_BASE_URL : undefined)
      ?? window.location.origin;
    return (baseUrl || window.location.origin).replace(/\/+$/, "");
  },
  get sentryDsn(): string {
    return window.APP_CONFIG?.sentryDsn
      ?? (import.meta.env.DEV ? import.meta.env.VITE_SENTRY_DSN : undefined)
      ?? "";
  },
  get sentryEnvironment(): string {
    return window.APP_CONFIG?.sentryEnvironment
      ?? (import.meta.env.DEV ? import.meta.env.VITE_SENTRY_ENVIRONMENT : undefined)
      ?? import.meta.env.MODE;
  },
};
