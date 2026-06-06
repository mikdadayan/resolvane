import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import CreateUserDialog from "./CreateUserDialog";

const BASE_URL = "http://localhost:3000";

vi.stubEnv("VITE_SERVER_BASE_URL", BASE_URL);

const mockCreatedUser = {
  id: "99",
  name: "Jane Doe",
  email: "jane@example.com",
  role: "agent",
  createdAt: new Date().toISOString(),
};

const server = setupServer(
  http.post(`${BASE_URL}/api/users`, () =>
    HttpResponse.json({ user: mockCreatedUser }, { status: 201 })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDialog(onOpenChange = vi.fn()) {
  renderWithQuery(<CreateUserDialog open={true} onOpenChange={onOpenChange} />);
  return { onOpenChange };
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, overrides: Partial<{name: string; email: string; password: string}> = {}) {
  const { name = "Jane Doe", email = "jane@example.com", password = "password123" } = overrides;
  if (name) await user.type(screen.getByLabelText(/^name$/i), name);
  if (email) await user.type(screen.getByLabelText(/^email$/i), email);
  if (password) await user.type(screen.getByLabelText(/^password$/i), password);
}

describe("CreateUserDialog", () => {
  describe("validation", () => {
    it("shows name error when name is too short", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.type(screen.getByLabelText(/^name$/i), "ab");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(await screen.findByText(/name must be at least 3 characters/i)).toBeInTheDocument();
    });

    it("shows email error when email is empty", async () => {
      const user = userEvent.setup();
      renderDialog();

      // Fill name and password validly so only the email error is shown.
      // Typing an invalid format into type="email" blocks native form submission
      // before react-hook-form runs, so we test the missing-email case instead.
      await user.type(screen.getByLabelText(/^name$/i), "Jane Doe");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    });

    it("shows password error when password is too short", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.type(screen.getByLabelText(/^password$/i), "short");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it("shows all field errors when submitting empty form", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(await screen.findByText(/name must be at least 3 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  describe("submission", () => {
    it("POSTs the correct payload on valid submission", async () => {
      const user = userEvent.setup();
      let body: unknown;

      server.use(
        http.post(`${BASE_URL}/api/users`, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ user: mockCreatedUser }, { status: 201 });
        })
      );

      renderDialog();
      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      await waitFor(() =>
        expect(body).toMatchObject({
          name: "Jane Doe",
          email: "jane@example.com",
          password: "password123",
          role: "agent",
        })
      );
    });

    it("calls onOpenChange(false) after successful submission", async () => {
      const user = userEvent.setup();
      const { onOpenChange } = renderDialog();

      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });

    it("shows Creating… and disables the button while the request is in flight", async () => {
      let resolve!: () => void;
      server.use(
        http.post(`${BASE_URL}/api/users`, () =>
          new Promise<Response>((res) => {
            resolve = () => res(HttpResponse.json({ user: mockCreatedUser }, { status: 201 }));
          })
        )
      );

      const user = userEvent.setup();
      renderDialog();
      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      const pendingBtn = await screen.findByRole("button", { name: /creating/i });
      expect(pendingBtn).toBeDisabled();

      resolve();
    });

    it("shows the server error message when the request fails", async () => {
      server.use(
        http.post(`${BASE_URL}/api/users`, () =>
          HttpResponse.json(
            { error: "A user with that email already exists." },
            { status: 409 }
          )
        )
      );

      const user = userEvent.setup();
      renderDialog();
      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(
        await screen.findByText(/a user with that email already exists/i)
      ).toBeInTheDocument();
    });

    it("does not close the dialog when the server returns an error", async () => {
      server.use(
        http.post(`${BASE_URL}/api/users`, () =>
          new HttpResponse(null, { status: 500 })
        )
      );

      const user = userEvent.setup();
      const { onOpenChange } = renderDialog();
      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create user/i }));

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
