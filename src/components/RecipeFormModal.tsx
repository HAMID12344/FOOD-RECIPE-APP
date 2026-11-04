import React, { useMemo, useRef, useState } from 'react';
import { Camera, Check, Plus, Search, Upload, X } from 'lucide-react';
import { PRESET_RECIPE_IMAGES } from '../assets/culinaryAssets';
import { searchOnlineRecipes } from '../services/mealDbApi';
import {
  OnlineMealRecipe,
  RECIPE_CATEGORIES,
  RecipeRecord,
  getRecipeCategories,
  normalizeCategoryList,
} from '../types';
import { RecipeImage } from './RecipeImage';

interface RecipeFormModalProps {
  initialRecipe?: RecipeRecord | null;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    category: string;
    categories: string[];
    image_url: string;
    ingredients: string;
    steps: string;
  }) => void;
}

/**
 * Compresses an uploaded device photo via HTML5 Canvas so real user recipe photos
 * render sharply while fitting comfortably under Firestore's 150KB string limit.
 */
function compressImageFile(file: File, maxWidth = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read photo file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format.'));
      img.onload = () => {
        const renderAt = (targetW: number, quality: number) => {
          const scale = Math.min(1, targetW / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return String(reader.result);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', quality);
        };

        let result = renderAt(maxWidth, 0.68);
        if (result.length > 140000) {
          result = renderAt(480, 0.55);
        }
        resolve(result);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const RecipeFormModal: React.FC<RecipeFormModalProps> = ({
  initialRecipe,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(initialRecipe?.title ?? '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    initialRecipe ? getRecipeCategories(initialRecipe) : ['Dinner']
  );
  const [customTagInput, setCustomTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState(
    initialRecipe?.image_url ?? PRESET_RECIPE_IMAGES[0].url
  );
  const [ingredients, setIngredients] = useState(initialRecipe?.ingredients ?? '');
  const [steps, setSteps] = useState(initialRecipe?.steps ?? '');
  const [error, setError] = useState<string | null>(null);

  // Photo picker mode: curated studio gallery | online TheMealDB photo finder | custom URL
  const [photoTab, setPhotoTab] = useState<'studio' | 'online' | 'url'>('studio');
  const [onlinePhotoQuery, setOnlinePhotoQuery] = useState('');
  const [onlinePhotoResults, setOnlinePhotoResults] = useState<OnlineMealRecipe[]>([]);
  const [searchingPhotos, setSearchingPhotos] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Combine built-in preset labels + any custom labels already selected on this recipe
  const allPickerOptions = useMemo(() => {
    const presetSet = new Set<string>(RECIPE_CATEGORIES);
    const list: string[] = [...RECIPE_CATEGORIES];
    for (const tag of selectedCategories) {
      if (!presetSet.has(tag)) {
        presetSet.add(tag);
        list.push(tag);
      }
    }
    return list;
  }, [selectedCategories]);

  const toggleCategoryLabel = (label: string) => {
    setError(null);
    setSelectedCategories((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === label.toLowerCase());
      if (exists) {
        return prev.filter((c) => c.toLowerCase() !== label.toLowerCase());
      }
      if (prev.length >= 10) {
        setError('You can select up to 10 category labels per recipe.');
        return prev;
      }
      return [...prev, label];
    });
  };

  const handleAddCustomLabel = () => {
    const cleaned = customTagInput.trim().slice(0, 40);
    if (!cleaned) return;
    if (selectedCategories.some((c) => c.toLowerCase() === cleaned.toLowerCase())) {
      setCustomTagInput('');
      return;
    }
    if (selectedCategories.length >= 10) {
      setError('You can select up to 10 category labels per recipe.');
      return;
    }
    setSelectedCategories((prev) => [...prev, cleaned]);
    setCustomTagInput('');
    setError(null);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setImageUrl(dataUrl);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process uploaded photo.');
    }
  };

  const handleSearchOnlinePhotos = async () => {
    const q = onlinePhotoQuery.trim() || title.trim() || 'Chicken';
    setSearchingPhotos(true);
    const res = await searchOnlineRecipes(q);
    setOnlinePhotoResults(res.recipes.slice(0, 8));
    setSearchingPhotos(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a recipe title.');
      return;
    }
    if (selectedCategories.length === 0) {
      setError('Please select at least one category or dietary label (e.g. Quick, Gluten-Free).');
      return;
    }
    if (!ingredients.trim()) {
      setError('Please list at least one ingredient.');
      return;
    }
    if (!steps.trim()) {
      setError('Please enter cooking instructions.');
      return;
    }

    const normalized = normalizeCategoryList(selectedCategories);
    onSave({
      title: title.trim(),
      category: normalized.join(', '),
      categories: normalized,
      image_url: imageUrl.trim(),
      ingredients: ingredients.trim(),
      steps: steps.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initialRecipe ? 'Edit Recipe' : 'Add Personal Recipe'}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#f5faf8] w-full sm:max-w-2xl max-h-[92vh] rounded-t-[28px] sm:rounded-[28px] border border-[#bfc9c4] overflow-hidden flex flex-col"
      >
        <div className="w-9 h-1 rounded-full bg-zinc-400/70 mx-auto mt-3 shrink-0" />
        <div className="px-6 py-3.5 border-b border-[#bfc9c4]/70 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-[#171d1b]">
            {initialRecipe ? 'Edit Recipe & Labels' : 'Create Personal Recipe'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[#cde8df]/60 flex items-center justify-center text-zinc-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Live Real Photo Preview Banner + Device Upload Trigger */}
          <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200">
            <RecipeImage
              src={imageUrl}
              alt={title || 'Selected dish cover photo'}
              className="w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadPhoto}
              className="hidden"
            />

            <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">
              <div className="text-white min-w-0">
                <p className="text-xs text-zinc-200 truncate">
                  {selectedCategories.length > 0
                    ? selectedCategories.join(', ')
                    : 'Select categories below'}{' '}
                  · Live Cover Preview
                </p>
                <p className="text-base font-semibold truncate">
                  {title.trim() || 'Your Recipe Title'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/95 hover:bg-white text-zinc-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                <span>Upload Dish Photo</span>
              </button>
            </div>
          </div>

          {/* Visual Photo Picker Tabs */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-700">
                Choose Real Recipe Photography
              </span>

              <div className="flex items-center p-1 bg-zinc-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPhotoTab('studio')}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    photoTab === 'studio'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Culinary Gallery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoTab('online');
                    if (onlinePhotoResults.length === 0) {
                      handleSearchOnlinePhotos();
                    }
                  }}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    photoTab === 'online'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Search Dish Photos
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoTab('url')}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    photoTab === 'url'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Image URL
                </button>
              </div>
            </div>

            {photoTab === 'studio' && (
              <div className="grid grid-cols-5 gap-2">
                {PRESET_RECIPE_IMAGES.map((preset) => {
                  const selected = imageUrl === preset.url;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      title={preset.label}
                      className={`group relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selected
                          ? 'border-emerald-700 ring-2 ring-emerald-700/25'
                          : 'border-transparent hover:border-zinc-300'
                      }`}
                    >
                      <RecipeImage
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full"
                      />
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {photoTab === 'online' && (
              <div className="space-y-3 bg-zinc-50 rounded-2xl p-3.5 border border-zinc-200/80">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={onlinePhotoQuery}
                      onChange={(e) => setOnlinePhotoQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchOnlinePhotos();
                        }
                      }}
                      placeholder="Type dish name (e.g. Burger, Tikka, Lasagna, Pancakes)..."
                      className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchOnlinePhotos}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                  >
                    {searchingPhotos ? 'Loading…' : 'Find Photos'}
                  </button>
                </div>

                {onlinePhotoResults.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {onlinePhotoResults.map((meal) => {
                      const selected = imageUrl === meal.image_url;
                      return (
                        <button
                          key={meal.apiId}
                          type="button"
                          onClick={() => setImageUrl(meal.image_url)}
                          title={meal.title}
                          className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 cursor-pointer ${
                            selected ? 'border-emerald-700' : 'border-transparent'
                          }`}
                        >
                          <RecipeImage
                            src={meal.image_url}
                            alt={meal.title}
                            className="w-full h-full"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {photoTab === 'url' && (
              <div className="flex items-center gap-2">
                <input
                  id="recipe-image"
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://www.themealdb.com/images/media/meals/..."
                  className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-medium text-zinc-700 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Browse File</span>
                </button>
              </div>
            )}
          </div>

          {/* Recipe Title */}
          <div>
            <label
              htmlFor="recipe-title"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Recipe Name
            </label>
            <input
              id="recipe-title"
              type="text"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hostel Masala Omelette Wrap"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
            />
          </div>

          {/* Multi-Select Categories & Dietary Labels Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-zinc-700">
                Categories &amp; Dietary Labels (select one or multiple)
              </label>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="font-mono tabular-nums">
                  {selectedCategories.length}/10 selected
                </span>
                {selectedCategories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([selectedCategories[0]])}
                    className="text-zinc-600 hover:text-zinc-900 underline cursor-pointer whitespace-nowrap"
                  >
                    Keep first
                  </button>
                )}
              </div>
            </div>

            <div
              role="group"
              aria-label="Multi-select recipe categories and labels"
              className="flex flex-wrap gap-2"
            >
              {allPickerOptions.map((cat) => {
                const isSelected = selectedCategories.some(
                  (c) => c.toLowerCase() === cat.toLowerCase()
                );
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleCategoryLabel(cat)}
                    className={`m3-ripple min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#cde8df] border-[#006b58]/30 text-[#07201a]'
                        : 'bg-white border-[#bfc9c4] text-zinc-700 hover:bg-[#eff5f2]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#006b58] shrink-0" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Optional Custom Label Input */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="text"
                maxLength={40}
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomLabel();
                  }
                }}
                placeholder="Add custom label (e.g. Keto, Low-Carb, Air Fryer)..."
                className="flex-1 min-h-[40px] px-3.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700"
              />
              <button
                type="button"
                onClick={handleAddCustomLabel}
                disabled={!customTagInput.trim()}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 text-xs font-semibold text-zinc-800 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Label</span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="recipe-ingredients"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Ingredients (one item per line — compiled automatically into Grocery Lists)
            </label>
            <textarea
              id="recipe-ingredients"
              rows={4}
              required
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder={
                '2 large eggs\n1 small onion, finely chopped\n1 green chili, sliced\n2 whole-wheat parathas'
              }
              className="w-full p-3.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div>
            <label
              htmlFor="recipe-steps"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Cooking Steps (one step per line)
            </label>
            <textarea
              id="recipe-steps"
              rows={4}
              required
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={
                'Whisk eggs with onion, green chili, salt, and red chili flakes.\nPour into oiled pan and cook 2 minutes per side.\nWrap inside warm paratha and serve.'
              }
              className="w-full p-3.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="m3-ripple min-h-[44px] px-5 py-2 rounded-full border border-[#6f7975] bg-white text-sm font-semibold text-[#006b58] hover:bg-[#eff5f2] cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="m3-ripple min-h-[44px] px-6 py-2 rounded-full bg-[#006b58] hover:bg-[#005546] text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
            >
              {initialRecipe ? 'Save Changes' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
