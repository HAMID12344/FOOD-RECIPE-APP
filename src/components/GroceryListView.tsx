import React, { useState } from 'react';
import { Camera, Check, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { GroceryItemRecord, RecipeRecord } from '../types';
import { RecipeImage } from './RecipeImage';
import { SnapToAddModal } from './SnapToAddModal';

interface GroceryListViewProps {
  items: GroceryItemRecord[];
  plannedMealsCount: number;
  plannedDishes: RecipeRecord[];
  onSelectDish: (recipe: RecipeRecord) => void;
  onAddItem: (name: string) => void;
  onAddMultipleItems: (names: string[]) => void;
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onClearChecked: () => void;
  onSyncFromMealPlan: () => void;
}

export const GroceryListView: React.FC<GroceryListViewProps> = ({
  items,
  plannedMealsCount,
  plannedDishes,
  onSelectDish,
  onAddItem,
  onAddMultipleItems,
  onToggleItem,
  onDeleteItem,
  onClearChecked,
  onSyncFromMealPlan,
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'bought'>('all');
  const [isSnapModalOpen, setIsSnapModalOpen] = useState(false);

  const boughtCount = items.filter((i) => i.checked === 1).length;
  const pendingCount = items.length - boughtCount;

  const visibleItems = items.filter((item) => {
    if (filter === 'pending') return item.checked === 0;
    if (filter === 'bought') return item.checked === 1;
    return true;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    onAddItem(newItemText);
    setNewItemText('');
  };

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900">
            Grocery Checklist
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Compiled from your weekly meal plan, or snap a photo of ingredients to recognize and
            populate items automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsSnapModalOpen(true)}
            className="m3-ripple min-h-[44px] px-5 py-2 rounded-full bg-[#cde8df] hover:bg-[#bce0d4] text-[#07201a] text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Camera className="w-4 h-4 text-[#006b58]" />
            <span>Snap to Add</span>
          </button>

          <button
            type="button"
            onClick={onSyncFromMealPlan}
            disabled={plannedMealsCount === 0}
            className="m3-ripple min-h-[44px] px-5 py-2 rounded-full bg-[#006b58] hover:bg-[#005546] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync from Meal Plan ({plannedMealsCount})</span>
          </button>
        </div>
      </div>

      {/* Visual Planned Dishes Strip Feeding This Grocery List */}
      {plannedDishes.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 space-y-2.5">
          <div className="text-xs font-medium text-zinc-500">
            Scheduled dishes contributing ingredients this week:
          </div>
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
            {plannedDishes.map((dish) => (
              <button
                key={dish.id}
                type="button"
                onClick={() => onSelectDish(dish)}
                className="flex items-center gap-2.5 pr-3.5 p-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/70 transition-colors shrink-0 cursor-pointer text-left"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-200 shrink-0">
                  <RecipeImage
                    src={dish.image_url}
                    alt={dish.title}
                    className="w-full h-full"
                  />
                </div>
                <div className="max-w-[160px]">
                  <div className="text-[11px] text-zinc-500">{dish.category}</div>
                  <div className="text-xs font-semibold text-zinc-900 truncate">
                    {dish.title}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-zinc-600">
          <span>
            <strong className="font-mono tabular-nums text-sm text-zinc-900">
              {pendingCount}
            </strong>{' '}
            pending
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="font-mono tabular-nums text-sm text-emerald-700">
              {boughtCount}
            </strong>{' '}
            bought
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{items.length} total</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-[#6f7975] bg-white overflow-hidden divide-x divide-[#bfc9c4]">
            {(['all', 'pending', 'bought'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`min-h-[36px] px-4 py-1 text-xs font-semibold capitalize transition-colors whitespace-nowrap cursor-pointer ${
                  filter === tab
                    ? 'bg-[#cde8df] text-[#07201a]'
                    : 'text-zinc-700 hover:bg-[#eff5f2]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {boughtCount > 0 && (
            <button
              type="button"
              onClick={onClearChecked}
              className="min-h-[38px] px-4 py-1.5 rounded-full border border-[#bfc9c4] hover:border-red-200 hover:bg-red-50 text-xs font-semibold text-zinc-700 hover:text-red-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Clear Bought
            </button>
          )}
        </div>
      </div>

      {/* Add Manual Item Input */}
      <form onSubmit={handleAdd} className="flex items-center gap-2.5">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add an extra grocery item (e.g. Cooking oil, 1 dozen eggs, Green tea)..."
          className="flex-1 min-h-[48px] px-4 rounded-full border border-[#bfc9c4] bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#006b58]"
        />
        <button
          type="submit"
          className="m3-ripple min-h-[48px] px-5 py-2.5 rounded-full bg-[#006b58] hover:bg-[#005546] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </form>

      {/* Checklist Rows */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        {visibleItems.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-base font-medium text-zinc-900">
              {items.length === 0
                ? 'Your grocery checklist is empty'
                : `No ${filter} items right now`}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              {items.length === 0
                ? 'Use "Snap to Add" with your camera, sync dishes from the Weekly Meal Planner, or type items above.'
                : 'Switch filter tabs above to view the rest of your list.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {visibleItems.map((item) => {
              const isChecked = item.checked === 1;
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 sm:px-5 min-h-[58px] hover:bg-zinc-50/80 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onToggleItem(item.id)}
                    className="flex-1 min-h-[48px] flex items-center gap-3.5 text-left cursor-pointer"
                  >
                    <span
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'bg-white border-zinc-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </span>
                    <span
                      className={`text-sm transition-colors ${
                        isChecked ? 'line-through text-zinc-400' : 'text-zinc-900 font-medium'
                      }`}
                    >
                      {item.name}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => onDeleteItem(item.id)}
                    className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isSnapModalOpen && (
        <SnapToAddModal
          onClose={() => setIsSnapModalOpen(false)}
          onAddRecognizedItems={onAddMultipleItems}
        />
      )}
    </section>
  );
};
