export const MENU_CATEGORY_GROUPS = ["DRINKS", "FOOD", "DESSERTS", "KIDS"];

export function categoryGroup(category) {
  return typeof category?.group === "string" ? category.group : "OTHER";
}

export function availableCategoryGroups(categories) {
  return MENU_CATEGORY_GROUPS.filter((group) =>
    categories.some((category) => categoryGroup(category) === group)
  );
}

export function filterCategoriesByGroup(categories, activeGroup) {
  if (activeGroup === "ALL") return categories;
  return categories.filter((category) => categoryGroup(category) === activeGroup);
}
