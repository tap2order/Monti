-- Existing deployments may already have applied the initial category-group
-- migration. Backfill additional beverage category names without touching
-- categories that an administrator has already assigned to another group.
UPDATE "MenuCategory"
SET "group" = 'DRINKS'::"MenuCategoryGroup"
WHERE "group" = 'OTHER'::"MenuCategoryGroup"
  AND (
    lower(coalesce("name", '')) = ANY (ARRAY[
      'voda', 'vode', 'mineralna voda', 'gazirana voda', 'negazirana voda',
      'prirodna voda', 'pivo', 'piva', 'piva i cideri', 'konjak', 'konjaci',
      'cognac', 'brandy', 'viski', 'whisky', 'whiskey', 'rakija',
      'žestoka pića', 'žestoka alkoholna pića', 'likeri', 'aperitivi', 'digestivi'
    ])
    OR lower(coalesce("name1", '')) = ANY (ARRAY[
      'water', 'mineral water', 'sparkling water', 'still water', 'beer',
      'beers', 'beer and cider', 'cognac', 'brandy', 'whisky', 'whiskey',
      'spirits', 'liqueurs', 'aperitifs', 'digestifs'
    ])
    OR lower(coalesce("name2", '')) = ANY (ARRAY[
      'wasser', 'mineralwasser', 'sprudelwasser', 'stilles wasser', 'bier',
      'cognac', 'brandy', 'whisky', 'spirituosen', 'liköre', 'aperitifs', 'digestifs'
    ])
    OR lower(coalesce("name3", '')) = ANY (ARRAY[
      'ماء', 'مياه', 'مياه معدنية', 'مياه غازية', 'بيرة', 'كونياك',
      'براندي', 'ويسكي', 'مشروبات روحية', 'ليكور'
    ])
    OR lower(coalesce("name4", '')) = ANY (ARRAY[
      'su', 'maden suyu', 'gazlı su', 'gazli su', 'bira', 'konyak',
      'brendi', 'viski', 'likörler', 'likorler', 'aperatifler', 'digestifler'
    ])
  );
