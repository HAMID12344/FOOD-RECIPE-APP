const String kAppBrandName = 'Hamid & Hassan Kitchen';
const String kMasterAdminName = 'Hamid Ali';
const String kMasterAdminEmail = 'hamidalideveloper01@gmail.com';

const List<String> kDaysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const List<String> kMealTypes = [
  'Breakfast',
  'Lunch',
  'Dinner',
];

const List<String> kRecipeCategories = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Quick',
  'Gluten-Free',
  'High-Protein',
  'Vegetarian',
  'Dairy-Free',
  'Meal Prep',
  'Chicken',
  'Beef',
  'Pasta',
  'Seafood',
  'Dessert',
  'Quick Hostel',
];

const List<String> kKitchenSegments = [
  'Student Hostel',
  'Family Kitchen',
  'Busy Professional',
  'Shared Apartment',
];

/// Normalizes and deduplicates recipe category labels (1..10 items, max 40 chars each)
/// matching firestore.rules bounds.
List<String> normalizeCategoryList(
  List<String>? rawList, [
  String fallbackCategory = 'Dinner',
]) {
  final List<String> candidates = [];
  if (rawList != null && rawList.isNotEmpty) {
    for (final item in rawList) {
      for (final part in item.split(',')) {
        final cleaned = part.trim();
        if (cleaned.isNotEmpty) {
          candidates.add(
            cleaned.length > 40 ? cleaned.substring(0, 40) : cleaned,
          );
        }
      }
    }
  } else if (fallbackCategory.isNotEmpty) {
    for (final part in fallbackCategory.split(',')) {
      final cleaned = part.trim();
      if (cleaned.isNotEmpty) {
        candidates.add(
          cleaned.length > 40 ? cleaned.substring(0, 40) : cleaned,
        );
      }
    }
  }

  final Set<String> seen = {};
  final List<String> unique = [];
  for (final label in candidates) {
    final key = label.toLowerCase();
    if (!seen.contains(key)) {
      seen.add(key);
      unique.add(label);
      if (unique.length == 10) break;
    }
  }

  return unique.isNotEmpty ? unique : ['Dinner'];
}

class CustomerProfile {
  final String id;
  final String uid;
  final String name;
  final String email;
  final String role; // 'admin' | 'customer'
  final String status; // 'active' | 'vip' | 'suspended' | 'archived'
  final String kitchenType;
  final String phone;
  final int createdAtMs;

  const CustomerProfile({
    required this.id,
    required this.uid,
    required this.name,
    required this.email,
    required this.role,
    required this.status,
    required this.kitchenType,
    required this.phone,
    required this.createdAtMs,
  });

  bool get isAdmin => role == 'admin';

  factory CustomerProfile.fromMap(String id, Map<String, dynamic> data) {
    return CustomerProfile(
      id: id,
      uid: (data['uid'] as String?) ?? id,
      name: (data['name'] as String?) ?? 'Kitchen Member',
      email: (data['email'] as String?) ?? '',
      role: data['role'] == 'admin' ? 'admin' : 'customer',
      status: (data['status'] as String?) ?? 'active',
      kitchenType: (data['kitchenType'] as String?) ?? kKitchenSegments.first,
      phone: (data['phone'] as String?) ?? '',
      createdAtMs: (data['createdAtMs'] as num?)?.toInt() ??
          DateTime.now().millisecondsSinceEpoch,
    );
  }

  Map<String, dynamic> toMap() => {
        'uid': uid,
        'name': name,
        'email': email,
        'role': role,
        'status': status,
        'kitchenType': kitchenType,
        'phone': phone,
        'createdAtMs': createdAtMs,
      };
}

class RecipeItem {
  final String id;
  final String ownerId;
  final String title;
  final String category;
  final List<String> categories;
  final String imageUrl;
  final String ingredients;
  final String steps;
  final bool isFromApi;
  final String apiMealId;
  final bool isGlobalCatalog;
  final bool published;

  const RecipeItem({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.category,
    required this.categories,
    required this.imageUrl,
    required this.ingredients,
    required this.steps,
    this.isFromApi = false,
    this.apiMealId = '',
    this.isGlobalCatalog = false,
    this.published = true,
  });

  factory RecipeItem.fromPersonalDoc(String id, Map<String, dynamic> data) {
    final rawCats = (data['categories'] as List<dynamic>?)
        ?.map((e) => e.toString())
        .toList();
    final fallback = (data['category'] as String?) ?? 'Dinner';
    final normalized = normalizeCategoryList(rawCats, fallback);
    return RecipeItem(
      id: id,
      ownerId: (data['ownerId'] as String?) ?? '',
      title: (data['title'] as String?) ?? 'Untitled Dish',
      category: normalized.join(', '),
      categories: normalized,
      imageUrl: (data['imageUrl'] as String?) ?? '',
      ingredients: (data['ingredients'] as String?) ?? '',
      steps: (data['steps'] as String?) ?? '',
      isFromApi: data['isFromApi'] == true,
      apiMealId: (data['apiMealId'] as String?) ?? '',
      isGlobalCatalog: false,
    );
  }

  factory RecipeItem.fromGlobalDoc(String id, Map<String, dynamic> data) {
    final rawCats = (data['categories'] as List<dynamic>?)
        ?.map((e) => e.toString())
        .toList();
    final fallback = (data['category'] as String?) ?? 'Dinner';
    final normalized = normalizeCategoryList(rawCats, fallback);
    return RecipeItem(
      id: 'global_$id',
      ownerId: (data['authorId'] as String?) ?? 'admin',
      title: (data['title'] as String?) ?? 'Featured Dish',
      category: normalized.join(', '),
      categories: normalized,
      imageUrl: (data['imageUrl'] as String?) ?? '',
      ingredients: (data['ingredients'] as String?) ?? '',
      steps: (data['steps'] as String?) ?? '',
      isGlobalCatalog: true,
      published: data['published'] != false,
    );
  }
}

class MealPlanSlot {
  final String id;
  final String ownerId;
  final String recipeId;
  final String day;
  final String mealType;

  const MealPlanSlot({
    required this.id,
    required this.ownerId,
    required this.recipeId,
    required this.day,
    required this.mealType,
  });

  factory MealPlanSlot.fromMap(String id, Map<String, dynamic> data) {
    return MealPlanSlot(
      id: id,
      ownerId: (data['ownerId'] as String?) ?? '',
      recipeId: (data['recipeId'] as String?) ?? '',
      day: (data['day'] as String?) ?? 'Monday',
      mealType: (data['mealType'] as String?) ?? 'Dinner',
    );
  }
}

class GroceryItem {
  final String id;
  final String ownerId;
  final String name;
  final bool checked;

  const GroceryItem({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.checked,
  });

  factory GroceryItem.fromMap(String id, Map<String, dynamic> data) {
    return GroceryItem(
      id: id,
      ownerId: (data['ownerId'] as String?) ?? '',
      name: (data['name'] as String?) ?? '',
      checked: data['checked'] == true,
    );
  }
}

class OnlineMealRecipe {
  final String apiId;
  final String title;
  final String category;
  final String area;
  final String imageUrl;
  final String ingredients;
  final String steps;

  const OnlineMealRecipe({
    required this.apiId,
    required this.title,
    required this.category,
    required this.area,
    required this.imageUrl,
    required this.ingredients,
    required this.steps,
  });

  Map<String, dynamic> toJson() => {
        'apiId': apiId,
        'title': title,
        'category': category,
        'area': area,
        'imageUrl': imageUrl,
        'ingredients': ingredients,
        'steps': steps,
      };

  factory OnlineMealRecipe.fromJson(Map<String, dynamic> json) {
    return OnlineMealRecipe(
      apiId: (json['apiId'] as String?) ?? '',
      title: (json['title'] as String?) ?? '',
      category: (json['category'] as String?) ?? 'Dinner',
      area: (json['area'] as String?) ?? '',
      imageUrl: (json['imageUrl'] as String?) ?? '',
      ingredients: (json['ingredients'] as String?) ?? '',
      steps: (json['steps'] as String?) ?? '',
    );
  }
}
