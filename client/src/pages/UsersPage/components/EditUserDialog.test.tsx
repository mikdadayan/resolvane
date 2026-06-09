import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import { Role } from "@helpdesk/core";
import EditUserDialog from "./EditUserDialog";
import type { User } from "../types";

const BASE_URL = "http://localhost:3000";

vi.stubEnv("VITE_SERVER_BASE_URL", BASE_URL);

const mockUser: User = {
  id: "1",
  name: "Jane Doe",
  email: "jane@example.com",
  role: Role.agent,
  createdAt: "2024-01-15T00:00:00.000Z",
};

const server = setupServer(
  http.patch(`${BASE_URL}/api/users/${mockUser.id}`, () =>
    HttpResponse.json({ user: mockUser })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDialog(user: User | null = mockUser, onOpenChange = vi.fn()) {
  renderWithQuery(<EditUserDialog user={user} onOpenChange={onOpenChange} />);
  return { onOpenChange };
}

describe("EditUserDialog", () => {
  describe("pre-population", () => {
    it("pre-fills name and email from the user prop", () => {
      renderDialog();
      expect(screen.getByLabelText(/^name$/i)).toHaveValue("Jane Doe");
      expect(screen.getByLabelText(/^email$/i)).toHaveValue("jane@example.com");
    });

    it("starts with an empty password field", () => {
      renderDialog();
      expect(screen.getByLabelText(/new password/i)).toHaveValue("");
    });

    it("does not render when user is null", () => {
      renderDialog(null);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows name error when name is too short", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.clear(screen.getByLabelText(/^name$/i));
      await user.type(screen.getByLabelText(/^name$/i), "ab");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(await screen.findByText(/name must be at least 3 characters/i)).toBeInTheDocument();
    });

    it("shows password error when a too-short password is provided", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.type(screen.getByLabelText(/new password/i), "short");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it("accepts an empty password without a validation error", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(screen.queryByText(/password must be at least 8 characters/i)).not.toBeInTheDocument()
      );
    });
  });

  describe("submission", () => {
    it("PATCHes correct payload when a new password is provided", async () => {
      const user = userEvent.setup();
      let body: unknown;

      server.use(
        http.patch(`${BASE_URL}/api/users/${mockUser.id}`, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ user: mockUser });
        })
      );

      renderDialog();
      await user.type(screen.getByLabelText(/new password/i), "newpassword123");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() =>
        expect(body).toMatchObject({
          name: "Jane Doe",
          email: "jane@example.com",
          password: "newpassword123",
          role: Role.agent,
        })
      );
    });

    it("PATCHes with empty password when the password field is left blank", async () => {
      const user = userEvent.setup();
      let body: unknown;

      server.use(
        http.patch(`${BASE_URL}/api/users/${mockUser.id}`, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ user: mockUser });
        })
      );

      renderDialog();
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => expect(body).toMatchObject({ password: "" }));
    });

    it("calls onOpenChange(false) after a successful save", async () => {
      const user = userEvent.setup();
      const { onOpenChange } = renderDialog();

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });

    it("shows Saving… and disables the button while the request is in flight", async () => {
      let resolve!: () => void;
      server.use(
        http.patch(`${BASE_URL}/api/users/${mockUser.id}`, () =>
          new Promise<Response>((res) => {
            resolve = () => res(HttpResponse.json({ user: mockUser }));
          })
        )
      );

      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      const pendingBtn = await screen.findByRole("button", { name: /saving/i });
      expect(pendingBtn).toBeDisabled();

      resolve();
    });

    it("shows the server error message on failure", async () => {
      server.use(
        http.patch(`${BASE_URL}/api/users/${mockUser.id}`, () =>
          HttpResponse.json(
            { error: "A user with that email already exists." },
            { status: 409 }
          )
        )
      );

      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(
        await screen.findByText(/a user with that email already exists/i)
      ).toBeInTheDocument();
    });

    it("does not close the dialog when the server returns an error", async () => {
      server.use(
        http.patch(`${BASE_URL}/api/users/${mockUser.id}`, () =>
          new HttpResponse(null, { status: 500 })
        )
      );

      const user = userEvent.setup();
      const { onOpenChange } = renderDialog();
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await screen.findByText(/something went wrong/i);
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  describe("cancel", () => {
    it("calls onOpenChange(false) when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const { onOpenChange } = renderDialog();

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
