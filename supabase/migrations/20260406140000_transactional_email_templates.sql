-- Admin-editable transactional notification emails (optional overrides; empty = built-in template)

CREATE TABLE IF NOT EXISTS public.transactional_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactional_email_templates_slug ON public.transactional_email_templates (slug);

ALTER TABLE public.transactional_email_templates ENABLE ROW LEVEL SECURITY;
