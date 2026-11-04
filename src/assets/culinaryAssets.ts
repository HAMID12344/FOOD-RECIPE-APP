import heroMealPrepImg from './images/hero_meal_prep_1793771509924.jpg';
import shakshukaBreakfastImg from './images/recipe_shakshuka_breakfast_1793771511961.jpg';
import chickenKarahiImg from './images/recipe_chicken_karahi_1793771512863.jpg';
import chickpeaBowlImg from './images/recipe_chickpea_bowl_1793771514356.jpg';
import mangoParfaitImg from './images/recipe_mango_parfait_1793771513565.jpg';
import sindhiBiryaniImg from './images/recipe_sindhi_biryani_1793772573683.jpg';
import parathaOmeletteImg from './images/recipe_paratha_omelette_1793772575471.jpg';
import garlicPastaImg from './images/recipe_garlic_pasta_1793772578444.jpg';
import beefSeekhKebabImg from './images/recipe_beef_seekh_kebab_1793772579326.jpg';
import chocolateBrownieImg from './images/recipe_chocolate_brownie_1793772579482.jpg';

export const CULINARY_ASSETS = {
  heroMealPrep: heroMealPrepImg,
  shakshukaBreakfast: shakshukaBreakfastImg,
  chickenKarahi: chickenKarahiImg,
  chickpeaBowl: chickpeaBowlImg,
  mangoParfait: mangoParfaitImg,
  sindhiBiryani: sindhiBiryaniImg,
  parathaOmelette: parathaOmeletteImg,
  garlicPasta: garlicPastaImg,
  beefSeekhKebab: beefSeekhKebabImg,
  chocolateBrownie: chocolateBrownieImg,
} as const;

export const PRESET_RECIPE_IMAGES = [
  { label: 'Sindhi Chicken Biryani', category: 'Chicken', url: sindhiBiryaniImg },
  { label: 'Paratha & Masala Omelette', category: 'Breakfast', url: parathaOmeletteImg },
  { label: 'Islamabad Chicken Karahi', category: 'Dinner', url: chickenKarahiImg },
  { label: 'Creamy Garlic Pasta', category: 'Pasta', url: garlicPastaImg },
  { label: 'Char-Grilled Seekh Kebabs', category: 'Beef', url: beefSeekhKebabImg },
  { label: 'Skillet Egg Shakshuka', category: 'Breakfast', url: shakshukaBreakfastImg },
  { label: 'Chickpea Basmati Bowl', category: 'Vegetarian', url: chickpeaBowlImg },
  { label: 'Fudgy Brownie & Ice Cream', category: 'Dessert', url: chocolateBrownieImg },
  { label: 'Mango Pistachio Parfait', category: 'Dessert', url: mangoParfaitImg },
  { label: 'Fresh Kitchen Prep', category: 'Quick Hostel', url: heroMealPrepImg },
];

export const CATEGORY_THUMBNAILS: Record<string, string> = {
  All: heroMealPrepImg,
  Breakfast: parathaOmeletteImg,
  Lunch: chickpeaBowlImg,
  Dinner: chickenKarahiImg,
  Quick: shakshukaBreakfastImg,
  'Gluten-Free': chickpeaBowlImg,
  'High-Protein': beefSeekhKebabImg,
  Vegetarian: chickpeaBowlImg,
  'Dairy-Free': chickenKarahiImg,
  'Meal Prep': heroMealPrepImg,
  Chicken: sindhiBiryaniImg,
  Beef: beefSeekhKebabImg,
  Pasta: garlicPastaImg,
  Seafood: heroMealPrepImg,
  'Quick Hostel': shakshukaBreakfastImg,
  Dessert: chocolateBrownieImg,
};
