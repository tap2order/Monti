\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE menu_category_translations (
  id TEXT PRIMARY KEY,
  name1 TEXT NOT NULL,
  name2 TEXT NOT NULL,
  name3 TEXT NOT NULL,
  name4 TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO menu_category_translations (id, name1, name2, name3, name4)
VALUES
  ('cms67jvb30000ajvyyratzhkx', 'Hot beverages', 'Heiße Getränke', 'المشروبات الساخنة', 'Sıcak içecekler'),
  ('cms67jvb8000gajvyr5f472uq', 'Carbonated drinks', 'Kohlensäurehaltige Getränke', 'المشروبات الغازية', 'Gazlı içecekler'),
  ('cms67jvbb000sajvy3s6bxwzo', 'Freshly squeezed juices', 'Frisch gepresste Säfte', 'العصائر الطازجة', 'Taze sıkılmış meyve suları'),
  ('cms67jvbd000wajvy99kjlhv9', 'Non-carbonated drinks', 'Getränke ohne Kohlensäure', 'المشروبات غير الغازية', 'Gazsız içecekler'),
  ('cms67jvbf0017ajvy99kqnymw', 'Water', 'Wasser', 'المياه', 'Su'),
  ('cms67jvbi001eajvyd1il1o3t', 'Beer', 'Bier', 'البيرة', 'Bira'),
  ('cms67jvbl001pajvy39z3q2xp', 'Cognac', 'Cognac', 'الكونياك', 'Konyak'),
  ('cms67jvbn001sajvygdqxz2eq', 'Whiskey', 'Whiskey', 'الويسكي', 'Viski'),
  ('cms67jvbp0020ajvy2ac7lfy1', 'Vodka, rum, gin and tequila', 'Wodka, Rum, Gin und Tequila', 'الفودكا والروم والجن والتيكيلا', 'Votka, rom, cin ve tekila'),
  ('cms67jvbs002aajvyyx87hh8g', 'Vermouth', 'Wermut', 'الفيرموث', 'Vermut'),
  ('cms67jvbt002eajvyjgcvgycm', 'Fruit brandy', 'Obstbrand', 'براندي الفواكه', 'Meyve rakısı'),
  ('cms67jvbv002lajvyvub1vi7e', 'Aperitifs and liqueurs', 'Aperitifs und Liköre', 'المقبلات والمشروبات الكحولية المنكهة', 'Aperitifler ve likörler'),
  ('cms67jvbx002rajvyg1cjpq6p', 'Breakfast until 12 PM', 'Frühstück bis 12 Uhr', 'الإفطار حتى الساعة 12', 'Saat 12''ye kadar kahvaltı'),
  ('cms67jvbz0033ajvykk4yqfda', 'Appetizers', 'Vorspeisen', 'المقبلات', 'Başlangıçlar'),
  ('cms67jvc1003aajvy6x3t2pyu', 'Soups and stews', 'Suppen und Eintöpfe', 'الشوربات واليخنات', 'Çorbalar ve güveçler'),
  ('cms67jvc2003fajvyqlk8fntu', 'Salads', 'Salate', 'السلطات', 'Salatalar'),
  ('cms67jvc4003najvyeejvbvy9', 'Mountain specialties', 'Bergspezialitäten', 'أطباق الجبل المميزة', 'Dağ spesiyalleri'),
  ('cms67jvc6003xajvyibi74bfy', 'Fast food "Monti"', 'Fast Food "Monti"', 'الوجبات السريعة "مونتي"', 'Fast food "Monti"'),
  ('cms67jvc80042ajvyl7033obv', 'Main courses', 'Hauptgerichte', 'الأطباق الرئيسية', 'Ana yemekler'),
  ('cms67jvca004cajvy8qpomxc3', 'Wok corner', 'Wok-Ecke', 'ركن الووك', 'Wok köşesi'),
  ('cms67jvcd004gajvyie8pdz6b', 'Pasta and risotto', 'Pasta und Risotto', 'المعكرونة والريزوتو', 'Makarna ve risotto'),
  ('cms67jvcf004lajvy2npxo299', 'Chef''s recommendations', 'Empfehlungen des Küchenchefs', 'توصيات الشيف', 'Şefin önerileri'),
  ('cms67jvch004qajvy3shadyul', 'Pizza', 'Pizza', 'البيتزا', 'Pizza'),
  ('cms67jvcj004wajvyu71lkgbs', 'Desserts', 'Desserts', 'الحلويات', 'Tatlılar'),
  ('cms67jvcm0058ajvyyzewv3up', 'Kids'' menu', 'Kindermenü', 'قائمة الأطفال', 'Çocuk menüsü'),
  ('cms67jvco005cajvyo1zzbn85', 'Side dishes', 'Beilagen', 'الأطباق الجانبية', 'Garnitürler');

DO $$
DECLARE
  expected_count INTEGER;
  existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO expected_count FROM menu_category_translations;
  SELECT COUNT(*)
    INTO existing_count
    FROM "MenuCategory" AS category
    JOIN menu_category_translations AS translation ON translation.id = category.id;

  IF expected_count <> 26 OR existing_count <> expected_count THEN
    RAISE EXCEPTION
      'Translation update cancelled: expected 26 category IDs, found % of %.',
      existing_count,
      expected_count;
  END IF;
END
$$;

UPDATE "MenuCategory" AS category
SET
  "name1" = translation.name1,
  "name2" = translation.name2,
  "name3" = translation.name3,
  "name4" = translation.name4
FROM menu_category_translations AS translation
WHERE category.id = translation.id;

DO $$
DECLARE
  translated_count INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO translated_count
    FROM "MenuCategory" AS category
    JOIN menu_category_translations AS translation ON translation.id = category.id
   WHERE category."name1" = translation.name1
     AND category."name2" = translation.name2
     AND category."name3" = translation.name3
     AND category."name4" = translation.name4;

  IF translated_count <> 26 THEN
    RAISE EXCEPTION
      'Translation update verification failed: updated % of 26 categories.',
      translated_count;
  END IF;
END
$$;

COMMIT;
