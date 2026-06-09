/**
 * Authentication end-to-end tests for the Helpdesk application.
 *
 * Covers full-stack flows only — rendering, validation, and loading states
 * are handled by LoginPage.test.tsx (component tests).
 *
 *  - Server-side auth error (wrong password)
 *  - Successful login and redirect
 *  - Protected route redirect for unauthenticated users
 *  - Already-authenticated redirect away from /login
 *  - Admin-only route access control
 *  - Navbar role-based visibility
 *  - Sign-out flow
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth";

// ---------------------------------------------------------------------------
// Server-side auth error
// ---------------------------------------------------------------------------

test("shows error message for wrong password", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByText(/invalid credentials|invalid email or password/i)
  ).toBeVisible();
  await expect(page).toHaveURL("/login");
});

// ---------------------------------------------------------------------------
// Successful login
// ---------------------------------------------------------------------------

test("admin login redirects to /", async ({ page }) => {
  await loginAs(page, "admin");
  await expect(page).toHaveURL("/");
});

// ---------------------------------------------------------------------------
// Protected routing
// ---------------------------------------------------------------------------

test("unauthenticated visit to / redirects to /login", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("/login");
  await expect(page).toHaveURL("/login");
});

test("authenticated user visiting /login is redirected to /", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/login");
  await page.waitForURL("/");
  await expect(page).toHaveURL("/");
});

// ---------------------------------------------------------------------------
// Admin-only route access control
// ---------------------------------------------------------------------------

test("admin can visit /users", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/users");
  await expect(page).toHaveURL("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
});

test("agent visiting /users is redirected to /", async ({ page }) => {
  await loginAs(page, "agent");
  await page.goto("/users");
  await page.waitForURL("/");
  await expect(page).toHaveURL("/");
});

// ---------------------------------------------------------------------------
// Navbar role-based visibility
// ---------------------------------------------------------------------------

test("shows Users link for admin but not for agent", async ({ page }) => {
  await loginAs(page, "admin");
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/login");

  await loginAs(page, "agent");
  await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Sign-out
// ---------------------------------------------------------------------------

test("sign-out redirects to /login and destroys the session", async ({ page }) => {
  await loginAs(page, "admin");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/login");
  await expect(page).toHaveURL("/login");

  // Session is gone — protected route redirects again
  await page.goto("/");
  await page.waitForURL("/login");
});
