import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import ReplyForm from ".";

const BASE_URL = "http://localhost:3000";
const TICKET_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

vi.stubEnv("VITE_SERVER_BASE_URL", BASE_URL);

const server = setupServer(
  http.post(`${BASE_URL}/api/tickets/${TICKET_ID}/polish-reply`, () =>
    HttpResponse.json({ body: "Polished reply text." })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderForm(overrides: { isPending?: boolean; error?: string | null } = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  renderWithQuery(
    <ReplyForm
      ticketId={TICKET_ID}
      onSubmit={onSubmit}
      isPending={overrides.isPending ?? false}
      error={overrides.error}
    />
  );
  return { onSubmit };
}

describe("ReplyForm", () => {
  describe("button disabled states", () => {
    it("disables Send Reply and Polish when the textarea is empty", () => {
      renderForm();

      expect(screen.getByRole("button", { name: /send reply/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /polish/i })).toBeDisabled();
    });

    it("enables Send Reply and Polish after typing", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByRole("textbox", { name: /reply/i }), "Hello");

      expect(screen.getByRole("button", { name: /send reply/i })).toBeEnabled();
      expect(screen.getByRole("button", { name: /polish/i })).toBeEnabled();
    });

    it("disables both buttons when isPending is true", async () => {
      const user = userEvent.setup();
      renderForm({ isPending: true });

      await user.type(screen.getByRole("textbox", { name: /reply/i }), "Hello");

      expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /polish/i })).toBeDisabled();
    });
  });

  describe("Polish button", () => {
    it("replaces textarea content with polished text on success", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByRole("textbox", { name: /reply/i }), "rough draft");
      await user.click(screen.getByRole("button", { name: /polish/i }));

      expect(await screen.findByDisplayValue("Polished reply text.")).toBeInTheDocument();
    });

    it("shows Polishing… and disables both buttons while the request is in flight", async () => {
      let resolve!: () => void;
      server.use(
        http.post(`${BASE_URL}/api/tickets/${TICKET_ID}/polish-reply`, () =>
          new Promise<Response>((res) => {
            resolve = () => res(HttpResponse.json({ body: "Done." }));
          })
        )
      );

      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByRole("textbox", { name: /reply/i }), "rough draft");
      await user.click(screen.getByRole("button", { name: /polish/i }));

      const polishBtn = await screen.findByRole("button", { name: /polishing/i });
      expect(polishBtn).toBeDisabled();
      expect(screen.getByRole("button", { name: /send reply/i })).toBeDisabled();

      resolve();
    });

    it("shows the server error message when the request fails", async () => {
      server.use(
        http.post(`${BASE_URL}/api/tickets/${TICKET_ID}/polish-reply`, () =>
          HttpResponse.json({ error: "AI service unavailable." }, { status: 503 })
        )
      );

      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByRole("textbox", { name: /reply/i }), "rough draft");
      await user.click(screen.getByRole("button", { name: /polish/i }));

      expect(await screen.findByText(/ai service unavailable/i)).toBeInTheDocument();
    });

    it("shows a fallback error message when the request fails without a message", async () => {
      server.use(
        http.post(`${BASE_URL}/api/tickets/${TICKET_ID}/polish-reply`, () =>
          new HttpResponse(null, { status: 500 })
        )
      );

      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByRole("textbox", { name: /reply/i }), "rough draft");
      await user.click(screen.getByRole("button", { name: /polish/i }));

      expect(await screen.findByText(/failed to polish reply/i)).toBeInTheDocument();
    });
  });

  describe("Send Reply button", () => {
    it("calls onSubmit with the reply body", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();

      await user.type(screen.getByRole("textbox", { name: /reply/i }), "Thanks for reaching out");
      await user.click(screen.getByRole("button", { name: /send reply/i }));

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({ body: "Thanks for reaching out" })
      );
    });

    it("clears the textarea after successful submission", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByRole("textbox", { name: /reply/i }), "Thanks for reaching out");
      await user.click(screen.getByRole("button", { name: /send reply/i }));

      await waitFor(() =>
        expect(screen.getByRole("textbox", { name: /reply/i })).toHaveValue("")
      );
    });

    it("keeps the draft when submission fails", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue(new Error("network error"));
      renderWithQuery(
        <ReplyForm ticketId={TICKET_ID} onSubmit={onSubmit} isPending={false} />
      );

      await user.type(screen.getByRole("textbox", { name: /reply/i }), "Thanks for reaching out");
      await user.click(screen.getByRole("button", { name: /send reply/i }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(screen.getByRole("textbox", { name: /reply/i })).toHaveValue("Thanks for reaching out");
    });

    it("shows the error prop message", () => {
      renderForm({ error: "Could not send reply." });

      expect(screen.getByText("Could not send reply.")).toBeInTheDocument();
    });
  });
});
