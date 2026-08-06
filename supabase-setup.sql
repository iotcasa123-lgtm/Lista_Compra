-- Ejecuta este SQL en Supabase → SQL Editor → New query

-- Tabla de casas (configuración por casa)
create table if not exists houses (
  id text primary key,
  name text not null,
  emoji text default '🏡',
  supermarkets text[] default array['Mercadona', 'Lidl', 'Carrefour', 'Dia', 'Alcampo'],
  created_at timestamptz default now()
);

-- Tabla de productos
create table if not exists items (
  id bigserial primary key,
  house_id text not null references houses(id) on delete cascade,
  name text not null,
  qty text,
  supermarket text,
  person text,
  done boolean default false,
  created_at timestamptz default now()
);

-- Índice para acelerar las consultas por casa
create index if not exists items_house_id_idx on items(house_id);

-- Activar Row Level Security (permite acceso público a todas las casas)
alter table houses enable row level security;
alter table items enable row level security;

-- Políticas de acceso público (cualquiera con la URL puede leer y escribir)
create policy "public_houses" on houses for all using (true) with check (true);
create policy "public_items" on items for all using (true) with check (true);

-- Activar realtime para sincronización en tiempo real
alter publication supabase_realtime add table items;
