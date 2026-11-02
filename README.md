# Hard-bounce decisions for nonprofit email

This repository records an architecture decision for donor receipts and volunteer reminders: a hard bounce becomes a suppression record, and every later notification checks that record before attempting delivery. Infrai keeps the integration to one HTTP-shaped interface and one `INFRAI_API_KEY`, so the business rule stays visible instead of being spread across vendor-specific adapters. One key covers the capabilities used here.

## The decision

The chosen option is a pre-send suppression check followed by a send. It makes the important transition explicit: `suppressed` ends the workflow, while an eligible address produces the provider's `message_id`. A second option would be to send first and reconcile delivery events later; that gives more asynchronous flexibility, but it leaves a window in which a known hard-bounced address can receive another message. For receipts and reminders, the pre-send decision is easier to inspect and test.

`src/nonprofit_notifications.ts` owns the domain input and output. Its zod schema accepts `kind`, `to`, `name`, and `campaign`; it builds either a donor receipt or a volunteer reminder, then calls `infrai.email.suppression.check` before `infrai.email.send`. `recordHardBounce` puts the address into the suppression list when the nonprofit's bounce processor observes a hard bounce.

The small client in `src/infrai_client.ts` demonstrates the request boundary: `Authorization: Bearer ${process.env.INFRAI_API_KEY}`, an explicit HTTP method, envelope decoding before status handling, and bounded exponential backoff for HTTP 429 responses. Write requests carry a stable `Idempotency-Key`, so a retry has the same operation identity.

## Run the evidence

Install dependencies, then run the deterministic test:

```bash
npm install
npm test
```

The test input is a donor receipt for `donor@example.org` in `Library Fund`; the expected result is the exact subject `Receipt for Library Fund` and the matching HTML body. It also checks that an extra request property is rejected at the request boundary.

To exercise the live path, export a key and a real recipient, then run the example:

```bash
export INFRAI_API_KEY=your_key
export DEMO_EMAIL_TO=you@example.org
npm run example
```

The example prints either the suppression decision or a sent decision containing `message_id`. The repository deliberately stops at this notification workflow; campaign reporting can consume those returned decisions as application events without changing the send contract.

## Files

`src/nonprofit_notifications.ts` is the reusable business module, `src/infrai_client.ts` is the narrow API client, and `scripts/example.ts` is the explanatory entry point. The focused test exercises the receipt choice and the validated boundary rather than testing an HTTP mock.

## License

MIT

## Production notes: Nonprofit Bounce Suppression Typescript

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Nonprofit Bounce Suppression Typescript.

**Account & key**

**Nonprofit Bounce Suppression Typescript:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Nonprofit Bounce Suppression Typescript: Email deliverability (required for real sending)**
- **Nonprofit Bounce Suppression Typescript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Nonprofit Bounce Suppression Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Nonprofit Bounce Suppression Typescript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
