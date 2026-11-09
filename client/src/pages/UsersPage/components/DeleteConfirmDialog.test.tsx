import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import { Role } from "@resolvane/core";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import type { User } from "../types";

const BASE_URL = "http://localhost:3000";

vi.stubEnv("VITE_SERVER_BASE_URL", BASE_URL);

const mockUser: User = {
  id: "42",
  name: "Jane Agent",
  email: "jane@example.com",
  role: Role.agent,
  createdAt: "2024-01-15T00:00:00.000Z",
};

const server = setupServer(
  http.delete(`${BASE_URL}/api/users/${mockUser.id}`, () =>
    new HttpResponse(null, { status: 204 })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDialog(user: User | null = mockUser, onOpenChange = vi.fn()) {
  renderWithQuery(<DeleteConfirmDialog user={user} onOpenChange={onOpenChange} />);
  return { onOpenChange };
}

describe("DeleteConfirmDialog", () => {
  describe("rendering", () => {
    it("does not render when user is null", () => {
      renderDialog(null);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows the Delete User heading when open", () => {
      renderDialog();
      expect(screen.getByRole("heading", { name: /delete user/i })).toBeInTheDocument();
    });

    it("shows the user's name in the confirmation text", () => {
      renderDialog();
      expect(screen.getByText("Jane Agent")).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });
  });

  describe("deletion", () => {
    it("sends DELETE to the correct URL on confirm", async () => {
      const user = userEvent.setup();
      let deletedId: string | undefined;

      server.use(
        http.delete(`${BASE_URL}/api/users/:id`, ({ params }) => {
          deletedId = params["id"] as string;
          return new HttpResponse(null, { status: 204 });
        })
      );

      renderDialog();
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => expect(deletedId).toBe(mockUser.id));
    });

    it("calls onOpenChange(false) after successful deletion", async () => {
      const user = userEvent.setup();
      const { onOpenChange } = renderDialog();

      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });

    it("shows Deleting… and disables the button while the request is in flight", async () => {
      let resolve!: () => void;
      server.use(
        http.delete(`${BASE_URL}/api/users/${mockUser.id}`, () =>
          new Promise<Response>((res) => {
            resolve = () => res(new HttpResponse(null, { status: 204 }));
          })
        )
      );

      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      const pendingBtn = await screen.findByRole("button", { name: /deleting/i });
      expect(pendingBtn).toBeDisabled();

      resolve();
    });

    it("shows the server error message on failure", async () => {
      server.use(
        http.delete(`${BASE_URL}/api/users/${mockUser.id}`, () =>
          HttpResponse.json(
            { error: "Admin users cannot be deleted." },
            { status: 403 }
          )
        )
      );

      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      expect(
        await screen.findByText(/admin users cannot be deleted/i)
      ).toBeInTheDocument();
    });

    it("shows a fallback error message when the server returns no body", async () => {
      server.use(
        http.delete(`${BASE_URL}/api/users/${mockUser.id}`, () =>
          new HttpResponse(null, { status: 500 })
        )
      );

      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

      expect(
        await screen.findByText(/something went wrong/i)
      ).toBeInTheDocument();
    });

    it("does not close the dialog when the server returns an error", async () => {
      server.use(
        http.delete(`${BASE_URL}/api/users/${mockUser.id}`, () =>
          new HttpResponse(null, { status: 500 })
        )
      );

      const user = userEvent.setup();
      const { onOpenChange } = renderDialog();
      await user.click(screen.getByRole("button", { name: /^delete$/i }));

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
