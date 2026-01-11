-- Jalankan script ini di SQL Editor Supabase

create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  sender text not null,
  content text not null,
  sent_at timestamptz default now()
);

create table if not exists receipts (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references transactions(id) on delete cascade,
  receiver text not null,
  received_at timestamptz default now()
);

-- Enable Realtime untuk kedua tabel agar fitur live update berjalan
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table transactions, receipts;
commit;
