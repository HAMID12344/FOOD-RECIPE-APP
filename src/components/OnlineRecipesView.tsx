import React, { useEffect, useState } from 'react';
import { BookmarkPlus, Check, Search } from 'lucide-react';
import {
  ONLINE_CATEGORIES,
  fetchOnlineRecipesByCategory,
  searchOnlineRecipes,
} from '../services/mealDbApi';
import { OnlineMealRecipe } from '../types';
import { RecipeImage } from './RecipeImage';

interface OnlineRecipesViewProps {
  savedApiIds: Set<string>;
  onSelectOnlineRecipe: (recipe: OnlineMealRecipe) => void;
  onSaveOnlineRecipe: (recipe: OnlineMealRecipe) => void;
}

export const OnlineRecipesView: React.FC<OnlineRecipesViewProps> = ({
  savedApiIds,
  onSelectOnlineRecipe,
  onSaveOnlineRecipe,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Chicken');
  const [recipes, setRecipes] = useState<OnlineMealRecipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadCategory = async (category: string) => {
    setLoading(true);
    const res = await fetchOnlineRecipesByCategory(category);
    setRecipes(res.recipes);
    setLoading(false);
  };

  useEffect(() => {
    loadCategory(selectedCategory);
  }, [selectedCategory]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadCategory(selectedCategory);
      return;
    }
    setLoading(true);
    const res = await searchOnlineRecipes(searchQuery);
    setRecipes(res.recipes);
    setLoading(false);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900">
            Online Recipe Catalog
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Browse public dishes live from TheMealDB API and save any recipe directly to your
            kitchen cloud database.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search TheMealDB (e.g. Arrabiata, Biryani)..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-full border border-[#bfc9c4] bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#006b58]"
            />
          </div>
          <button
            type="submit"
            className="m3-ripple min-h-[44px] px-5 py-2 rounded-full bg-[#006b58] hover:bg-[#005546] text-white text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
          >
            Search API
          </button>
        </form>
      </div>

      {/* Interactive Category FilterChips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {ONLINE_CATEGORIES.map((cat) => {
          const isActive = !searchQuery.trim() && selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(cat);
              }}
              className={`m3-ripple min-h-[40px] px-4 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#cde8df] border-[#006b58]/30 text-[#07201a]'
                  : 'bg-white border-[#bfc9c4] text-zinc-700 hover:bg-[#eff5f2]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-zinc-200" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-1/2 bg-zinc-200 rounded" />
                <div className="h-5 w-3/4 bg-zinc-200 rounded" />
                <div className="h-9 w-full bg-zinc-100 rounded-lg mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-10 text-center">
          <p className="text-base font-medium text-zinc-900">No matching online recipes found</p>
          <p className="text-sm text-zinc-500 mt-1">
            Try searching another dish name or pick one of the curated categories above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((meal) => {
            const isSaved = savedApiIds.has(meal.apiId);
            const ingCount = meal.ingredients
              .split(/\r?\n/)
              .filter((l) => l.trim().length > 1).length;

            return (
              <article
                key={meal.apiId}
                className="group bg-white rounded-2xl border border-zinc-200/80 overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div
                  onClick={() => onSelectOnlineRecipe(meal)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectOnlineRecipe(meal);
                    }
                  }}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 cursor-pointer"
                >
                  <RecipeImage
                    src={meal.image_url}
                    alt={meal.title}
                    className="w-full h-full transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Zero-Pill Metadata Discipline */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
                      <span>{meal.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{meal.area}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{ingCount} items</span>
                    </div>

                    <h3 className="text-base font-semibold text-zinc-900 leading-snug line-clamp-2">
                      <button
                        type="button"
                        onClick={() => onSelectOnlineRecipe(meal)}
                        className="text-left hover:text-[#006b58] transition-colors cursor-pointer"
                      >
                        {meal.title}
                      </button>
                    </h3>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-[#e9efec] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectOnlineRecipe(meal)}
                      className="min-h-[40px] text-xs font-semibold text-[#006b58] hover:text-[#005546] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Inspect Recipe
                    </button>

                    <button
                      type="button"
                      disabled={isSaved}
                      onClick={() => onSaveOnlineRecipe(meal)}
                      className={`m3-ripple min-h-[40px] px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isSaved
                          ? 'bg-[#cde8df] text-[#07201a] cursor-default'
                          : 'bg-[#006b58] hover:bg-[#005546] text-white'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>Save to Kitchen</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
