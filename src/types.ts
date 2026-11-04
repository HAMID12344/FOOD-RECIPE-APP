export enum ScreenTab {
  Profile = 'profile',
  Admin = 'admin',
  Home = 'home',
  Online = 'online',
  Planner = 'planner',
  Groceries = 'groceries',
  Favorites = 'favorites',
}

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export const RECIPE_CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Quick',
  'Gluten-Free',
  'High-Protein',
  'Vegetarian',
  'Dairy-Free',
  'Meal Prep',
  'Chicken',
  'Beef',
  'Pasta',
  'Seafood',
  'Dessert',
  'Quick Hostel',
] as const;

export const KITCHEN_SEGMENTS = [
  'Student Hostel',
  'Family Kitchen',
  'Busy Professional',
  'Shared Apartment',
] as const;

export type AccountRole = 'admin' | 'customer';
export type CustomerStatus = 'active' | 'vip' | 'suspended' | 'archived';

export interface CustomerProfileRecord {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: AccountRole;
  status: CustomerStatus;
  kitchenType: string;
  phone: string;
  createdAtMs: number;
}

export interface GlobalRecipeRecord {
  id: string;
  title: string;
  category: string;
  categories?: string[];
  imageUrl: string;
  ingredients: string;
  steps: string;
  published: boolean;
  authorId: string;
}

export interface RecipeRecord {
  id: string;
  ownerId: string;
  title: string;
  ingredients: string;
  steps: string;
  category: string;
  categories?: string[];
  image_url: string;
  is_from_api: 0 | 1;
  api_meal_id: string;
  isFavorite: boolean;
  isGlobalCatalog?: boolean;
}

export interface MealPlanRecord {
  id: string;
  ownerId: string;
  recipe_id: string;
  day: DayOfWeek;
  meal_type: MealType;
}

export interface GroceryItemRecord {
  id: string;
  ownerId: string;
  name: string;
  checked: 0 | 1;
}

export interface OnlineMealRecipe {
  apiId: string;
  title: string;
  category: string;
  area: string;
  image_url: string;
  ingredients: string;
  steps: string;
}

/**
 * Normalizes and deduplicates an array of recipe category labels to match
 * firebase-blueprint.json & firestore.rules bounds (1..10 items, 1..40 chars each).
 */
export function normalizeCategoryList(
  rawList?: string[],
  fallbackCategory = 'Dinner'
): string[] {
  const candidates: string[] = [];
  if (Array.isArray(rawList) && rawList.length > 0) {
    for (const item of rawList) {
      for (const part of String(item ?? '').split(',')) {
        const cleaned = part.trim().slice(0, 40);
        if (cleaned) candidates.push(cleaned);
      }
    }
  } else if (fallbackCategory) {
    for (const part of String(fallbackCategory).split(',')) {
      const cleaned = part.trim().slice(0, 40);
      if (cleaned) candidates.push(cleaned);
    }
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const label of candidates) {
    const key = label.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(label);
      if (unique.length === 10) break;
    }
  }

  return unique.length > 0 ? unique : ['Dinner'];
}

/**
 * Resolves all category/dietary labels assigned to a recipe.
 */
export function getRecipeCategories(recipe: {
  category: string;
  categories?: string[];
}): string[] {
  return normalizeCategoryList(recipe.categories, recipe.category);
}
