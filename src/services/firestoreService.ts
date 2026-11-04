import { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { CULINARY_ASSETS } from '../assets/culinaryAssets';
import {
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_NAME,
  OperationType,
  db,
  handleFirestoreError,
} from '../firebase';
import {
  CustomerProfileRecord,
  CustomerStatus,
  DayOfWeek,
  GlobalRecipeRecord,
  GroceryItemRecord,
  MealPlanRecord,
  MealType,
  OnlineMealRecipe,
  RecipeRecord,
  normalizeCategoryList,
} from '../types';

function clampString(val: string, maxLen: number, fallback = ''): string {
  const trimmed = (val ?? '').trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function parseDocCategories(rawCategories: unknown, fallbackCategory: unknown): string[] {
  if (Array.isArray(rawCategories)) {
    const strs = rawCategories.filter((x): x is string => typeof x === 'string');
    if (strs.length > 0) {
      return normalizeCategoryList(strs, String(fallbackCategory ?? 'Dinner'));
    }
  }
  return normalizeCategoryList(undefined, String(fallbackCategory ?? 'Dinner'));
}

export const SIGNATURE_DISH_TEMPLATES = [
  {
    title: 'Sindhi Handi Chicken Biryani',
    categories: ['Chicken', 'Dinner', 'Gluten-Free', 'High-Protein'],
    imageUrl: CULINARY_ASSETS.sindhiBiryani,
    ingredients: [
      '500g bone-in chicken pieces',
      '2 cups aged sella basmati rice, soaked 30 min',
      '2 large onions, thinly sliced & golden fried',
      '2 ripe tomatoes, chopped',
      '1/2 cup plain whisked yogurt',
      '2 tbsp ginger-garlic paste',
      '4 dried plums (aloo bukhara)',
      '1 bunch fresh mint & coriander leaves',
      'Pinch of saffron soaked in 2 tbsp warm milk',
    ].join('\n'),
    steps: [
      'Parboil soaked basmati rice in salted water with cardamom and cloves until 75% tender, then drain.',
      'Sear chicken with ginger-garlic paste, tomatoes, yogurt, biryani spices, and dried plums until thick masala forms.',
      'Layer fragrant chicken masala and parboiled basmati rice inside a heavy handi pot.',
      'Scatter crispy fried onions, fresh mint leaves, lemon slices, and saffron milk over the top.',
      'Seal tightly and steam on low flame (dum) for 18 minutes. Serve hot with mint-cucumber raita.',
    ].join('\n'),
  },
  {
    title: 'Crispy Lacha Paratha & Masala Omelette',
    categories: ['Breakfast', 'Quick', 'Quick Hostel', 'Vegetarian'],
    imageUrl: CULINARY_ASSETS.parathaOmelette,
    ingredients: [
      '3 farm-fresh eggs',
      '2 whole-wheat lacha parathas',
      '1 small red onion, finely diced',
      '1 plum tomato, deseeded & diced',
      '2 green chilies, finely sliced',
      '2 tbsp fresh chopped coriander',
      '1/2 tsp crushed red chili & pinch of turmeric',
      '2 tbsp desi ghee or butter',
    ].join('\n'),
    steps: [
      'Whisk eggs vigorously with diced onion, tomato, green chilies, coriander, salt, turmeric, and chili flakes.',
      'Warm a cast-iron tawa over medium flame and pan-roast each layered paratha in ghee until crisp and flaky.',
      'Pour the spiced egg mixture onto the hot skillet with butter and cook 2 minutes until golden underneath.',
      'Fold gently in half and serve alongside hot flaky paratha and morning chai.',
    ].join('\n'),
  },
  {
    title: 'Islamabad Style Chicken Karahi',
    categories: ['Dinner', 'Chicken', 'Gluten-Free', 'Dairy-Free', 'High-Protein'],
    imageUrl: CULINARY_ASSETS.chickenKarahi,
    ingredients: [
      '500g bone-in chicken pieces',
      '4 medium vine tomatoes, halved',
      '2 tbsp ginger-garlic paste',
      '3 fresh green chilies, sliced',
      '1 tsp crushed black pepper',
      '1 tsp roasted ground coriander',
      'Fresh julienned ginger & cilantro',
      '3 tbsp cooking oil',
    ].join('\n'),
    steps: [
      'Heat oil in a metallic karahi over medium-high flame and sear chicken pieces with salt for 6 minutes until golden.',
      'Stir in ginger-garlic paste and cook briskly for 2 minutes.',
      'Arrange halved tomatoes cut-side down over the chicken, cover for 6 minutes, then peel off softened skins.',
      'Mash tomatoes into a rich gravy with roasted coriander and black pepper; simmer until glossy oil separates.',
      'Garnish generously with julienned ginger, green chilies, and fresh cilantro.',
    ].join('\n'),
  },
  {
    title: 'Creamy Roasted Garlic Chicken Penne',
    categories: ['Pasta', 'Chicken', 'Dinner', 'Quick'],
    imageUrl: CULINARY_ASSETS.garlicPasta,
    ingredients: [
      '250g penne pasta',
      '250g boneless chicken breast, sliced',
      '4 cloves garlic, finely minced',
      '1/3 cup sun-dried tomatoes, sliced',
      '3/4 cup cooking cream',
      '1/2 cup freshly grated Parmesan cheese',
      'Handful of fresh basil leaves',
      'Freshly cracked black pepper',
    ].join('\n'),
    steps: [
      'Boil penne pasta in salted water until al dente; reserve 1/2 cup starchy pasta water before draining.',
      'Season chicken strips with salt, pepper, and oregano, then sear in olive oil 4 minutes per side until golden.',
      'Sauté minced garlic and sun-dried tomatoes in the same skillet for 1 minute until fragrant.',
      'Pour in cream, grated Parmesan, and pasta water; simmer gently until velvety.',
      'Toss cooked penne, sliced chicken, and fresh basil into the sauce and finish with cracked black pepper.',
    ].join('\n'),
  },
  {
    title: 'Char-Grilled Beef Seekh Kebabs',
    categories: ['Beef', 'Dinner', 'Gluten-Free', 'High-Protein'],
    imageUrl: CULINARY_ASSETS.beefSeekhKebab,
    ingredients: [
      '500g lean minced beef (with 15% fat)',
      '1 medium onion, grated & squeezed dry',
      '1 tbsp ginger-garlic & green chili paste',
      '1 tsp roasted cumin & coriander seeds, crushed',
      '1/2 tsp garam masala',
      '3 tbsp fresh chopped cilantro & mint',
      'Red onion rings & lemon wedges for serving',
    ].join('\n'),
    steps: [
      'Knead minced beef thoroughly for 5 minutes with squeezed onion, ginger-garlic paste, herbs, and roasted spices.',
      'Chill the spiced mixture for 30 minutes so the kebabs hold firmly on skewers.',
      'Thread portions onto flat skewers with damp hands.',
      'Grill over high heat or a cast-iron grill pan for 8–10 minutes, turning and brushing lightly with butter.',
      'Serve sizzling over red onion rings with lemon wedges, green mint chutney, and warm naan.',
    ].join('\n'),
  },
  {
    title: 'Spiced Skillet Egg Shakshuka',
    categories: ['Breakfast', 'Quick', 'Quick Hostel', 'Vegetarian', 'Gluten-Free'],
    imageUrl: CULINARY_ASSETS.shakshukaBreakfast,
    ingredients: [
      '4 large eggs',
      '3 ripe tomatoes, diced',
      '1 medium red onion, finely chopped',
      '2 cloves garlic, minced',
      '1 tsp ground cumin & smoked paprika',
      '60g crumbled feta cheese',
      'Fresh coriander leaves',
      '2 toasted flatbreads',
    ].join('\n'),
    steps: [
      'Sauté chopped red onion in olive oil over medium heat for 4 minutes until soft.',
      'Add minced garlic, cumin, and smoked paprika; stir for 45 seconds.',
      'Stir in diced tomatoes and simmer 7 minutes until thickened.',
      'Make four wells, crack an egg into each, cover, and cook 5 minutes on low heat.',
      'Top with crumbled feta and coriander leaves; serve with warm flatbread.',
    ].join('\n'),
  },
  {
    title: 'Roasted Chickpea & Herb Basmati Bowl',
    categories: ['Lunch', 'Vegetarian', 'Gluten-Free', 'Quick', 'Meal Prep'],
    imageUrl: CULINARY_ASSETS.chickpeaBowl,
    ingredients: [
      '1 can (400g) cooked chickpeas, drained',
      '1 cup cooked basmati rice',
      '1 crisp cucumber, diced',
      '100g cherry tomatoes, halved',
      '3 tbsp thick Greek yogurt',
      '1 fresh lemon, juiced',
      '1 tsp roasted cumin powder',
      'Fresh parsley & mint leaves',
    ].join('\n'),
    steps: [
      'Pan-roast drained chickpeas in olive oil with roasted cumin, salt, and pepper for 8 minutes until crisp.',
      'Spoon warm fluffy basmati rice into wide meal-prep bowls.',
      'Arrange crispy spiced chickpeas, diced cucumber, and cherry tomatoes beside the rice.',
      'Whisk Greek yogurt with lemon juice and chopped herbs, then drizzle over the bowl.',
    ].join('\n'),
  },
  {
    title: 'Warm Fudgy Chocolate Brownie & Vanilla Scoop',
    categories: ['Dessert', 'Vegetarian'],
    imageUrl: CULINARY_ASSETS.chocolateBrownie,
    ingredients: [
      '150g dark chocolate (70%), chopped',
      '115g unsalted butter',
      '2 large eggs',
      '3/4 cup caster sugar',
      '1/2 cup all-purpose flour',
      '2 tbsp Dutch-process cocoa powder',
      'Flaky sea salt & vanilla bean ice cream',
    ].join('\n'),
    steps: [
      'Melt chopped dark chocolate and butter together gently until glossy and smooth.',
      'Whisk eggs and sugar for 2 minutes until pale, then fold in warm melted chocolate.',
      'Sift in flour and cocoa powder; fold just until streaks disappear.',
      'Bake in a lined square pan at 175°C for 22 minutes until crackly on top and fudgy inside.',
      'Sprinkle with flaky sea salt and serve warm topped with vanilla bean ice cream.',
    ].join('\n'),
  },
  {
    title: 'Chilled Mango Yogurt Pistachio Parfait',
    categories: ['Dessert', 'Quick', 'Gluten-Free', 'Vegetarian'],
    imageUrl: CULINARY_ASSETS.mangoParfait,
    ingredients: [
      '2 ripe sweet mangoes, cubed',
      '1 cup thick Greek yogurt',
      '2 tbsp honey',
      '1/4 tsp ground cardamom',
      '2 tbsp slivered pistachios',
      'Fresh mint leaves',
    ].join('\n'),
    steps: [
      'Puree half of the ripe mango cubes until smooth; reserve remaining cubes chilled.',
      'Whisk thick yogurt with honey and fragrant ground cardamom.',
      'Layer mango puree, cardamom yogurt, and fresh mango cubes in clear glass tumblers.',
      'Garnish with toasted pistachios and fresh mint before serving.',
    ].join('\n'),
  },
];

function parseProfileDoc(id: string, data: Record<string, unknown>): CustomerProfileRecord {
  const created = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  return {
    id,
    uid: String(data.uid ?? id),
    name: String(data.name ?? 'Customer'),
    email: String(data.email ?? ''),
    role: data.role === 'admin' ? 'admin' : 'customer',
    status: (['active', 'vip', 'suspended', 'archived'].includes(String(data.status))
      ? data.status
      : 'active') as CustomerStatus,
    kitchenType: String(data.kitchenType ?? 'Student Hostel'),
    phone: String(data.phone ?? ''),
    createdAtMs: created,
  };
}

/**
 * Ensures the signed-in Firebase user has a verified document in `/customers/{uid}`.
 * - Master Admin `hamidalideveloper01@gmail.com` is provisioned as Admin Hamid Ali (`role: 'admin'`)
 *   and automatically seeds the Global Recipe Catalog if empty.
 * - Any other user is registered into the Customer Database (`role: 'customer'`) and given
 *   starter recipes on initial registration.
 */
export async function ensureAccountProfile(
  fbUser: User,
  onboarding?: {
    customName?: string;
    kitchenType?: string;
    phone?: string;
  }
): Promise<CustomerProfileRecord> {
  const uid = fbUser.uid;
  const email = (fbUser.email ?? '').trim().toLowerCase();
  const isMasterAdmin = email === MASTER_ADMIN_EMAIL.toLowerCase();
  const customerPath = `customers/${uid}`;
  const customerRef = doc(db, 'customers', uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(customerRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, customerPath);
  }

  if (existingSnap && existingSnap.exists()) {
    const profile = parseProfileDoc(existingSnap.id, existingSnap.data());
    if (isMasterAdmin && profile.role !== 'admin') {
      try {
        await updateDoc(customerRef, {
          name: MASTER_ADMIN_NAME,
          role: 'admin',
          status: 'vip',
          updatedAt: serverTimestamp(),
        });
        profile.role = 'admin';
        profile.name = MASTER_ADMIN_NAME;
        profile.status = 'vip';
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, customerPath);
      }
    }
    return profile;
  }

  const displayName = isMasterAdmin
    ? MASTER_ADMIN_NAME
    : clampString(
        onboarding?.customName || fbUser.displayName || email.split('@')[0] || 'Customer',
        100,
        'Customer'
      );

  const kitchenType = isMasterAdmin
    ? 'Master App Control'
    : clampString(onboarding?.kitchenType || 'Student Hostel', 60, 'Student Hostel');

  const phone = clampString(onboarding?.phone || '', 40, '');

  const newProfileData = {
    uid,
    name: displayName,
    email: clampString(fbUser.email || email, 254, 'customer@example.com'),
    role: isMasterAdmin ? 'admin' : 'customer',
    status: isMasterAdmin ? 'vip' : 'active',
    kitchenType,
    phone,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(customerRef, newProfileData);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, customerPath);
  }

  // Seed initial starter personal recipes for this new user
  await seedStarterUserRecipes(uid, isMasterAdmin ? 9 : 4);

  if (isMasterAdmin) {
    await ensureGlobalCatalogSeeded(uid);
  }

  return {
    id: uid,
    uid,
    name: displayName,
    email: newProfileData.email,
    role: isMasterAdmin ? 'admin' : 'customer',
    status: isMasterAdmin ? 'vip' : 'active',
    kitchenType,
    phone,
    createdAtMs: Date.now(),
  };
}

async function seedStarterUserRecipes(uid: string, count: number): Promise<void> {
  const q = query(collection(db, 'user_recipes'), where('ownerId', '==', uid));
  let snap;
  try {
    snap = await getDocs(q);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'user_recipes');
  }
  if (!snap || !snap.empty) return;

  const batch = writeBatch(db);
  const templates = SIGNATURE_DISH_TEMPLATES.slice(0, count);
  templates.forEach((tpl, idx) => {
    const recId = makeSafeId(`urec_${idx}`);
    const ref = doc(db, 'user_recipes', recId);
    const cats = normalizeCategoryList(tpl.categories, tpl.categories[0]);
    batch.set(ref, {
      ownerId: uid,
      title: clampString(tpl.title, 140),
      category: clampString(cats.join(', '), 240, 'Dinner'),
      categories: cats,
      imageUrl: clampString(tpl.imageUrl, 150000),
      ingredients: clampString(tpl.ingredients, 8000),
      steps: clampString(tpl.steps, 12000),
      isFromApi: false,
      apiMealId: '',
      isFavorite: idx < 2,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'user_recipes');
  }
}

export async function ensureGlobalCatalogSeeded(adminUid: string): Promise<number> {
  let snap;
  try {
    snap = await getDocs(collection(db, 'global_recipes'));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'global_recipes');
  }
  if (snap && !snap.empty) return 0;

  const batch = writeBatch(db);
  SIGNATURE_DISH_TEMPLATES.forEach((tpl, idx) => {
    const id = makeSafeId(`grec_${idx}`);
    const cats = normalizeCategoryList(tpl.categories, tpl.categories[0]);
    batch.set(doc(db, 'global_recipes', id), {
      title: clampString(tpl.title, 140),
      category: clampString(cats.join(', '), 240, 'Dinner'),
      categories: cats,
      imageUrl: clampString(tpl.imageUrl, 150000),
      ingredients: clampString(tpl.ingredients, 8000),
      steps: clampString(tpl.steps, 12000),
      published: true,
      authorId: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'global_recipes');
  }
  return SIGNATURE_DISH_TEMPLATES.length;
}

// --- Real-Time Subscriptions ---

export function subscribeOwnProfile(
  uid: string,
  onData: (profile: CustomerProfileRecord | null) => void
): () => void {
  const path = `customers/${uid}`;
  return onSnapshot(
    doc(db, 'customers', uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(parseProfileDoc(snap.id, snap.data()));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeAllCustomersForAdmin(
  onData: (customers: CustomerProfileRecord[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'customers'),
    (snap) => {
      const list = snap.docs
        .map((d) => parseProfileDoc(d.id, d.data()))
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'customers')
  );
}

export function subscribeGlobalRecipes(
  isAdminUser: boolean,
  onData: (recipes: GlobalRecipeRecord[]) => void
): () => void {
  const ref = isAdminUser
    ? collection(db, 'global_recipes')
    : query(collection(db, 'global_recipes'), where('published', '==', true));

  return onSnapshot(
    ref,
    (snap) => {
      const list: GlobalRecipeRecord[] = snap.docs.map((d) => {
        const data = d.data();
        const cats = parseDocCategories(data.categories, data.category);
        return {
          id: d.id,
          title: String(data.title ?? ''),
          category: cats.join(', '),
          categories: cats,
          imageUrl: String(data.imageUrl ?? ''),
          ingredients: String(data.ingredients ?? ''),
          steps: String(data.steps ?? ''),
          published: Boolean(data.published),
          authorId: String(data.authorId ?? ''),
        };
      });
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'global_recipes')
  );
}

export function subscribeUserRecipes(
  uid: string,
  onData: (recipes: RecipeRecord[]) => void
): () => void {
  const q = query(collection(db, 'user_recipes'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: RecipeRecord[] = snap.docs.map((d) => {
        const data = d.data();
        const cats = parseDocCategories(data.categories, data.category);
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? uid),
          title: String(data.title ?? ''),
          category: cats.join(', '),
          categories: cats,
          image_url: String(data.imageUrl ?? ''),
          ingredients: String(data.ingredients ?? ''),
          steps: String(data.steps ?? ''),
          is_from_api: data.isFromApi ? 1 : 0,
          api_meal_id: String(data.apiMealId ?? ''),
          isFavorite: Boolean(data.isFavorite),
        };
      });
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'user_recipes')
  );
}

export function subscribeUserMealPlan(
  uid: string,
  onData: (slots: MealPlanRecord[]) => void
): () => void {
  const q = query(collection(db, 'meal_plans'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: MealPlanRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? uid),
          recipe_id: String(data.recipeId ?? ''),
          day: String(data.day ?? 'Monday') as DayOfWeek,
          meal_type: String(data.mealType ?? 'Dinner') as MealType,
        };
      });
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'meal_plans')
  );
}

export function subscribeUserGroceries(
  uid: string,
  onData: (items: GroceryItemRecord[]) => void
): () => void {
  const q = query(collection(db, 'grocery_items'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: GroceryItemRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId ?? uid),
          name: String(data.name ?? ''),
          checked: data.checked ? 1 : 0,
        };
      });
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'grocery_items')
  );
}

// --- Customer Own Profile Updates ---

export async function updateOwnCustomerProfile(
  uid: string,
  updates: { name: string; kitchenType: string; phone: string }
): Promise<void> {
  const path = `customers/${uid}`;
  try {
    await updateDoc(doc(db, 'customers', uid), {
      name: clampString(updates.name, 100, 'Customer'),
      kitchenType: clampString(updates.kitchenType, 60, 'Student Hostel'),
      phone: clampString(updates.phone, 40, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Admin Hamid Ali: Customer Database CRUD ---

export async function adminCreateCustomerRecord(payload: {
  name: string;
  email: string;
  kitchenType: string;
  phone: string;
  status: CustomerStatus;
}): Promise<void> {
  const id = makeSafeId('cust');
  const path = `customers/${id}`;
  try {
    await setDoc(doc(db, 'customers', id), {
      uid: id,
      name: clampString(payload.name, 100, 'Customer'),
      email: clampString(payload.email.toLowerCase(), 254, 'customer@example.com'),
      role: 'customer',
      status: payload.status,
      kitchenType: clampString(payload.kitchenType, 60, 'Student Hostel'),
      phone: clampString(payload.phone, 40, ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function adminUpdateCustomerRecord(
  customerId: string,
  updates: {
    name: string;
    email: string;
    kitchenType: string;
    phone: string;
    status: CustomerStatus;
    role: 'admin' | 'customer';
  }
): Promise<void> {
  const path = `customers/${customerId}`;
  try {
    await updateDoc(doc(db, 'customers', customerId), {
      name: clampString(updates.name, 100, 'Customer'),
      email: clampString(updates.email.toLowerCase(), 254),
      kitchenType: clampString(updates.kitchenType, 60, 'Student Hostel'),
      phone: clampString(updates.phone, 40, ''),
      status: updates.status,
      role: updates.role,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function adminDeleteCustomerRecord(customerId: string): Promise<void> {
  const path = `customers/${customerId}`;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Admin Hamid Ali: Global Recipe Catalog CRUD ---

export async function adminCreateGlobalRecipe(
  adminUid: string,
  payload: {
    title: string;
    category: string;
    categories?: string[];
    imageUrl: string;
    ingredients: string;
    steps: string;
    published?: boolean;
  }
): Promise<void> {
  const id = makeSafeId('grec');
  const path = `global_recipes/${id}`;
  const cats = normalizeCategoryList(payload.categories, payload.category);
  try {
    await setDoc(doc(db, 'global_recipes', id), {
      title: clampString(payload.title, 140, 'Untitled Dish'),
      category: clampString(cats.join(', '), 240, 'Dinner'),
      categories: cats,
      imageUrl: clampString(payload.imageUrl, 150000, ''),
      ingredients: clampString(payload.ingredients, 8000, 'Ingredients'),
      steps: clampString(payload.steps, 12000, 'Steps'),
      published: payload.published ?? true,
      authorId: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function adminUpdateGlobalRecipe(
  recipeId: string,
  payload: {
    title: string;
    category: string;
    categories?: string[];
    imageUrl: string;
    ingredients: string;
    steps: string;
    published: boolean;
  }
): Promise<void> {
  const path = `global_recipes/${recipeId}`;
  const cats = normalizeCategoryList(payload.categories, payload.category);
  try {
    await updateDoc(doc(db, 'global_recipes', recipeId), {
      title: clampString(payload.title, 140, 'Untitled Dish'),
      category: clampString(cats.join(', '), 240, 'Dinner'),
      categories: cats,
      imageUrl: clampString(payload.imageUrl, 150000, ''),
      ingredients: clampString(payload.ingredients, 8000, 'Ingredients'),
      steps: clampString(payload.steps, 12000, 'Steps'),
      published: payload.published,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function adminToggleGlobalRecipePublished(
  recipeId: string,
  published: boolean
): Promise<void> {
  const path = `global_recipes/${recipeId}`;
  try {
    await updateDoc(doc(db, 'global_recipes', recipeId), {
      published,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function adminDeleteGlobalRecipe(recipeId: string): Promise<void> {
  const path = `global_recipes/${recipeId}`;
  try {
    await deleteDoc(doc(db, 'global_recipes', recipeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Customer / Personal Recipes CRUD ---

export async function createUserRecipe(
  ownerId: string,
  payload: {
    title: string;
    category: string;
    categories?: string[];
    image_url: string;
    ingredients: string;
    steps: string;
    isFromApi?: boolean;
    apiMealId?: string;
    isFavorite?: boolean;
  }
): Promise<string> {
  const id = makeSafeId('urec');
  const path = `user_recipes/${id}`;
  const cats = normalizeCategoryList(payload.categories, payload.category);
  try {
    await setDoc(doc(db, 'user_recipes', id), {
      ownerId,
      title: clampString(payload.title, 140, 'Untitled Recipe'),
      category: clampString(cats.join(', '), 240, 'Dinner'),
      categories: cats,
      imageUrl: clampString(payload.image_url, 150000, ''),
      ingredients: clampString(payload.ingredients, 8000, 'Ingredients'),
      steps: clampString(payload.steps, 12000, 'Instructions'),
      isFromApi: Boolean(payload.isFromApi),
      apiMealId: clampString(payload.apiMealId ?? '', 128, ''),
      isFavorite: Boolean(payload.isFavorite),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
  return id;
}

export async function saveOnlineRecipeForCustomer(
  ownerId: string,
  online: OnlineMealRecipe,
  existingRecipes: RecipeRecord[]
): Promise<string> {
  const existing = existingRecipes.find((r) => r.api_meal_id === online.apiId);
  if (existing) return existing.id;
  const cats = normalizeCategoryList(
    online.area ? [online.category || 'Dinner', online.area] : [online.category || 'Dinner']
  );
  return createUserRecipe(ownerId, {
    title: online.title,
    category: cats.join(', '),
    categories: cats,
    image_url: online.image_url,
    ingredients: online.ingredients,
    steps: online.steps,
    isFromApi: true,
    apiMealId: online.apiId,
    isFavorite: false,
  });
}

export async function updateUserRecipeDoc(
  recipeId: string,
  currentFavorite: boolean,
  updates: {
    title: string;
    category: string;
    categories?: string[];
    image_url: string;
    ingredients: string;
    steps: string;
  }
): Promise<void> {
  const path = `user_recipes/${recipeId}`;
  const cats = normalizeCategoryList(updates.categories, updates.category);
  try {
    await updateDoc(doc(db, 'user_recipes', recipeId), {
      title: clampString(updates.title, 140, 'Untitled Recipe'),
      category: clampString(cats.join(', '), 240, 'Dinner'),
      categories: cats,
      imageUrl: clampString(updates.image_url, 150000, ''),
      ingredients: clampString(updates.ingredients, 8000, 'Ingredients'),
      steps: clampString(updates.steps, 12000, 'Instructions'),
      isFavorite: currentFavorite,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleUserRecipeFavorite(
  recipeId: string,
  nextFavorite: boolean
): Promise<void> {
  const path = `user_recipes/${recipeId}`;
  try {
    await updateDoc(doc(db, 'user_recipes', recipeId), {
      isFavorite: nextFavorite,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteUserRecipeDoc(
  recipeId: string,
  mealPlans: MealPlanRecord[]
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'user_recipes', recipeId));
  for (const slot of mealPlans) {
    if (slot.recipe_id === recipeId) {
      batch.delete(doc(db, 'meal_plans', slot.id));
    }
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `user_recipes/${recipeId}`);
  }
}

// --- Meal Plan Slots ---

export async function assignMealPlanSlotDoc(
  ownerId: string,
  day: DayOfWeek,
  mealType: MealType,
  recipeId: string,
  existingSlots: MealPlanRecord[]
): Promise<void> {
  const match = existingSlots.find((s) => s.day === day && s.meal_type === mealType);
  if (match) {
    const path = `meal_plans/${match.id}`;
    try {
      await updateDoc(doc(db, 'meal_plans', match.id), {
        recipeId: clampString(recipeId, 128),
        day,
        mealType,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
    return;
  }

  const id = makeSafeId('mplan');
  const path = `meal_plans/${id}`;
  try {
    await setDoc(doc(db, 'meal_plans', id), {
      ownerId,
      recipeId: clampString(recipeId, 128),
      day,
      mealType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function removeMealPlanSlotDoc(slotId: string): Promise<void> {
  const path = `meal_plans/${slotId}`;
  try {
    await deleteDoc(doc(db, 'meal_plans', slotId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearAllMealPlanSlots(slots: MealPlanRecord[]): Promise<void> {
  if (slots.length === 0) return;
  const batch = writeBatch(db);
  for (const s of slots) {
    batch.delete(doc(db, 'meal_plans', s.id));
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'meal_plans');
  }
}

// --- Grocery Checklist Operations ---

export async function addGroceryItemDoc(
  ownerId: string,
  name: string,
  existingItems: GroceryItemRecord[]
): Promise<boolean> {
  const cleaned = clampString(name, 200, '');
  if (!cleaned) return false;

  const existing = existingItems.find(
    (g) => g.name.toLowerCase() === cleaned.toLowerCase()
  );
  if (existing) {
    if (existing.checked === 1) {
      await toggleGroceryItemDoc(existing.id, false);
    }
    return false;
  }

  const id = makeSafeId('groc');
  const path = `grocery_items/${id}`;
  try {
    await setDoc(doc(db, 'grocery_items', id), {
      ownerId,
      name: cleaned,
      checked: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
  return true;
}

export async function addMultipleGroceryItemsBatch(
  ownerId: string,
  names: string[],
  existingItems: GroceryItemRecord[]
): Promise<number> {
  const existingSet = new Set(existingItems.map((i) => i.name.toLowerCase()));
  const batch = writeBatch(db);
  let added = 0;

  for (const rawName of names) {
    const cleaned = clampString(rawName, 200, '');
    if (!cleaned) continue;
    const lower = cleaned.toLowerCase();
    if (existingSet.has(lower)) continue;
    existingSet.add(lower);

    const id = makeSafeId(`groc_${added}`);
    batch.set(doc(db, 'grocery_items', id), {
      ownerId,
      name: cleaned,
      checked: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    added += 1;
  }

  if (added > 0) {
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'grocery_items');
    }
  }
  return added;
}

export async function toggleGroceryItemDoc(
  itemId: string,
  nextChecked: boolean
): Promise<void> {
  const path = `grocery_items/${itemId}`;
  try {
    await updateDoc(doc(db, 'grocery_items', itemId), {
      checked: nextChecked,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteGroceryItemDoc(itemId: string): Promise<void> {
  const path = `grocery_items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'grocery_items', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearCheckedGroceriesBatch(
  items: GroceryItemRecord[]
): Promise<void> {
  const bought = items.filter((i) => i.checked === 1);
  if (bought.length === 0) return;
  const batch = writeBatch(db);
  for (const item of bought) {
    batch.delete(doc(db, 'grocery_items', item.id));
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'grocery_items');
  }
}

export async function syncGroceriesFromMealPlanBatch(
  ownerId: string,
  mealPlan: MealPlanRecord[],
  allAvailableRecipes: RecipeRecord[],
  existingGroceries: GroceryItemRecord[]
): Promise<{ addedCount: number; totalMeals: number }> {
  if (mealPlan.length === 0) return { addedCount: 0, totalMeals: 0 };

  const recipeMap = new Map<string, RecipeRecord>();
  for (const r of allAvailableRecipes) recipeMap.set(r.id, r);

  const tally = new Map<string, { display: string; count: number }>();

  for (const slot of mealPlan) {
    const rec = recipeMap.get(slot.recipe_id);
    if (!rec) continue;
    const lines = rec.ingredients
      .split(/\r?\n|,/)
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l) => l.length > 1);

    for (const line of lines) {
      const key = line.toLowerCase();
      const prev = tally.get(key);
      if (prev) prev.count += 1;
      else tally.set(key, { display: line, count: 1 });
    }
  }

  const batch = writeBatch(db);
  let addedCount = 0;

  for (const [, { display, count }] of tally) {
    const rawLabel = count > 1 ? `${display} (×${count} meals)` : display;
    const label = clampString(rawLabel, 200);
    const baseLower = display.toLowerCase();

    const match = existingGroceries.find((g) => {
      const cleanExisting = g.name.replace(/\s*\(×\d+\s*meals\)$/i, '').toLowerCase();
      return cleanExisting === baseLower;
    });

    if (match) {
      if (match.name !== label) {
        batch.update(doc(db, 'grocery_items', match.id), {
          name: label,
          checked: match.checked === 1,
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      const id = makeSafeId(`groc_${addedCount}`);
      batch.set(doc(db, 'grocery_items', id), {
        ownerId,
        name: label,
        checked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      addedCount += 1;
    }
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'grocery_items');
  }

  return { addedCount, totalMeals: mealPlan.length };
}
