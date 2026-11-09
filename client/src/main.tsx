import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import { reportUnexpectedError } from '@/lib/sentry'
import { runtimeConfig } from '@/lib/runtime-config'
import { ThemeProvider } from '@/components/ThemeProvider'
import './index.css'
import App from './App.tsx'
import { Toaster } from '@/components/ui/sonner'

if (runtimeConfig.sentryDsn) {
  Sentry.init({
    dsn: runtimeConfig.sentryDsn,
    environment: runtimeConfig.sentryEnvironment,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  })
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: reportUnexpectedError }),
  mutationCache: new MutationCache({ onError: reportUnexpectedError }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please refresh the page.</p>}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
            <Toaster />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
