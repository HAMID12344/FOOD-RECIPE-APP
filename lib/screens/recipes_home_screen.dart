import 'package:flutter/material.dart';

import '../models/kitchen_models.dart';
import '../services/firestore_service.dart';

class RecipesHomeScreen extends StatefulWidget {
  final String uid;
  final List<RecipeItem> combinedRecipes;
  final Set<String> favoriteIds;
  final List<MealPlanSlot> mealPlan;
  final VoidCallback onSyncGroceries;

  const RecipesHomeScreen({
    super.key,
    required this.uid,
    required this.combinedRecipes,
    required this.favoriteIds,
    required this.mealPlan,
    required this.onSyncGroceries,
  });

  @override
  State<RecipesHomeScreen> createState() => _RecipesHomeScreenState();
}

class _RecipesHomeScreenState extends State<RecipesHomeScreen> {
  String _searchQuery = '';
  String _sourceFilter = 'all'; // all | featured | personal | api | favorites
  final Set<String> _selectedCategories = {};
  bool _matchAllLabels = true;

  List<String> get _availableCategories {
    final Set<String> seen = {};
    final List<String> list = ['All'];
    for (final preset in kRecipeCategories) {
      seen.add(preset.toLowerCase());
      list.add(preset);
    }
    for (final rec in widget.combinedRecipes) {
      for (final tag in rec.categories) {
        if (!seen.contains(tag.toLowerCase())) {
          seen.add(tag.toLowerCase());
          list.add(tag);
        }
      }
    }
    return list;
  }

  List<RecipeItem> get _filteredRecipes {
    return widget.combinedRecipes.where((r) {
      if (_selectedCategories.isNotEmpty) {
        final lowerTags = r.categories.map((e) => e.toLowerCase()).toSet();
        final matches = _matchAllLabels
            ? _selectedCategories.every((f) => lowerTags.contains(f.toLowerCase()))
            : _selectedCategories.any((f) => lowerTags.contains(f.toLowerCase()));
        if (!matches) return false;
      }

      if (_sourceFilter == 'featured' && !r.isGlobalCatalog) return false;
      if (_sourceFilter == 'personal' && (r.isGlobalCatalog || r.isFromApi)) {
        return false;
      }
      if (_sourceFilter == 'api' && !r.isFromApi) return false;
      if (_sourceFilter == 'favorites' && !widget.favoriteIds.contains(r.id)) {
        return false;
      }

      final q = _searchQuery.trim().toLowerCase();
      if (q.isNotEmpty) {
        return r.title.toLowerCase().contains(q) ||
            r.ingredients.toLowerCase().contains(q) ||
            r.categories.any((c) => c.toLowerCase().contains(q));
      }
      return true;
    }).toList();
  }

  void _toggleFilterCategory(String cat) {
    setState(() {
      if (cat == 'All') {
        _selectedCategories.clear();
      } else if (_selectedCategories.contains(cat)) {
        _selectedCategories.remove(cat);
      } else {
        _selectedCategories.add(cat);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final filtered = _filteredRecipes;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Multi-Select Category & Dietary Label FilterChips
        SizedBox(
          height: 44,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _availableCategories.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, idx) {
              final cat = _availableCategories[idx];
              final selected = cat == 'All'
                  ? _selectedCategories.isEmpty
                  : _selectedCategories.contains(cat);
              return FilterChip(
                label: Text(cat),
                selected: selected,
                onSelected: (_) => _toggleFilterCategory(cat),
              );
            },
          ),
        ),
        if (_selectedCategories.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            children: [
              Text(
                'Active labels: ${_selectedCategories.join(' · ')} (${filtered.length})',
                style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
              ),
              if (_selectedCategories.length > 1)
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: true, label: Text('Match All')),
                    ButtonSegment(value: false, label: Text('Match Any')),
                  ],
                  selected: {_matchAllLabels},
                  onSelectionChanged: (s) =>
                      setState(() => _matchAllLabels = s.first),
                ),
              TextButton(
                onPressed: () => setState(() => _selectedCategories.clear()),
                child: const Text('Clear Labels'),
              ),
            ],
          ),
        ],
        const SizedBox(height: 14),
        SearchBar(
          hintText: 'Search dishes, ingredients, or labels (e.g. Quick, Gluten-Free)…',
          leading: const Icon(Icons.search_rounded),
          elevation: const WidgetStatePropertyAll(0),
          backgroundColor: WidgetStatePropertyAll(cs.surfaceContainerLow),
          onChanged: (v) => setState(() => _searchQuery = v),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'all', label: Text('All Dishes')),
              ButtonSegment(value: 'featured', label: Text('Admin Featured')),
              ButtonSegment(value: 'personal', label: Text('My Personal')),
              ButtonSegment(value: 'api', label: Text('From API')),
              ButtonSegment(value: 'favorites', label: Text('Favorites')),
            ],
            selected: {_sourceFilter},
            onSelectionChanged: (s) => setState(() => _sourceFilter = s.first),
          ),
        ),
        const SizedBox(height: 18),
        if (filtered.isEmpty)
          Card(
            elevation: 0,
            color: cs.surfaceContainerLow,
            child: const Padding(
              padding: EdgeInsets.all(32),
              child: Center(
                child: Text('No recipes match your current filter.'),
              ),
            ),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: MediaQuery.of(context).size.width > 960
                  ? 3
                  : (MediaQuery.of(context).size.width > 620 ? 2 : 1),
              mainAxisSpacing: 16,
              crossAxisSpacing: 16,
              childAspectRatio: 0.92,
            ),
            itemCount: filtered.length,
            itemBuilder: (context, index) {
              final recipe = filtered[index];
              final isFav = widget.favoriteIds.contains(recipe.id);
              return _RecipeCardWidget(
                recipe: recipe,
                isFavorite: isFav,
                onToggleFavorite: () => KitchenFirestoreService.instance
                    .toggleFavorite(widget.uid, recipe.id, isFav),
                onOpenDetail: () => _showRecipeDetailDialog(context, recipe),
              );
            },
          ),
      ],
    );
  }

  void _showRecipeDetailDialog(BuildContext context, RecipeItem recipe) {
    String selectedDay = kDaysOfWeek.first;
    String selectedMeal = kMealTypes.last;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.85,
              builder: (_, scrollCtrl) {
                return ListView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
                  children: [
                    Text(
                      recipe.categories.join(' · '),
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(ctx).colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      recipe.title,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Ingredients',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    Text(recipe.ingredients),
                    const SizedBox(height: 16),
                    const Text(
                      'Preparation Steps',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    Text(recipe.steps),
                    const SizedBox(height: 20),
                    const Divider(),
                    const SizedBox(height: 12),
                    const Text(
                      'Assign to Weekly Meal Planner',
                      style:
                          TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: selectedDay,
                            decoration: const InputDecoration(
                              labelText: 'Day',
                              border: OutlineInputBorder(),
                            ),
                            items: kDaysOfWeek
                                .map((d) =>
                                    DropdownMenuItem(value: d, child: Text(d)))
                                .toList(),
                            onChanged: (v) {
                              if (v != null) {
                                setModalState(() => selectedDay = v);
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: selectedMeal,
                            decoration: const InputDecoration(
                              labelText: 'Meal',
                              border: OutlineInputBorder(),
                            ),
                            items: kMealTypes
                                .map((m) =>
                                    DropdownMenuItem(value: m, child: Text(m)))
                                .toList(),
                            onChanged: (v) {
                              if (v != null) {
                                setModalState(() => selectedMeal = v);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: () async {
                        await KitchenFirestoreService.instance.assignMealSlot(
                          uid: widget.uid,
                          day: selectedDay,
                          mealType: selectedMeal,
                          recipeId: recipe.id,
                        );
                        if (ctx.mounted) Navigator.pop(ctx);
                      },
                      icon: const Icon(Icons.calendar_month_rounded),
                      label: const Text('Schedule in Planner'),
                    ),
                    if (!recipe.isGlobalCatalog) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                Navigator.pop(ctx);
                                showRecipeFormModal(
                                  context,
                                  uid: widget.uid,
                                  existing: recipe,
                                );
                              },
                              icon: const Icon(Icons.edit_outlined),
                              label: const Text('Edit Recipe & Labels'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                await KitchenFirestoreService.instance
                                    .deletePersonalRecipe(
                                        widget.uid, recipe.id);
                                if (ctx.mounted) Navigator.pop(ctx);
                              },
                              icon: const Icon(Icons.delete_outline_rounded),
                              label: const Text('Delete'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                );
              },
            );
          },
        );
      },
    );
  }
}

class _RecipeCardWidget extends StatelessWidget {
  final RecipeItem recipe;
  final bool isFavorite;
  final VoidCallback onToggleFavorite;
  final VoidCallback onOpenDetail;

  const _RecipeCardWidget({
    required this.recipe,
    required this.isFavorite,
    required this.onToggleFavorite,
    required this.onOpenDetail,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final origin = recipe.isGlobalCatalog
        ? 'Admin Featured'
        : (recipe.isFromApi ? 'Saved from API' : 'Personal');

    return Card(
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      color: cs.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: cs.outlineVariant),
      ),
      child: InkWell(
        onTap: onOpenDetail,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  recipe.imageUrl.startsWith('http')
                      ? Image.network(
                          recipe.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: cs.secondaryContainer,
                            child: Icon(Icons.restaurant_menu_rounded,
                                color: cs.onSecondaryContainer),
                          ),
                        )
                      : Container(
                          color: cs.secondaryContainer,
                          child: Icon(Icons.restaurant_menu_rounded,
                              size: 36, color: cs.onSecondaryContainer),
                        ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: IconButton.filledTonal(
                      onPressed: onToggleFavorite,
                      icon: Icon(
                        isFavorite
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        color: isFavorite ? Colors.redAccent : null,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${recipe.categories.join(', ')} · $origin',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    recipe.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Multi-Select Category & Personal Recipe Form BottomSheet
Future<void> showRecipeFormModal(
  BuildContext context, {
  required String uid,
  RecipeItem? existing,
}) async {
  final titleCtrl = TextEditingController(text: existing?.title ?? '');
  final imgCtrl = TextEditingController(text: existing?.imageUrl ?? '');
  final ingCtrl = TextEditingController(text: existing?.ingredients ?? '');
  final stepsCtrl = TextEditingController(text: existing?.steps ?? '');
  final customTagCtrl = TextEditingController();
  final List<String> selectedCats = existing != null
      ? List<String>.from(existing.categories)
      : <String>['Dinner'];

  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setModalState) {
          final allOptions = <String>{
            ...kRecipeCategories,
            ...selectedCats,
          }.toList();

          return Padding(
            padding: EdgeInsets.only(
              left: 24,
              right: 24,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    existing != null
                        ? 'Edit Recipe & Labels'
                        : 'Create Personal Recipe',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: titleCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Recipe Title',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Categories & Dietary Labels (${selectedCats.length}/10)',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: allOptions.map((label) {
                      final active = selectedCats.any(
                        (c) => c.toLowerCase() == label.toLowerCase(),
                      );
                      return FilterChip(
                        label: Text(label),
                        selected: active,
                        onSelected: (_) {
                          setModalState(() {
                            if (active) {
                              selectedCats.removeWhere(
                                (c) => c.toLowerCase() == label.toLowerCase(),
                              );
                            } else if (selectedCats.length < 10) {
                              selectedCats.add(label);
                            }
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: customTagCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Add custom label (e.g. Keto, Spicy)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton.tonal(
                        onPressed: () {
                          final raw = customTagCtrl.text.trim();
                          if (raw.isNotEmpty && selectedCats.length < 10) {
                            setModalState(() {
                              if (!selectedCats.any((c) =>
                                  c.toLowerCase() == raw.toLowerCase())) {
                                selectedCats.add(raw);
                              }
                              customTagCtrl.clear();
                            });
                          }
                        },
                        child: const Text('Add Label'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: imgCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Dish Photo URL',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: ingCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Ingredients (one per line)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: stepsCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Cooking Instructions',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () async {
                      if (titleCtrl.text.trim().isEmpty ||
                          selectedCats.isEmpty ||
                          ingCtrl.text.trim().isEmpty ||
                          stepsCtrl.text.trim().isEmpty) {
                        return;
                      }
                      await KitchenFirestoreService.instance.savePersonalRecipe(
                        uid: uid,
                        recipeId: existing?.id,
                        title: titleCtrl.text,
                        categories: selectedCats,
                        imageUrl: imgCtrl.text,
                        ingredients: ingCtrl.text,
                        steps: stepsCtrl.text,
                      );
                      if (ctx.mounted) Navigator.pop(ctx);
                    },
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                    ),
                    child: const Text('Save Recipe'),
                  ),
                ],
              ),
            ),
          );
        },
      );
    },
  );
}
