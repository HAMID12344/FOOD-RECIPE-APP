import { OnlineMealRecipe } from '../types';

const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';

interface RawMealDBItem {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb?: string;
  [key: string]: string | undefined;
}

function normalizeMealItem(raw: RawMealDBItem): OnlineMealRecipe {
  const ingredientLines: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (raw[`strIngredient${i}`] ?? '').trim();
    const measure = (raw[`strMeasure${i}`] ?? '').trim();
    if (ing) {
      ingredientLines.push(measure ? `${measure} ${ing}`.trim() : ing);
    }
  }

  const cleanSteps = (raw.strInstructions ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^step\s*\d+$/i.test(s))
    .join('\n');

  return {
    apiId: raw.idMeal,
    title: raw.strMeal,
    category: raw.strCategory || 'Main Course',
    area: raw.strArea || 'International',
    image_url: raw.strMealThumb || '',
    ingredients: ingredientLines.join('\n'),
    steps: cleanSteps || 'Prepare ingredients and cook over medium heat until tender and flavorful.',
  };
}

/**
 * Searches TheMealDB live by recipe name (`search.php?s=...`).
 */
export async function searchOnlineRecipes(query: string): Promise<{
  recipes: OnlineMealRecipe[];
}> {
  const cleanQuery = query.trim();

  try {
    const url = `${MEALDB_BASE}/search.php?s=${encodeURIComponent(cleanQuery)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { meals: RawMealDBItem[] | null };
    const meals = (data.meals ?? []).map(normalizeMealItem);
    return { recipes: meals };
  } catch {
    return { recipes: [] };
  }
}

/**
 * Fetches recipes live by TheMealDB Category (`filter.php?c=...`) and resolves full details.
 */
export async function fetchOnlineRecipesByCategory(category: string): Promise<{
  recipes: OnlineMealRecipe[];
}> {
  try {
    const res = await fetch(`${MEALDB_BASE}/filter.php?c=${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      meals: Array<{ idMeal: string; strMeal: string; strMealThumb: string }> | null;
    };
    const summaries = (data.meals ?? []).slice(0, 12);

    const detailed = await Promise.all(
      summaries.map(async (item) => {
        try {
          const detailRes = await fetch(
            `${MEALDB_BASE}/lookup.php?i=${encodeURIComponent(item.idMeal)}`
          );
          const detailJson = (await detailRes.json()) as { meals: RawMealDBItem[] | null };
          if (detailJson.meals && detailJson.meals[0]) {
            return normalizeMealItem(detailJson.meals[0]);
          }
        } catch {
          // Fallback to summary if individual lookup fails
        }
        return {
          apiId: item.idMeal,
          title: item.strMeal,
          category,
          area: 'International',
          image_url: item.strMealThumb,
          ingredients: 'Inspect recipe to load full ingredients',
          steps: 'Full instructions available from TheMealDB.',
        } satisfies OnlineMealRecipe;
      })
    );

    return { recipes: detailed };
  } catch {
    return { recipes: [] };
  }
}

export const ONLINE_CATEGORIES = [
  'Chicken',
  'Beef',
  'Vegetarian',
  'Seafood',
  'Pasta',
  'Breakfast',
  'Dessert',
  'Lamb',
] as const;
