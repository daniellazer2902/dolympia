-- Types énumérés
create type session_status as enum ('waiting', 'playing', 'finished');
create type session_mode as enum ('solo', 'team');
create type team_mode_type as enum ('auto', 'manual');
create type difficulty_level as enum ('easy', 'medium', 'hard');

-- Sessions (parties)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null,
  status session_status default 'waiting',
  mode session_mode default 'solo',
  team_mode team_mode_type,
  duration_min int default 20,
  total_rounds int default 5,
  current_round int default 0,
  games_order text[] default '{}',
  created_at timestamptz default now()
);

-- Joueurs
create table players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  pseudo text not null,
  team text check (team in ('red', 'blue')),
  is_host boolean default false,
  is_connected boolean default true,
  joined_at timestamptz default now()
);

-- Manches
create table rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  round_number int not null,
  game_type text not null,
  config jsonb default '{}',
  started_at timestamptz,
  ended_at timestamptz
);

-- Scores
create table scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  points int default 0,
  metadata jsonb default '{}'
);

-- Questions
create table questions (
  id uuid primary key default gen_random_uuid(),
  game_type text not null,
  content text not null,
  options jsonb default '[]',
  answer jsonb not null,
  difficulty difficulty_level default 'medium',
  category text,
  created_at timestamptz default now()
);

-- RLS : activer sur toutes les tables
alter table sessions enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table scores enable row level security;
alter table questions enable row level security;

-- Policies sessions : lecture publique, écriture publique (pas d'auth joueur en V1)
create policy "sessions_select" on sessions for select using (true);
create policy "sessions_insert" on sessions for insert with check (true);
create policy "sessions_update" on sessions for update using (true);

-- Policies players
create policy "players_select" on players for select using (true);
create policy "players_insert" on players for insert with check (true);
create policy "players_update" on players for update using (true);

-- Policies rounds
create policy "rounds_select" on rounds for select using (true);
create policy "rounds_insert" on rounds for insert with check (true);
create policy "rounds_update" on rounds for update using (true);

-- Policies scores
create policy "scores_select" on scores for select using (true);
create policy "scores_insert" on scores for insert with check (true);

-- Policies questions : lecture publique, écriture admin seulement (service_role)
create policy "questions_select" on questions for select using (true);
create policy "questions_write" on questions
  for all using (auth.role() = 'service_role');
