-- Compteur de séquence mensuelle par utilisateur / préfixe (DEV, FAC, AVR)
-- Garantit une numérotation continue et chronologique sans trou.
CREATE TABLE IF NOT EXISTS document_sequence (
  user_id      TEXT NOT NULL,
  prefix       TEXT NOT NULL,
  year         INTEGER NOT NULL,
  month        INTEGER NOT NULL,
  last_seq     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, prefix, year, month)
);

-- Fonction atomique : retourne le prochain numéro de séquence pour le triplet (user, prefix, année, mois)
CREATE OR REPLACE FUNCTION next_document_sequence(
  p_user_id TEXT,
  p_prefix  TEXT,
  p_year    INTEGER,
  p_month   INTEGER
) RETURNS INTEGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  INSERT INTO document_sequence (user_id, prefix, year, month, last_seq)
  VALUES (p_user_id, p_prefix, p_year, p_month, 1)
  ON CONFLICT (user_id, prefix, year, month)
  DO UPDATE SET last_seq = document_sequence.last_seq + 1
  RETURNING last_seq INTO next_seq;

  RETURN next_seq;
END;
$$ LANGUAGE plpgsql;