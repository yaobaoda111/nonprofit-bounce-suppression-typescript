import { deliverNotification } from "../src/nonprofit_notifications.ts";

const to = process.env.DEMO_EMAIL_TO;
if (!to) throw new Error("DEMO_EMAIL_TO is required");

const result = await deliverNotification({
  kind: "donor_receipt",
  to,
  name: "Jordan",
  campaign: "Community Garden Fund",
});
console.log(result);
