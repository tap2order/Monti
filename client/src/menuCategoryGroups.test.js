import assert from "node:assert/strict";
import test from "node:test";
import {
  availableCategoryGroups,
  filterCategoriesByGroup,
} from "./menuCategoryGroups.js";

const categories = [
  { id: "coffee", group: "DRINKS" },
  { id: "pizza", group: "FOOD" },
  { id: "cake", group: "DESSERTS" },
  { id: "other" },
];

test("All category filter keeps every category, including an ungrouped fallback", () => {
  assert.deepEqual(filterCategoriesByGroup(categories, "ALL"), categories);
});

test("group filter returns only matching categories", () => {
  assert.deepEqual(
    filterCategoriesByGroup(categories, "FOOD").map(({ id }) => id),
    ["pizza"]
  );
});

test("filters without categories are not offered", () => {
  assert.deepEqual(availableCategoryGroups(categories), ["DRINKS", "FOOD", "DESSERTS"]);
});
