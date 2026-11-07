import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  BookOpen,
  Calendar,
  Compass,
  Heart,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  User as UserIcon,
  UtensilsCrossed,
} from 'lucide-react';
import { CATEGORY_THUMBNAILS, CULINARY_ASSETS } from './assets/culinaryAssets';
import { AdminControlView } from './components/AdminControlView';
import { AuthScreen, PendingCustomerOnboarding } from './components/AuthScreen';
import { GroceryListView } from './components/GroceryListView';
import { MealPlannerView } from './components/MealPlannerView';
import { OnlineRecipesView } from './components/OnlineRecipesView';
import { ProfileView } from './components/ProfileView';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeFormModal } from './components/RecipeFormModal';
import { RecipeImage } from './components/RecipeImage';
import { auth, MASTER_ADMIN_EMAIL, MASTER_ADMIN_NAME } from './firebase';
import {
  addGroceryItemDoc,
  addMultipleGroceryItemsBatch,
  assignMealPlanSlotDoc,
  clearAllMealPlanSlots,
  clearCheckedGroceriesBatch,
  createUserRecipe,
  deleteGroceryItemDoc,
  deleteUserRecipeDoc,
  ensureAccountProfile,
  MealPlanSlotRecord,
  removeMealPlanSlotDoc,
  saveOnlineRecipeForCustomer,
  SIGNATURE_DISH_TEMPLATES,
  subscribeAllCustomersForAdmin,
  subscribeGlobalRecipes,
  subscribeOwnProfile,
  subscribeUserGroceries,
  subscribeUserMealPlan,
  subscribeUserRecipes,
  syncGroceriesFromMealPlanBatch,
  toggleGroceryItemDoc,
  toggleUserRecipeFavorite,
  updateOwnCustomerProfile,
  updateUserRecipeDoc,
  UserRecipeRecord,
} from './services/firestoreService';
import {
  CustomerProfileRecord,
  DayOfWeek,
  GlobalRecipeRecord,
  GroceryItemRecord,
  MealPlanRecord,
  MealType,
  OnlineMealRecipe,
  RECIPE_CATEGORIES,
  RecipeRecord,
  ScreenTab,
  getRecipeCategories,
} from './types';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<CustomerProfileRecord | null>(null);
  // Profile comes FIRST as requested by user
  const [activeTab, setActiveTab] = useState<ScreenTab>(ScreenTab.Profile);

  // Real-time Firestore state
  const [userRecipes, setUserRecipes] = useState<RecipeRecord[]>([]);
  const [globalRecipes, setGlobalRecipes] = useState<GlobalRecipeRecord[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerProfileRecord[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanRecord[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItemRecord[]>([]);

  // Home search & multi-label filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<
    'all' | 'featured' | 'personal' | 'api' | 'favorites'
  >('all');
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([]);
  const [categoryMatchMode, setCategoryMatchMode] = useState<'all' | 'any'>('all');

  // Modals & active selections
  const [selectedSavedRecipe, setSelectedSavedRecipe] = useState<RecipeRecord | null>(null);
  const [selectedOnlineRecipe, setSelectedOnlineRecipe] = useState<OnlineMealRecipe | null>(null);
  const [openDetailInPlanMode, setOpenDetailInPlanMode] = useState(false);
  const [isRecipeFormOpen, setIsRecipeFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeRecord | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Local / Demo Access Mode (when Firebase Auth domain is not yet authorized)
  const [isLocalMode, setIsLocalMode] = useState<boolean>(false);
  const isLocalModeRef = useRef<boolean>(false);
  isLocalModeRef.current = isLocalMode;

  // Onboarding metadata captured prior to Google Sign-In popup
  const pendingOnboardingRef = useRef<PendingCustomerOnboarding | undefined>(undefined);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const handleLocalSignIn = useCallback(
    (role: 'customer' | 'admin', onboarding?: PendingCustomerOnboarding) => {
      const isMasterAdmin = role === 'admin';
      const uid = isMasterAdmin ? 'local_admin_hamid' : 'local_cust_' + Date.now();
      const demoProfile: CustomerProfileRecord = {
        id: uid,
        uid,
        name: isMasterAdmin
          ? MASTER_ADMIN_NAME
          : onboarding?.customName?.trim() || 'YAWAR',
        email: isMasterAdmin
          ? MASTER_ADMIN_EMAIL
          : onboarding?.customName
          ? `${onboarding.customName.toLowerCase().replace(/\s+/g, '')}@example.com`
          : 'yawar@example.com',
        role: isMasterAdmin ? 'admin' : 'customer',
        status: 'active',
        kitchenType: onboarding?.kitchenType || (isMasterAdmin ? 'Master App Control' : 'Student Hostel'),
        phone: onboarding?.phone || '03273554515',
        createdAtMs: Date.now(),
      };

      const starterUserRecipes: UserRecipeRecord[] = SIGNATURE_DISH_TEMPLATES.slice(
        0,
        isMasterAdmin ? 9 : 4
      ).map((tpl, i) => ({
        id: `local_rec_${i + 1}`,
        ownerId: uid,
        title: tpl.title,
        category: tpl.categories[0] || 'Dinner',
        categories: tpl.categories,
        imageUrl: tpl.imageUrl,
        ingredients: tpl.ingredients,
        steps: tpl.steps,
        isFromApi: false,
        isFavorite: i === 0,
        createdAtMs: Date.now() - i * 60000,
        updatedAtMs: Date.now() - i * 60000,
      }));

      const sampleGlobalRecipes: GlobalRecipeRecord[] = SIGNATURE_DISH_TEMPLATES.map((tpl, i) => ({
        id: `global_rec_${i + 1}`,
        title: tpl.title,
        category: tpl.categories[0] || 'Dinner',
        categories: tpl.categories,
        imageUrl: tpl.imageUrl,
        ingredients: tpl.ingredients,
        steps: tpl.steps,
        published: true,
        authorId: 'admin_hamid_ali',
      }));

      const sampleCustomers: CustomerProfileRecord[] = [
        demoProfile,
        {
          id: 'cust_sample_1',
          uid: 'cust_sample_1',
          name: 'Bilal Ahmed',
          email: 'bilal@example.com',
          role: 'customer',
          status: 'active',
          kitchenType: 'Student Hostel',
          phone: '03001234567',
          createdAtMs: Date.now() - 86400000,
        },
        {
          id: 'cust_sample_2',
          uid: 'cust_sample_2',
          name: 'Zainab Noor',
          email: 'zainab@example.com',
          role: 'customer',
          status: 'vip',
          kitchenType: 'Family Home',
          phone: '03219876543',
          createdAtMs: Date.now() - 172800000,
        },
      ];

      setIsLocalMode(true);
      isLocalModeRef.current = true;
      setProfile(demoProfile);
      setUserRecipes(starterUserRecipes);
      setGlobalRecipes(sampleGlobalRecipes);
      if (isMasterAdmin) {
        setAllCustomers(sampleCustomers);
      }
      setActiveTab(ScreenTab.Profile);
      showToast(`Welcome ${demoProfile.name}! Opened Profile with instant access.`);
    },
    [showToast]
  );

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3400);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // Firebase Auth + Real-Time Firestore Listeners Lifecycle
  useEffect(() => {
    let unsubSubs: Array<() => void> = [];

    const clearDataSubscriptions = () => {
      for (const unsub of unsubSubs) {
        try {
          unsub();
        } catch {
          // ignore cleanup errors
        }
      }
      unsubSubs = [];
    };

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (isLocalModeRef.current) return;
      clearDataSubscriptions();

      if (!fbUser) {
        setProfile(null);
        setUserRecipes([]);
        setGlobalRecipes([]);
        setAllCustomers([]);
        setMealPlan([]);
        setGroceryItems([]);
        setActiveTab(ScreenTab.Profile);
        setBooting(false);
        return;
      }

      try {
        const ensured = await ensureAccountProfile(fbUser, pendingOnboardingRef.current);
        pendingOnboardingRef.current = undefined;

        setProfile(ensured);
        setActiveTab(ScreenTab.Profile); // Profile opens FIRST immediately on sign-in

        const isAdminUser = ensured.role === 'admin';

        unsubSubs.push(
          subscribeOwnProfile(fbUser.uid, (latestProfile) => {
            if (latestProfile) setProfile(latestProfile);
          })
        );
        unsubSubs.push(subscribeUserRecipes(fbUser.uid, setUserRecipes));
        unsubSubs.push(subscribeGlobalRecipes(isAdminUser, setGlobalRecipes));
        unsubSubs.push(subscribeUserMealPlan(fbUser.uid, setMealPlan));
        unsubSubs.push(subscribeUserGroceries(fbUser.uid, setGroceryItems));

        if (isAdminUser) {
          unsubSubs.push(subscribeAllCustomersForAdmin(setAllCustomers));
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to initialize cloud account.');
      } finally {
        setBooting(false);
      }
    });

    return () => {
      clearDataSubscriptions();
      unsubAuth();
    };
  }, [showToast]);

  const isAdmin = profile?.role === 'admin';
  const isSuspendedCustomer = Boolean(profile && !isAdmin && profile.status === 'suspended');

  const guardWritableAccount = (): boolean => {
    if (!profile) return false;
    if (isSuspendedCustomer) {
      showToast('Account writes are paused while marked Suspended by Admin Hamid Ali.');
      return false;
    }
    return true;
  };

  // Merge User Personal Recipes + Published Global Catalog Recipes (avoiding title duplicates)
  const combinedRecipes = useMemo<RecipeRecord[]>(() => {
    const userTitlesLower = new Set(userRecipes.map((r) => r.title.trim().toLowerCase()));
    const featuredFromGlobal: RecipeRecord[] = globalRecipes
      .filter((g) => g.published && !userTitlesLower.has(g.title.trim().toLowerCase()))
      .map((g) => ({
        id: g.id,
        ownerId: g.authorId,
        title: g.title,
        category: g.category,
        categories: g.categories,
        image_url: g.imageUrl,
        ingredients: g.ingredients,
        steps: g.steps,
        is_from_api: 0,
        api_meal_id: '',
        isFavorite: false,
        isGlobalCatalog: true,
      }));

    return [...userRecipes, ...featuredFromGlobal];
  }, [userRecipes, globalRecipes]);

  const favoriteIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of userRecipes) {
      if (r.isFavorite) set.add(r.id);
    }
    return set;
  }, [userRecipes]);

  const handleLogout = async () => {
    setIsLocalMode(false);
    isLocalModeRef.current = false;
    setProfile(null);
    setUserRecipes([]);
    setGlobalRecipes([]);
    setAllCustomers([]);
    setMealPlan([]);
    setGroceryItems([]);
    await signOut(auth).catch(() => {});
    setSelectedSavedRecipe(null);
    setSelectedOnlineRecipe(null);
    setActiveTab(ScreenTab.Profile);
  };

  // --- Recipe CRUD Handlers ---

  const handleSaveRecipeForm = async (payload: {
    title: string;
    category: string;
    categories: string[];
    image_url: string;
    ingredients: string;
    steps: string;
  }) => {
    if (!profile || !guardWritableAccount()) return;

    if (isLocalMode) {
      if (editingRecipe) {
        setUserRecipes((prev) =>
          prev.map((r) =>
            r.id === editingRecipe.id
              ? {
                  ...r,
                  title: payload.title,
                  category: payload.category,
                  categories: payload.categories,
                  imageUrl: payload.image_url,
                  ingredients: payload.ingredients,
                  steps: payload.steps,
                  updatedAtMs: Date.now(),
                }
              : r
          )
        );
        if (selectedSavedRecipe?.id === editingRecipe.id) {
          setSelectedSavedRecipe({
            ...editingRecipe,
            ...payload,
          });
        }
        showToast(`Updated "${payload.title}".`);
      } else {
        const newRec: UserRecipeRecord = {
          id: 'local_rec_' + Date.now(),
          ownerId: profile.uid,
          title: payload.title,
          category: payload.category,
          categories: payload.categories,
          imageUrl: payload.image_url || CULINARY_ASSETS.heroMealPrep,
          ingredients: payload.ingredients,
          steps: payload.steps,
          isFromApi: false,
          isFavorite: false,
          createdAtMs: Date.now(),
          updatedAtMs: Date.now(),
        };
        setUserRecipes((prev) => [newRec, ...prev]);
        showToast(`Saved "${payload.title}" to My Recipes.`);
      }
      setIsRecipeFormOpen(false);
      setEditingRecipe(null);
      return;
    }

    if (editingRecipe) {
      await updateUserRecipeDoc(editingRecipe.id, editingRecipe.isFavorite, payload);
      if (selectedSavedRecipe?.id === editingRecipe.id) {
        setSelectedSavedRecipe({
          ...editingRecipe,
          ...payload,
        });
      }
      showToast(`Updated "${payload.title}".`);
    } else {
      await createUserRecipe(profile.uid, payload);
      showToast(`Saved "${payload.title}" to My Recipes.`);
    }

    setIsRecipeFormOpen(false);
    setEditingRecipe(null);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!profile || !guardWritableAccount()) return;
    if (isLocalMode) {
      setUserRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      setMealPlan((prev) => prev.filter((s) => s.recipeId !== recipeId));
      setSelectedSavedRecipe(null);
      showToast('Recipe deleted from your account.');
      return;
    }
    await deleteUserRecipeDoc(recipeId, mealPlan);
    setSelectedSavedRecipe(null);
    showToast('Recipe deleted from your account.');
  };

  const handleSaveGlobalCopyToPersonal = async (
    globalRec: RecipeRecord,
    markFavorite = false
  ): Promise<string | null> => {
    if (!profile || !guardWritableAccount()) return null;
    const existing = userRecipes.find(
      (r) => r.title.trim().toLowerCase() === globalRec.title.trim().toLowerCase()
    );
    if (existing) {
      if (markFavorite && !existing.isFavorite) {
        await toggleUserRecipeFavorite(existing.id, true);
      }
      return existing.id;
    }

    if (isLocalMode) {
      const newRec: UserRecipeRecord = {
        id: 'local_copy_' + Date.now(),
        ownerId: profile.uid,
        title: globalRec.title,
        category: globalRec.category,
        categories: getRecipeCategories(globalRec),
        imageUrl: globalRec.image_url,
        ingredients: globalRec.ingredients,
        steps: globalRec.steps,
        isFromApi: false,
        isFavorite: markFavorite,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      };
      setUserRecipes((prev) => [newRec, ...prev]);
      return newRec.id;
    }

    const newId = await createUserRecipe(profile.uid, {
      title: globalRec.title,
      category: globalRec.category,
      categories: getRecipeCategories(globalRec),
      image_url: globalRec.image_url,
      ingredients: globalRec.ingredients,
      steps: globalRec.steps,
      isFavorite: markFavorite,
    });
    return newId;
  };

  const handleToggleFavorite = async (recipeId: string) => {
    if (!profile || !guardWritableAccount()) return;

    const target = combinedRecipes.find((r) => r.id === recipeId);
    if (!target) return;

    if (target.isGlobalCatalog) {
      await handleSaveGlobalCopyToPersonal(target, true);
      showToast(`Saved "${target.title}" to Favorites.`);
      return;
    }

    if (isLocalMode) {
      setUserRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, isFavorite: !r.isFavorite } : r))
      );
      showToast(!favoriteIds.has(recipeId) ? 'Added to Favorites.' : 'Removed from Favorites.');
      return;
    }

    const nextFav = !favoriteIds.has(recipeId);
    await toggleUserRecipeFavorite(recipeId, nextFav);
    showToast(nextFav ? 'Added to Favorites.' : 'Removed from Favorites.');
  };

  const handleSaveOnlineRecipe = async (online: OnlineMealRecipe): Promise<string | null> => {
    if (!profile || !guardWritableAccount()) return null;

    if (isLocalMode) {
      const newRec: UserRecipeRecord = {
        id: 'online_' + (online.apiId || Date.now()),
        ownerId: profile.uid,
        title: online.title,
        category: online.category || 'Dinner',
        categories: [online.category || 'Dinner'],
        imageUrl: online.imageUrl,
        ingredients: online.ingredients,
        steps: online.steps,
        isFromApi: true,
        apiMealId: online.apiId,
        isFavorite: false,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      };
      setUserRecipes((prev) => [newRec, ...prev]);
      showToast(`Saved "${online.title}" to your cloud recipe box.`);
      return newRec.id;
    }

    const id = await saveOnlineRecipeForCustomer(profile.uid, online, userRecipes);
    showToast(`Saved "${online.title}" to your cloud recipe box.`);
    return id;
  };

  // --- Meal Plan & Grocery Handlers ---

  const handleAssignToPlan = async (
    day: DayOfWeek,
    mealType: MealType,
    explicitRecipeId?: string
  ) => {
    if (!profile || !guardWritableAccount()) return;
    let targetRecipeId = explicitRecipeId ?? selectedSavedRecipe?.id;

    // If assigning an Admin Featured global catalog dish, copy to user_recipes so it persists cleanly
    if (targetRecipeId) {
      const candidate = combinedRecipes.find((r) => r.id === targetRecipeId);
      if (candidate?.isGlobalCatalog) {
        const copiedId = await handleSaveGlobalCopyToPersonal(candidate, false);
        if (copiedId) targetRecipeId = copiedId;
      }
    } else if (selectedOnlineRecipe) {
      const savedId = await saveOnlineRecipeForCustomer(
        profile.uid,
        selectedOnlineRecipe,
        userRecipes
      );
      targetRecipeId = savedId;
    }

    if (!targetRecipeId) return;

    if (isLocalMode) {
      const existingIdx = mealPlan.findIndex((s) => s.day === day && s.mealType === mealType);
      const newSlot: MealPlanSlotRecord = {
        id: `slot_${day}_${mealType}_${Date.now()}`,
        ownerId: profile.uid,
        recipeId: targetRecipeId,
        day,
        mealType,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      };
      if (existingIdx >= 0) {
        setMealPlan((prev) => prev.map((s, i) => (i === existingIdx ? newSlot : s)));
      } else {
        setMealPlan((prev) => [...prev, newSlot]);
      }
      showToast(`Scheduled for ${day} ${mealType}.`);
      return;
    }

    await assignMealPlanSlotDoc(profile.uid, day, mealType, targetRecipeId, mealPlan);
    showToast(`Scheduled for ${day} ${mealType}.`);
  };

  const handleRemoveMealSlot = async (slotId: string) => {
    if (!profile || !guardWritableAccount()) return;
    if (isLocalMode) {
      setMealPlan((prev) => prev.filter((s) => s.id !== slotId));
      showToast('Removed meal slot.');
      return;
    }
    await removeMealPlanSlotDoc(slotId);
    showToast('Removed meal slot.');
  };

  const handleClearWeekPlan = async () => {
    if (!profile || !guardWritableAccount()) return;
    if (isLocalMode) {
      setMealPlan([]);
      showToast('Cleared weekly meal schedule.');
      return;
    }
    await clearAllMealPlanSlots(mealPlan);
    showToast('Cleared weekly meal schedule.');
  };

  const handleGenerateGroceryChecklist = async () => {
    if (!profile || !guardWritableAccount()) return;

    if (isLocalMode) {
      const namesToAdd: string[] = [];
      for (const slot of mealPlan) {
        const rec = combinedRecipes.find((r) => r.id === slot.recipeId);
        if (!rec) continue;
        const lines = rec.ingredients
          .split(/\r?\n|,/)
          .map((l) => l.replace(/^[-•*]\s*/, '').trim())
          .filter((l) => l.length > 1);
        namesToAdd.push(...lines);
      }
      const newItems: GroceryItemRecord[] = namesToAdd.map((name, i) => ({
        id: `local_groc_${Date.now()}_${i}`,
        ownerId: profile.uid,
        name,
        checked: 0,
      }));
      setGroceryItems((prev) => [...newItems, ...prev]);
      setActiveTab(ScreenTab.Groceries);
      showToast(`Synced ${newItems.length} items from planned meals.`);
      return;
    }

    const { addedCount, totalMeals } = await syncGroceriesFromMealPlanBatch(
      profile.uid,
      mealPlan,
      combinedRecipes,
      groceryItems
    );
    setActiveTab(ScreenTab.Groceries);
    showToast(
      addedCount > 0
        ? `Added ${addedCount} grocery items from ${totalMeals} planned meals.`
        : `Checklist synced with all ${totalMeals} planned meals.`
    );
  };

  const handleAddRecipeToGrocery = async (recipe: RecipeRecord) => {
    if (!profile || !guardWritableAccount()) return;
    const lines = recipe.ingredients
      .split(/\r?\n|,/)
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l) => l.length > 1);

    if (isLocalMode) {
      const newItems: GroceryItemRecord[] = lines.map((name, i) => ({
        id: `local_groc_${Date.now()}_${i}`,
        ownerId: profile.uid,
        name,
        checked: 0,
      }));
      setGroceryItems((prev) => [...newItems, ...prev]);
      showToast(`Added ${newItems.length} ingredients to your Grocery List.`);
      return;
    }

    const added = await addMultipleGroceryItemsBatch(profile.uid, lines, groceryItems);
    showToast(`Added ${added} ingredients to your Grocery List.`);
  };

  // --- Computed Collections ---

  const savedApiIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of userRecipes) {
      if (r.api_meal_id) ids.add(r.api_meal_id);
    }
    return ids;
  }, [userRecipes]);

  const availableCategories = useMemo(() => {
    const canonicalByLower = new Map<string, string>();
    const registerLabel = (label: string) => {
      const cleaned = label.trim();
      if (!cleaned) return;
      const lower = cleaned.toLowerCase();
      if (!canonicalByLower.has(lower)) {
        canonicalByLower.set(lower, cleaned);
      }
    };

    registerLabel('All');
    for (const preset of RECIPE_CATEGORIES) {
      registerLabel(preset);
    }
    for (const r of combinedRecipes) {
      for (const tag of getRecipeCategories(r)) {
        registerLabel(tag);
      }
    }
    return Array.from(canonicalByLower.values());
  }, [combinedRecipes]);

  const toggleDashboardCategoryFilter = useCallback((cat: string) => {
    if (cat === 'All') {
      setSelectedCategoryFilters([]);
      return;
    }
    setSelectedCategoryFilters((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === cat.toLowerCase());
      if (exists) {
        return prev.filter((c) => c.toLowerCase() !== cat.toLowerCase());
      }
      return [...prev, cat];
    });
  }, []);

  const filteredHomeRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const activeFilterLowers = selectedCategoryFilters.map((c) => c.toLowerCase());

    return combinedRecipes.filter((r) => {
      if (sourceFilter === 'featured' && !r.isGlobalCatalog) return false;
      if (sourceFilter === 'personal' && (r.isGlobalCatalog || r.is_from_api !== 0)) return false;
      if (sourceFilter === 'api' && r.is_from_api !== 1) return false;
      if (sourceFilter === 'favorites' && !favoriteIds.has(r.id)) return false;

      const recipeTagLowers = getRecipeCategories(r).map((t) => t.toLowerCase());

      if (activeFilterLowers.length > 0) {
        const matches =
          categoryMatchMode === 'all'
            ? activeFilterLowers.every((flt) => recipeTagLowers.includes(flt))
            : activeFilterLowers.some((flt) => recipeTagLowers.includes(flt));
        if (!matches) return false;
      }

      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.ingredients.toLowerCase().includes(q) ||
        recipeTagLowers.some((tag) => tag.includes(q))
      );
    });
  }, [
    combinedRecipes,
    searchQuery,
    sourceFilter,
    selectedCategoryFilters,
    categoryMatchMode,
    favoriteIds,
  ]);

  const favoriteRecipes = useMemo(
    () => userRecipes.filter((r) => favoriteIds.has(r.id)),
    [userRecipes, favoriteIds]
  );

  const pendingGroceriesCount = useMemo(
    () => groceryItems.filter((g) => g.checked === 0).length,
    [groceryItems]
  );

  const mondayPreviewMeals = useMemo(() => {
    const map = new Map<string, RecipeRecord>();
    for (const r of combinedRecipes) map.set(r.id, r);
    return (['Breakfast', 'Lunch', 'Dinner'] as const).map((slot) => {
      const found = mealPlan.find((m) => m.day === 'Monday' && m.meal_type === slot);
      return {
        slot,
        recipe: found ? map.get(found.recipe_id) : undefined,
      };
    });
  }, [combinedRecipes, mealPlan]);

  const uniquePlannedDishes = useMemo(() => {
    const map = new Map<string, RecipeRecord>();
    for (const r of combinedRecipes) map.set(r.id, r);
    const seen = new Set<string>();
    const list: RecipeRecord[] = [];
    for (const entry of mealPlan) {
      if (!seen.has(entry.recipe_id)) {
        const rec = map.get(entry.recipe_id);
        if (rec) {
          seen.add(entry.recipe_id);
          list.push(rec);
        }
      }
    }
    return list;
  }, [combinedRecipes, mealPlan]);

  // Navigation items with PROFILE FIRST on both Desktop and Mobile
  const desktopNavItems = useMemo(() => {
    if (isAdmin) {
      return [
        { id: ScreenTab.Profile, label: 'Profile' },
        { id: ScreenTab.Admin, label: 'Admin Control' },
        { id: ScreenTab.Home, label: 'Recipes' },
        { id: ScreenTab.Planner, label: 'Meal Planner' },
        { id: ScreenTab.Groceries, label: 'Grocery List' },
      ];
    }
    return [
      { id: ScreenTab.Profile, label: 'Profile' },
      { id: ScreenTab.Home, label: 'Recipes' },
      { id: ScreenTab.Online, label: 'Online Recipes' },
      { id: ScreenTab.Planner, label: 'Meal Planner' },
      { id: ScreenTab.Groceries, label: 'Grocery List' },
    ];
  }, [isAdmin]);

  const mobileNavItems = useMemo(() => {
    if (isAdmin) {
      return [
        { id: ScreenTab.Profile, label: 'Profile', Icon: UserIcon },
        { id: ScreenTab.Admin, label: 'Admin DB', Icon: ShieldCheck },
        { id: ScreenTab.Home, label: 'Recipes', Icon: BookOpen },
        { id: ScreenTab.Planner, label: 'Planner', Icon: Calendar },
        { id: ScreenTab.Groceries, label: 'Groceries', Icon: ShoppingBag },
      ];
    }
    return [
      { id: ScreenTab.Profile, label: 'Profile', Icon: UserIcon },
      { id: ScreenTab.Home, label: 'Recipes', Icon: BookOpen },
      { id: ScreenTab.Online, label: 'Online', Icon: Compass },
      { id: ScreenTab.Planner, label: 'Planner', Icon: Calendar },
      { id: ScreenTab.Groceries, label: 'Groceries', Icon: ShoppingBag },
    ];
  }, [isAdmin]);

  // 1. Flutter Material 3 Splash Screen
  if (booting) {
    return (
      <div className="min-h-screen bg-[#f5faf8] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#cde8df] text-[#07201a] flex items-center justify-center mb-4">
          <UtensilsCrossed className="w-7 h-7 text-[#006b58]" />
        </div>
        <h1 className="font-editorial text-2xl font-semibold text-zinc-900">
          Hamid &amp; Hassan Kitchen
        </h1>
        <p className="text-xs text-zinc-600 mt-1.5">Connecting to kitchen cloud database…</p>
      </div>
    );
  }

  // 2. Customer Sign Up / Customer Log In / Admin Hamid Ali Portal
  if (!profile) {
    return (
      <AuthScreen
        onBeforeSignIn={(onboarding) => {
          pendingOnboardingRef.current = onboarding;
        }}
        onLocalSignIn={handleLocalSignIn}
      />
    );
  }

  // 3. Authenticated Flutter Material 3 Workspace (Profile Comes First)
  return (
    <div className="min-h-screen bg-[#f5faf8] text-[#171d1b] flex flex-col pb-20 md:pb-12">
      {/* Desktop Top Bar Contract: strictly 3 zones separated by gap-8 */}
      <header className="hidden md:flex sticky top-0 z-30 bg-[#eff5f2]/95 backdrop-blur-md border-b border-[#bfc9c4]/70">
        <div className="max-w-7xl w-full mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab(ScreenTab.Profile)}
            className="font-editorial text-xl font-semibold tracking-tight text-[#171d1b] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Hamid &amp; Hassan Kitchen
          </button>

          {/* Zone 2: 5 concise single-line text navigation links (Profile FIRST) */}
          <nav className="flex items-center gap-7 text-sm font-medium text-zinc-600 h-full">
            {desktopNavItems.map((item) => {
              const isActive =
                activeTab === item.id ||
                (item.id === ScreenTab.Home &&
                  (activeTab === ScreenTab.Favorites ||
                    (isAdmin && activeTab === ScreenTab.Online)));
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`h-full inline-flex items-center transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-[3px] ${
                    isActive
                      ? 'text-[#006b58] border-[#006b58] font-semibold'
                      : 'border-transparent hover:text-[#171d1b]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary Material 3 FilledButton action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingRecipe(null);
                setIsRecipeFormOpen(true);
              }}
              className="m3-ripple min-h-[40px] px-5 py-2 rounded-full bg-[#006b58] hover:bg-[#005546] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Recipe</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Flutter Material 3 AppBar */}
      <header className="md:hidden sticky top-0 z-30 h-14 px-4 bg-[#eff5f2]/95 backdrop-blur-md border-b border-[#bfc9c4]/60 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActiveTab(ScreenTab.Profile)}
          className="font-editorial text-lg font-semibold text-[#171d1b] whitespace-nowrap shrink-0"
        >
          Hamid &amp; Hassan Kitchen
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditingRecipe(null);
              setIsRecipeFormOpen(true);
            }}
            className="m3-ripple min-h-[38px] px-4 py-1.5 rounded-full bg-[#006b58] text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Recipe</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex-1">
        {activeTab === ScreenTab.Profile && (
          <ProfileView
            profile={profile}
            totalCustomersCount={allCustomers.length}
            globalRecipesCount={globalRecipes.length}
            stats={{
              recipesCount: userRecipes.length,
              favoritesCount: favoriteRecipes.length,
              plannedCount: mealPlan.length,
              pendingGroceriesCount,
            }}
            onSaveProfile={async (updates) => {
              if (isLocalMode) {
                setProfile((prev) => (prev ? { ...prev, ...updates } : null));
                showToast('Profile updated!');
                return;
              }
              await updateOwnCustomerProfile(profile.uid, updates);
            }}
            onNavigateTab={setActiveTab}
            onLogout={handleLogout}
            onNotify={showToast}
          />
        )}

        {activeTab === ScreenTab.Admin && isAdmin && (
          <AdminControlView
            adminUid={profile.uid}
            customers={allCustomers}
            globalRecipes={globalRecipes}
            onNotify={showToast}
          />
        )}

        {activeTab === ScreenTab.Home && (
          <div className="space-y-8">
            {/* Editorial Split Hero & Visual Monday Schedule Snapshot */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 relative rounded-3xl overflow-hidden min-h-[280px] sm:min-h-[320px] flex flex-col justify-end border border-zinc-200/80">
                <RecipeImage
                  src={CULINARY_ASSETS.heroMealPrep}
                  alt="Organized fresh ingredients on a stone kitchen counter"
                  className="absolute inset-0 w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
                <div className="relative z-10 p-6 sm:p-8 text-white space-y-3">
                  <div className="text-xs text-zinc-200">
                    {profile.name} · {combinedRecipes.length} available dishes ·{' '}
                    {pendingGroceriesCount} pending groceries
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-semibold leading-tight max-w-xl">
                    Cook smarter all week with curated &amp; personal recipes.
                  </h1>
                  <div className="pt-1 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab(ScreenTab.Online)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Browse Online Recipes
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab(ScreenTab.Favorites)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-black/45 hover:bg-black/65 border border-white/25 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-xs transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                      <span>Favorites ({favoriteRecipes.length})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Monday Lineup with Real Dish Thumbnails */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-zinc-200/80 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-zinc-500">Weekly Schedule Snapshot</p>
                      <h2 className="text-lg font-semibold text-zinc-900">Monday Lineup</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab(ScreenTab.Planner)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap cursor-pointer"
                    >
                      Open Full Planner
                    </button>
                  </div>

                  <div className="divide-y divide-zinc-100">
                    {mondayPreviewMeals.map(({ slot, recipe }) => (
                      <div
                        key={slot}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {recipe ? (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDetailInPlanMode(false);
                                setSelectedSavedRecipe(recipe);
                              }}
                              className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 shrink-0 cursor-pointer"
                            >
                              <RecipeImage
                                src={recipe.image_url}
                                alt={recipe.title}
                                className="w-full h-full"
                              />
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 shrink-0 flex items-center justify-center text-[10px] text-zinc-400">
                              Empty
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="text-xs text-zinc-500">{slot}</div>
                            {recipe ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenDetailInPlanMode(false);
                                  setSelectedSavedRecipe(recipe);
                                }}
                                className="text-sm font-medium text-zinc-900 hover:text-emerald-800 truncate block text-left cursor-pointer"
                              >
                                {recipe.title}
                              </button>
                            ) : (
                              <span className="text-sm text-zinc-400">Unassigned</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab(ScreenTab.Planner)}
                          className="min-h-[36px] px-3 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-medium text-zinc-700 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {recipe ? 'Swap' : 'Assign'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-500">
                    <strong className="font-mono tabular-nums text-zinc-800">
                      {mealPlan.length}
                    </strong>{' '}
                    meals planned this week
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateGroceryChecklist}
                    disabled={mealPlan.length === 0}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Build Grocery List
                  </button>
                </div>
              </div>
            </section>

            {/* Multi-Select Category & Dietary Label Strip on Home Dashboard */}
            <section className="space-y-4">
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {availableCategories.map((cat) => {
                  const thumb = CATEGORY_THUMBNAILS[cat] ?? CULINARY_ASSETS.heroMealPrep;
                  const active =
                    cat === 'All'
                      ? selectedCategoryFilters.length === 0
                      : selectedCategoryFilters.some(
                          (c) => c.toLowerCase() === cat.toLowerCase()
                        );
                  const count =
                    cat === 'All'
                      ? combinedRecipes.length
                      : combinedRecipes.filter((r) =>
                          getRecipeCategories(r).some(
                            (tag) => tag.toLowerCase() === cat.toLowerCase()
                          )
                        ).length;

                  return (
                      <button
                        key={cat}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleDashboardCategoryFilter(cat)}
                        className={`m3-ripple min-h-[52px] pr-4 p-1.5 rounded-2xl border flex items-center gap-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#cde8df] border-[#006b58]/40 text-[#07201a]'
                            : 'bg-white border-[#bfc9c4]/80 text-zinc-800 hover:bg-[#eff5f2]'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-200 shrink-0">
                          <RecipeImage src={thumb} alt={cat} className="w-full h-full" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-semibold leading-tight">{cat}</div>
                          <div
                            className={`text-[11px] font-mono tabular-nums ${
                              active ? 'text-[#006b58] font-medium' : 'text-zinc-500'
                            }`}
                          >
                            {count} {count === 1 ? 'dish' : 'dishes'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

              {/* Active Multi-Label Filter Summary & Match Mode Control */}
              {selectedCategoryFilters.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-4 rounded-xl bg-white border border-zinc-200/80 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-zinc-600">
                    <span>Active label filters:</span>
                    <strong className="font-semibold text-zinc-900">
                      {selectedCategoryFilters.join(' · ')}
                    </strong>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-emerald-700 font-medium">
                      {filteredHomeRecipes.length}{' '}
                      {filteredHomeRecipes.length === 1 ? 'match' : 'matches'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {selectedCategoryFilters.length > 1 && (
                      <div className="flex items-center p-0.5 bg-zinc-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setCategoryMatchMode('all')}
                          className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            categoryMatchMode === 'all'
                              ? 'bg-white text-zinc-900 shadow-xs'
                              : 'text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          Match All
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoryMatchMode('any')}
                          className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            categoryMatchMode === 'any'
                              ? 'bg-white text-zinc-900 shadow-xs'
                              : 'text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          Match Any
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilters([])}
                      className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 underline cursor-pointer whitespace-nowrap"
                    >
                      Clear Labels
                    </button>
                  </div>
                </div>
              )}

              {/* Flutter Material 3 SearchBar & SegmentedButton Source Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-xl">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dishes by name, ingredient, or label (e.g. gluten-free, quick, biryani)..."
                    className="w-full min-h-[48px] pl-11 pr-4 rounded-full border border-[#bfc9c4] bg-[#eff5f2] focus:bg-white text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-[#006b58]"
                  />
                </div>

                <div className="inline-flex items-center rounded-full border border-[#6f7975] bg-white overflow-x-auto no-scrollbar divide-x divide-[#bfc9c4]">
                  {[
                    { id: 'all', label: 'All Dishes' },
                    { id: 'featured', label: 'Admin Featured' },
                    { id: 'personal', label: 'My Personal' },
                    { id: 'api', label: 'From API' },
                    { id: 'favorites', label: 'Favorites' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setSourceFilter(
                          item.id as 'all' | 'featured' | 'personal' | 'api' | 'favorites'
                        )
                      }
                      className={`min-h-[40px] px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        sourceFilter === item.id
                          ? 'bg-[#cde8df] text-[#07201a]'
                          : 'text-zinc-700 hover:bg-[#eff5f2]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Recipe Grid */}
            <section>
              {filteredHomeRecipes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-10 text-center space-y-3">
                  <p className="text-base font-medium text-zinc-900">
                    No recipes match your current filter
                  </p>
                  <p className="text-sm text-zinc-500 max-w-md mx-auto">
                    Create a personal recipe with your own dish photo and dietary labels, clear
                    your active label filters, or save new dishes from the online catalog.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSourceFilter('all');
                        setSelectedCategoryFilters([]);
                      }}
                      className="min-h-[42px] px-4 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecipe(null);
                        setIsRecipeFormOpen(true);
                      }}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Create Recipe
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredHomeRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      isFavorite={favoriteIds.has(recipe.id)}
                      onSelect={(r) => {
                        setOpenDetailInPlanMode(false);
                        setSelectedSavedRecipe(r);
                      }}
                      onToggleFavorite={handleToggleFavorite}
                      onQuickPlan={(r) => {
                        setOpenDetailInPlanMode(true);
                        setSelectedSavedRecipe(r);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === ScreenTab.Favorites && (
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900">
                  Favorite Recipes
                </h1>
                <p className="text-sm text-zinc-600 mt-1">
                  Your bookmarked go-to meals synced across your account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab(ScreenTab.Home)}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 whitespace-nowrap cursor-pointer"
              >
                All Recipes
              </button>
            </div>

            {favoriteRecipes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-10 text-center space-y-3">
                <p className="text-base font-medium text-zinc-900">No favorite recipes yet</p>
                <p className="text-sm text-zinc-500">
                  Tap the heart icon on any recipe card to pin it here for quick access.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isFavorite={true}
                    onSelect={(r) => {
                      setOpenDetailInPlanMode(false);
                      setSelectedSavedRecipe(r);
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    onQuickPlan={(r) => {
                      setOpenDetailInPlanMode(true);
                      setSelectedSavedRecipe(r);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === ScreenTab.Online && (
          <OnlineRecipesView
            savedApiIds={savedApiIds}
            onSelectOnlineRecipe={(meal) => {
              setOpenDetailInPlanMode(false);
              setSelectedOnlineRecipe(meal);
            }}
            onSaveOnlineRecipe={(meal) => {
              handleSaveOnlineRecipe(meal);
            }}
          />
        )}

        {activeTab === ScreenTab.Planner && (
          <MealPlannerView
            recipes={combinedRecipes}
            mealPlan={mealPlan}
            onAssignSlot={(day, mealType, recipeId) =>
              handleAssignToPlan(day, mealType, recipeId)
            }
            onRemoveSlot={handleRemoveMealSlot}
            onClearWeek={handleClearWeekPlan}
            onGenerateGroceryList={handleGenerateGroceryChecklist}
            onSelectRecipe={(r) => {
              setOpenDetailInPlanMode(false);
              setSelectedSavedRecipe(r);
            }}
            onNavigateAddRecipe={() => {
              setEditingRecipe(null);
              setIsRecipeFormOpen(true);
            }}
          />
        )}

        {activeTab === ScreenTab.Groceries && (
          <GroceryListView
            items={groceryItems}
            plannedMealsCount={mealPlan.length}
            plannedDishes={uniquePlannedDishes}
            onSelectDish={(r) => {
              setOpenDetailInPlanMode(false);
              setSelectedSavedRecipe(r);
            }}
            onAddItem={async (name) => {
              if (!guardWritableAccount()) return;
              if (isLocalMode) {
                setGroceryItems((prev) => [
                  { id: 'local_groc_' + Date.now(), ownerId: profile.uid, name, checked: 0 },
                  ...prev,
                ]);
                return;
              }
              await addGroceryItemDoc(profile.uid, name, groceryItems);
            }}
            onAddMultipleItems={async (names) => {
              if (!guardWritableAccount()) return;
              if (isLocalMode) {
                const added: GroceryItemRecord[] = names.map((name, i) => ({
                  id: `local_groc_${Date.now()}_${i}`,
                  ownerId: profile.uid,
                  name,
                  checked: 0,
                }));
                setGroceryItems((prev) => [...added, ...prev]);
                showToast(`Added ${added.length} recognized grocery ${added.length === 1 ? 'item' : 'items'}.`);
                return;
              }
              const added = await addMultipleGroceryItemsBatch(profile.uid, names, groceryItems);
              showToast(`Added ${added} recognized grocery ${added === 1 ? 'item' : 'items'}.`);
            }}
            onToggleItem={async (itemId) => {
              if (!guardWritableAccount()) return;
              if (isLocalMode) {
                setGroceryItems((prev) =>
                  prev.map((i) => (i.id === itemId ? { ...i, checked: i.checked === 1 ? 0 : 1 } : i))
                );
                return;
              }
              const found = groceryItems.find((i) => i.id === itemId);
              if (!found) return;
              await toggleGroceryItemDoc(itemId, found.checked === 0);
            }}
            onDeleteItem={async (itemId) => {
              if (!guardWritableAccount()) return;
              if (isLocalMode) {
                setGroceryItems((prev) => prev.filter((i) => i.id !== itemId));
                return;
              }
              await deleteGroceryItemDoc(itemId);
            }}
            onClearChecked={async () => {
              if (!guardWritableAccount()) return;
              if (isLocalMode) {
                setGroceryItems((prev) => prev.filter((i) => i.checked !== 1));
                showToast('Cleared bought grocery items.');
                return;
              }
              await clearCheckedGroceriesBatch(groceryItems);
              showToast('Cleared bought grocery items.');
            }}
            onSyncFromMealPlan={handleGenerateGroceryChecklist}
          />
        )}
      </main>

      {/* Mobile Flutter Material 3 NavigationBar with Stadium Indicator Pill (Profile FIRST) */}
      <nav
        aria-label="Primary mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#eff5f2] border-t border-[#bfc9c4]/60 grid grid-cols-5 items-center"
      >
        {mobileNavItems.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className="min-h-[52px] flex flex-col items-center justify-center cursor-pointer"
            >
              <span
                className={`w-14 h-7 rounded-full flex items-center justify-center transition-colors ${
                  active ? 'bg-[#cde8df] text-[#07201a]' : 'text-zinc-600'
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span
                className={`text-[10px] tracking-tight mt-0.5 whitespace-nowrap ${
                  active ? 'text-[#07201a] font-semibold' : 'text-zinc-600 font-medium'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Recipe Details Modal */}
      {(selectedSavedRecipe || selectedOnlineRecipe) && (
        <RecipeDetailModal
          savedRecipe={selectedSavedRecipe}
          onlineRecipe={selectedOnlineRecipe}
          isAlreadySavedFromApi={
            selectedOnlineRecipe ? savedApiIds.has(selectedOnlineRecipe.apiId) : false
          }
          isFavorite={selectedSavedRecipe ? favoriteIds.has(selectedSavedRecipe.id) : false}
          initialShowPlanner={openDetailInPlanMode}
          onClose={() => {
            setSelectedSavedRecipe(null);
            setSelectedOnlineRecipe(null);
            setOpenDetailInPlanMode(false);
          }}
          onToggleFavorite={handleToggleFavorite}
          onEditRecipe={(rec) => {
            setSelectedSavedRecipe(null);
            setEditingRecipe(rec);
            setIsRecipeFormOpen(true);
          }}
          onDeleteRecipe={handleDeleteRecipe}
          onAssignToPlan={(day, mealType) => handleAssignToPlan(day, mealType)}
          onSaveOnlineRecipe={async (online) => {
            await handleSaveOnlineRecipe(online);
            setSelectedOnlineRecipe(null);
          }}
          onSaveGlobalRecipeToPersonal={async (globalRec) => {
            const id = await handleSaveGlobalCopyToPersonal(globalRec, false);
            if (id) {
              showToast(`Saved copy of "${globalRec.title}" to My Recipes.`);
              setSelectedSavedRecipe(null);
            }
          }}
          onAddIngredientsToGrocery={handleAddRecipeToGrocery}
        />
      )}

      {/* Create / Edit Personal Recipe Modal */}
      {isRecipeFormOpen && (
        <RecipeFormModal
          initialRecipe={editingRecipe}
          onClose={() => {
            setIsRecipeFormOpen(false);
            setEditingRecipe(null);
          }}
          onSave={handleSaveRecipeForm}
        />
      )}

      {/* Non-intrusive Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:max-w-sm z-50 bg-zinc-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-white text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
