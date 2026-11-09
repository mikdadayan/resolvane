import { render, screen } from "@testing-library/react";
import { ReplySenderType } from "@resolvane/core";
import ReplyThread from ".";

const mockReplies = [
  {
    id: "reply-1",
    body: "Thanks for reaching out, looking into it now.",
    senderType: ReplySenderType.agent,
    createdAt: "2026-06-23T10:00:00.000Z",
    author: { id: "u1", name: "Agent Smith" },
  },
  {
    id: "reply-2",
    body: "Should be fixed now, let us know if it persists.",
    senderType: ReplySenderType.agent,
    createdAt: "2026-06-23T12:00:00.000Z",
    author: { id: "u1", name: "Agent Smith" },
  },
];

describe("ReplyThread", () => {
  it("shows skeleton rows while loading", () => {
    render(<ReplyThread replies={undefined} isPending={true} />);

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(2);
  });

  it("shows an empty state when there are no replies", () => {
    render(<ReplyThread replies={[]} isPending={false} />);

    expect(screen.getByText(/no replies yet/i)).toBeInTheDocument();
  });

  it("renders each reply with its author and body", () => {
    render(<ReplyThread replies={mockReplies} isPending={false} />);

    expect(screen.getAllByText("Agent Smith")).toHaveLength(2);
    expect(screen.getAllByText("Agent")).toHaveLength(2);
    expect(screen.getByText(/looking into it now/i)).toBeInTheDocument();
    expect(screen.getByText(/let us know if it persists/i)).toBeInTheDocument();
  });

  it("falls back to Customer when a customer reply has no author", () => {
    render(
      <ReplyThread
        replies={[
          {
            id: "reply-3",
            body: "Still seeing the issue.",
            senderType: ReplySenderType.customer,
            createdAt: "2026-06-23T13:00:00.000Z",
            author: null,
          },
        ]}
        isPending={false}
      />
    );

    expect(screen.getAllByText("Customer")).toHaveLength(2);
  });
});
