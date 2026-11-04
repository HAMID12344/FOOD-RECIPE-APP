import 'package:flutter/material.dart';

import '../models/kitchen_models.dart';
import '../services/firestore_service.dart';

class ProfileScreen extends StatefulWidget {
  final CustomerProfile profile;
  final int recipesCount;
  final int favoritesCount;
  final int plannedCount;
  final int pendingGroceriesCount;
  final int totalCustomersCount;
  final int globalRecipesCount;
  final ValueChanged<int> onNavigateIndex;
  final VoidCallback onSignOut;

  const ProfileScreen({
    super.key,
    required this.profile,
    required this.recipesCount,
    required this.favoritesCount,
    required this.plannedCount,
    required this.pendingGroceriesCount,
    required this.totalCustomersCount,
    required this.globalRecipesCount,
    required this.onNavigateIndex,
    required this.onSignOut,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late String _segment;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.profile.name);
    _phoneCtrl = TextEditingController(text: widget.profile.phone);
    _segment = widget.profile.kitchenType;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    setState(() => _saving = true);
    try {
      await KitchenFirestoreService.instance.updateOwnProfile(
        widget.profile.uid,
        name: _nameCtrl.text,
        kitchenType: _segment,
        phone: _phoneCtrl.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile saved to database.')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isAdmin = widget.profile.isAdmin;

    final segments = [
      if (isAdmin) 'Master App Control',
      ...kKitchenSegments,
    ];

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          elevation: 0,
          color: isAdmin ? cs.inverseSurface : cs.surfaceContainerLow,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: BorderSide(color: cs.outlineVariant),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isAdmin
                      ? 'Master Application Administrator · Full Control'
                      : 'Registered Customer · ${widget.profile.kitchenType} · ${widget.profile.status.toUpperCase()}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isAdmin ? cs.inversePrimary : cs.primary,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  widget.profile.name,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: isAdmin ? cs.onInverseSurface : cs.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  widget.profile.phone.isNotEmpty
                      ? '${widget.profile.email} · ${widget.profile.phone}'
                      : widget.profile.email,
                  style: TextStyle(
                    fontSize: 13,
                    color: isAdmin
                        ? cs.onInverseSurface.withOpacity(0.8)
                        : cs.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    if (isAdmin)
                      FilledButton.icon(
                        onPressed: () => widget.onNavigateIndex(1),
                        icon: const Icon(Icons.admin_panel_settings_rounded),
                        label: const Text('Open Admin Control & Customer DB'),
                      ),
                    OutlinedButton.icon(
                      onPressed: widget.onSignOut,
                      icon: const Icon(Icons.logout_rounded),
                      label: const Text('Sign Out'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: MediaQuery.of(context).size.width > 700 ? 4 : 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.55,
          children: [
            if (isAdmin) ...[
              _MetricTile(
                label: 'Customer Database',
                value: '${widget.totalCustomersCount}',
                onTap: () => widget.onNavigateIndex(1),
              ),
              _MetricTile(
                label: 'Global App Dishes',
                value: '${widget.globalRecipesCount}',
                onTap: () => widget.onNavigateIndex(1),
              ),
            ] else ...[
              _MetricTile(
                label: 'My Saved Recipes',
                value: '${widget.recipesCount}',
                onTap: () => widget.onNavigateIndex(1),
              ),
              _MetricTile(
                label: 'Favorites',
                value: '${widget.favoritesCount}',
                onTap: () => widget.onNavigateIndex(1),
              ),
            ],
            _MetricTile(
              label: 'Planned Meals',
              value: '${widget.plannedCount}',
              onTap: () => widget.onNavigateIndex(3),
            ),
            _MetricTile(
              label: 'Pending Groceries',
              value: '${widget.pendingGroceriesCount}',
              onTap: () => widget.onNavigateIndex(4),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Card(
          elevation: 0,
          color: cs.surfaceContainerLow,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: cs.outlineVariant),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Profile & Kitchen Preferences',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: segments.contains(_segment) ? _segment : segments.first,
                  decoration: const InputDecoration(
                    labelText: 'Kitchen Segment',
                    border: OutlineInputBorder(),
                  ),
                  items: segments
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _segment = v);
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phoneCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Phone / Hostel Location Note',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton(
                    onPressed: _saving ? null : _saveProfile,
                    child: Text(_saving ? 'Saving…' : 'Update Profile'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;

  const _MetricTile({
    required this.label,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      elevation: 0,
      color: cs.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: cs.outlineVariant),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: cs.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
