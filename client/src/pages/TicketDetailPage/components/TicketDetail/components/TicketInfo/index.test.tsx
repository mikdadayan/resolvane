import { render, screen } from "@testing-library/react";
import { TicketStatus } from "@resolvane/core";
import TicketInfo from ".";

const mockTicket = {
  id: "ticket-1",
  subject: "Login page broken",
  senderName: "Jane Doe",
  senderEmail: "jane@example.com",
  status: TicketStatus.open,
  category: null,
  receivedAt: "2026-06-20T09:00:00.000Z",
  updatedAt: "2026-06-21T14:30:00.000Z",
  body: "I cannot log in. The page just spins forever.",
  assignedTo: null,
};

describe("TicketInfo", () => {
  it("renders the sender name and email", () => {
    render(<TicketInfo ticket={mockTicket} />);

    // name appears in both the metadata row and the message card
    expect(screen.getAllByText(/jane doe/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/jane@example\.com/i)).toBeInTheDocument();
  });

  it("renders the created and updated date labels", () => {
    render(<TicketInfo ticket={mockTicket} />);

    expect(screen.getByText(/created:/i)).toBeInTheDocument();
    expect(screen.getByText(/updated:/i)).toBeInTheDocument();
  });

  it("renders the formatted created and updated dates", () => {
    render(<TicketInfo ticket={mockTicket} />);

    const expectedCreated = new Date(mockTicket.receivedAt).toLocaleString();
    const expectedUpdated = new Date(mockTicket.updatedAt).toLocaleString();

    expect(screen.getByText(expectedCreated)).toBeInTheDocument();
    expect(screen.getByText(expectedUpdated)).toBeInTheDocument();
  });

  it("renders the message body", () => {
    render(<TicketInfo ticket={mockTicket} />);

    expect(screen.getByText(/cannot log in/i)).toBeInTheDocument();
  });

  it("renders the From label with sender name in the message card", () => {
    render(<TicketInfo ticket={mockTicket} />);

    expect(screen.getByText(/from jane doe/i)).toBeInTheDocument();
  });
});
