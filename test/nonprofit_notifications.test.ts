import test from "node:test";
import assert from "node:assert/strict";
import { messageFor, notificationSchema } from "../src/nonprofit_notifications.ts";

test("a receipt has a donor-specific subject and HTML body", () => {
  const input = notificationSchema.parse({ kind: "donor_receipt", to: "donor@example.org", name: "Mina", campaign: "Library Fund" });
  assert.deepEqual(messageFor(input), {
    subject: "Receipt for Library Fund",
    html: "<p>Thank you, Mina, for supporting Library Fund.</p>",
  });
});

test("the request boundary rejects an unsupported email field", () => {
  assert.throws(() => notificationSchema.parse({ kind: "volunteer_reminder", to: "volunteer@example.org", name: "Lee", campaign: "Park Day", extra: "hello" }));
});
