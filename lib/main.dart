import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'firebase_options.dart';
import 'models/kitchen_models.dart';
import 'screens/admin_control_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/grocery_list_screen.dart';
import 'screens/meal_planner_screen.dart';
import 'screens/online_recipes_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/recipes_home_screen.dart';
import 'services/firestore_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const HamidHassanKitchenApp());
}

class HamidHassanKitchenApp extends StatelessWidget {
  const HamidHassanKitchenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '$kAppBrandName – Recipe & Meal Planner',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF006B58),
        brightness: Brightness.light,
      ),
      home: StreamBuilder<User?>(
        stream: FirebaseAuth.instance.authStateChanges(),
        builder: (context, authSnap) {
          if (authSnap.connectionState == ConnectionState.waiting) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          final user = authSnap.data;
          if (user == null) {
            return const AuthScreen();
          }
          return KitchenShell(user: user);
        },
      ),
    );
  }
}

class KitchenShell extends StatefulWidget {
  final User user;

  const KitchenShell({super.key, required this.user});

  @override
  State<KitchenShell> createState() => _KitchenShellState();
}

class _KitchenShellState extends State<KitchenShell> {
  // Profile comes FIRST (index 0)
  int _selectedIndex = 0;

  CustomerProfile? _profile;
  List<RecipeItem> _personalRecipes = [];
  List<RecipeItem> _globalRecipes = [];
  List<CustomerProfile> _allCustomers = [];
  Set<String> _favoriteIds = {};
  List<MealPlanSlot> _mealPlan = [];
  List<GroceryItem> _groceries = [];

  final List<StreamSubscription<dynamic>> _subs = [];

  @override
  void initState() {
    super.initState();
    _bootstrapStreams();
  }

  Future<void> _bootstrapStreams() async {
    final ensured = await KitchenFirestoreService.instance
        .ensureCustomerProfile(widget.user);
    if (!mounted) return;
    setState(() => _profile = ensured);

    final uid = widget.user.uid;
    final svc = KitchenFirestoreService.instance;

    _subs.add(svc.watchCustomerProfile(uid).listen((p) {
      if (mounted && p != null) setState(() => _profile = p);
    }));
    _subs.add(svc
        .watchGlobalRecipes(includeDrafts: ensured.isAdmin)
        .listen((list) {
      if (mounted) setState(() => _globalRecipes = list);
    }));
    _subs.add(svc.watchPersonalRecipes(uid).listen((list) {
      if (mounted) setState(() => _personalRecipes = list);
    }));
    _subs.add(svc.watchFavoriteIds(uid).listen((ids) {
      if (mounted) setState(() => _favoriteIds = ids);
    }));
    _subs.add(svc.watchMealPlan(uid).listen((slots) {
      if (mounted) setState(() => _mealPlan = slots);
    }));
    _subs.add(svc.watchGroceries(uid).listen((items) {
      if (mounted) setState(() => _groceries = items);
    }));

    if (ensured.isAdmin) {
      _subs.add(svc.watchAllCustomers().listen((customers) {
        if (mounted) setState(() => _allCustomers = customers);
      }));
    }
  }

  @override
  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }

  Future<void> _syncMealPlanToGroceries() async {
    final combined = [..._globalRecipes, ..._personalRecipes];
    final byId = {for (final r in combined) r.id: r};
    final List<String> ingredients = [];
    for (final slot in _mealPlan) {
      final r = byId[slot.recipeId];
      if (r != null) {
        ingredients.addAll(
          r.ingredients
              .split(RegExp(r'\r?\n|,'))
              .map((s) => s.trim())
              .where((s) => s.length > 1),
        );
      }
    }
    final added = await KitchenFirestoreService.instance.addGroceryItemsBatch(
      widget.user.uid,
      ingredients,
      _groceries,
    );
    if (mounted) {
      setState(() => _selectedIndex = 4);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Synced $added grocery items from meal plan.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    if (profile == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final isAdmin = profile.isAdmin;
    final combined = [..._globalRecipes, ..._personalRecipes];
    final savedApiIds = _personalRecipes
        .where((r) => r.isFromApi && r.apiMealId.isNotEmpty)
        .map((r) => r.apiMealId)
        .toSet();
    final pendingGroceries = _groceries.where((g) => !g.checked).length;

    final screens = <Widget>[
      ProfileScreen(
        profile: profile,
        recipesCount: _personalRecipes.length,
        favoritesCount: _favoriteIds.length,
        plannedCount: _mealPlan.length,
        pendingGroceriesCount: pendingGroceries,
        totalCustomersCount: _allCustomers.length,
        globalRecipesCount: _globalRecipes.length,
        onNavigateIndex: (i) => setState(() => _selectedIndex = i),
        onSignOut: () => FirebaseAuth.instance.signOut(),
      ),
      if (isAdmin)
        AdminControlScreen(
          adminUid: profile.uid,
          customers: _allCustomers,
          globalRecipes: _globalRecipes,
        )
      else
        RecipesHomeScreen(
          uid: profile.uid,
          combinedRecipes: combined,
          favoriteIds: _favoriteIds,
          mealPlan: _mealPlan,
          onSyncGroceries: _syncMealPlanToGroceries,
        ),
      if (isAdmin)
        RecipesHomeScreen(
          uid: profile.uid,
          combinedRecipes: combined,
          favoriteIds: _favoriteIds,
          mealPlan: _mealPlan,
          onSyncGroceries: _syncMealPlanToGroceries,
        )
      else
        OnlineRecipesScreen(
          uid: profile.uid,
          savedApiIds: savedApiIds,
        ),
      MealPlannerScreen(
        uid: profile.uid,
        recipes: combined,
        mealPlan: _mealPlan,
        onGenerateGroceryList: _syncMealPlanToGroceries,
      ),
      GroceryListScreen(
        uid: profile.uid,
        items: _groceries,
        plannedMealsCount: _mealPlan.length,
        onSyncFromMealPlan: _syncMealPlanToGroceries,
      ),
    ];

    final destinations = <NavigationDestination>[
      const NavigationDestination(
        icon: Icon(Icons.person_outline_rounded),
        selectedIcon: Icon(Icons.person_rounded),
        label: 'Profile',
      ),
      if (isAdmin)
        const NavigationDestination(
          icon: Icon(Icons.verified_user_outlined),
          selectedIcon: Icon(Icons.verified_user_rounded),
          label: 'Admin DB',
        )
      else
        const NavigationDestination(
          icon: Icon(Icons.menu_book_outlined),
          selectedIcon: Icon(Icons.menu_book_rounded),
          label: 'Recipes',
        ),
      if (isAdmin)
        const NavigationDestination(
          icon: Icon(Icons.menu_book_outlined),
          selectedIcon: Icon(Icons.menu_book_rounded),
          label: 'Recipes',
        )
      else
        const NavigationDestination(
          icon: Icon(Icons.explore_outlined),
          selectedIcon: Icon(Icons.explore_rounded),
          label: 'Online',
        ),
      const NavigationDestination(
        icon: Icon(Icons.calendar_month_outlined),
        selectedIcon: Icon(Icons.calendar_month_rounded),
        label: 'Planner',
      ),
      const NavigationDestination(
        icon: Icon(Icons.shopping_bag_outlined),
        selectedIcon: Icon(Icons.shopping_bag_rounded),
        label: 'Groceries',
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          kAppBrandName,
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilledButton.icon(
              onPressed: () =>
                  showRecipeFormModal(context, uid: profile.uid),
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Add Recipe'),
            ),
          ),
        ],
      ),
      body: screens[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) => setState(() => _selectedIndex = i),
        destinations: destinations,
      ),
    );
  }
}
