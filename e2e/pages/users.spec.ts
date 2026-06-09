/**
 * User management — happy-path CRUD e2e tests.
 *
 * Only full-stack flows are tested here. Table rendering, dialog pre-population,
 * role badge visibility, and delete button guards are covered by component tests
 * (UsersPage/index.test.tsx, EditUserDialog.test.tsx, UsersTable.test.tsx).
 *
 * Tests use Date.now() suffixes on names/emails to avoid unique-email conflicts
 * across parallel or repeated runs. No cleanup is needed — global-setup re-seeds
 * the test DB before each full run.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth";

test.describe("Users page — CRUD flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/users");
    await expect(page).toHaveURL("/users");
    // Wait for table data to load
    await expect(page.getByRole("cell", { name: /admin/i }).first()).toBeVisible();
  });

  test("creates a new user and shows the row in the table", async ({ page }) => {
    const ts = Date.now();
    const name = `Test Agent ${ts}`;
    const email = `agent-${ts}@test.example`;

    await page.getByRole("button", { name: "New User" }).click();
    await expect(page.getByRole("heading", { name: "Create User" })).toBeVisible();

    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create User" }).click();

    await expect(page.getByRole("heading", { name: "Create User" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: email, exact: true })).toBeVisible();
  });

  test("edits a user and reflects the updated name in the table", async ({ page }) => {
    const ts = Date.now();
    const originalName = `Edit Target ${ts}`;
    const updatedName = `Edited User ${ts}`;
    const email = `edit-${ts}@test.example`;

    // Create a dedicated user to edit
    await page.getByRole("button", { name: "New User" }).click();
    await page.getByLabel("Name").fill(originalName);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create User" }).click();
    await expect(page.getByRole("heading", { name: "Create User" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name: originalName, exact: true })).toBeVisible();

    // Edit the user
    await page.getByRole("button", { name: `Edit ${originalName}` }).click();
    await expect(page.getByRole("heading", { name: "Edit User" })).toBeVisible();

    const nameInput = page.getByLabel("Name");
    await nameInput.clear();
    await nameInput.fill(updatedName);
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("heading", { name: "Edit User" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name: updatedName, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: originalName, exact: true })).not.toBeVisible();
  });

  test("deletes a user and removes the row from the table", async ({ page }) => {
    const ts = Date.now();
    const name = `Delete Target ${ts}`;
    const email = `delete-${ts}@test.example`;

    // Create a dedicated user to delete
    await page.getByRole("button", { name: "New User" }).click();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create User" }).click();
    await expect(page.getByRole("heading", { name: "Create User" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();

    // Delete the user
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(page.getByRole("heading", { name: "Delete User" })).toBeVisible();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Are you sure you want to delete")).toBeVisible();
    await expect(dialog.getByText(name, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByRole("heading", { name: "Delete User" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name, exact: true })).not.toBeVisible();
  });
});
