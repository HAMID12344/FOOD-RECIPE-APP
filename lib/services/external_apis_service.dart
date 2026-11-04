import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../models/kitchen_models.dart';

class ExternalApisService {
  ExternalApisService._();
  static final ExternalApisService instance = ExternalApisService._();

  /// Searches TheMealDB API live without local offline caching
  Future<List<OnlineMealRecipe>> searchMealDb(String query) async {
    final q = query.trim().isEmpty ? 'Chicken' : query.trim();
    try {
      final uri = Uri.parse(
        'https://www.themealdb.com/api/json/v1/1/search.php?s=${Uri.encodeComponent(q)}',
      );
      final response =
          await http.get(uri).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body) as Map<String, dynamic>;
        final rawMeals = (decoded['meals'] as List<dynamic>?) ?? [];
        return rawMeals
            .map((m) => _mapMealDbJson(m as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {
      return [];
    }
    return [];
  }

  OnlineMealRecipe _mapMealDbJson(Map<String, dynamic> meal) {
    final List<String> ingredientLines = [];
    for (int i = 1; i <= 20; i++) {
      final ing = (meal['strIngredient$i'] as String?)?.trim() ?? '';
      final measure = (meal['strMeasure$i'] as String?)?.trim() ?? '';
      if (ing.isNotEmpty) {
        ingredientLines.add(measure.isNotEmpty ? '$measure $ing' : ing);
      }
    }

    return OnlineMealRecipe(
      apiId: (meal['idMeal'] as String?) ?? '',
      title: (meal['strMeal'] as String?) ?? 'Online Recipe',
      category: (meal['strCategory'] as String?) ?? 'Dinner',
      area: (meal['strArea'] as String?) ?? 'Global',
      imageUrl: (meal['strMealThumb'] as String?) ?? '',
      ingredients: ingredientLines.join('\n'),
      steps: (meal['strInstructions'] as String?) ?? '',
    );
  }

  /// Calls the backend Groq Vision endpoint (`/api/groceries/snap-recognize`)
  /// using `qwen/qwen3.8-27b` to recognize ingredients from a camera snapshot.
  Future<List<String>> scanIngredientsWithGroqVision({
    required Uint8List imageBytes,
    String mimeType = 'image/jpeg',
    String apiBaseUrl = '',
  }) async {
    final base64Image = base64Encode(imageBytes);
    final uri = Uri.parse('$apiBaseUrl/api/groceries/snap-recognize');

    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'imageBase64': base64Image,
        'mimeType': mimeType,
      }),
    );

    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      throw Exception(
        (payload['error'] as String?) ??
            'Failed to recognize ingredients from camera snapshot.',
      );
    }

    final rawItems = (payload['items'] as List<dynamic>?) ?? [];
    return rawItems
        .map((e) => ((e as Map<String, dynamic>)['name'] as String?)?.trim() ?? '')
        .where((name) => name.isNotEmpty)
        .toList();
  }
}
