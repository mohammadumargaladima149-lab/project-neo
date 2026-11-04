create table public.scenarios (
  id text primary key default gen_random_uuid()::text,
  category text not null,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 20 and 1200),
  prompt text not null check (char_length(prompt) between 5 and 500),
  tag text not null,
  trending boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null references public.scenarios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.answer_likes (
  answer_id uuid not null references public.answers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);

create index scenarios_status_created_at_idx on public.scenarios (status, created_at desc);
create index answers_scenario_created_at_idx on public.answers (scenario_id, created_at desc);

alter table public.scenarios enable row level security;
alter table public.answers enable row level security;
alter table public.answer_likes enable row level security;

grant select on public.scenarios to anon, authenticated;
grant insert on public.scenarios to authenticated;
grant select, insert on public.answers to anon, authenticated;
grant select on public.answer_likes to anon, authenticated;
grant insert, delete on public.answer_likes to authenticated;

create policy "Published scenarios and your submissions are visible"
  on public.scenarios for select to anon, authenticated
  using (status = 'published' or (select auth.uid()) = created_by);

create policy "Signed-in users can submit scenarios for review"
  on public.scenarios for insert to authenticated
  with check ((select auth.uid()) = created_by and status = 'pending');

create policy "Published scenario answers are visible"
  on public.answers for select to anon, authenticated
  using (
    exists (
      select 1 from public.scenarios
      where scenarios.id = answers.scenario_id and scenarios.status = 'published'
    )
  );

create policy "Signed-in users can answer published scenarios"
  on public.answers for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.scenarios
      where scenarios.id = answers.scenario_id and scenarios.status = 'published'
    )
  );

create policy "Like counts are visible"
  on public.answer_likes for select to anon, authenticated
  using (
    exists (
      select 1 from public.answers
      where answers.id = answer_likes.answer_id
    )
  );

create policy "Users can like as themselves"
  on public.answer_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own likes"
  on public.answer_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create view public.community_answers with (security_invoker = true) as
select
  answers.id,
  answers.scenario_id,
  answers.answer,
  answers.created_at,
  'Community member'::text as author_name,
  false as unexpected,
  count(answer_likes.answer_id)::integer as likes
from public.answers
left join public.answer_likes on answer_likes.answer_id = answers.id
group by answers.id;

grant select on public.community_answers to anon, authenticated;

create or replace function public.toggle_answer_like(target_answer_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to like an answer';
  end if;

  delete from public.answer_likes
  where answer_id = target_answer_id and user_id = auth.uid();

  if not found then
    insert into public.answer_likes (answer_id, user_id)
    values (target_answer_id, auth.uid());
  end if;
end;
$$;

grant execute on function public.toggle_answer_like(uuid) to authenticated;

insert into public.scenarios (id, category, title, description, prompt, tag, trending, status) values
  ('1', 'Future & Sci-Fi', 'Meet your future self', 'You wake up tomorrow and discover that you can meet your future self.', 'What are the three questions you''d ask?', 'Deep', true, 'published'),
  ('2', 'Moral Dilemmas', '₦500 million, but there''s a catch', 'Someone offers you ₦500 million. You can take it, but you''ll never speak to your closest friend again.', 'Would you take the money? Why or why not?', 'Moral', true, 'published'),
  ('3', 'Chaos & Funny', 'The duck problem', 'Every time you lie, a duck appears within 10 metres. Nobody knows why.', 'Would you stop lying or embrace the duck army?', 'Funny', false, 'published'),
  ('4', 'Life', 'Know exactly how your life ends', 'You can see exactly how your life will turn out, including your successes, failures and relationships.', 'Would you look?', 'Deep', true, 'published'),
  ('5', 'Relationships', 'Read one person''s mind', 'You can read the mind of one person you know for exactly 24 hours.', 'Who would you choose?', 'Relationships', false, 'published'),
  ('6', 'Weird', 'The mysterious button', 'A button appears on your desk. Pressing it gives you ₦1 million, but you don''t know what happens somewhere else.', 'Are you pressing it?', 'Weird', false, 'published'),
  ('7', 'Future & Sci-Fi', 'Pause the world', 'You can freeze time for everyone except yourself, but you can only use the ability once.', 'When would you use it?', 'Future', false, 'published'),
  ('8', 'Life', 'Delete one regret', 'You can completely erase one regret from your past.', 'What would you erase?', 'Life', false, 'published');
