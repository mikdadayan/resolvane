import { test, expect } from "bun:test";
import { extractReferencedMessageIds } from "./email-threading";

test("returns [] for null headers", () => {
  expect(extractReferencedMessageIds(null)).toEqual([]);
});

test("returns [] when headers have neither References nor In-Reply-To", () => {
  expect(extractReferencedMessageIds({ "x-foo": "bar" })).toEqual([]);
});

test("extracts a single id from References, keeping angle brackets", () => {
  expect(extractReferencedMessageIds({ References: "<abc123@mail.example.com>" })).toEqual([
    "<abc123@mail.example.com>",
  ]);
});

test("extracts multiple space-separated ids from References, preserving order", () => {
  expect(
    extractReferencedMessageIds({
      References: "<one@mail.example.com> <two@mail.example.com> <three@mail.example.com>",
    })
  ).toEqual(["<one@mail.example.com>", "<two@mail.example.com>", "<three@mail.example.com>"]);
});

test("looks up header names case-insensitively", () => {
  expect(extractReferencedMessageIds({ REFERENCES: "<abc@mail.example.com>" })).toEqual([
    "<abc@mail.example.com>",
  ]);
});

test("falls back to In-Reply-To when References is absent", () => {
  expect(extractReferencedMessageIds({ "In-Reply-To": "<abc@mail.example.com>" })).toEqual([
    "<abc@mail.example.com>",
  ]);
});

test("prefers References over In-Reply-To when both are present", () => {
  expect(
    extractReferencedMessageIds({
      References: "<references@mail.example.com>",
      "In-Reply-To": "<in-reply-to@mail.example.com>",
    })
  ).toEqual(["<references@mail.example.com>"]);
});

test("adds angle brackets to a bare id that lacks them", () => {
  expect(extractReferencedMessageIds({ References: "abc123@mail.example.com" })).toEqual([
    "<abc123@mail.example.com>",
  ]);
});

test("treats an empty-string References value as absent and falls back to In-Reply-To", () => {
  expect(
    extractReferencedMessageIds({ References: "", "In-Reply-To": "<abc@mail.example.com>" })
  ).toEqual(["<abc@mail.example.com>"]);
});

test("returns [] when both headers are absent or whitespace-only", () => {
  expect(extractReferencedMessageIds({ References: "   " })).toEqual([]);
});
