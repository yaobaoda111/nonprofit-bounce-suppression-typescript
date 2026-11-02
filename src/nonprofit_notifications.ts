import { z } from "zod";
import { infrai } from "./infrai_client.ts";

export const notificationSchema = z.object({
  kind: z.enum(["donor_receipt", "volunteer_reminder"]),
  to: z.string().email(),
  name: z.string().min(1),
  campaign: z.string().min(1),
}).strict();

export type Notification = z.infer<typeof notificationSchema>;

export type DeliveryDecision = {
  action: "sent" | "suppressed";
  reason: "hard_bounce_suppression" | "eligible";
  message_id?: string;
};

export function messageFor(input: Notification): { subject: string; html: string } {
  if (input.kind === "donor_receipt") {
    return { subject: `Receipt for ${input.campaign}`, html: `<p>Thank you, ${input.name}, for supporting ${input.campaign}.</p>` };
  }
  return { subject: `Volunteer reminder for ${input.campaign}`, html: `<p>Hello ${input.name}, this is your reminder for ${input.campaign}.</p>` };
}

export async function deliverNotification(raw: unknown): Promise<DeliveryDecision> {
  const input = notificationSchema.parse(raw);
  const suppression = await infrai.email.suppression.check(input.to);
  if (suppression.suppressed) return { action: "suppressed", reason: "hard_bounce_suppression" };

  const message = messageFor(input);
  const sent = await infrai.email.send({ to: input.to, subject: message.subject, html: message.html }, {
    "Idempotency-Key": `${input.kind}:${input.campaign}:${input.to}`,
  });
  return { action: "sent", reason: "eligible", message_id: sent.message_id };
}

export async function recordHardBounce(email: string): Promise<{ email: string }> {
  return infrai.email.suppression.add(email, { "Idempotency-Key": `hard-bounce:${email}` });
}
