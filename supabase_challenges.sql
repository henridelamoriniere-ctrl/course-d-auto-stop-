-- =============================================
-- DÉFIS PAR DÉFAUT — Colle après le schema
-- =============================================
insert into challenges (title, description, points, category, proof_type, validation_type, active, sort_order) values
-- Rencontres & photos
('Selfie avec le conducteur', 'Photo souriante obligatoire avec le chauffeur', 30, 'photo', 'photo', 'auto', true, 1),
('Photo avec un camionneur', 'Dans la cabine du camion, plaque visible', 50, 'photo', 'photo', 'manual', true, 2),
('Conducteur d''une autre nationalité', 'Plaque d''immatriculation étrangère visible', 40, 'photo', 'photo', 'auto', true, 3),
('Interview vidéo du conducteur', 'Pourquoi prenez-vous des auto-stoppeurs ?', 60, 'photo', 'video', 'manual', true, 4),
('Photo devant un monument', 'Sur le trajet uniquement', 20, 'photo', 'photo', 'auto', true, 5),
-- Véhicules spéciaux
('Prendre un camion', 'Poids lourd uniquement', 70, 'vehicule', 'photo', 'auto', true, 10),
('Voiture de luxe', 'Mercedes, BMW, Audi, Porsche…', 80, 'vehicule', 'photo', 'auto', true, 11),
('Véhicule utilitaire / van', 'Artisan, livreur, plombier…', 40, 'vehicule', 'photo', 'auto', true, 12),
('Voiture électrique', 'Tesla, Renault Zoé, BMW i3…', 50, 'vehicule', 'photo', 'auto', true, 13),
('Moto ou scooter', 'Défi risqué, gros bonus !', 100, 'vehicule', 'photo', 'manual', true, 14),
('Véhicule agricole', 'Tracteur, moissonneuse…', 120, 'vehicule', 'photo', 'manual', true, 15),
-- Défis fun
('Chanter ensemble dans la voiture', 'Vidéo de 30 secondes minimum', 40, 'fun', 'video', 'auto', true, 20),
('Faire deviner votre destination', 'Le conducteur doit trouver votre destination', 30, 'fun', 'video', 'manual', true, 21),
('Manger avec le conducteur', 'Repas ou snack partagé, photo obligatoire', 60, 'fun', 'photo', 'manual', true, 22),
('Faire monter toute l''équipe dans 1 voiture', 'Tous les équipiers simultanément', 90, 'fun', 'photo', 'manual', true, 23),
-- Bonus performance
('Arriver avant 17h', 'Enregistrement automatique à l''arrivée', 100, 'bonus', 'photo', 'auto', true, 30),
('Arriver avant 18h', 'Enregistrement automatique à l''arrivée', 60, 'bonus', 'photo', 'auto', true, 31),
('Trajet d''une seule voiture > 150 km', 'Screenshot GPS ou carte avec distance visible', 70, 'bonus', 'photo', 'manual', true, 32),
('Premier à arriver', 'Attribué automatiquement au premier arrivé', 200, 'bonus', 'photo', 'auto', true, 33);
