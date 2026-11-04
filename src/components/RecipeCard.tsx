import React from 'react';
import { CalendarPlus, Heart } from 'lucide-react';
import { RecipeRecord, getRecipeCategories } from '../types';
import { RecipeImage } from './RecipeImage';

interface RecipeCardProps {
  recipe: RecipeRecord;
  isFavorite: boolean;
  onSelect: (recipe: RecipeRecord) => void;
  onToggleFavorite: (recipeId: string) => void;
  onQuickPlan: (recipe: RecipeRecord) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onQuickPlan,
}) => {
  const ingredientCount = recipe.ingredients
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1).length;

  const originLabel = recipe.isGlobalCatalog
    ? 'Admin Featured'
    : recipe.is_from_api === 1
    ? 'Saved from API'
    : 'Personal';

  const categorySummary = getRecipeCategories(recipe).join(', ');

  return (
    <article className="group bg-white rounded-2xl border border-zinc-200/80 overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5">
      <div
        onClick={() => onSelect(recipe)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(recipe);
          }
        }}
        className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700"
      >
        <RecipeImage
          src={recipe.image_url}
          alt={recipe.title}
          className="w-full h-full transition-transform duration-200 group-hover:scale-[1.03]"
        />
        <button
          type="button"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
          }}
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] rounded-full bg-white/90 backdrop-blur-md border border-zinc-200/70 flex items-center justify-center text-zinc-700 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 ${
              isFavorite ? 'fill-rose-600 text-rose-600' : 'text-zinc-700'
            }`}
          />
        </button>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Zero-Pill Metadata Discipline: quiet unboxed text with middot separators */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500 mb-1.5">
            <span className="text-zinc-600 font-medium">{categorySummary}</span>
            <span aria-hidden="true">·</span>
            <span>{originLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{ingredientCount} items</span>
          </div>

          <h3 className="text-base font-semibold text-zinc-900 leading-snug line-clamp-2">
            <button
              type="button"
              onClick={() => onSelect(recipe)}
              className="text-left hover:text-emerald-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
            >
              {recipe.title}
            </button>
          </h3>
        </div>

        <div className="mt-4 pt-3.5 border-t border-[#e9efec] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelect(recipe)}
            className="min-h-[40px] text-xs font-semibold text-[#006b58] hover:text-[#005546] transition-colors cursor-pointer whitespace-nowrap"
          >
            View Recipe
          </button>

          <button
            type="button"
            onClick={() => onQuickPlan(recipe)}
            className="m3-ripple min-h-[40px] px-4 py-1.5 rounded-full bg-[#cde8df] hover:bg-[#bce0d4] text-[#07201a] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-[#006b58]" />
            <span>Plan Meal</span>
          </button>
        </div>
      </div>
    </article>
  );
};
