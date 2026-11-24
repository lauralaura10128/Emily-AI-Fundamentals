-- Supabase / Postgres schema for the scraped books.
-- Run this once in your Supabase project:  Dashboard -> SQL Editor -> paste -> Run.

create table if not exists public.books (
    id            bigint generated always as identity primary key,
    title         text    not null,
    category      text,                    -- e.g. "Travel"; the explorer filters on this
    price_gbp     numeric(6,2),
    availability  text,
    rating        smallint check (rating between 1 and 5),
    num_available integer,                 -- stock count; only populated by --details
    detail_url    text    unique,          -- used as the upsert key (one row per book page)
    image_url     text,
    scraped_at    timestamptz default now()
);

-- If the table already exists from an earlier version of this file, add the
-- two newer columns rather than recreating it.
alter table public.books add column if not exists category      text;
alter table public.books add column if not exists num_available integer;

-- Helpful indexes for querying/sorting later.
create index if not exists books_price_idx    on public.books (price_gbp);
create index if not exists books_rating_idx   on public.books (rating);
create index if not exists books_category_idx on public.books (category);
