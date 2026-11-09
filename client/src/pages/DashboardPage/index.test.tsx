import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import type { DashboardStats } from "@resolvane/core";
import DashboardPage from ".";

const BASE_URL = "http://localhost:3000";

vi.stubEnv("VITE_SERVER_BASE_URL", BASE_URL);

const mockStats: DashboardStats = {
  totalTickets: 42,
  openTickets: 7,
  aiResolvedTickets: 15,
  aiResolvedPercentage: 62.5,
  avgResolutionTimeMs: 2 * 60 * 60 * 1000 + 15 * 60 * 1000,
  ticketsPerDay: [
    { date: "2026-06-10", count: 3 },
    { date: "2026-06-11", count: 5 },
  ],
};

const server = setupServer(
  http.get(`${BASE_URL}/api/dashboard/stats`, () => HttpResponse.json(mockStats)),
  http.get(`${BASE_URL}/api/dashboard/tickets-by-status`, () =>
    HttpResponse.json({
      ticketsByStatus: [
        { status: "new", count: 0 },
        { status: "processing", count: 0 },
        { status: "open", count: 4 },
        { status: "resolved", count: 6 },
        { status: "closed", count: 0 },
      ],
    })
  ),
  http.get(`${BASE_URL}/api/dashboard/tickets-by-assignee`, () =>
    HttpResponse.json({
      ticketsByAssignee: [
        { assigneeId: "user-1", assigneeName: "Agent Smith", count: 6 },
        { assigneeId: null, assigneeName: "Unassigned", count: 4 },
      ],
    })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("DashboardPage", () => {
  it("shows skeletons while loading", () => {
    renderWithQuery(<DashboardPage />);
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(8);
  });

  it("renders all five stats after data loads", async () => {
    renderWithQuery(<DashboardPage />);
    await waitFor(() => screen.getByText("42"));

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("62.5%")).toBeInTheDocument();
    expect(screen.getByText("2h 15m")).toBeInTheDocument();
  });

  it("renders the tickets-per-day chart after data loads", async () => {
    renderWithQuery(<DashboardPage />);
    await waitFor(() => screen.getByText("42"));

    expect(screen.getByText("Tickets Received (Last 30 Days)")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="chart"]')).toBeInTheDocument();
  });

  it("renders the tickets-by-status and tickets-by-assignee charts after data loads", async () => {
    renderWithQuery(<DashboardPage />);
    await waitFor(() => screen.getByText("Tickets by Status"));
    await waitFor(() => screen.getByText("Tickets by Assignee"));

    const charts = await waitFor(() => {
      const found = document.querySelectorAll('[data-slot="chart"]');
      expect(found.length).toBe(3);
      return found;
    });
    expect(charts).toHaveLength(3);
  });

  it("shows an em dash when there's no resolution time data yet", async () => {
    server.use(
      http.get(`${BASE_URL}/api/dashboard/stats`, () =>
        HttpResponse.json({ ...mockStats, avgResolutionTimeMs: null })
      )
    );
    renderWithQuery(<DashboardPage />);
    await waitFor(() => screen.getByText("42"));
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    server.use(
      http.get(`${BASE_URL}/api/dashboard/stats`, () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 })
      )
    );
    renderWithQuery(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText(/request failed with status code 403/i)).toBeInTheDocument()
    );
  });
});
