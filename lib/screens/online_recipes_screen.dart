import 'package:flutter/material.dart';

import '../models/kitchen_models.dart';
import '../services/external_apis_service.dart';
import '../services/firestore_service.dart';

class OnlineRecipesScreen extends StatefulWidget {
  final String uid;
  final Set<String> savedApiIds;

  const OnlineRecipesScreen({
    super.key,
    required this.uid,
    required this.savedApiIds,
  });

  @override
  State<OnlineRecipesScreen> createState() => _OnlineRecipesScreenState();
}

class _OnlineRecipesScreenState extends State<OnlineRecipesScreen> {
  final TextEditingController _queryCtrl =
      TextEditingController(text: 'Chicken');
  List<OnlineMealRecipe> _results = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _search('Chicken');
  }

  Future<void> _search(String q) async {
    setState(() => _loading = true);
    final res = await ExternalApisService.instance.searchMealDb(q);
    if (mounted) {
      setState(() {
        _results = res;
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _queryCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Online Recipe Explorer (TheMealDB)',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _queryCtrl,
                onSubmitted: _search,
                decoration: const InputDecoration(
                  hintText: 'Search global dishes (e.g. Biryani, Pasta, Beef)…',
                  prefixIcon: Icon(Icons.search_rounded),
                  border: OutlineInputBorder(),
                ),
              ),
            ),
            const SizedBox(width: 10),
            FilledButton(
              onPressed: () => _search(_queryCtrl.text),
              style: FilledButton.styleFrom(minimumSize: const Size(92, 52)),
              child: const Text('Search'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Padding(
            padding: EdgeInsets.all(40),
            child: Center(child: CircularProgressIndicator()),
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
              childAspectRatio: 0.9,
            ),
            itemCount: _results.length,
            itemBuilder: (context, index) {
              final meal = _results[index];
              final alreadySaved = widget.savedApiIds.contains(meal.apiId);
              return Card(
                elevation: 0,
                clipBehavior: Clip.antiAlias,
                color: cs.surfaceContainerLow,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: BorderSide(color: cs.outlineVariant),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: Image.network(
                        meal.imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            Container(color: cs.secondaryContainer),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${meal.category} · ${meal.area}',
                            style: TextStyle(
                              fontSize: 12,
                              color: cs.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            meal.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 10),
                          FilledButton.tonalIcon(
                            onPressed: alreadySaved
                                ? null
                                : () async {
                                    await KitchenFirestoreService.instance
                                        .savePersonalRecipe(
                                      uid: widget.uid,
                                      title: meal.title,
                                      categories: [meal.category],
                                      imageUrl: meal.imageUrl,
                                      ingredients: meal.ingredients,
                                      steps: meal.steps,
                                      isFromApi: true,
                                      apiMealId: meal.apiId,
                                    );
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(
                                        SnackBar(
                                          content: Text(
                                              'Saved "${meal.title}" to My Recipes.'),
                                        ),
                                      );
                                    }
                                  },
                            icon: Icon(alreadySaved
                                ? Icons.check_rounded
                                : Icons.bookmark_add_outlined),
                            label: Text(
                                alreadySaved ? 'Saved' : 'Save to Kitchen'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }
}
