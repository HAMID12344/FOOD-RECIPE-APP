import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/kitchen_models.dart';
import '../services/external_apis_service.dart';
import '../services/firestore_service.dart';

class GroceryListScreen extends StatefulWidget {
  final String uid;
  final List<GroceryItem> items;
  final int plannedMealsCount;
  final VoidCallback onSyncFromMealPlan;

  const GroceryListScreen({
    super.key,
    required this.uid,
    required this.items,
    required this.plannedMealsCount,
    required this.onSyncFromMealPlan,
  });

  @override
  State<GroceryListScreen> createState() => _GroceryListScreenState();
}

class _GroceryListScreenState extends State<GroceryListScreen> {
  final TextEditingController _inputCtrl = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  String _filter = 'all'; // all | pending | bought
  bool _scanningCamera = false;

  @override
  void dispose() {
    _inputCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSnapToAdd() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024,
        imageQuality: 78,
      );
      if (photo == null) return;

      setState(() => _scanningCamera = true);
      final bytes = await photo.readAsBytes();
      final recognized =
          await ExternalApisService.instance.scanIngredientsWithGroqVision(
        imageBytes: bytes,
        mimeType: photo.mimeType ?? 'image/jpeg',
      );

      if (!mounted) return;
      if (recognized.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No ingredients detected in snapshot. Try closer lighting.'),
          ),
        );
        return;
      }

      final added = await KitchenFirestoreService.instance.addGroceryItemsBatch(
        widget.uid,
        recognized,
        widget.items,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Added $added recognized grocery items via Groq Vision.'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _scanningCamera = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final visible = widget.items.where((i) {
      if (_filter == 'pending') return !i.checked;
      if (_filter == 'bought') return i.checked;
      return true;
    }).toList();

    final boughtCount = widget.items.where((i) => i.checked).length;

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
              'Grocery Checklist',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
            Wrap(
              spacing: 10,
              children: [
                FilledButton.tonalIcon(
                  onPressed: _scanningCamera ? null : _handleSnapToAdd,
                  icon: const Icon(Icons.camera_alt_rounded),
                  label: Text(_scanningCamera ? 'Scanning…' : 'Snap to Add'),
                ),
                FilledButton.icon(
                  onPressed: widget.plannedMealsCount == 0
                      ? null
                      : widget.onSyncFromMealPlan,
                  icon: const Icon(Icons.sync_rounded),
                  label: Text(
                      'Sync Meal Plan (${widget.plannedMealsCount})'),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'all', label: Text('All')),
                ButtonSegment(value: 'pending', label: Text('Pending')),
                ButtonSegment(value: 'bought', label: Text('Bought')),
              ],
              selected: {_filter},
              onSelectionChanged: (s) => setState(() => _filter = s.first),
            ),
            if (boughtCount > 0)
              TextButton(
                onPressed: () => KitchenFirestoreService.instance
                    .clearBoughtGroceries(widget.uid, widget.items),
                child: const Text('Clear Bought'),
              ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _inputCtrl,
                decoration: const InputDecoration(
                  hintText: 'Add grocery item (e.g. Cooking oil, 1 dozen eggs)…',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
            const SizedBox(width: 10),
            FilledButton.icon(
              onPressed: () async {
                final text = _inputCtrl.text.trim();
                if (text.isEmpty) return;
                _inputCtrl.clear();
                await KitchenFirestoreService.instance.addGroceryItemsBatch(
                  widget.uid,
                  [text],
                  widget.items,
                );
              },
              style: FilledButton.styleFrom(minimumSize: const Size(110, 52)),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Add'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Card(
          elevation: 0,
          color: cs.surfaceContainerLow,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: cs.outlineVariant),
          ),
          child: visible.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(
                    child: Text('No grocery items in this view.'),
                  ),
                )
              : Column(
                  children: visible.map((item) {
                    return CheckboxListTile(
                      controlAffinity: ListTileControlAffinity.leading,
                      value: item.checked,
                      onChanged: (val) => KitchenFirestoreService.instance
                          .toggleGroceryChecked(
                              widget.uid, item.id, val ?? false),
                      title: Text(
                        item.name,
                        style: TextStyle(
                          decoration:
                              item.checked ? TextDecoration.lineThrough : null,
                        ),
                      ),
                      secondary: IconButton(
                        onPressed: () => KitchenFirestoreService.instance
                            .deleteGroceryItem(widget.uid, item.id),
                        icon: const Icon(Icons.delete_outline_rounded),
                      ),
                    );
                  }).toList(),
                ),
        ),
      ],
    );
  }
}
