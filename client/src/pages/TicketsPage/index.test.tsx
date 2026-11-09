import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import { TicketStatus, TicketCategory } from "@resolvane/core";
import TicketsPage from ".";

const BASE_URL = "http://localhost:3000";

vi.stubEnv("VITE_SERVER_BASE_URL", BASE_URL);

const mockTickets = [
  {
    id: "1",
    subject: "Cannot log in",
    senderName: "Jane Customer",
    senderEmail: "jane@example.com",
    status: TicketStatus.open,
    category: TicketCategory.technicalQuestion,
    receivedAt: "2026-06-23T10:00:00.000Z",
    assignedTo: { id: "u1", name: "Agent Smith" },
  },
  {
    id: "2",
    subject: "Refund please",
    senderName: "John Doe",
    senderEmail: "john@example.com",
    status: TicketStatus.closed,
    category: null,
    receivedAt: "2026-06-20T10:00:00.000Z",
    assignedTo: null,
  },
];

let capturedUrl: URL | null = null;

const server = setupServer(
  http.get(`${BASE_URL}/api/tickets`, ({ request }) => {
    capturedUrl = new URL(request.url);
    return HttpResponse.json({ tickets: mockTickets, total: mockTickets.length });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  capturedUrl = null;
});
afterAll(() => server.close());

describe("TicketsPage", () => {
  it("shows skeleton rows while loading", () => {
    renderWithQuery(<TicketsPage />);
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(30);
  });

  it("renders the table header immediately", () => {
    renderWithQuery(<TicketsPage />);
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(screen.getByText("Received")).toBeInTheDocument();
  });

  it("renders ticket rows after data loads", async () => {
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    expect(screen.getByText("Cannot log in")).toBeInTheDocument();
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument();
    expect(screen.getByText("Refund please")).toBeInTheDocument();
  });

  it("shows category label or uncategorized fallback", async () => {
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    expect(screen.getByText("Technical Question")).toBeInTheDocument();
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
  });

  it("shows assigned agent name or unassigned fallback", async () => {
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    expect(screen.getByText("Agent Smith")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("displays status badges", async () => {
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("defaults to sorting by receivedAt desc", async () => {
    renderWithQuery(<TicketsPage />);
    await waitFor(() => expect(capturedUrl).not.toBeNull());

    expect(capturedUrl!.searchParams.get("sortBy")).toBe("receivedAt");
    expect(capturedUrl!.searchParams.get("sortOrder")).toBe("desc");
  });

  it("clicking a sortable header requests that column ascending", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    await user.click(screen.getByText("Subject"));

    await waitFor(() => {
      expect(capturedUrl!.searchParams.get("sortBy")).toBe("subject");
      expect(capturedUrl!.searchParams.get("sortOrder")).toBe("asc");
    });
  });

  it("shows the active sort chevron for the column matching the URL", async () => {
    renderWithQuery(<TicketsPage />, { initialEntries: ["/?sortBy=subject&sortOrder=asc"] });
    await waitFor(() => screen.getByText("Cannot log in"));

    const subjectHeader = screen.getByText("Subject").closest("th")!;
    expect(subjectHeader.querySelector("svg")).toBeInTheDocument();
  });

  it("does not make the Assigned column sortable", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    const assignedHeader = screen.getByText("Assigned").closest("th")!;
    expect(assignedHeader.querySelector("svg")).not.toBeInTheDocument();
    expect(assignedHeader).not.toHaveClass("cursor-pointer");

    await user.click(screen.getByText("Assigned"));

    expect(capturedUrl!.searchParams.get("sortBy")).toBe("receivedAt");
  });

  it("requests with the typed search term after debouncing", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    await user.type(screen.getByLabelText("Search tickets"), "refund");

    await waitFor(
      () => expect(capturedUrl!.searchParams.get("search")).toBe("refund"),
      { timeout: 1000 }
    );
  });

  it("filters by the selected status", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    await user.click(screen.getByLabelText("Filter by status"));
    await user.click(await screen.findByRole("option", { name: "Closed" }));

    await waitFor(() => expect(capturedUrl!.searchParams.get("status")).toBe("closed"));
  });

  it("filters by the selected category", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    await user.click(screen.getByLabelText("Filter by category"));
    await user.click(await screen.findByRole("option", { name: "Refund Request" }));

    await waitFor(() =>
      expect(capturedUrl!.searchParams.get("category")).toBe("refund_request")
    );
  });

  it("pre-populates filters from the URL on initial load", async () => {
    renderWithQuery(<TicketsPage />, {
      initialEntries: ["/?search=refund&status=closed&category=refund_request"],
    });
    await waitFor(() => screen.getByText("Cannot log in"));

    expect(screen.getByLabelText("Search tickets")).toHaveValue("refund");
    expect(capturedUrl!.searchParams.get("search")).toBe("refund");
    expect(capturedUrl!.searchParams.get("status")).toBe("closed");
    expect(capturedUrl!.searchParams.get("category")).toBe("refund_request");
  });

  it("shows page 1 of 1 and disables all pagination buttons when there's only one page", async () => {
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled();
  });

  it("clicking Next requests the next page", async () => {
    server.use(
      http.get(`${BASE_URL}/api/tickets`, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({ tickets: mockTickets, total: 25 });
      })
    );

    const user = userEvent.setup();
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => expect(capturedUrl!.searchParams.get("page")).toBe("2"));
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("clicking Last page jumps to the final page", async () => {
    server.use(
      http.get(`${BASE_URL}/api/tickets`, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({ tickets: mockTickets, total: 25 });
      })
    );

    const user = userEvent.setup();
    renderWithQuery(<TicketsPage />);
    await waitFor(() => screen.getByText("Cannot log in"));

    await user.click(screen.getByRole("button", { name: "Last page" }));

    await waitFor(() => expect(capturedUrl!.searchParams.get("page")).toBe("3"));
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
  });

  it("resets to page 1 when a filter changes", async () => {
    server.use(
      http.get(`${BASE_URL}/api/tickets`, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({ tickets: mockTickets, total: 25 });
      })
    );

    const user = userEvent.setup();
    renderWithQuery(<TicketsPage />, { initialEntries: ["/?page=2"] });
    await waitFor(() => screen.getByText("Cannot log in"));
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Filter by status"));
    await user.click(await screen.findByRole("option", { name: "Closed" }));

    await waitFor(() => expect(capturedUrl!.searchParams.get("page")).toBe("1"));
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    server.use(
      http.get(`${BASE_URL}/api/tickets`, () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 })
      )
    );

    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText(/request failed with status code 403/i)).toBeInTheDocument()
    );
  });
});
