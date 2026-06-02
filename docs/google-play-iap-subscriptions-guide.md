# Google Play In-App Purchases and Subscriptions Guide

This guide explains how to implement Google Play Billing for a production app, with a special focus on the case where you do not have your own backend server.

The short version:

- You can implement subscriptions entirely from the Android app using the Google Play Billing Library.
- For a production-grade setup, Google strongly recommends a secure backend for purchase verification, subscription lifecycle handling, and Real-time Developer Notifications (RTDN).
- If you truly have no backend, you can still build a client-only subscription flow, but it is a weaker security model and should be treated as a tradeoff, not the ideal end state.

## What Google Play Billing Is

Google Play Billing is Google's system for selling digital goods and subscriptions in Android apps. It is for digital products only, not physical goods or services.

Google provides:

- The Play Billing Library in your app.
- The Google Play Developer API for server-to-server management.
- RTDN for subscription and purchase state changes.

Official docs:

- [Google Play's billing system](https://developer.android.com/google/play/billing)
- [Integrate the Google Play Billing Library into your app](https://developer.android.com/google/play/billing/integrate)

## The Most Important Production Decision

There are three realistic architecture choices.

### Option 1: Client-only billing

This means the app:

- Launches the purchase flow.
- Receives the purchase result in the app.
- Calls `BillingClient.acknowledgePurchase()` from the app.
- Uses `BillingClient.queryPurchasesAsync()` to restore purchases.

This is officially supported for apps that are client-only, and Google explicitly documents that client-only apps should acknowledge purchases in the app.

What this option does well:

- Lowest infrastructure complexity.
- Fastest to ship.
- Works if your app is simple and the entitlement rules are not complex.

What this option does not do well:

- It does not give you server-side purchase verification.
- It does not give you RTDN processing.
- It is weaker against tampering, replay, and lifecycle edge cases than a backend-backed setup.

### Option 2: Minimal serverless backend

This is the production-grade recommendation if you do not want to run a traditional server.

Use something like:

- Firebase Cloud Functions
- Cloud Run
- A small API backed by Google Cloud

This gives you:

- Server-side verification with the Google Play Developer API.
- RTDN handling.
- A durable source of truth for user entitlements.

This is still "a backend", but it can be very small and mostly serverless.

### Option 3: Full backend

This is the most robust option if you later add:

- Web subscriptions
- Cross-platform access
- Admin tooling
- Fraud detection
- Refund handling

## Recommended Subscription Model

For monthly and yearly subscriptions, the cleanest Play Console structure is:

- One subscription product for the premium entitlement
- One auto-renewing monthly base plan
- One auto-renewing yearly base plan
- Optional offers on top of those base plans

Google documents that a single subscription can have multiple base plans, including:

- Monthly auto-renewing
- Annual auto-renewing
- Monthly prepaid, if you need it

Official docs also note that offers are only available for auto-renewing base plans.

### Suggested setup

Example:

- Subscription product ID: `premium`
- Base plan ID: `premium_monthly`
- Base plan ID: `premium_yearly`
- Offer IDs:
  - `intro_7d`
  - `winback_50`

Keep the entitlements the same if the monthly and yearly plans both unlock the same premium features. The only difference should be billing period and price.

## When to Use Separate Subscription Products

Use separate subscription products only when the entitlements are meaningfully different.

Examples:

- `basic`
- `pro`
- `premium`

Use base plans when the entitlement is the same and only pricing/billing differs.

## How Monthly and Yearly Plans Work

Monthly and yearly subscriptions are usually just two auto-renewing base plans under one subscription product.

That means:

- Monthly plan renews every month.
- Yearly plan renews every year.
- If the user cancels, access usually continues until the current paid period ends.
- If the user changes plans, the change is treated as a new purchase event and must be handled correctly.

Google's Play Console guidance also recommends that developers communicate:

- Whether the subscription renews automatically
- The billing frequency
- The cost
- Cancellation terms
- Whether the subscription is required to use the app

## What You Can Do Without a Backend

If you do not have a backend, the best client-only approach is:

1. Start the purchase flow from the app.
2. Receive the purchase in `PurchasesUpdatedListener`.
3. Verify the purchase state in the app.
4. Acknowledge the purchase from the app.
5. On app launch and resume, call `queryPurchasesAsync()` and restore entitlements from the Play purchase list.
6. Keep a local entitlement cache so the UI is responsive.

### Client-only purchase flow

Use the Play Billing Library to:

- Connect to Google Play Billing.
- Query product details.
- Launch the billing flow.
- Handle the purchase callback.
- Acknowledge the purchase.

Google documents that if your app is client-only, you should use `BillingClient.acknowledgePurchase()` in the app and check `isAcknowledged()` before acknowledging.

### Local entitlement rules

For a client-only app, a practical entitlement rule is:

- Grant access only after the purchase is in `PURCHASED` state.
- Never grant access for `PENDING` purchases.
- Restore access from `queryPurchasesAsync()` when the app starts or resumes.
- Re-check access whenever the user returns to the app.

### Important limitation

Without a backend, you should assume that Google Play Billing gives you the best available client-side signal, but not a fully authoritative server-side ledger.

In practice, this means:

- Good enough for a simple app.
- Not the strongest fraud protection.
- Not ideal for complex subscription logic.
- Not ideal if you need to sync entitlement across many devices, platforms, or account types.

## What Google Recommends for Production

Google's official docs strongly recommend a secure backend for:

- Purchase verification
- Subscription-specific features
- RTDN
- Fraud resistance

Google also says the Google Play Developer API is the server-to-server complement to the Billing Library, and RTDN is meant to be processed on the backend.

So, if you want a truly production-grade subscription system, the recommended shape is:

- App talks to Play Billing Library.
- Backend talks to Google Play Developer API.
- RTDN updates your backend.
- Backend decides and stores entitlement.
- App reads entitlement from your backend.

If you do not want to manage a server, a serverless backend is the best compromise.

## How Verification Works

There are two levels of verification.

### 1. App-side verification

This is what you can do without a backend:

- Check the `Purchase` state.
- Check whether the purchase is acknowledged.
- Restore purchases with `queryPurchasesAsync()`.
- Persist the local result in your app.

### 2. Server-side verification

This is Google's recommended production approach:

- Send the purchase token to your backend.
- Call the Google Play Developer API.
- Confirm the subscription state server-side.
- Use RTDN to stay in sync.

Google recommends using the purchase token with the Google Play Developer APIs to verify that purchases are authentic and not forged or replayed.

## Subscription Lifecycle Notes

Important behavior to design for:

- A new subscription purchase must be acknowledged within 3 days or the user can receive a refund and the purchase can be revoked.
- Prepaid plans also need acknowledgement.
- Pending purchases should not receive entitlement until the payment is completed.
- If you later add plan changes, treat them as new purchase events and handle the replacement carefully.

## Offers, Trials, and Discounts

If you want trials or discounts, use offers.

Offers can provide:

- Free trials
- Introductory pricing
- Win-back style promotions

Key rules:

- Offers are only available for auto-renewing base plans.
- Offers can have eligibility rules.
- You should clearly disclose offer terms in the app.

Common examples:

- `monthly` with a 7-day free trial
- `yearly` with a first-year intro price
- `winback` offer for expired subscribers

## Play Console Setup Checklist

1. Create the subscription product in Play Console.
2. Add at least one active base plan.
3. Add your monthly auto-renewing base plan.
4. Add your yearly auto-renewing base plan.
5. Set region availability and pricing.
6. Add offers if needed.
7. Activate the base plans.
8. Add license testers for testing.
9. Upload a build that includes the Billing Library.
10. Test purchases on a real Play-signed build or licensed test setup.

Google notes that once you create a base plan, you cannot delete the subscription. You archive it instead when you stop selling it.

## Testing Guidance

For testing:

- Use license testers.
- Test on internal or closed tracks.
- Verify acknowledgment behavior.
- Verify restore behavior after reinstall.
- Test cancellation and resubscribe flows.
- Test annual and monthly plan selection separately.

If you later add a backend, also test:

- RTDN delivery
- Purchase token validation
- Subscription renewal handling
- Expiry handling

## Practical Recommendation For Your App

If your app only needs Android subscriptions and you want the simplest reliable setup:

- Use one subscription product for premium access.
- Add monthly and yearly auto-renewing base plans.
- Implement client-only billing first if you need to ship quickly.
- Plan a minimal serverless backend as soon as the subscription logic becomes important to protect.

If you want to stay backend-free long term, keep the rules simple:

- One entitlement.
- One Google account-based purchase source.
- Restore on app launch.
- Acknowledge immediately.
- Avoid complex upgrade/downgrade logic unless necessary.

## Suggested File-Level Implementation Plan

If you want to implement this in the app next, the code work would usually be:

- Add a Play Billing wrapper or native module.
- Define product IDs and base plan IDs.
- Build a paywall screen.
- Add purchase restore logic.
- Add local entitlement state.
- Add a subscription management link in account settings.

## Official References

- [Google Play's billing system](https://developer.android.com/google/play/billing)
- [Integrate the Google Play Billing Library into your app](https://developer.android.com/google/play/billing/integrate)
- [About subscriptions](https://developer.android.com/google/play/billing/billing_subscriptions)
- [Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- [Real-time developer notifications reference guide](https://developer.android.com/google/play/billing/rtdn-reference)
- [Developer payload / purchase verification](https://developer.android.com/google/play/billing/developer-payload)
- [Create and manage subscriptions](https://support.google.com/googleplay/android-developer/answer/140504)
- [Understanding subscriptions](https://support.google.com/googleplay/android-developer/answer/12154973)
- [Subscriptions policy and transparency requirements](https://support.google.com/googleplay/android-developer/answer/9900533)

