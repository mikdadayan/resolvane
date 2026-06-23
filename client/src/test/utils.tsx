import { type ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

export function renderWithQuery(ui: ReactElement, options?: { initialEntries?: string[] }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={options?.initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
