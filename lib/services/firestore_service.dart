import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import '../firebase_options.dart';
import '../models/kitchen_models.dart';

class KitchenFirestoreService {
  KitchenFirestoreService._();
  static final KitchenFirestoreService instance = KitchenFirestoreService._();

  FirebaseFirestore get _db => FirebaseFirestore.instanceFor(
        app: Firebase.app(),
        databaseId: kFirestoreDatabaseId,
      );

  bool isMasterAdminEmail(String? email) =>
      (email ?? '').trim().toLowerCase() == kMasterAdminEmail.toLowerCase();

  /// Bootstraps or updates the signed-in customer/admin profile in `/customers/{uid}`
  Future<CustomerProfile> ensureCustomerProfile(
    User user, {
    String? customName,
    String? kitchenType,
    String? phone,
  }) async {
    final docRef = _db.collection('customers').doc(user.uid);
    final snap = await docRef.get();
    final email = (user.email ?? '').trim().toLowerCase();
    final isAdmin = isMasterAdminEmail(email);

    if (snap.exists && snap.data() != null) {
      final existing = CustomerProfile.fromMap(snap.id, snap.data()!);
      if (isAdmin && existing.role != 'admin') {
        await docRef.update({
          'role': 'admin',
          'name': kMasterAdminName,
        });
        return CustomerProfile(
          id: existing.id,
          uid: existing.uid,
          name: kMasterAdminName,
          email: existing.email,
          role: 'admin',
          status: existing.status,
          kitchenType: 'Master App Control',
          phone: existing.phone,
          createdAtMs: existing.createdAtMs,
        );
      }
      return existing;
    }

    final resolvedName = isAdmin
        ? kMasterAdminName
        : ((customName != null && customName.trim().isNotEmpty)
            ? customName.trim()
            : (user.displayName ?? email.split('@').first));

    final created = CustomerProfile(
      id: user.uid,
      uid: user.uid,
      name: resolvedName,
      email: email,
      role: isAdmin ? 'admin' : 'customer',
      status: 'active',
      kitchenType: isAdmin
          ? 'Master App Control'
          : (kitchenType ?? kKitchenSegments.first),
      phone: phone?.trim() ?? '',
      createdAtMs: DateTime.now().millisecondsSinceEpoch,
    );

    await docRef.set(created.toMap());
    return created;
  }

  Stream<CustomerProfile?> watchCustomerProfile(String uid) {
    return _db.collection('customers').doc(uid).snapshots().map((snap) {
      if (!snap.exists || snap.data() == null) return null;
      return CustomerProfile.fromMap(snap.id, snap.data()!);
    });
  }

  Future<void> updateOwnProfile(
    String uid, {
    required String name,
    required String kitchenType,
    required String phone,
  }) async {
    await _db.collection('customers').doc(uid).update({
      'name': name.trim(),
      'kitchenType': kitchenType.trim(),
      'phone': phone.trim(),
    });
  }

  // --- Master Admin: Customer Database (/customers) ---
  Stream<List<CustomerProfile>> watchAllCustomers() {
    return _db.collection('customers').snapshots().map((snap) {
      final list = snap.docs
          .map((d) => CustomerProfile.fromMap(d.id, d.data()))
          .toList();
      list.sort((a, b) => b.createdAtMs.compareTo(a.createdAtMs));
      return list;
    });
  }

  Future<void> adminSaveCustomer({
    String? docId,
    required String name,
    required String email,
    required String role,
    required String status,
    required String kitchenType,
    required String phone,
  }) async {
    final ref = docId != null
        ? _db.collection('customers').doc(docId)
        : _db.collection('customers').doc();
    await ref.set(
      {
        'uid': ref.id,
        'name': name.trim(),
        'email': email.trim().toLowerCase(),
        'role': role == 'admin' ? 'admin' : 'customer',
        'status': status,
        'kitchenType': kitchenType.trim(),
        'phone': phone.trim(),
        'createdAtMs': DateTime.now().millisecondsSinceEpoch,
      },
      SetOptions(merge: true),
    );
  }

  Future<void> adminDeleteCustomer(String docId) async {
    await _db.collection('customers').doc(docId).delete();
  }

  // --- Global App Recipes (/global_recipes) ---
  Stream<List<RecipeItem>> watchGlobalRecipes({bool includeDrafts = false}) {
    return _db.collection('global_recipes').snapshots().map((snap) {
      return snap.docs
          .map((d) => RecipeItem.fromGlobalDoc(d.id, d.data()))
          .where((r) => includeDrafts || r.published)
          .toList();
    });
  }

  Future<void> adminSaveGlobalRecipe({
    String? rawGlobalId,
    required String adminUid,
    required String title,
    required List<String> categories,
    required String imageUrl,
    required String ingredients,
    required String steps,
    bool published = true,
  }) async {
    final normalized = normalizeCategoryList(categories);
    final cleanId = rawGlobalId?.replaceFirst('global_', '');
    final ref = cleanId != null
        ? _db.collection('global_recipes').doc(cleanId)
        : _db.collection('global_recipes').doc();

    await ref.set({
      'title': title.trim(),
      'category': normalized.join(', '),
      'categories': normalized,
      'imageUrl': imageUrl.trim(),
      'ingredients': ingredients.trim(),
      'steps': steps.trim(),
      'published': published,
      'authorId': adminUid,
    });
  }

  Future<void> adminDeleteGlobalRecipe(String globalId) async {
    final cleanId = globalId.replaceFirst('global_', '');
    await _db.collection('global_recipes').doc(cleanId).delete();
  }

  // --- Personal Recipes (/users/{uid}/recipes) ---
  Stream<List<RecipeItem>> watchPersonalRecipes(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .collection('recipes')
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => RecipeItem.fromPersonalDoc(d.id, d.data()))
            .toList());
  }

  Future<String> savePersonalRecipe({
    required String uid,
    String? recipeId,
    required String title,
    required List<String> categories,
    required String imageUrl,
    required String ingredients,
    required String steps,
    bool isFromApi = false,
    String apiMealId = '',
  }) async {
    final normalized = normalizeCategoryList(categories);
    final col = _db.collection('users').doc(uid).collection('recipes');
    final ref = recipeId != null ? col.doc(recipeId) : col.doc();
    await ref.set({
      'ownerId': uid,
      'title': title.trim(),
      'category': normalized.join(', '),
      'categories': normalized,
      'imageUrl': imageUrl.trim(),
      'ingredients': ingredients.trim(),
      'steps': steps.trim(),
      'isFromApi': isFromApi,
      'apiMealId': apiMealId,
    });
    return ref.id;
  }

  Future<void> deletePersonalRecipe(String uid, String recipeId) async {
    await _db
        .collection('users')
        .doc(uid)
        .collection('recipes')
        .doc(recipeId)
        .delete();
  }

  // --- Favorites (/users/{uid}/favorites) ---
  Stream<Set<String>> watchFavoriteIds(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .collection('favorites')
        .snapshots()
        .map((snap) => snap.docs.map((d) => d.id).toSet());
  }

  Future<void> toggleFavorite(
    String uid,
    String recipeId,
    bool currentlyFavorite,
  ) async {
    final ref = _db
        .collection('users')
        .doc(uid)
        .collection('favorites')
        .doc(recipeId);
    if (currentlyFavorite) {
      await ref.delete();
    } else {
      await ref.set({
        'ownerId': uid,
        'recipeId': recipeId,
      });
    }
  }

  // --- Weekly Meal Plan (/users/{uid}/meal_plan) ---
  Stream<List<MealPlanSlot>> watchMealPlan(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .collection('meal_plan')
        .snapshots()
        .map((snap) =>
            snap.docs.map((d) => MealPlanSlot.fromMap(d.id, d.data())).toList());
  }

  Future<void> assignMealSlot({
    required String uid,
    required String day,
    required String mealType,
    required String recipeId,
  }) async {
    final slotId = '${day}_$mealType';
    await _db
        .collection('users')
        .doc(uid)
        .collection('meal_plan')
        .doc(slotId)
        .set({
      'ownerId': uid,
      'day': day,
      'mealType': mealType,
      'recipeId': recipeId,
    });
  }

  Future<void> removeMealSlot(String uid, String slotId) async {
    await _db
        .collection('users')
        .doc(uid)
        .collection('meal_plan')
        .doc(slotId)
        .delete();
  }

  Future<void> clearWeekMealPlan(String uid, List<MealPlanSlot> slots) async {
    final batch = _db.batch();
    for (final slot in slots) {
      batch.delete(
        _db.collection('users').doc(uid).collection('meal_plan').doc(slot.id),
      );
    }
    await batch.commit();
  }

  // --- Grocery Checklist (/users/{uid}/grocery_list) ---
  Stream<List<GroceryItem>> watchGroceries(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .collection('grocery_list')
        .snapshots()
        .map((snap) =>
            snap.docs.map((d) => GroceryItem.fromMap(d.id, d.data())).toList());
  }

  Future<int> addGroceryItemsBatch(
    String uid,
    List<String> rawNames,
    List<GroceryItem> existing,
  ) async {
    final existingLower =
        existing.map((e) => e.name.trim().toLowerCase()).toSet();
    final batch = _db.batch();
    int added = 0;

    for (final raw in rawNames) {
      final cleaned = raw.trim();
      if (cleaned.isEmpty) continue;
      if (existingLower.contains(cleaned.toLowerCase())) continue;
      existingLower.add(cleaned.toLowerCase());
      final ref =
          _db.collection('users').doc(uid).collection('grocery_list').doc();
      batch.set(ref, {
        'ownerId': uid,
        'name': cleaned.length > 200 ? cleaned.substring(0, 200) : cleaned,
        'checked': false,
      });
      added++;
    }

    if (added > 0) {
      await batch.commit();
    }
    return added;
  }

  Future<void> toggleGroceryChecked(
    String uid,
    String itemId,
    bool nextChecked,
  ) async {
    await _db
        .collection('users')
        .doc(uid)
        .collection('grocery_list')
        .doc(itemId)
        .update({'checked': nextChecked});
  }

  Future<void> deleteGroceryItem(String uid, String itemId) async {
    await _db
        .collection('users')
        .doc(uid)
        .collection('grocery_list')
        .doc(itemId)
        .delete();
  }

  Future<void> clearBoughtGroceries(
    String uid,
    List<GroceryItem> items,
  ) async {
    final batch = _db.batch();
    for (final item in items.where((i) => i.checked)) {
      batch.delete(
        _db
            .collection('users')
            .doc(uid)
            .collection('grocery_list')
            .doc(item.id),
      );
    }
    await batch.commit();
  }
}
