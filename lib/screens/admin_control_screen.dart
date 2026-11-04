import 'package:flutter/material.dart';

import '../models/kitchen_models.dart';
import '../services/firestore_service.dart';

class AdminControlScreen extends StatefulWidget {
  final String adminUid;
  final List<CustomerProfile> customers;
  final List<RecipeItem> globalRecipes;

  const AdminControlScreen({
    super.key,
    required this.adminUid,
    required this.customers,
    required this.globalRecipes,
  });

  @override
  State<AdminControlScreen> createState() => _AdminControlScreenState();
}

class _AdminControlScreenState extends State<AdminControlScreen> {
  String _section = 'customers'; // customers | catalog

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Master Administrator · $kMasterAdminName',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: cs.primary,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'App Control & Customer Database',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(
          'Monitor every customer registered in $kAppBrandName, add or update customer records, and control global featured recipes across all customer kitchens.',
          style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        SegmentedButton<String>(
          segments: [
            ButtonSegment(
              value: 'customers',
              label: Text('Customer Database (${widget.customers.length})'),
            ),
            ButtonSegment(
              value: 'catalog',
              label: Text('Global App Recipes (${widget.globalRecipes.length})'),
            ),
          ],
          selected: {_section},
          onSelectionChanged: (s) => setState(() => _section = s.first),
        ),
        const SizedBox(height: 16),
        if (_section == 'customers')
          ...widget.customers.map((c) {
            return Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 10),
              color: cs.surfaceContainerLow,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: BorderSide(color: cs.outlineVariant),
              ),
              child: ListTile(
                title: Text(
                  c.name,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  '${c.email} · ${c.kitchenType} · ${c.role.toUpperCase()} · ${c.status.toUpperCase()}',
                ),
                trailing: PopupMenuButton<String>(
                  onSelected: (status) {
                    KitchenFirestoreService.instance.adminSaveCustomer(
                      docId: c.id,
                      name: c.name,
                      email: c.email,
                      role: c.role,
                      status: status,
                      kitchenType: c.kitchenType,
                      phone: c.phone,
                    );
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'active', child: Text('Set Active')),
                    PopupMenuItem(value: 'vip', child: Text('Set VIP')),
                    PopupMenuItem(
                        value: 'suspended', child: Text('Suspend Customer')),
                  ],
                ),
              ),
            );
          })
        else
          ...widget.globalRecipes.map((r) {
            return Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 10),
              color: cs.surfaceContainerLow,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: BorderSide(color: cs.outlineVariant),
              ),
              child: ListTile(
                title: Text(
                  r.title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(r.categories.join(' · ')),
                trailing: IconButton(
                  onPressed: () => KitchenFirestoreService.instance
                      .adminDeleteGlobalRecipe(r.id),
                  icon: const Icon(Icons.delete_outline_rounded),
                ),
              ),
            );
          }),
      ],
    );
  }
}
