-- schema.sql

-- Enable pgcrypto for random UUID generation
create extension if not exists pgcrypto;

-- Table for rooms (or organizations)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  current_code text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz default now() -- Corrected type
);
create index if not exists idx_rooms_current_code on rooms(current_code);

-- Table for user profiles, linked to Supabase auth users
create table if not exists users_info (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  room_id uuid references rooms(id),
  role_flags jsonb default '["user"]'::jsonb,
  approved boolean default false,
  joined_at timestamptz default now() -- Corrected type
);
create index if not exists idx_users_info_room on users_info(room_id);

-- Table for tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) not null,
  title text not null,
  description text,
  created_by uuid references auth.users(id),
  assigned_to uuid references users_info(id),
  status text default 'assigned' check (status in ('assigned','in_progress','submitted','approved','rejected')),
  due_date date,
  created_at timestamptz default now(), -- Corrected type
  updated_at timestamptz default now()  -- Corrected type
);

-- Table to log room code changes
create table if not exists rooms_history (
  id bigserial primary key,
  room_id uuid references rooms(id),
  old_code text,
  new_code text,
  rotated_by uuid references auth.users(id),
  rotated_at timestamptz default now() -- Corrected type
);

-- Function to generate a random 6-character room code
create or replace function generate_room_code()
returns text language sql as $$
  select string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36)::int + 1, 1), '')
  from generate_series(1, 6);
$$;

-- Enable Row Level Security for all tables
alter table rooms enable row level security;
alter table users_info enable row level security;
alter table tasks enable row level security;
alter table rooms_history enable row level security;