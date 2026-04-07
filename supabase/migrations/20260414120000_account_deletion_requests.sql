-- Account deletion requests: soft-delete queue with 5-day recovery window

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_status text NOT NULL DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid,
  email text NOT NULL,
  business_name text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cancelled_by_user', 'cancelled_by_admin', 'completed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  purge_after_at timestamptz NOT NULL DEFAULT (now() + interval '5 days'),
  completed_at timestamptz,
  cancel_token_hash text,
  cancel_token_expires_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON account_deletion_requests(user_id);

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'account_deletion_requests' AND policyname = 'deletion_requests_admin_all'
  ) THEN
    CREATE POLICY deletion_requests_admin_all ON account_deletion_requests FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
