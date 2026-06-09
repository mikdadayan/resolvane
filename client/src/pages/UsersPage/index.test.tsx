import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import { Role } from "@helpdesk/core";
import UsersPage from ".";

const BASE_URL = "http://localhost:3000";

vi.stubEnv("VITE_SERVER_BASE_URL", BASE_URL);

const mockUsers = [
  { id: "1", name: "Alice Admin", email: "alice@example.com", role: Role.admin, createdAt: "2024-01-15T00:00:00.000Z" },
  { id: "2", name: "Bob Agent", email: "bob@example.com", role: Role.agent, createdAt: "2024-03-20T00:00:00.000Z" },
];

const server = setupServer(
  http.get(`${BASE_URL}/api/users`, () =>
    HttpResponse.json({ users: mockUsers })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("UsersPage", () => {
  it("shows skeleton rows while loading", () => {
    renderWithQuery(<UsersPage />);
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    // 4 skeletons per row × 5 rows
    expect(skeletons.length).toBe(20);
  });

  it("renders the table header immediately", () => {
    renderWithQuery(<UsersPage />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Joined")).toBeInTheDocument();
  });

  it("renders user rows after data loads", async () => {
    renderWithQuery(<UsersPage />);
    await waitFor(() => screen.getByText("Alice Admin"));

    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bob Agent")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("hides skeletons once data has loaded", async () => {
    renderWithQuery(<UsersPage />);
    await waitFor(() => screen.getByText("Alice Admin"));
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(0);
  });

  it("displays role badges with correct labels", async () => {
    renderWithQuery(<UsersPage />);
    await waitFor(() => screen.getByText("Alice Admin"));

    const rows = screen.getAllByRole("row").slice(1); // skip header row
    const aliceRow = rows[0];
    const bobRow = rows[1];

    expect(within(aliceRow).getByText("admin")).toBeInTheDocument();
    expect(within(bobRow).getByText("agent")).toBeInTheDocument();
  });

  it("formats the joined date", async () => {
    renderWithQuery(<UsersPage />);
    await waitFor(() => screen.getByText("Alice Admin"));

    const formatted = new Date("2024-01-15T00:00:00.000Z").toLocaleDateString();
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  describe("Create User dialog", () => {
    it("opens when New User button is clicked", async () => {
      const user = userEvent.setup();
      renderWithQuery(<UsersPage />);

      await user.click(screen.getByRole("button", { name: /new user/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /create user/i })).toBeInTheDocument();
    });

    it("closes when Escape is pressed", async () => {
      const user = userEvent.setup();
      renderWithQuery(<UsersPage />);

      await user.click(screen.getByRole("button", { name: /new user/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes when clicking outside the dialog", async () => {
      const user = userEvent.setup();
      renderWithQuery(<UsersPage />);

      await user.click(screen.getByRole("button", { name: /new user/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.click(document.querySelector('[data-slot="dialog-overlay"]')!);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows an error message when the request fails", async () => {
    server.use(
      http.get(`${BASE_URL}/api/users`, () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 })
      )
    );

    renderWithQuery(<UsersPage />);
    await waitFor(() =>
      expect(screen.getByText(/request failed with status code 403/i)).toBeInTheDocument()
    );
  });
});
