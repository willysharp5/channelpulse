create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chat_threads_user_idx on chat_threads(user_id, updated_at desc);
create index chat_threads_org_idx on chat_threads(org_id);

alter table chat_threads enable row level security;

create policy "Users can manage their own chat threads"
  on chat_threads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
