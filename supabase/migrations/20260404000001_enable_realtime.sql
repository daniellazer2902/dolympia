-- Activer Realtime (postgres_changes) sur les tables de jeu
-- À exécuter dans Supabase > SQL Editor
alter publication supabase_realtime add table sessions, players, rounds, scores;
