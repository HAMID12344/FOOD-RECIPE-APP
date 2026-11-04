import React, { useMemo, useState } from 'react';
import { Calendar, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import {
  DAYS_OF_WEEK,
  DayOfWeek,
  MEAL_TYPES,
  MealPlanRecord,
  MealType,
  RecipeRecord,
} from '../types';
import { RecipeImage } from './RecipeImage';

interface MealPlannerViewProps {
  recipes: RecipeRecord[];
  mealPlan: MealPlanRecord[];
  onAssignSlot: (day: DayOfWeek, mealType: MealType, recipeId: string) => void;
  onRemoveSlot: (slotId: string) => void;
  onClearWeek: () => void;
  onGenerateGroceryList: () => void;
  onSelectRecipe: (recipe: RecipeRecord) => void;
  onNavigateAddRecipe: () => void;
}

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({
  recipes,
  mealPlan,
  onAssignSlot,
  onRemoveSlot,
  onClearWeek,
  onGenerateGroceryList,
  onSelectRecipe,
  onNavigateAddRecipe,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [pickerTarget, setPickerTarget] = useState<{
    day: DayOfWeek;
    mealType: MealType;
  } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [confirmClearWeek, setConfirmClearWeek] = useState(false);

  const recipeById = useMemo(() => {
    const map = new Map<string, RecipeRecord>();
    for (const r of recipes) map.set(r.id, r);
    return map;
  }, [recipes]);

  const getSlotEntry = (day: DayOfWeek, mealType: MealType) =>
    mealPlan.find((m) => m.day === day && m.meal_type === mealType);

  const filteredPickerRecipes = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.ingredients.toLowerCase().includes(q)
    );
  }, [recipes, pickerSearch]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900">
            Weekly Meal Planner
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Assign saved dishes with visual thumbnails across Breakfast, Lunch, and Dinner, then
            generate your consolidated grocery checklist automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Day Focus
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Full Week Board
            </button>
          </div>

          <button
            type="button"
            onClick={onGenerateGroceryList}
            disabled={mealPlan.length === 0}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Generate Grocery List ({mealPlan.length})</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 py-3 border-y border-zinc-200/80 text-xs text-zinc-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span>
            <strong className="font-mono tabular-nums text-zinc-900">{mealPlan.length}</strong> of{' '}
            <span className="font-mono tabular-nums">21</span> weekly meal slots scheduled
          </span>
        </div>

        {mealPlan.length > 0 && (
          <div>
            {!confirmClearWeek ? (
              <button
                type="button"
                onClick={() => setConfirmClearWeek(true)}
                className="text-xs font-medium text-zinc-500 hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Clear Entire Week
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearWeek();
                    setConfirmClearWeek(false);
                  }}
                  className="px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearWeek(false)}
                  className="px-2 py-1 rounded-md bg-zinc-200 text-zinc-700 text-xs cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {viewMode === 'day' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {DAYS_OF_WEEK.map((day) => {
              const count = mealPlan.filter((m) => m.day === day).length;
              const active = selectedDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[52px] min-w-[96px] px-4 py-2 rounded-2xl border text-left transition-colors shrink-0 cursor-pointer ${
                    active
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-white border-zinc-200/90 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <div className="text-xs font-semibold">{day.slice(0, 3)}</div>
                  <div
                    className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                      active ? 'text-emerald-300' : 'text-zinc-500'
                    }`}
                  >
                    {count}/3 meals
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {MEAL_TYPES.map((mealType) => {
              const entry = getSlotEntry(selectedDay, mealType);
              const assignedRecipe = entry ? recipeById.get(entry.recipe_id) : undefined;

              return (
                <div
                  key={mealType}
                  className="bg-white rounded-2xl border border-zinc-200/80 p-5 flex flex-col justify-between min-h-[260px]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-zinc-500">
                        {selectedDay} · {mealType}
                      </span>
                      {entry && (
                        <button
                          type="button"
                          aria-label={`Remove ${mealType} on ${selectedDay}`}
                          onClick={() => onRemoveSlot(entry.id)}
                          className="min-w-[38px] min-h-[38px] -mr-2 -mt-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {assignedRecipe ? (
                      <div className="space-y-3">
                        <div
                          onClick={() => onSelectRecipe(assignedRecipe)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onSelectRecipe(assignedRecipe);
                          }}
                          className="aspect-[16/10] rounded-xl overflow-hidden bg-zinc-100 cursor-pointer"
                        >
                          <RecipeImage
                            src={assignedRecipe.image_url}
                            alt={assignedRecipe.title}
                            className="w-full h-full"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500 mb-0.5">
                            {assignedRecipe.category}
                          </div>
                          <h3 className="text-base font-semibold text-zinc-900 line-clamp-2">
                            <button
                              type="button"
                              onClick={() => onSelectRecipe(assignedRecipe)}
                              className="text-left hover:text-emerald-800 cursor-pointer"
                            >
                              {assignedRecipe.title}
                            </button>
                          </h3>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-sm text-zinc-400">No dish scheduled yet</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPickerSearch('');
                      setPickerTarget({ day: selectedDay, mealType });
                    }}
                    className="mt-4 w-full min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 hover:border-emerald-700 hover:bg-emerald-50/50 text-xs font-semibold text-zinc-800 hover:text-emerald-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{assignedRecipe ? 'Swap Recipe' : `Assign ${mealType}`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Visual Full 7-Day Matrix Board with Real Recipe Photo Thumbnails */
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold text-zinc-600">
                <th className="py-3.5 px-4 w-32">Day</th>
                {MEAL_TYPES.map((mt) => (
                  <th key={mt} className="py-3.5 px-4">
                    {mt}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {DAYS_OF_WEEK.map((day) => (
                <tr key={day} className="align-middle">
                  <td className="py-4 px-4 font-semibold text-zinc-900 whitespace-nowrap">
                    {day}
                  </td>
                  {MEAL_TYPES.map((mt) => {
                    const entry = getSlotEntry(day, mt);
                    const rec = entry ? recipeById.get(entry.recipe_id) : undefined;
                    return (
                      <td key={mt} className="py-3 px-4">
                        {rec && entry ? (
                          <div className="flex items-center justify-between gap-2.5 bg-zinc-50 rounded-xl p-2 border border-zinc-200/70">
                            <button
                              type="button"
                              onClick={() => onSelectRecipe(rec)}
                              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
                            >
                              <div className="w-11 h-11 rounded-lg overflow-hidden bg-zinc-200 shrink-0">
                                <RecipeImage
                                  src={rec.image_url}
                                  alt={rec.title}
                                  className="w-full h-full"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] text-zinc-500">{rec.category}</div>
                                <div className="text-xs font-semibold text-zinc-900 group-hover:text-emerald-800 line-clamp-1">
                                  {rec.title}
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              aria-label="Remove planned meal"
                              onClick={() => onRemoveSlot(entry.id)}
                              className="text-zinc-400 hover:text-red-600 p-1.5 shrink-0 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPickerSearch('');
                              setPickerTarget({ day, mealType: mt });
                            }}
                            className="min-h-[42px] px-3 py-1.5 rounded-xl border border-dashed border-zinc-300 hover:border-emerald-700 text-xs text-zinc-500 hover:text-emerald-800 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign Dish</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recipe Picker Bottom Sheet / Modal */}
      {pickerTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setPickerTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select a Recipe for Meal Plan"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-xl max-h-[85vh] rounded-t-3xl sm:rounded-3xl border border-zinc-200 overflow-hidden flex flex-col"
          >
            <div className="sm:hidden w-10 h-1.5 bg-zinc-300 rounded-full mx-auto mt-2.5 shrink-0" />
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
              <div>
                <p className="text-xs text-zinc-500">
                  {pickerTarget.day} · {pickerTarget.mealType}
                </p>
                <h2 className="text-base font-semibold text-zinc-900">
                  Choose a Saved Dish
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                aria-label="Close recipe selector"
                className="min-w-[44px] min-h-[44px] rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-zinc-100 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Filter saved recipes by name or ingredient..."
                  className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto divide-y divide-zinc-100">
              {filteredPickerRecipes.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-zinc-600">No matching saved recipes found.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget(null);
                      onNavigateAddRecipe();
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Create New Recipe
                  </button>
                </div>
              ) : (
                filteredPickerRecipes.map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      onAssignSlot(pickerTarget.day, pickerTarget.mealType, rec.id);
                      setPickerTarget(null);
                    }}
                    className="w-full py-3 px-2 hover:bg-zinc-50 rounded-xl flex items-center gap-3.5 text-left transition-colors cursor-pointer"
                  >
                    <div className="w-16 h-12 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                      <RecipeImage
                        src={rec.image_url}
                        alt={rec.title}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-zinc-500">
                        {rec.category} ·{' '}
                        {rec.isGlobalCatalog
                          ? 'Admin Featured'
                          : rec.is_from_api === 1
                          ? 'Saved API'
                          : 'Personal'}
                      </div>
                      <div className="text-sm font-semibold text-zinc-900 truncate">
                        {rec.title}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 shrink-0 px-2">
                      Select
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
