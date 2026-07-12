import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import TicketsByAssigneeChart from ".";

const BASE_URL = "http://localhost:3000";

vi.stubEnv("VITE_SERVER_BASE_URL", BASE_URL);

const mockTicketsByAssignee = [
  { assigneeId: "user-1", assigneeName: "Agent Smith", count: 6 },
  { assigneeId: "user-2", assigneeName: "Agent Jones", count: 3 },
  { assigneeId: null, assigneeName: "Unassigned", count: 2 },
];

let capturedUrl: URL | null = null;

const server = setupServer(
  http.get(`${BASE_URL}/api/dashboard/tickets-by-assignee`, ({ request }) => {
    capturedUrl = new URL(request.url);
    return HttpResponse.json({ ticketsByAssignee: mockTicketsByAssignee });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  capturedUrl = null;
});
afterAll(() => server.close());

describe("TicketsByAssigneeChart", () => {
  it("shows a skeleton while loading", () => {
    renderWithQuery(<TicketsByAssigneeChart />);
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("defaults to a 30-day range with no category filter", async () => {
    renderWithQuery(<TicketsByAssigneeChart />);
    await waitFor(() => expect(capturedUrl).not.toBeNull());

    expect(capturedUrl!.searchParams.get("range")).toBe("30d");
    expect(capturedUrl!.searchParams.get("category")).toBeNull();
  });

  it("renders the chart and legend after data loads", async () => {
    renderWithQuery(<TicketsByAssigneeChart />);
    await waitFor(() => expect(document.querySelector('[data-slot="chart"]')).toBeInTheDocument());

    expect(screen.getByText("Agent Smith")).toBeInTheDocument();
    expect(screen.getByText("Agent Jones")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("folds assignees beyond the top 7 into an Other slice", async () => {
    const manyAssignees = Array.from({ length: 9 }, (_, i) => ({
      assigneeId: `user-${i}`,
      assigneeName: `Agent ${i}`,
      count: 9 - i,
    }));
    server.use(
      http.get(`${BASE_URL}/api/dashboard/tickets-by-assignee`, () =>
        HttpResponse.json({ ticketsByAssignee: manyAssignees })
      )
    );
    renderWithQuery(<TicketsByAssigneeChart />);
    await waitFor(() => expect(document.querySelector('[data-slot="chart"]')).toBeInTheDocument());

    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.queryByText("Agent 7")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent 8")).not.toBeInTheDocument();
    expect(screen.getByText("Agent 0")).toBeInTheDocument();
  });

  it("shows a fallback message when there are no assigned tickets", async () => {
    server.use(
      http.get(`${BASE_URL}/api/dashboard/tickets-by-assignee`, () =>
        HttpResponse.json({ ticketsByAssignee: [] })
      )
    );
    renderWithQuery(<TicketsByAssigneeChart />);
    await waitFor(() => screen.getByText("No tickets in this range."));
    expect(document.querySelector('[data-slot="chart"]')).not.toBeInTheDocument();
  });

  it("requests the newly selected date range", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TicketsByAssigneeChart />);
    await waitFor(() => expect(capturedUrl).not.toBeNull());

    await user.click(screen.getByLabelText("Filter by date range"));
    await user.click(await screen.findByRole("option", { name: "Last 90 Days" }));

    await waitFor(() => expect(capturedUrl!.searchParams.get("range")).toBe("90d"));
  });

  it("requests the newly selected category", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TicketsByAssigneeChart />);
    await waitFor(() => expect(capturedUrl).not.toBeNull());

    await user.click(screen.getByLabelText("Filter by category"));
    await user.click(await screen.findByRole("option", { name: "General Question" }));

    await waitFor(() => expect(capturedUrl!.searchParams.get("category")).toBe("general_question"));
  });

  it("shows an error message when the request fails", async () => {
    server.use(
      http.get(`${BASE_URL}/api/dashboard/tickets-by-assignee`, () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 })
      )
    );
    renderWithQuery(<TicketsByAssigneeChart />);
    await waitFor(() =>
      expect(screen.getByText(/request failed with status code 403/i)).toBeInTheDocument()
    );
  });
});
