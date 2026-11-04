import 'package:flutter/material.dart';

import '../models/kitchen_models.dart';
import '../services/firestore_service.dart';

class MealPlannerScreen extends StatelessWidget {
  final String uid;
  final List<RecipeItem> recipes;
  final List<MealPlanSlot> mealPlan;
  final VoidCallback onGenerateGroceryList;

  const MealPlannerScreen({
    super.key,
    required this.uid,
    required this.recipes,
    required this.mealPlan,
    required this.onGenerateGroceryList,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final recipeMap = {for (final r in recipes) r.id: r};

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 12,
          runSpacing: 10,
          children: [
            const Text(
              'Weekly Meal Planner',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
            Wrap(
              spacing: 10,
              children: [
                if (mealPlan.isNotEmpty)
                  OutlinedButton(
                    onPressed: () => KitchenFirestoreService.instance
                        .clearWeekMealPlan(uid, mealPlan),
                    child: const Text('Clear Week'),
                  ),
                FilledButton.icon(
                  onPressed: mealPlan.isEmpty ? null : onGenerateGroceryList,
                  icon: const Icon(Icons.shopping_bag_outlined),
                  label: Text('Build Grocery List (${mealPlan.length})'),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        ...kDaysOfWeek.map((day) {
          return Card(
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 14),
            color: cs.surfaceContainerLow,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: cs.outlineVariant),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    day,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  ...kMealTypes.map((mealType) {
                    MealPlanSlot? assignedSlot;
                    for (final s in mealPlan) {
                      if (s.day == day && s.mealType == mealType) {
                        assignedSlot = s;
                        break;
                      }
                    }
                    final assignedRecipe = assignedSlot != null
                        ? recipeMap[assignedSlot.recipeId]
                        : null;

                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        mealType,
                        style: TextStyle(
                          fontSize: 12,
                          color: cs.onSurfaceVariant,
                        ),
                      ),
                      subtitle: Text(
                        assignedRecipe?.title ?? 'Unassigned',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: assignedRecipe != null
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                      ),
                      trailing: assignedSlot != null
                          ? IconButton(
                              onPressed: () => KitchenFirestoreService.instance
                                  .removeMealSlot(uid, assignedSlot!.id),
                              icon: const Icon(Icons.close_rounded),
                            )
                          : FilledButton.tonal(
                              onPressed: recipes.isEmpty
                                  ? null
                                  : () => _pickRecipeDialog(
                                        context,
                                        day: day,
                                        mealType: mealType,
                                      ),
                              child: const Text('Assign'),
                            ),
                    );
                  }),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Future<void> _pickRecipeDialog(
    BuildContext context, {
    required String day,
    required String mealType,
  }) async {
    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return ListView.builder(
          itemCount: recipes.length,
          itemBuilder: (_, idx) {
            final rec = recipes[idx];
            return ListTile(
              title: Text(rec.title),
              subtitle: Text(rec.categories.join(' · ')),
              onTap: () async {
                await KitchenFirestoreService.instance.assignMealSlot(
                  uid: uid,
                  day: day,
                  mealType: mealType,
                  recipeId: rec.id,
                );
                if (ctx.mounted) Navigator.pop(ctx);
              },
            );
          },
        );
      },
    );
  }
}
