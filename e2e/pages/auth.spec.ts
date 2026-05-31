/**
 * Authentication end-to-end tests for the Helpdesk application.
 *
 * Covers:
 *  - Login page rendering
 *  - Client-side form validation (empty fields, invalid email format)
 *  - Server-side auth errors (wrong password, unknown email)
 *  - Successful login for admin and agent roles
 *  - Protected route redirect for unauthenticated users
 *  - Already-authenticated redirect away from /login
 *  - Admin-only route access control
 *  - Navbar "Users" link visibility per role
 *  - Sign-out flow and session teardown
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth";

// ---------------------------------------------------------------------------
// Login page — structure and validation
// ---------------------------------------------------------------------------

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the login form", async ({ page }) => {
    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Helpdesk", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("shows validation error when email field is empty on submit", async ({
    page,
  }) => {
    // Leave both fields empty and submit
    await page.getByRole("button", { name: "Sign in" }).click();

    // Zod schema: email must be a valid email string
    await expect(page.getByText("Enter a valid email")).toBeVisible();
  });

  test("shows validation error when password field is empty on submit", async ({
    page,
  }) => {
    // Provide a valid email but leave password blank
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Zod schema: password min(1)
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("shows validation error for malformed email", async ({ page }) => {
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("anything");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email")).toBeVisible();
  });

  test("shows error message for wrong password", async ({ page }) => {
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // The submit button enters a loading state while the request is in flight
    await expect(page.getByRole("button", { name: "Signing in…" })).toBeVisible();

    // Server returns an auth error; LoginPage renders it via errors.root
    await expect(
      page.getByText(/invalid credentials|invalid email or password/i)
    ).toBeVisible();

    // URL must remain on /login — no redirect happened
    await expect(page).toHaveURL("/login");
  });

  test("shows error message for non-existent email", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText(/invalid credentials|invalid email or password/i)
    ).toBeVisible();

    await expect(page).toHaveURL("/login");
  });

  test("sign-in button shows loading state while request is in flight", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("password123");

    // Click and immediately assert the loading text before the redirect resolves
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("button", { name: "Signing in…" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Successful login
// ---------------------------------------------------------------------------

test.describe("Successful login", () => {
  test("admin login redirects to /", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page).toHaveURL("/");
  });

  test("agent login redirects to /", async ({ page }) => {
    await loginAs(page, "agent");
    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// Protected routing — unauthenticated access
// ---------------------------------------------------------------------------

test.describe("Protected routing", () => {
  test("unauthenticated visit to / redirects to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("unauthenticated visit to /users redirects to /login", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("authenticated user visiting /login is redirected to /", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    // Now navigate to /login — LoginPage does <Navigate to="/" replace /> when session exists
    await page.goto("/login");
    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// Admin-only route access
// ---------------------------------------------------------------------------

test.describe("Admin-only access", () => {
  test("admin can visit /users", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/users");
    await expect(page).toHaveURL("/users");
    // UsersPage renders an <h1>Users</h1>
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test("agent visiting /users is redirected to /", async ({ page }) => {
    await loginAs(page, "agent");
    await page.goto("/users");
    // AdminRoute redirects non-admins to /
    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// Navbar role-based visibility
// ---------------------------------------------------------------------------

test.describe("Navbar", () => {
  test("shows Users link for admin", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("does not show Users link for agent", async ({ page }) => {
    await loginAs(page, "agent");
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
  });

  test("shows the logged-in user's name in the navbar", async ({ page }) => {
    await loginAs(page, "admin");
    // Navbar renders session.user.name — seeded as "Admin"
    await expect(page.getByText("Admin")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test.describe("Logout", () => {
  test("sign-out redirects to /login", async ({ page }) => {
    await loginAs(page, "admin");

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("after sign-out, visiting / redirects back to /login", async ({
    page,
  }) => {
    await loginAs(page, "admin");

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");

    // Navigate to a protected page — session is gone, should redirect
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("after sign-out, visiting /users redirects to /login", async ({
    page,
  }) => {
    await loginAs(page, "admin");

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");

    await page.goto("/users");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });
});
