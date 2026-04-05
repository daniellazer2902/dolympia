-- Ajouter la colonne duration (en secondes) à game_settings
-- NULL = utiliser la durée par défaut du jeu
ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS duration int DEFAULT NULL;
