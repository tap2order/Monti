-- Add an explicit, language-neutral grouping for guest menu category filters.
-- The default keeps every existing row valid while the data update classifies
-- only names that can be identified with confidence.
CREATE TYPE "MenuCategoryGroup" AS ENUM ('DRINKS', 'FOOD', 'DESSERTS', 'KIDS', 'OTHER');

ALTER TABLE "MenuCategory"
ADD COLUMN "group" "MenuCategoryGroup" NOT NULL DEFAULT 'OTHER';

UPDATE "MenuCategory"
SET "group" = CASE
  WHEN lower(coalesce("name", '')) = ANY (ARRAY[
    'topli napici', 'gazirani sokovi', 'prirodni cijeđeni sokovi',
    'prirodni cijeđeni sokovi', 'pića', 'pica', 'napici', 'kafa', 'čajevi',
    'cajevi', 'kokteli', 'vina', 'piva', 'energetska pića', 'energetska pica',
    'coffee', 'tea', 'fresh juices', 'soft drinks', 'cocktails', 'milkshakes',
    'smoothies', 'energy drinks'
  ])
  OR lower(coalesce("name1", '')) = ANY (ARRAY['drinks', 'coffee', 'tea', 'fresh juices', 'soft drinks', 'cocktails', 'milkshakes', 'smoothies', 'energy drinks'])
  OR lower(coalesce("name2", '')) = ANY (ARRAY['getränke', 'kaffee', 'tee', 'säfte', 'cocktails'])
  OR lower(coalesce("name3", '')) = ANY (ARRAY['المشروبات', 'مشروبات'])
  OR lower(coalesce("name4", '')) = ANY (ARRAY['içecekler', 'içecek'])
    THEN 'DRINKS'::"MenuCategoryGroup"

  WHEN lower(coalesce("name", '')) = ANY (ARRAY[
    'pizza', 'prilozi', 'planinska ponuda', 'fast food "monti"',
    'glavna jela', 'wok kutak', 'pasta i rižoto', 'pasta i rizoto',
    'jela po preporuci chefa', 'doručak', 'dorucak', 'sendviči', 'sendvici',
    'burgeri', 'salate', 'roštilj', 'rostilj', 'morski plodovi', 'supe',
    'predjela', 'wrapovi', 'lokalni specijaliteti', 'breakfast', 'sandwiches',
    'burgers', 'pasta', 'salads', 'grill', 'seafood', 'soups', 'appetizers',
    'wraps', 'local specialties'
  ])
  OR lower(coalesce("name1", '')) = ANY (ARRAY['pizza', 'sides', 'mountain offer', 'fast food "monti"', 'main dishes', 'wok corner', 'pasta and risotto', 'chef recommendations', 'breakfast', 'sandwiches', 'burgers', 'pasta', 'salads', 'grill', 'seafood', 'soups', 'appetizers', 'wraps', 'local specialties'])
  OR lower(coalesce("name2", '')) = ANY (ARRAY['pizza', 'beilagen', 'hauptgerichte', 'wok-ecke', 'pasta und risotto', 'empfehlungen des chefs'])
  OR lower(coalesce("name3", '')) = ANY (ARRAY['الطعام', 'الأطباق الرئيسية', 'بيتزا'])
  OR lower(coalesce("name4", '')) = ANY (ARRAY['yemekler', 'ana yemekler', 'pizza'])
    THEN 'FOOD'::"MenuCategoryGroup"

  WHEN lower(coalesce("name", '')) = ANY (ARRAY['desert', 'deserti', 'dessert', 'desserts', 'sladoled', 'ice cream'])
  OR lower(coalesce("name1", '')) = ANY (ARRAY['dessert', 'desserts', 'ice cream'])
  OR lower(coalesce("name2", '')) = ANY (ARRAY['dessert', 'desserts', 'eis'])
  OR lower(coalesce("name3", '')) = ANY (ARRAY['الحلويات'])
  OR lower(coalesce("name4", '')) = ANY (ARRAY['tatlılar', 'tatlilar'])
    THEN 'DESSERTS'::"MenuCategoryGroup"

  WHEN lower(coalesce("name", '')) = ANY (ARRAY['dječiji meni', 'djeciji meni', 'dječiji menu', 'djeciji menu', 'kids menu', 'children''s menu'])
  OR lower(coalesce("name1", '')) = ANY (ARRAY['kids menu', 'children''s menu'])
  OR lower(coalesce("name2", '')) = ANY (ARRAY['kindermenü', 'kindermenu'])
  OR lower(coalesce("name3", '')) = ANY (ARRAY['قائمة الأطفال'])
  OR lower(coalesce("name4", '')) = ANY (ARRAY['çocuk menüsü', 'cocuk menusu'])
    THEN 'KIDS'::"MenuCategoryGroup"

  ELSE 'OTHER'::"MenuCategoryGroup"
END;
