import Stripe from "stripe";

let _stripe: Stripe | null = null;

const stripe = new Proxy({} as Stripe, {
  get(_, prop: keyof Stripe) {
    if (!_stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error("STRIPE_SECRET_KEY is not set — Stripe is unavailable");
      }
      _stripe = new Stripe(key);
    }
    return _stripe[prop];
  },
});

export { stripe };
