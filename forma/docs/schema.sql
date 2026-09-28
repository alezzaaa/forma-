-- GET DRESSD: production reference schema (PostgreSQL 15+).
-- This schema is not needed to run the local MVP and is not automatically applied.
-- Keep object storage private and authorize every request by the authenticated owner.
BEGIN;
CREATE TYPE garment_category AS ENUM ('T-shirt','Camicia','Polo','Felpa','Maglione','Giacca','Cappotto','Jeans','Pantaloni','Shorts','Sneakers','Scarpe eleganti','Accessori');
CREATE TYPE wardrobe_style AS ENUM ('Minimal','Casual','Streetwear','Elegante','Sportivo');
CREATE TYPE wardrobe_season AS ENUM ('Primavera','Estate','Autunno','Inverno');

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text NOT NULL UNIQUE,
  display_name varchar(80) NOT NULL DEFAULT '',
  preferred_style wardrobe_style NOT NULL DEFAULT 'Minimal',
  reduce_motion boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE garments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  category garment_category NOT NULL,
  subcategory varchar(120) NOT NULL DEFAULT '',
  color varchar(50) NOT NULL,
  color_hex char(7) NOT NULL CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  style wardrobe_style NOT NULL,
  formality smallint NOT NULL CHECK (formality BETWEEN 1 AND 5),
  material varchar(160) NOT NULL DEFAULT '',
  pattern varchar(120) NOT NULL DEFAULT '',
  -- Object storage key, never an unrestricted public URL.
  image_key text NOT NULL,
  favorite boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id,id)
);
CREATE INDEX garments_owner_category ON garments(owner_id,category) WHERE archived_at IS NULL;
CREATE INDEX garments_owner_recent ON garments(owner_id,created_at DESC);
CREATE TABLE garment_secondary_colors (
  garment_id uuid NOT NULL REFERENCES garments(id) ON DELETE CASCADE,
  color varchar(50) NOT NULL,
  PRIMARY KEY(garment_id,color)
);
CREATE TABLE garment_seasons (
  garment_id uuid NOT NULL REFERENCES garments(id) ON DELETE CASCADE,
  season wardrobe_season NOT NULL,
  PRIMARY KEY(garment_id,season)
);

CREATE TABLE outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  occasion varchar(100) NOT NULL,
  season wardrobe_season NOT NULL,
  style wardrobe_style NOT NULL,
  rating smallint NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  favorite boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '' CHECK (length(notes)<=5000),
  explanation text NOT NULL DEFAULT '' CHECK (length(explanation)<=2000),
  score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE(owner_id,id)
);
CREATE TABLE outfit_garments (
  owner_id uuid NOT NULL,
  outfit_id uuid NOT NULL,
  garment_id uuid NOT NULL,
  position smallint NOT NULL CHECK(position BETWEEN 0 AND 19),
  PRIMARY KEY(outfit_id,garment_id),
  UNIQUE(outfit_id,position),
  FOREIGN KEY(owner_id,outfit_id) REFERENCES outfits(owner_id,id) ON DELETE CASCADE,
  FOREIGN KEY(owner_id,garment_id) REFERENCES garments(owner_id,id)
);

CREATE TABLE wear_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  -- Optional: generated looks can be worn without being saved as an outfit.
  outfit_id uuid,
  outfit_name varchar(160) NOT NULL,
  worn_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,id),
  FOREIGN KEY(owner_id,outfit_id) REFERENCES outfits(owner_id,id)
);
CREATE INDEX wear_events_owner_date ON wear_events(owner_id,worn_at DESC);
CREATE TABLE wear_event_garments (
  owner_id uuid NOT NULL,
  wear_event_id uuid NOT NULL,
  garment_id uuid NOT NULL,
  position smallint NOT NULL CHECK(position BETWEEN 0 AND 19),
  -- Preserve the visual metadata if a garment is later edited or archived.
  name_snapshot varchar(160) NOT NULL,
  color_snapshot varchar(50) NOT NULL,
  category_snapshot garment_category NOT NULL,
  PRIMARY KEY(wear_event_id,garment_id),
  UNIQUE(wear_event_id,position),
  FOREIGN KEY(owner_id,wear_event_id) REFERENCES wear_events(owner_id,id) ON DELETE CASCADE,
  FOREIGN KEY(owner_id,garment_id) REFERENCES garments(owner_id,id)
);

CREATE TABLE user_favorite_colors (
  owner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  color varchar(50) NOT NULL,
  PRIMARY KEY(owner_id,color)
);
CREATE TABLE outfit_feedback (
  owner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  -- Canonical sorted garment IDs. Stable across generation requests.
  garment_signature text NOT NULL,
  liked boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,garment_signature)
);

-- Usage counts are derived from events, so writing a wear event never increments
-- a counter independently and cannot leave counts out of sync after a rollback.
CREATE VIEW garment_usage AS
SELECT g.owner_id,g.id AS garment_id,count(weg.wear_event_id) AS wear_count,max(we.worn_at) AS last_worn
FROM garments g
LEFT JOIN wear_event_garments weg ON weg.owner_id=g.owner_id AND weg.garment_id=g.id
LEFT JOIN wear_events we ON we.owner_id=weg.owner_id AND we.id=weg.wear_event_id
GROUP BY g.owner_id,g.id;
CREATE VIEW outfit_usage AS
SELECT o.owner_id,o.id AS outfit_id,max(we.worn_at) AS last_worn
FROM outfits o LEFT JOIN wear_events we ON we.owner_id=o.owner_id AND we.outfit_id=o.id
GROUP BY o.owner_id,o.id;

-- Before exposing this through an API: enforce tenant authorization (RLS or a
-- dedicated API service), add migration tracking and image upload validation,
-- and soft-delete garments/outfits to retain truthful historical statistics.
COMMIT;
