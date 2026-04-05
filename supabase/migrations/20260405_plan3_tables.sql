-- ============================================
-- Plan 3 : nouvelles tables + seeds
-- ============================================

-- Table draw_words (mots pour Draw & Guess)
CREATE TABLE IF NOT EXISTS draw_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE draw_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "draw_words_read" ON draw_words FOR SELECT USING (true);
CREATE POLICY "draw_words_write" ON draw_words FOR ALL USING (auth.role() = 'authenticated');

-- Table word_pairs (paires pour Mot Commun)
CREATE TABLE IF NOT EXISTS word_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_a text NOT NULL,
  word_b text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE word_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "word_pairs_read" ON word_pairs FOR SELECT USING (true);
CREATE POLICY "word_pairs_write" ON word_pairs FOR ALL USING (auth.role() = 'authenticated');

-- Table game_settings (activation/désactivation globale des jeux)
CREATE TABLE IF NOT EXISTS game_settings (
  game_id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_settings_read" ON game_settings FOR SELECT USING (true);
CREATE POLICY "game_settings_write" ON game_settings FOR ALL USING (auth.role() = 'authenticated');

-- Colonne disabled_games sur sessions (jeux désactivés par le host pour cette partie)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS disabled_games text[] DEFAULT NULL;

-- Seed game_settings : tous les jeux activés par défaut
INSERT INTO game_settings (game_id, enabled) VALUES
  ('quiz', true), ('true-false', true), ('mental-math', true),
  ('reflex', true), ('tap-spam', true), ('memory', true),
  ('moving-target', true), ('order-logic', true), ('shake-it', true),
  ('geo-guess', true), ('rock-paper-scissors', true), ('point-rush', true),
  ('territory', true), ('draw-guess', true), ('common-word', true)
ON CONFLICT (game_id) DO NOTHING;

-- Seed draw_words : 30 mots pour Draw & Guess
INSERT INTO draw_words (word, category) VALUES
  ('Éléphant','animal'),('Pizza','nourriture'),('Fusée','objet'),
  ('Sirène','mythologie'),('Parapluie','objet'),('Volcan','nature'),
  ('Robot','technologie'),('Château','lieu'),('Pirate','personnage'),
  ('Guitare','musique'),('Dinosaure','animal'),('Arc-en-ciel','nature'),
  ('Astronaute','métier'),('Spaghetti','nourriture'),('Dragon','mythologie'),
  ('Hélicoptère','véhicule'),('Cactus','plante'),('Fantôme','halloween'),
  ('Skateboard','sport'),('Couronne','objet'),('Méduse','animal'),
  ('Igloo','lieu'),('Licorne','mythologie'),('Croissant','nourriture'),
  ('Tornade','nature'),('Clown','personnage'),('Palmier','plante'),
  ('Monstre','fantaisie'),('Baleine','animal'),('Pyramide','lieu')
ON CONFLICT DO NOTHING;

-- Seed word_pairs : 30 paires pour Mot Commun
INSERT INTO word_pairs (word_a, word_b, category) VALUES
  ('Soleil','Plage','vacances'),('Nuit','Étoile','ciel'),
  ('Chat','Souris','animaux'),('Feu','Glace','éléments'),
  ('Livre','Aventure','loisirs'),('Montagne','Neige','nature'),
  ('Musique','Danse','fête'),('Roi','Château','royauté'),
  ('Café','Matin','quotidien'),('Avion','Nuage','ciel'),
  ('Chocolat','Lait','nourriture'),('Forêt','Loup','conte'),
  ('Pirate','Trésor','aventure'),('Pluie','Parapluie','météo'),
  ('École','Crayon','éducation'),('Hiver','Cheminée','saison'),
  ('Cinéma','Popcorn','loisirs'),('Jardin','Fleur','nature'),
  ('Football','But','sport'),('Mariage','Gâteau','fête'),
  ('Océan','Baleine','mer'),('Vampire','Sang','horreur'),
  ('Paris','Tour','ville'),('Bébé','Biberon','famille'),
  ('Guitare','Chanson','musique'),('Espace','Fusée','science'),
  ('Clé','Porte','maison'),('Pizza','Italie','pays'),
  ('Halloween','Citrouille','fête'),('Diamant','Bague','bijoux')
ON CONFLICT DO NOTHING;
