import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderWithQuery } from "@/test/utils";
import { Role } from "@resolvane/core";
import UsersTable from "./UsersTable";
import type { User } from "../types";

const agentUser: User = {
  id: "1",
  name: "Jane Agent",
  email: "jane@example.com",
  role: Role.agent,
  createdAt: "2024-01-15T00:00:00.000Z",
};

const adminUser: User = {
  id: "2",
  name: "Bob Admin",
  email: "bob@example.com",
  role: Role.admin,
  createdAt: "2024-02-01T00:00:00.000Z",
};

function renderTable(
  users: User[] = [agentUser, adminUser],
  onEdit = vi.fn(),
  onDelete = vi.fn()
) {
  renderWithQuery(
    <UsersTable users={users} isPending={false} onEdit={onEdit} onDelete={onDelete} />
  );
  return { onEdit, onDelete };
}

describe("UsersTable — delete button", () => {
  it("shows a delete button for agent users", () => {
    renderTable();
    expect(
      screen.getByRole("button", { name: `Delete ${agentUser.name}` })
    ).toBeInTheDocument();
  });

  it("does not show a delete button for admin users", () => {
    renderTable();
    expect(
      screen.queryByRole("button", { name: `Delete ${adminUser.name}` })
    ).not.toBeInTheDocument();
  });

  it("calls onDelete with the correct user when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderTable();

    await user.click(
      screen.getByRole("button", { name: `Delete ${agentUser.name}` })
    );

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(agentUser);
  });

  it("does not call onDelete when an admin row is rendered", async () => {
    const { onDelete } = renderTable([adminUser]);
    expect(
      screen.queryByRole("button", { name: `Delete ${adminUser.name}` })
    ).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
