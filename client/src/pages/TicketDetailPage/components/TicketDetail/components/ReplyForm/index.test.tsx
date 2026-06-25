import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import ReplyForm from ".";

describe("ReplyForm", () => {
  it("shows a validation error when submitting an empty reply", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithQuery(<ReplyForm onSubmit={onSubmit} isPending={false} />);

    await user.click(screen.getByRole("button", { name: /send reply/i }));

    expect(await screen.findByText(/reply body is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the reply body and resets the field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithQuery(<ReplyForm onSubmit={onSubmit} isPending={false} />);

    const textarea = screen.getByLabelText(/reply/i);
    await user.type(textarea, "Thanks for reaching out");
    await user.click(screen.getByRole("button", { name: /send reply/i }));

    expect(onSubmit).toHaveBeenCalledWith({ body: "Thanks for reaching out" });
    expect(textarea).toHaveValue("");
  });

  it("disables the submit button while pending", () => {
    renderWithQuery(<ReplyForm onSubmit={vi.fn()} isPending={true} />);

    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
  });

  it("shows the error message and keeps the draft when submission fails", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("failed"));
    const { rerender } = renderWithQuery(
      <ReplyForm onSubmit={onSubmit} isPending={false} error={null} />
    );

    const textarea = screen.getByLabelText(/reply/i);
    await user.type(textarea, "Thanks for reaching out");
    await user.click(screen.getByRole("button", { name: /send reply/i }));

    rerender(<ReplyForm onSubmit={onSubmit} isPending={false} error="Could not send reply." />);

    expect(screen.getByText("Could not send reply.")).toBeInTheDocument();
    expect(textarea).toHaveValue("Thanks for reaching out");
  });
});
