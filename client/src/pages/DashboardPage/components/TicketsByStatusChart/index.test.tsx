import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import TicketsByStatusChart from ".";

const BASE_URL = "http://localhost:3000";

vi.stubEnv("VITE_SERVER_BASE_URL", BASE_URL);

const mockTicketsByStatus = [
  { status: "new", count: 0 },
  { status: "processing", count: 0 },
  { status: "open", count: 4 },
  { status: "resolved", count: 6 },
  { status: "closed", count: 2 },
];

let capturedUrl: URL | null = null;

const server = setupServer(
  http.get(`${BASE_URL}/api/dashboard/tickets-by-status`, ({ request }) => {
    capturedUrl = new URL(request.url);
    return HttpResponse.json({ ticketsByStatus: mockTicketsByStatus });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  capturedUrl = null;
});
afterAll(() => server.close());

describe("TicketsByStatusChart", () => {
  it("shows a skeleton while loading", () => {
    renderWithQuery(<TicketsByStatusChart />);
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("defaults to a 30-day range with no category filter", async () => {
    renderWithQuery(<TicketsByStatusChart />);
    await waitFor(() => expect(capturedUrl).not.toBeNull());

    expect(capturedUrl!.searchParams.get("range")).toBe("30d");
    expect(capturedUrl!.searchParams.get("category")).toBeNull();
  });

  it("renders the chart and legend after data loads", async () => {
    renderWithQuery(<TicketsByStatusChart />);
    await waitFor(() => expect(document.querySelector('[data-slot="chart"]')).toBeInTheDocument());

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows a fallback message when every status has zero tickets", async () => {
    server.use(
      http.get(`${BASE_URL}/api/dashboard/tickets-by-status`, () =>
        HttpResponse.json({
          ticketsByStatus: [
            { status: "new", count: 0 },
            { status: "processing", count: 0 },
            { status: "open", count: 0 },
            { status: "resolved", count: 0 },
            { status: "closed", count: 0 },
          ],
        })
      )
    );
    renderWithQuery(<TicketsByStatusChart />);
    await waitFor(() => screen.getByText("No tickets in this range."));
    expect(document.querySelector('[data-slot="chart"]')).not.toBeInTheDocument();
  });

  it("requests the newly selected date range", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TicketsByStatusChart />);
    await waitFor(() => expect(capturedUrl).not.toBeNull());

    await user.click(screen.getByLabelText("Filter by date range"));
    await user.click(await screen.findByRole("option", { name: "Last 7 Days" }));

    await waitFor(() => expect(capturedUrl!.searchParams.get("range")).toBe("7d"));
  });

  it("requests the newly selected category", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TicketsByStatusChart />);
    await waitFor(() => expect(capturedUrl).not.toBeNull());

    await user.click(screen.getByLabelText("Filter by category"));
    await user.click(await screen.findByRole("option", { name: "Refund Request" }));

    await waitFor(() => expect(capturedUrl!.searchParams.get("category")).toBe("refund_request"));
  });

  it("shows an error message when the request fails", async () => {
    server.use(
      http.get(`${BASE_URL}/api/dashboard/tickets-by-status`, () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 })
      )
    );
    renderWithQuery(<TicketsByStatusChart />);
    await waitFor(() =>
      expect(screen.getByText(/request failed with status code 403/i)).toBeInTheDocument()
    );
  });
});
