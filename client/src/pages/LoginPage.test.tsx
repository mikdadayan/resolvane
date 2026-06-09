import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import LoginPage from "./LoginPage";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: null, isPending: false })),
    signIn: {
      email: vi.fn(() => new Promise(() => {})), // never resolves by default
    },
  },
}));

// Import after vi.mock so we get the hoisted mock
import { authClient } from "@/lib/auth-client";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.mocked(authClient.signIn.email).mockImplementation(() => new Promise(() => {}));
  });

  describe("rendering", () => {
    it("renders the email and password inputs and sign-in button", () => {
      renderWithQuery(<LoginPage />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows email and password errors when submitting an empty form", async () => {
      const user = userEvent.setup();
      renderWithQuery(<LoginPage />);

      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    it("shows an email error for a malformed email address", async () => {
      const user = userEvent.setup();
      renderWithQuery(<LoginPage />);

      // noValidate is set on the form, so browser validation won't block submit
      await user.type(screen.getByLabelText(/email/i), "not-an-email");
      await user.type(screen.getByLabelText(/password/i), "anypassword");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    });

    it("shows a password error when only the password field is empty", async () => {
      const user = userEvent.setup();
      renderWithQuery(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), "admin@example.com");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows Signing in… and disables the button while the request is in flight", async () => {
      const user = userEvent.setup();
      renderWithQuery(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), "admin@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      const btn = await screen.findByRole("button", { name: /signing in/i });
      expect(btn).toBeDisabled();
    });
  });
});
