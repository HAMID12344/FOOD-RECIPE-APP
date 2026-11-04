import React, { useState } from 'react';
import {
  BookmarkPlus,
  CalendarPlus,
  Check,
  Edit3,
  Heart,
  Maximize2,
  Minimize2,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  DAYS_OF_WEEK,
  DayOfWeek,
  MEAL_TYPES,
  MealType,
  OnlineMealRecipe,
  RecipeRecord,
  getRecipeCategories,
} from '../types';
import { RecipeImage } from './RecipeImage';

interface RecipeDetailModalProps {
  savedRecipe?: RecipeRecord | null;
  onlineRecipe?: OnlineMealRecipe | null;
  isAlreadySavedFromApi?: boolean;
  isFavorite?: boolean;
  initialShowPlanner?: boolean;
  onClose: () => void;
  onToggleFavorite?: (recipeId: string) => void;
  onEditRecipe?: (recipe: RecipeRecord) => void;
  onDeleteRecipe?: (recipeId: string) => void;
  onAssignToPlan: (day: DayOfWeek, mealType: MealType) => void;
  onSaveOnlineRecipe?: (online: OnlineMealRecipe) => void;
  onSaveGlobalRecipeToPersonal?: (recipe: RecipeRecord) => void;
  onAddIngredientsToGrocery?: (recipe: RecipeRecord) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  savedRecipe,
  onlineRecipe,
  isAlreadySavedFromApi = false,
  isFavorite = false,
  initialShowPlanner = false,
  onClose,
  onToggleFavorite,
  onEditRecipe,
  onDeleteRecipe,
  onAssignToPlan,
  onSaveOnlineRecipe,
  onSaveGlobalRecipeToPersonal,
  onAddIngredientsToGrocery,
}) => {
  const [showPlanPicker, setShowPlanPicker] = useState(initialShowPlanner);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('Dinner');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState(false);
  const [preppedIndices, setPreppedIndices] = useState<Set<number>>(new Set());
  const [completedStepIndices, setCompletedStepIndices] = useState<Set<number>>(new Set());

  const active = savedRecipe
    ? {
        title: savedRecipe.title,
        category: getRecipeCategories(savedRecipe).join(', '),
        originLabel: savedRecipe.isGlobalCatalog
          ? 'Admin Featured Catalog'
          : savedRecipe.is_from_api === 1
          ? 'Saved from TheMealDB'
          : 'Personal Recipe',
        image_url: savedRecipe.image_url,
        ingredients: savedRecipe.ingredients,
        steps: savedRecipe.steps,
      }
    : onlineRecipe
    ? {
        title: onlineRecipe.title,
        category: onlineRecipe.category,
        originLabel: `${onlineRecipe.area} · TheMealDB API`,
        image_url: onlineRecipe.image_url,
        ingredients: onlineRecipe.ingredients,
        steps: onlineRecipe.steps,
      }
    : null;

  if (!active) return null;

  const ingredientList = active.ingredients
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter((line) => line.length > 0);

  const stepList = active.steps
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
    .filter((line) => line.length > 0);

  const toggleIngredientPrep = (idx: number) => {
    setPreppedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleStepCompleted = (idx: number) => {
    setCompletedStepIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={active.title}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-3xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl border border-zinc-200 overflow-hidden flex flex-col"
      >
        <div className="sm:hidden w-10 h-1.5 bg-zinc-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* High-Resolution Dish Photography Header with Expandable View */}
        <div
          className={`relative w-full shrink-0 bg-zinc-900 transition-all duration-200 ${
            expandedPhoto ? 'h-80 sm:h-[420px]' : 'h-60 sm:h-72'
          }`}
        >
          <RecipeImage
            src={active.image_url}
            alt={active.title}
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          <button
            type="button"
            onClick={() => setExpandedPhoto((v) => !v)}
            aria-label={expandedPhoto ? 'Collapse dish photo' : 'Expand dish photo'}
            className="absolute top-4 left-4 min-w-[44px] min-h-[44px] rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
          >
            {expandedPhoto ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close recipe details"
            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {savedRecipe && onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(savedRecipe.id)}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="absolute top-4 right-18 min-w-[44px] min-h-[44px] rounded-full bg-white/90 hover:bg-white text-zinc-800 flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorite ? 'fill-rose-600 text-rose-600' : 'text-zinc-800'
                }`}
              />
            </button>
          )}

          <div className="absolute bottom-4 left-5 right-5 text-white">
            <div className="flex items-center gap-2 text-xs text-zinc-200 mb-1.5">
              <span>{active.category}</span>
              <span aria-hidden="true">·</span>
              <span>{active.originLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{ingredientList.length} ingredients</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold leading-snug">{active.title}</h2>
          </div>
        </div>

        {/* Action Strip */}
        <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {onlineRecipe && onSaveOnlineRecipe && (
              <button
                type="button"
                disabled={isAlreadySavedFromApi}
                onClick={() => onSaveOnlineRecipe(onlineRecipe)}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  isAlreadySavedFromApi
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {isAlreadySavedFromApi ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved in My Recipes</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>Save to My Recipes</span>
                  </>
                )}
              </button>
            )}

            {savedRecipe?.isGlobalCatalog && onSaveGlobalRecipeToPersonal && (
              <button
                type="button"
                onClick={() => onSaveGlobalRecipeToPersonal(savedRecipe)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Save Copy to My Recipes</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPlanPicker((v) => !v)}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                showPlanPicker
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Assign to Meal Plan</span>
            </button>

            {savedRecipe && onAddIngredientsToGrocery && (
              <button
                type="button"
                onClick={() => onAddIngredientsToGrocery(savedRecipe)}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-xs font-medium text-zinc-700 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-700" />
                <span>Add to Groceries</span>
              </button>
            )}
          </div>

          {savedRecipe && !savedRecipe.isGlobalCatalog && (
            <div className="flex items-center gap-2">
              {onEditRecipe && (
                <button
                  type="button"
                  onClick={() => onEditRecipe(savedRecipe)}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-xs font-medium text-zinc-700 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}

              {onDeleteRecipe && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-zinc-200 hover:border-red-200 hover:bg-red-50 text-xs font-medium text-red-700 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              {onDeleteRecipe && confirmDelete && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDeleteRecipe(savedRecipe.id)}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-zinc-200 text-zinc-700 text-xs font-medium whitespace-nowrap cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inline Meal Slot Assignment Drawer */}
        {showPlanPicker && (
          <div className="px-5 py-4 bg-emerald-50/60 border-b border-emerald-200/70 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Day of Week
                </label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value as DayOfWeek)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Meal Slot
                </label>
                <div className="grid grid-cols-3 p-1 bg-white border border-zinc-200 rounded-xl">
                  {MEAL_TYPES.map((mt) => (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setSelectedMealType(mt)}
                      className={`min-h-[36px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        selectedMealType === mt
                          ? 'bg-emerald-700 text-white'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {mt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onAssignToPlan(selectedDay, selectedMealType);
                  setShowPlanPicker(false);
                }}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
              >
                Schedule Meal
              </button>
            </div>
          </div>
        )}

        {/* Interactive Prep Checklist & Step-by-Step Cook Progress */}
        <div className="p-5 sm:p-7 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                Ingredients ({ingredientList.length})
              </h3>
              <span className="text-xs font-mono tabular-nums text-zinc-500">
                {preppedIndices.size}/{ingredientList.length} prepped
              </span>
            </div>
            <ul className="divide-y divide-zinc-100 border-t border-b border-zinc-100">
              {ingredientList.map((item, idx) => {
                const checked = preppedIndices.has(idx);
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => toggleIngredientPrep(idx)}
                      className="w-full py-2.5 text-left flex items-start gap-2.5 text-sm cursor-pointer group"
                    >
                      <span
                        className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          checked
                            ? 'bg-emerald-700 border-emerald-700 text-white'
                            : 'border-zinc-300 group-hover:border-emerald-700'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                      <span
                        className={
                          checked ? 'line-through text-zinc-400' : 'text-zinc-700'
                        }
                      >
                        {item}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="md:col-span-7">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                Cooking Instructions
              </h3>
              <span className="text-xs font-mono tabular-nums text-zinc-500">
                {completedStepIndices.size}/{stepList.length} done
              </span>
            </div>
            <ol className="space-y-3">
              {stepList.map((step, idx) => {
                const done = completedStepIndices.has(idx);
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => toggleStepCompleted(idx)}
                      className={`w-full text-left p-3 rounded-2xl border transition-colors flex gap-3.5 text-sm leading-relaxed cursor-pointer ${
                        done
                          ? 'bg-emerald-50/50 border-emerald-200/70 text-zinc-500'
                          : 'bg-white border-zinc-200/70 hover:border-zinc-300 text-zinc-700'
                      }`}
                    >
                      <span
                        className={`font-mono tabular-nums text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          done
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-50 border border-emerald-200/70 text-emerald-800'
                        }`}
                      >
                        {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </span>
                      <span className={done ? 'line-through' : ''}>{step}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
