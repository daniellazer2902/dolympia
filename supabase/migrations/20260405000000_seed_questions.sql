-- Seed: questions pour les mini-jeux dolympia
-- 20 Quiz + 15 Vrai/Faux + 10 Calcul Mental + 10 Ordre Logique

-- =============================================
-- 1. QUIZ (game_type = 'quiz') — 20 questions
-- =============================================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

-- Géographie
('quiz', 'Quelle est la capitale de l''Australie ?',
 '["Sydney", "Melbourne", "Canberra", "Perth"]', '"Canberra"', 'easy', 'géographie'),

('quiz', 'Quel est le plus long fleuve d''Afrique ?',
 '["Le Congo", "Le Niger", "Le Nil", "Le Zambèze"]', '"Le Nil"', 'easy', 'géographie'),

('quiz', 'Dans quel pays se trouve le désert d''Atacama ?',
 '["Argentine", "Pérou", "Chili", "Bolivie"]', '"Chili"', 'medium', 'géographie'),

('quiz', 'Quelle est la plus petite nation du monde par superficie ?',
 '["Monaco", "Vatican", "Saint-Marin", "Liechtenstein"]', '"Vatican"', 'medium', 'géographie'),

-- Science
('quiz', 'Quel gaz représente environ 78 % de l''atmosphère terrestre ?',
 '["Oxygène", "Azote", "Dioxyde de carbone", "Argon"]', '"Azote"', 'easy', 'science'),

('quiz', 'Combien d''os compose le squelette humain adulte ?',
 '["186", "206", "226", "256"]', '"206"', 'medium', 'science'),

('quiz', 'Quelle planète possède le plus grand nombre de lunes connues ?',
 '["Jupiter", "Saturne", "Uranus", "Neptune"]', '"Saturne"', 'hard', 'science'),

('quiz', 'Quel élément chimique a pour symbole « Fe » ?',
 '["Fluor", "Fer", "Francium", "Fermium"]', '"Fer"', 'easy', 'science'),

-- Culture générale
('quiz', 'Qui a peint « La Joconde » ?',
 '["Michel-Ange", "Raphaël", "Léonard de Vinci", "Botticelli"]', '"Léonard de Vinci"', 'easy', 'culture'),

('quiz', 'Dans quel pays a été inventé le piano ?',
 '["Allemagne", "Autriche", "Italie", "France"]', '"Italie"', 'medium', 'culture'),

('quiz', 'Quel philosophe grec est l''auteur de « La République » ?',
 '["Aristote", "Socrate", "Platon", "Épicure"]', '"Platon"', 'medium', 'culture'),

('quiz', 'Combien de touches possède un piano standard ?',
 '["76", "84", "88", "92"]', '"88"', 'medium', 'culture'),

-- Sport
('quiz', 'Dans quel sport utilise-t-on un volant ?',
 '["Tennis", "Badminton", "Squash", "Ping-pong"]', '"Badminton"', 'easy', 'sport'),

('quiz', 'Quel pays a remporté la Coupe du monde de football en 2022 ?',
 '["France", "Brésil", "Argentine", "Croatie"]', '"Argentine"', 'easy', 'sport'),

('quiz', 'Combien de joueurs composent une équipe de rugby à XV sur le terrain ?',
 '["13", "15", "11", "18"]', '"15"', 'easy', 'sport'),

('quiz', 'Quelle est la distance d''un marathon en kilomètres (arrondie) ?',
 '["38 km", "40 km", "42 km", "45 km"]', '"42 km"', 'medium', 'sport'),

-- Histoire
('quiz', 'En quelle année a eu lieu la Révolution française ?',
 '["1776", "1789", "1804", "1815"]', '"1789"', 'easy', 'histoire'),

('quiz', 'Quel empire a construit le Machu Picchu ?',
 '["Aztèque", "Maya", "Inca", "Olmèque"]', '"Inca"', 'medium', 'histoire'),

('quiz', 'Qui fut le premier homme à marcher sur la Lune ?',
 '["Buzz Aldrin", "Youri Gagarine", "Neil Armstrong", "John Glenn"]', '"Neil Armstrong"', 'easy', 'histoire'),

('quiz', 'En quelle année le mur de Berlin est-il tombé ?',
 '["1987", "1989", "1991", "1993"]', '"1989"', 'medium', 'histoire');


-- =============================================
-- 2. VRAI / FAUX (game_type = 'true-false') — 15 questions
-- =============================================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

('true-false', 'Les pieuvres ont trois cœurs.',
 '["Vrai", "Faux"]', '"Vrai"', 'easy', 'science'),

('true-false', 'La Grande Muraille de Chine est visible à l''œil nu depuis l''espace.',
 '["Vrai", "Faux"]', '"Faux"', 'easy', 'géographie'),

('true-false', 'Le miel ne périme jamais.',
 '["Vrai", "Faux"]', '"Vrai"', 'easy', 'science'),

('true-false', 'Vénus est la planète la plus chaude du système solaire.',
 '["Vrai", "Faux"]', '"Vrai"', 'medium', 'science'),

('true-false', 'Les bananes sont des baies au sens botanique.',
 '["Vrai", "Faux"]', '"Vrai"', 'medium', 'science'),

('true-false', 'Napoléon Bonaparte mesurait moins d''1m60.',
 '["Vrai", "Faux"]', '"Faux"', 'medium', 'histoire'),

('true-false', 'Un groupe de flamants roses s''appelle une « flamboyance ».',
 '["Vrai", "Faux"]', '"Vrai"', 'hard', 'science'),

('true-false', 'L''eau chaude gèle plus vite que l''eau froide dans certaines conditions.',
 '["Vrai", "Faux"]', '"Vrai"', 'hard', 'science'),

('true-false', 'Le Brésil a remporté cinq fois la Coupe du monde de football.',
 '["Vrai", "Faux"]', '"Vrai"', 'easy', 'sport'),

('true-false', 'Les crocodiles peuvent grimper aux arbres.',
 '["Vrai", "Faux"]', '"Vrai"', 'hard', 'science'),

('true-false', 'La Finlande est le pays qui compte le plus de saunas par habitant.',
 '["Vrai", "Faux"]', '"Vrai"', 'medium', 'géographie'),

('true-false', 'Le son se déplace plus vite dans l''eau que dans l''air.',
 '["Vrai", "Faux"]', '"Vrai"', 'medium', 'science'),

('true-false', 'Cléopâtre a vécu plus proche dans le temps de l''alunissage que de la construction des pyramides.',
 '["Vrai", "Faux"]', '"Vrai"', 'hard', 'histoire'),

('true-false', 'Les autruches enfouissent leur tête dans le sable quand elles ont peur.',
 '["Vrai", "Faux"]', '"Faux"', 'easy', 'science'),

('true-false', 'La Russie possède plus de fuseaux horaires que tout autre pays.',
 '["Vrai", "Faux"]', '"Vrai"', 'medium', 'géographie');


-- =============================================
-- 3. CALCUL MENTAL (game_type = 'mental-math') — 10 questions
-- =============================================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

('mental-math', '47 + 38',
 '[75, 85, 95, 80]', '85', 'easy', 'calcul'),

('mental-math', '156 - 79',
 '[67, 77, 87, 83]', '77', 'easy', 'calcul'),

('mental-math', '12 × 15',
 '[160, 170, 180, 190]', '180', 'easy', 'calcul'),

('mental-math', '256 ÷ 8',
 '[28, 30, 32, 34]', '32', 'medium', 'calcul'),

('mental-math', '99 × 7',
 '[683, 693, 703, 713]', '693', 'medium', 'calcul'),

('mental-math', '1024 - 567',
 '[447, 457, 467, 477]', '457', 'medium', 'calcul'),

('mental-math', '37 × 24',
 '[868, 878, 888, 898]', '888', 'hard', 'calcul'),

('mental-math', '15² + 20',
 '[225, 235, 245, 255]', '245', 'medium', 'calcul'),

('mental-math', '1000 ÷ 8',
 '[115, 120, 125, 130]', '125', 'hard', 'calcul'),

('mental-math', '78 × 12 - 36',
 '[890, 900, 910, 920]', '900', 'hard', 'calcul');


-- =============================================
-- 4. ORDRE LOGIQUE (game_type = 'order-logic') — 10 questions
-- =============================================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

('order-logic', 'Classez ces planètes de la plus proche à la plus éloignée du Soleil.',
 '["Mars", "Vénus", "Terre", "Mercure"]',
 '["Mercure", "Vénus", "Terre", "Mars"]', 'easy', 'science'),

('order-logic', 'Classez ces événements historiques du plus ancien au plus récent.',
 '["Révolution française", "Chute de Rome", "Première Guerre mondiale", "Découverte de l''Amérique"]',
 '["Chute de Rome", "Découverte de l''Amérique", "Révolution française", "Première Guerre mondiale"]', 'medium', 'histoire'),

('order-logic', 'Classez ces pays du plus peuplé au moins peuplé.',
 '["Brésil", "Inde", "Japon", "Chine"]',
 '["Chine", "Inde", "Brésil", "Japon"]', 'medium', 'géographie'),

('order-logic', 'Classez ces océans du plus grand au plus petit.',
 '["Atlantique", "Arctique", "Pacifique", "Indien"]',
 '["Pacifique", "Atlantique", "Indien", "Arctique"]', 'easy', 'géographie'),

('order-logic', 'Classez ces unités de mesure de la plus petite à la plus grande.',
 '["Kilomètre", "Centimètre", "Mètre", "Millimètre"]',
 '["Millimètre", "Centimètre", "Mètre", "Kilomètre"]', 'easy', 'science'),

('order-logic', 'Classez ces inventions de la plus ancienne à la plus récente.',
 '["Internet", "Téléphone", "Imprimerie", "Télévision"]',
 '["Imprimerie", "Téléphone", "Télévision", "Internet"]', 'medium', 'histoire'),

('order-logic', 'Classez ces animaux du plus rapide au plus lent.',
 '["Lion", "Guépard", "Lièvre", "Éléphant"]',
 '["Guépard", "Lion", "Lièvre", "Éléphant"]', 'medium', 'science'),

('order-logic', 'Classez ces montagnes de la plus haute à la moins haute.',
 '["Mont Blanc", "Everest", "Kilimandjaro", "Denali"]',
 '["Everest", "Kilimandjaro", "Denali", "Mont Blanc"]', 'hard', 'géographie'),

('order-logic', 'Classez ces langages de programmation par date de création (du plus ancien au plus récent).',
 '["Python", "JavaScript", "C", "Rust"]',
 '["C", "Python", "JavaScript", "Rust"]', 'hard', 'culture'),

('order-logic', 'Classez ces compositeurs par date de naissance (du plus ancien au plus récent).',
 '["Chopin", "Mozart", "Debussy", "Bach"]',
 '["Bach", "Mozart", "Chopin", "Debussy"]', 'hard', 'culture');


-- =============================================
-- 5. GEO GUESS (game_type = 'geo-guess') — 10 questions
-- =============================================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

('geo-guess', 'Ce pays est connu pour ses fjords et son saumon.',
 '["Norvège", "Suède", "Finlande", "Islande"]', '"Norvège"', 'easy', 'géographie'),

('geo-guess', 'Cette ville abrite le Colisée et la fontaine de Trevi.',
 '["Athènes", "Rome", "Barcelone", "Istanbul"]', '"Rome"', 'easy', 'géographie'),

('geo-guess', 'Ce pays est le plus grand producteur de café au monde.',
 '["Colombie", "Éthiopie", "Brésil", "Vietnam"]', '"Brésil"', 'easy', 'géographie'),

('geo-guess', 'Ce pays est un archipel de plus de 17 000 îles en Asie du Sud-Est.',
 '["Philippines", "Malaisie", "Indonésie", "Thaïlande"]', '"Indonésie"', 'medium', 'géographie'),

('geo-guess', 'Cette ville est surnommée « la Perle de l''Orient » et possède un célèbre port Victoria.',
 '["Singapour", "Hong Kong", "Shanghai", "Macao"]', '"Hong Kong"', 'medium', 'géographie'),

('geo-guess', 'Ce pays possède le désert du Sahara, les ruines de Timgad et le port d''Alger.',
 '["Maroc", "Tunisie", "Algérie", "Libye"]', '"Algérie"', 'medium', 'géographie'),

('geo-guess', 'Ce pays enclavé d''Amérique du Sud est traversé par le fleuve Paraguay.',
 '["Bolivie", "Paraguay", "Uruguay", "Équateur"]', '"Paraguay"', 'hard', 'géographie'),

('geo-guess', 'Cette île est célèbre pour ses lémuriens que l''on ne trouve nulle part ailleurs.',
 '["Sri Lanka", "Bornéo", "Madagascar", "Sumatra"]', '"Madagascar"', 'easy', 'géographie'),

('geo-guess', 'Ce petit pays européen est connu pour ses banques, son chocolat et ses montres.',
 '["Autriche", "Luxembourg", "Suisse", "Liechtenstein"]', '"Suisse"', 'easy', 'géographie'),

('geo-guess', 'Ce pays d''Asie centrale est traversé par la Route de la Soie et possède la mer d''Aral.',
 '["Turkménistan", "Ouzbékistan", "Kazakhstan", "Kirghizistan"]', '"Ouzbékistan"', 'hard', 'géographie');
