/**
 * Adversarial Security Rules Specification Tests ("Dirty Dozen" Verification Suite)
 * Validates that all 12 privilege-escalation, PII-leak, shadow-field, and spoofing payloads
 * return PERMISSION_DENIED against firestore.rules.
 */

export interface DirtyPayloadCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyPayloadCase[] = [
  {
    id: 1,
    name: 'Customer self-assigns admin role on signup',
    collection: 'customers',
    docId: 'cust_1',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'ali@example.com', email_verified: true },
    payload: {
      uid: 'cust_1',
      name: 'Ali',
      email: 'ali@example.com',
      role: 'admin',
      status: 'active',
      kitchenType: 'Student Hostel',
      phone: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified admin email spoof attempts customer list',
    collection: 'customers',
    docId: '*',
    operation: 'list',
    auth: { uid: 'spoof_1', email: 'hamidalideveloper01@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Non-owner customer attempts PII get on another customer',
    collection: 'customers',
    docId: 'cust_1',
    operation: 'get',
    auth: { uid: 'cust_2', email: 'other@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Regular customer attempts to list entire Customer Database',
    collection: 'customers',
    docId: '*',
    operation: 'list',
    auth: { uid: 'cust_1', email: 'ali@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow ghost field injection on customer profile update',
    collection: 'customers',
    docId: 'cust_1',
    operation: 'update',
    auth: { uid: 'cust_1', email: 'ali@example.com', email_verified: true },
    payload: { isSuperUser: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Archived customer attempts profile update after terminal lock',
    collection: 'customers',
    docId: 'cust_archived',
    operation: 'update',
    auth: { uid: 'cust_archived', email: 'old@example.com', email_verified: true },
    payload: { name: 'Reactivated' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned user_recipes create without parent customer record',
    collection: 'user_recipes',
    docId: 'rec_orphan',
    operation: 'create',
    auth: { uid: 'no_profile_uid', email: 'ghost@example.com', email_verified: true },
    payload: { ownerId: 'no_profile_uid', title: 'Test' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Suspended customer attempts grocery_items creation',
    collection: 'grocery_items',
    docId: 'groc_1',
    operation: 'create',
    auth: { uid: 'cust_suspended', email: 'susp@example.com', email_verified: true },
    payload: { ownerId: 'cust_suspended', name: 'Milk', checked: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Identity spoofing ownerId on user_recipes creation',
    collection: 'user_recipes',
    docId: 'rec_spoof',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'ali@example.com', email_verified: true },
    payload: { ownerId: 'cust_2', title: 'Spoofed' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Forged past client timestamp on meal_plans creation',
    collection: 'meal_plans',
    docId: 'plan_1',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'ali@example.com', email_verified: true },
    payload: {
      ownerId: 'cust_1',
      recipeId: 'rec_1',
      day: 'Monday',
      mealType: 'Dinner',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'ID poisoning with invalid characters',
    collection: 'grocery_items',
    docId: 'bad$id!@#',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'ali@example.com', email_verified: true },
    payload: { ownerId: 'cust_1', name: 'Eggs', checked: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Customer attempts unauthorized write to global_recipes',
    collection: 'global_recipes',
    docId: 'global_1',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'ali@example.com', email_verified: true },
    payload: { title: 'Hacked Dish', published: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 13,
    name: 'Customer injects unbounded (>10) or non-string categories array on user_recipes',
    collection: 'user_recipes',
    docId: 'rec_bad_tags',
    operation: 'create',
    auth: { uid: 'cust_1', email: 'ali@example.com', email_verified: true },
    payload: {
      ownerId: 'cust_1',
      title: 'Overloaded Tags',
      category: 'Quick',
      categories: Array.from({ length: 15 }, (_, i) => `Tag_${i}`),
    },
    expected: 'PERMISSION_DENIED',
  },
];
