-- =============================================
-- HITCHRACE — Schéma Supabase
-- Colle ce fichier entier dans SQL Editor > Run
-- =============================================

-- ÉQUIPES
create table if not exists teams (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  color text not null default '#EF9F27',
  car_count integer default 0,
  departure_time timestamptz,
  arrival_time timestamptz,
  created_at timestamptz default now()
);

-- POSITIONS GPS (une par équipe, mise à jour en continu)
create table if not exists team_locations (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz default now(),
  unique(team_id)
);

-- DÉFIS
create table if not exists challenges (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  points integer not null default 50,
  category text not null default 'fun',
  proof_type text not null default 'photo',
  validation_type text not null default 'auto',
  active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- COMPLETIONS DE DÉFIS
create table if not exists challenge_completions (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  status text default 'pending',
  proof_url text,
  proof_type text,
  submitted_at timestamptz default now(),
  validated_at timestamptz,
  unique(team_id, challenge_id)
);

-- MESSAGES
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  team_name text not null,
  team_color text not null default '#888780',
  content text not null,
  type text not null default 'general',
  created_at timestamptz default now()
);

-- CONFIG DE LA COURSE (1 seule ligne)
create table if not exists race_config (
  id integer primary key default 1,
  status text default 'waiting',
  start_location_name text default 'Paris',
  start_lat double precision default 48.8566,
  start_lng double precision default 2.3522,
  end_location_name text default 'Destination',
  end_lat double precision default 47.3220,
  end_lng double precision default 5.0415,
  started_at timestamptz,
  admin_password text default 'hitchrace2025'
);

insert into race_config (id) values (1) on conflict (id) do nothing;

-- ACTIVER LE TEMPS RÉEL
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table team_locations;
alter publication supabase_realtime add table challenge_completions;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table race_config;

-- POLITIQUES D'ACCÈS (accès public pour une app de jeu)
alter table teams enable row level security;
alter table team_locations enable row level security;
alter table challenges enable row level security;
alter table challenge_completions enable row level security;
alter table messages enable row level security;
alter table race_config enable row level security;

create policy "teams_all" on teams for all using (true) with check (true);
create policy "locations_all" on team_locations for all using (true) with check (true);
create policy "challenges_all" on challenges for all using (true) with check (true);
create policy "completions_all" on challenge_completions for all using (true) with check (true);
create policy "messages_all" on messages for all using (true) with check (true);
create policy "config_all" on race_config for all using (true) with check (true);

-- BUCKET STORAGE POUR LES PREUVES
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', true) on conflict do nothing;
create policy "proofs_all" on storage.objects for all using (bucket_id = 'proofs') with check (bucket_id = 'proofs');
