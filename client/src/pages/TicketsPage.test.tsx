import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import { TicketStatus, TicketCategory } from "@helpdesk/core";
import TicketsPage from "./TicketsPage";

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

const server = setupServer(
  http.get(`${BASE_URL}/api/tickets`, () =>
    HttpResponse.json({ tickets: mockTickets })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
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

    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("closed")).toBeInTheDocument();
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
