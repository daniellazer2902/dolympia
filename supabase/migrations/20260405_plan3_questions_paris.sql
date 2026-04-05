-- ============================================
-- Plan 3 : Questions thématiques Paris + Musique + Anecdotes
-- 30 Quiz + 30 Vrai/Faux + 10 Ordre Logique
-- ============================================

-- =====================
-- QUIZ (30 questions)
-- =====================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

-- Paris / Vie quotidienne
('quiz', 'Quelle ligne de métro parisien est la plus fréquentée ?',
 '["Ligne 1", "Ligne 4", "Ligne 13", "Ligne 9"]', '"Ligne 1"', 'medium', 'paris'),

('quiz', 'Combien de stations compte le métro parisien ?',
 '["245", "303", "198", "352"]', '"303"', 'hard', 'paris'),

('quiz', 'Quel est le monument le plus visité de Paris ?',
 '["Tour Eiffel", "Musée du Louvre", "Cathédrale Notre-Dame", "Arc de Triomphe"]', '"Cathédrale Notre-Dame"', 'medium', 'paris'),

('quiz', 'Combien de touristes visitent Paris chaque année (environ) ?',
 '["20 millions", "30 millions", "44 millions", "55 millions"]', '"44 millions"', 'hard', 'paris'),

('quiz', 'Quel arrondissement de Paris est le plus peuplé ?',
 '["15ème", "18ème", "20ème", "11ème"]', '"15ème"', 'hard', 'paris'),

('quiz', 'Quelle est la plus vieille station de métro de Paris ?',
 '["Bastille", "Concorde", "Porte Maillot", "Châtelet"]', '"Porte Maillot"', 'hard', 'paris'),

('quiz', 'Quel pont de Paris est le plus ancien encore debout ?',
 '["Pont Neuf", "Pont des Arts", "Pont Alexandre III", "Pont Royal"]', '"Pont Neuf"', 'medium', 'paris'),

('quiz', 'Combien de boulangeries compte Paris intra-muros (environ) ?',
 '["500", "1 200", "2 000", "3 500"]', '"1 200"', 'hard', 'paris'),

('quiz', 'Quelle gare parisienne accueille le plus de voyageurs par an ?',
 '["Gare du Nord", "Gare de Lyon", "Gare Saint-Lazare", "Gare Montparnasse"]', '"Gare du Nord"', 'easy', 'paris'),

('quiz', 'Quel est le plus grand parc de Paris intra-muros ?',
 '["Jardin des Tuileries", "Parc des Buttes-Chaumont", "Jardin du Luxembourg", "Bois de Vincennes"]', '"Bois de Vincennes"', 'medium', 'paris'),

('quiz', 'En quelle année la Tour Eiffel a-t-elle été construite ?',
 '["1889", "1900", "1875", "1892"]', '"1889"', 'easy', 'paris'),

('quiz', 'Quel quartier de Paris est surnommé le « village » ?',
 '["Montmartre", "Le Marais", "Saint-Germain", "Belleville"]', '"Montmartre"', 'easy', 'paris'),

('quiz', 'Combien d''étages compte la Tour Eiffel ?',
 '["2", "3", "4", "5"]', '"3"', 'easy', 'paris'),

('quiz', 'Quelle est la rue la plus longue de Paris ?',
 '["Rue de Rivoli", "Rue de Vaugirard", "Avenue des Champs-Élysées", "Boulevard Haussmann"]', '"Rue de Vaugirard"', 'hard', 'paris'),

('quiz', 'Quel fleuve traverse Paris ?',
 '["La Loire", "La Seine", "Le Rhône", "La Garonne"]', '"La Seine"', 'easy', 'paris'),

-- Musique / Anecdotes
('quiz', 'Qui chante « Allumer le feu » ?',
 '["Patrick Bruel", "Johnny Hallyday", "Jean-Jacques Goldman", "Francis Cabrel"]', '"Johnny Hallyday"', 'easy', 'musique'),

('quiz', 'Quel groupe a chanté « Around the World » en 1997 ?',
 '["Air", "Daft Punk", "Phoenix", "Justice"]', '"Daft Punk"', 'easy', 'musique'),

('quiz', 'Qui est l''interprète de « La Vie en rose » ?',
 '["Dalida", "Édith Piaf", "Mireille Mathieu", "Françoise Hardy"]', '"Édith Piaf"', 'easy', 'musique'),

('quiz', 'Quel artiste français a sorti l''album « Racine carrée » ?',
 '["Maître Gims", "Stromae", "Nekfeu", "Orelsan"]', '"Stromae"', 'easy', 'musique'),

('quiz', 'Combien de Victoires de la Musique a remporté Jean-Jacques Goldman ?',
 '["2", "5", "9", "12"]', '"9"', 'hard', 'musique'),

('quiz', 'Quel rappeur français a sorti « Civilisation » en 2021 ?',
 '["Booba", "Jul", "Nekfeu", "Orelsan"]', '"Orelsan"', 'medium', 'musique'),

('quiz', 'Quel artiste a chanté « Formidable » en se faisant passer pour un ivrogne dans la rue ?',
 '["Stromae", "Vianney", "Soprano", "Kendji Girac"]', '"Stromae"', 'easy', 'musique'),

('quiz', 'Quel groupe français est connu pour « Da Funk » et « One More Time » ?',
 '["Air", "Justice", "Daft Punk", "M83"]', '"Daft Punk"', 'easy', 'musique'),

('quiz', 'Qui a composé les « Quatre Saisons » ?',
 '["Mozart", "Vivaldi", "Bach", "Beethoven"]', '"Vivaldi"', 'easy', 'musique'),

('quiz', 'Quel chanteur français est surnommé « Le Grand Blond » ?',
 '["Renaud", "Patrick Juvet", "Claude François", "Dave"]', '"Claude François"', 'hard', 'musique'),

-- Culture générale fun
('quiz', 'Quel animal est le symbole de la France ?',
 '["L''aigle", "Le coq", "Le lion", "Le cerf"]', '"Le coq"', 'easy', 'culture'),

('quiz', 'Combien de fromages différents produit-on en France (environ) ?',
 '["200", "400", "1 000", "1 600"]', '"1 600"', 'medium', 'culture'),

('quiz', 'Quel est le plat préféré des Français selon les sondages ?',
 '["La raclette", "Le magret de canard", "Le steak-frites", "La blanquette de veau"]', '"Le magret de canard"', 'medium', 'culture'),

('quiz', 'En quelle année le Wi-Fi gratuit a-t-il été installé dans le métro parisien ?',
 '["2012", "2015", "2018", "2022"]', '"2012"', 'hard', 'paris'),

('quiz', 'Quelle est la vitesse maximale autorisée à Paris depuis 2021 ?',
 '["30 km/h", "40 km/h", "50 km/h", "20 km/h"]', '"30 km/h"', 'medium', 'paris')

ON CONFLICT DO NOTHING;

-- =====================
-- VRAI OU FAUX (30 questions)
-- =====================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

-- Paris
('true-false', 'La Tour Eiffel grandit d''environ 15 cm en été à cause de la chaleur.',
 '[]', 'true', 'easy', 'paris'),

('true-false', 'Le métro parisien roule 24h/24 tous les jours.',
 '[]', 'false', 'easy', 'paris'),

('true-false', 'Paris compte 20 arrondissements.',
 '[]', 'true', 'easy', 'paris'),

('true-false', 'La Gare du Nord est la gare la plus fréquentée d''Europe.',
 '[]', 'true', 'medium', 'paris'),

('true-false', 'Le Sacré-Cœur est plus haut que la Tour Eiffel.',
 '[]', 'false', 'easy', 'paris'),

('true-false', 'Il est interdit de mourir à Paris.',
 '[]', 'false', 'medium', 'paris'),

('true-false', 'La Seine traverse Paris d''est en ouest.',
 '[]', 'true', 'medium', 'paris'),

('true-false', 'Le Louvre est le plus grand musée du monde.',
 '[]', 'true', 'easy', 'paris'),

('true-false', 'Il y a plus de 470 parcs et jardins à Paris.',
 '[]', 'true', 'medium', 'paris'),

('true-false', 'Le métro parisien a été inauguré en 1900.',
 '[]', 'true', 'medium', 'paris'),

('true-false', 'La ligne 14 du métro est entièrement automatique.',
 '[]', 'true', 'easy', 'paris'),

('true-false', 'Les Champs-Élysées mesurent 3 km de long.',
 '[]', 'false', 'medium', 'paris'),

('true-false', 'Le Pont des Arts est célèbre pour ses cadenas d''amour.',
 '[]', 'true', 'easy', 'paris'),

('true-false', 'Paris est la ville avec le plus de restaurants étoilés Michelin au monde.',
 '[]', 'false', 'hard', 'paris'),

('true-false', 'La station de métro « Arts et Métiers » est décorée comme un sous-marin.',
 '[]', 'true', 'medium', 'paris'),

-- Musique
('true-false', 'Daft Punk est un duo originaire de Paris.',
 '[]', 'true', 'easy', 'musique'),

('true-false', 'Johnny Hallyday a vendu plus de 100 millions de disques.',
 '[]', 'true', 'medium', 'musique'),

('true-false', 'Stromae est un artiste français né à Paris.',
 '[]', 'false', 'medium', 'musique'),

('true-false', 'La Marseillaise a été composée à Marseille.',
 '[]', 'false', 'medium', 'musique'),

('true-false', 'Édith Piaf mesurait moins de 1m50.',
 '[]', 'true', 'medium', 'musique'),

('true-false', 'Le Festival de Cannes récompense aussi des œuvres musicales.',
 '[]', 'false', 'easy', 'musique'),

('true-false', 'David Guetta est le DJ français le plus streamé au monde.',
 '[]', 'true', 'easy', 'musique'),

('true-false', 'Le saxophone a été inventé par un Français.',
 '[]', 'false', 'hard', 'musique'),

('true-false', 'MC Solaar est considéré comme un pionnier du rap français.',
 '[]', 'true', 'easy', 'musique'),

('true-false', 'La chanson « Je t''aime moi non plus » a été interdite dans plusieurs pays.',
 '[]', 'true', 'medium', 'musique'),

-- Culture générale
('true-false', 'La France produit environ 10 milliards de baguettes par an.',
 '[]', 'true', 'hard', 'culture'),

('true-false', 'Le croissant est une invention française.',
 '[]', 'false', 'medium', 'culture'),

('true-false', 'La France est le pays le plus visité au monde.',
 '[]', 'true', 'easy', 'culture'),

('true-false', 'Le TGV français a battu le record mondial de vitesse sur rail en 2007.',
 '[]', 'true', 'hard', 'culture'),

('true-false', 'Il y a plus de 300 sortes de bières brassées en France.',
 '[]', 'true', 'hard', 'culture')

ON CONFLICT DO NOTHING;

-- =====================
-- ORDRE LOGIQUE (10 questions)
-- =====================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

('order-logic', 'Classez ces lignes de métro parisien de la plus ancienne à la plus récente.',
 '["Ligne 1", "Ligne 4", "Ligne 7", "Ligne 14"]',
 '["Ligne 1", "Ligne 4", "Ligne 7", "Ligne 14"]', 'medium', 'paris'),

('order-logic', 'Classez ces monuments parisiens du plus ancien au plus récent.',
 '["Notre-Dame", "Pont Neuf", "Arc de Triomphe", "Tour Eiffel"]',
 '["Notre-Dame", "Pont Neuf", "Arc de Triomphe", "Tour Eiffel"]', 'medium', 'paris'),

('order-logic', 'Classez ces albums de Daft Punk par date de sortie.',
 '["Homework", "Discovery", "Human After All", "Random Access Memories"]',
 '["Homework", "Discovery", "Human After All", "Random Access Memories"]', 'medium', 'musique'),

('order-logic', 'Classez ces chanteurs français du plus ancien au plus récent.',
 '["Charles Aznavour", "Jacques Brel", "Johnny Hallyday", "Stromae"]',
 '["Charles Aznavour", "Jacques Brel", "Johnny Hallyday", "Stromae"]', 'easy', 'musique'),

('order-logic', 'Classez ces arrondissements de Paris du plus petit au plus grand (superficie).',
 '["2ème", "1er", "6ème", "15ème"]',
 '["2ème", "1er", "6ème", "15ème"]', 'hard', 'paris'),

('order-logic', 'Classez ces gares parisiennes par fréquentation (de la plus à la moins fréquentée).',
 '["Gare du Nord", "Gare Saint-Lazare", "Gare de Lyon", "Gare Montparnasse"]',
 '["Gare du Nord", "Gare Saint-Lazare", "Gare de Lyon", "Gare Montparnasse"]', 'hard', 'paris'),

('order-logic', 'Classez ces événements musicaux français du plus ancien au plus récent.',
 '["Première Fête de la Musique", "Création des Victoires de la Musique", "Premier Hellfest", "Premier Lollapalooza Paris"]',
 '["Première Fête de la Musique", "Création des Victoires de la Musique", "Premier Hellfest", "Premier Lollapalooza Paris"]', 'hard', 'musique'),

('order-logic', 'Classez ces plats français du plus rapide au plus long à préparer.',
 '["Croque-monsieur", "Quiche lorraine", "Bœuf bourguignon", "Cassoulet"]',
 '["Croque-monsieur", "Quiche lorraine", "Bœuf bourguignon", "Cassoulet"]', 'easy', 'culture'),

('order-logic', 'Classez ces fleuves français du plus court au plus long.',
 '["La Garonne", "La Seine", "La Loire", "Le Rhin"]',
 '["La Garonne", "La Seine", "La Loire", "Le Rhin"]', 'medium', 'culture'),

('order-logic', 'Classez ces rappeurs français par nombre de ventes (du plus au moins vendu).',
 '["Jul", "Nekfeu", "Orelsan", "Damso"]',
 '["Jul", "Nekfeu", "Orelsan", "Damso"]', 'hard', 'musique')

ON CONFLICT DO NOTHING;
