-- Seed: questions supplémentaires — alcool, Pâques, calcul mental, ordre logique
-- 10 Quiz + 10 Vrai/Faux + 10 Calcul Mental + 10 Ordre Logique

-- =============================================
-- 1. QUIZ (game_type = 'quiz') — 10 questions
-- Thèmes : alcool & Pâques
-- =============================================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

-- Alcool
('quiz', 'Quel spiritueux est à la base du mojito ?',
 '["Vodka", "Rhum", "Gin", "Tequila"]', '"Rhum"', 'medium', 'alcool'),

('quiz', 'De quelle région française provient le champagne ?',
 '["Bourgogne", "Champagne", "Alsace", "Loire"]', '"Champagne"', 'medium', 'alcool'),

('quiz', 'Quel est l''ingrédient principal de la bière, en dehors de l''eau ?',
 '["Houblon", "Malt d''orge", "Levure", "Blé"]', '"Malt d''orge"', 'medium', 'alcool'),

('quiz', 'Quel cocktail est composé de vodka, de jus de tomate et d''épices ?',
 '["Cosmopolitan", "Bloody Mary", "Margarita", "Tequila Sunrise"]', '"Bloody Mary"', 'medium', 'alcool'),

('quiz', 'Quel pays est le plus grand producteur de whisky single malt ?',
 '["Irlande", "États-Unis", "Écosse", "Japon"]', '"Écosse"', 'hard', 'alcool'),

-- Pâques
('quiz', 'Dans quel pays la tradition de l''œuf de Pâques a-t-elle commencé ?',
 '["France", "Allemagne", "Angleterre", "Italie"]', '"Allemagne"', 'medium', 'pâques'),

('quiz', 'Quel animal distribue traditionnellement les œufs de Pâques en Australie ?',
 '["Lapin", "Kangourou", "Bilby", "Koala"]', '"Bilby"', 'hard', 'pâques'),

('quiz', 'Quelle fête chrétienne Pâques célèbre-t-elle ?',
 '["La naissance de Jésus", "La résurrection de Jésus", "L''ascension de Jésus", "La Pentecôte"]', '"La résurrection de Jésus"', 'medium', 'pâques'),

('quiz', 'Combien de jours dure le Carême qui précède Pâques ?',
 '["30", "40", "46", "50"]', '"40"', 'hard', 'pâques'),

('quiz', 'Quel type de chocolat contient le plus de cacao ?',
 '["Chocolat au lait", "Chocolat blanc", "Chocolat noir", "Chocolat praliné"]', '"Chocolat noir"', 'medium', 'pâques');


-- =============================================
-- 2. VRAI / FAUX (game_type = 'true-false') — 10 questions
-- Thèmes : alcool & Pâques
-- =============================================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

('true-false', 'Le champagne ne peut être produit qu''en France pour porter cette appellation.',
 '["Vrai", "Faux"]', '"Vrai"', 'medium', 'alcool'),

('true-false', 'La tequila est fabriquée à partir de cactus.',
 '["Vrai", "Faux"]', '"Faux"', 'medium', 'alcool'),

('true-false', 'Le vin rosé est un mélange de vin rouge et de vin blanc.',
 '["Vrai", "Faux"]', '"Faux"', 'medium', 'alcool'),

('true-false', 'La bière est la boisson alcoolisée la plus consommée au monde.',
 '["Vrai", "Faux"]', '"Vrai"', 'medium', 'alcool'),

('true-false', 'Le gin est aromatisé principalement avec des baies de genièvre.',
 '["Vrai", "Faux"]', '"Vrai"', 'hard', 'alcool'),

('true-false', 'Le lapin de Pâques est une tradition d''origine allemande.',
 '["Vrai", "Faux"]', '"Vrai"', 'medium', 'pâques'),

('true-false', 'Pâques tombe toujours le même jour chaque année.',
 '["Vrai", "Faux"]', '"Faux"', 'medium', 'pâques'),

('true-false', 'Le chocolat blanc ne contient pas de cacao solide.',
 '["Vrai", "Faux"]', '"Vrai"', 'hard', 'pâques'),

('true-false', 'En France, ce sont les cloches de Pâques qui apportent les œufs, pas le lapin.',
 '["Vrai", "Faux"]', '"Vrai"', 'hard', 'pâques'),

('true-false', 'L''île de Pâques doit son nom au fait qu''elle a été découverte un jour de Pâques.',
 '["Vrai", "Faux"]', '"Vrai"', 'hard', 'pâques');


-- =============================================
-- 3. CALCUL MENTAL (game_type = 'mental-math') — 10 questions
-- =============================================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

('mental-math', '63 + 89',
 '[142, 148, 152, 158]', '152', 'easy', 'calcul'),

('mental-math', '204 - 87',
 '[107, 113, 117, 123]', '117', 'easy', 'calcul'),

('mental-math', '16 × 14',
 '[204, 214, 224, 234]', '224', 'medium', 'calcul'),

('mental-math', '432 ÷ 12',
 '[32, 34, 36, 38]', '36', 'medium', 'calcul'),

('mental-math', '75 × 8',
 '[580, 590, 600, 610]', '600', 'easy', 'calcul'),

('mental-math', '1296 ÷ 36',
 '[32, 34, 36, 38]', '36', 'hard', 'calcul'),

('mental-math', '45 × 22',
 '[970, 980, 990, 1000]', '990', 'medium', 'calcul'),

('mental-math', '13² - 25',
 '[134, 140, 144, 150]', '144', 'medium', 'calcul'),

('mental-math', '88 × 11',
 '[958, 968, 978, 988]', '968', 'hard', 'calcul'),

('mental-math', '625 ÷ 25 + 50',
 '[65, 70, 75, 80]', '75', 'hard', 'calcul');


-- =============================================
-- 4. ORDRE LOGIQUE (game_type = 'order-logic') — 10 questions
-- =============================================

INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES

('order-logic', 'Classez ces cocktails du moins alcoolisé au plus alcoolisé (en degré typique).',
 '["Martini", "Bière pression", "Mojito", "Kir"]',
 '["Bière pression", "Kir", "Mojito", "Martini"]', 'hard', 'alcool'),

('order-logic', 'Classez ces étapes de fabrication du vin dans l''ordre chronologique.',
 '["Mise en bouteille", "Vendange", "Fermentation", "Élevage"]',
 '["Vendange", "Fermentation", "Élevage", "Mise en bouteille"]', 'medium', 'alcool'),

('order-logic', 'Classez ces spiritueux du moins au plus titré en alcool (degré moyen).',
 '["Absinthe", "Vin", "Bière", "Whisky"]',
 '["Bière", "Vin", "Whisky", "Absinthe"]', 'medium', 'alcool'),

('order-logic', 'Classez ces événements de Pâques dans l''ordre chronologique de la Semaine sainte.',
 '["Dimanche de Pâques", "Jeudi saint", "Vendredi saint", "Dimanche des Rameaux"]',
 '["Dimanche des Rameaux", "Jeudi saint", "Vendredi saint", "Dimanche de Pâques"]', 'medium', 'pâques'),

('order-logic', 'Classez ces types de chocolat du plus amer au plus sucré.',
 '["Chocolat au lait", "Chocolat noir 99%", "Chocolat blanc", "Chocolat noir 70%"]',
 '["Chocolat noir 99%", "Chocolat noir 70%", "Chocolat au lait", "Chocolat blanc"]', 'medium', 'pâques'),

('order-logic', 'Classez ces pays par production de cacao, du plus grand au plus petit producteur.',
 '["Ghana", "Côte d''Ivoire", "Indonésie", "Équateur"]',
 '["Côte d''Ivoire", "Ghana", "Indonésie", "Équateur"]', 'hard', 'pâques'),

('order-logic', 'Classez ces nombres du plus petit au plus grand.',
 '["√144", "2³", "15", "3²"]',
 '["2³", "3²", "√144", "15"]', 'medium', 'calcul'),

('order-logic', 'Classez ces fleuves du plus court au plus long.',
 '["Nil", "Amazone", "Rhin", "Danube"]',
 '["Rhin", "Danube", "Amazone", "Nil"]', 'hard', 'géographie'),

('order-logic', 'Classez ces fêtes dans l''ordre du calendrier (janvier → décembre).',
 '["Pâques", "Noël", "Halloween", "Saint-Valentin"]',
 '["Saint-Valentin", "Pâques", "Halloween", "Noël"]', 'easy', 'culture'),

('order-logic', 'Classez ces étapes de la fabrication du chocolat dans l''ordre.',
 '["Torréfaction", "Récolte des cabosses", "Moulage", "Conchage"]',
 '["Récolte des cabosses", "Torréfaction", "Conchage", "Moulage"]', 'hard', 'pâques');
