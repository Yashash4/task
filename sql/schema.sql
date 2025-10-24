-- schema.sql - COMPLETE VERSION WITH RLS POLICIES

-- Enable pgcrypto for random UUID generation
create extension if not exists pgcrypto;

-- Table for rooms (or organizations)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  current_code text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
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
  joined_at timestamptz default now()
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table to log room code changes
create table if not exists rooms_history (
  id bigserial primary key,
  room_id uuid references rooms(id),
  old_code text,
  new_code text,
  rotated_by uuid references auth.users(id),
  rotated_at timestamptz default now()
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

-- ============================================
-- RLS POLICIES
-- ============================================

-- ROOMS POLICIES
drop policy if exists "Admins can create rooms" on rooms;
create policy "Admins can create rooms"
on rooms for insert
to public
with check (
  exists (
    select 1 from users_info
    where users_info.id = auth.uid()
    and users_info.role_flags @> '["admin"]'::jsonb
  )
);

drop policy if exists "Members can view their own room" on rooms;
create policy "Members can view their own room"
on rooms for select
to public
using (
  id = (
    select users_info.room_id
    from users_info
    where users_info.id = auth.uid()
  )
);

-- USERS_INFO POLICIES
drop policy if exists "Allow public user sign-ups" on users_info;
create policy "Allow public user sign-ups"
on users_info for insert
to public
with check (true);

drop policy if exists "Users can view their own profile" on users_info;
create policy "Users can view their own profile"
on users_info for select
to public
using (auth.uid() = id);

drop policy if exists "Admins can view users in their room" on users_info;
create policy "Admins can view users in their room"
on users_info for select
to public
using (
  room_id = (
    select users_info_1.room_id
    from users_info users_info_1
    where users_info_1.id = auth.uid()
  )
);

drop policy if exists "Admins can update users in their room" on users_info;
create policy "Admins can update users in their room"
on users_info for update
to public
using (
  room_id = (
    select users_info_1.room_id
    from users_info users_info_1
    where users_info_1.id = auth.uid()
  )
);

-- TASKS POLICIES
drop policy if exists "Admins can create tasks" on tasks;
create policy "Admins can create tasks"
on tasks for insert
to public
with check (
  exists (
    select 1 from users_info
    where users_info.id = auth.uid()
    and users_info.role_flags @> '["admin"]'::jsonb
  )
);

drop policy if exists "Users and Admins can view tasks" on tasks;
create policy "Users and Admins can view tasks"
on tasks for select
to public
using (
  assigned_to = auth.uid()
  or room_id = (
    select users_info.room_id
    from users_info
    where users_info.id = auth.uid()
  )
);

drop policy if exists "Users and Admins can update tasks" on tasks;
create policy "Users and Admins can update tasks"
on tasks for update
to public
using (
  assigned_to = auth.uid()
  or room_id = (
    select users_info.room_id
    from users_info
    where users_info.id = auth.uid()
  )
);

-- ROOMS_HISTORY POLICIES (optional - for audit logging)
drop policy if exists "Admins can view room history" on rooms_history;
create policy "Admins can view room history"
on rooms_history for select
to public
using (
  exists (
    select 1 from users_info
    where users_info.id = auth.uid()
    and users_info.role_flags @> '["admin"]'::jsonb
  )
);