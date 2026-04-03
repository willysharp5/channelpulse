-- Stripe webhook sets status = 'cancelling' when cancel_at_period_end is true on an active subscription.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'active',
    'cancelling',
    'cancelled',
    'past_due',
    'trialing'
  ));
