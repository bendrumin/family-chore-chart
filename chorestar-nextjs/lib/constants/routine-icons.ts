import {
  Sun,
  Moon,
  Bed,
  Sparkles,
  Droplets,
  Shirt,
  UtensilsCrossed,
  Backpack,
  Bath,
  BookOpen,
  Heart,
  Apple,
  School,
  Dog,
  Cat,
  Cookie,
  Smile,
  Music,
  Brush,
  type LucideIcon,
  CircleCheckBig,
  Baby,
  Soup,
  Milk,
  Coffee,
  Pizza,
  Sandwich,
  HandHelping,
  Trash2,
  ShowerHead,
  Footprints,
  Glasses,
  Watch,
  Drumstick,
  GlassWater,
  Utensils,
  Home,
  TreePine,
  Flower2,
  CloudSun,
  Star,
  Zap,
  Package,
  ShoppingBag,
  Hammer,
  PaintBucket,
  Scissors,
  Book,
  Pencil,
  Calculator,
  Globe,
  Palette,
  Camera,
  Gamepad2,
  Puzzle,
  Dumbbell,
  BikeIcon,
  Trophy,
  Flag,
  Rocket,
  Clock,
  Timer,
  Bell,
  Phone,
  Mail,
  MessageCircle,
  Shirt as TShirt,
  Waves,
  Wind,
  Snowflake,
  Flame,
  Lightbulb,
  Check,
} from 'lucide-react';

export type RoutineIconKey = keyof typeof ROUTINE_ICONS;

export interface RoutineIcon {
  icon: LucideIcon;
  label: string;
  category: 'morning' | 'bedtime' | 'hygiene' | 'meals' | 'school' | 'chores' | 'fun' | 'general';
}

export const ROUTINE_ICONS = {
  // Morning Routine Icons
  'wake-up': { icon: Sun, label: 'Wake Up', category: 'morning' as const },
  'make-bed': { icon: Bed, label: 'Make Bed', category: 'morning' as const },
  'brush-teeth': { icon: Sparkles, label: 'Brush Teeth', category: 'hygiene' as const },
  'wash-face': { icon: Droplets, label: 'Wash Face', category: 'hygiene' as const },
  'get-dressed': { icon: Shirt, label: 'Get Dressed', category: 'morning' as const },
  'brush-hair': { icon: Brush, label: 'Brush Hair', category: 'hygiene' as const },
  'eat-breakfast': { icon: UtensilsCrossed, label: 'Eat Breakfast', category: 'meals' as const },
  'pack-backpack': { icon: Backpack, label: 'Pack Backpack', category: 'school' as const },
  'put-on-shoes': { icon: Footprints, label: 'Put On Shoes', category: 'morning' as const },
  'get-ready': { icon: Smile, label: 'Get Ready', category: 'morning' as const },
  'morning-stretch': { icon: Dumbbell, label: 'Morning Stretch', category: 'morning' as const },

  // Bedtime Routine Icons
  'take-bath': { icon: Bath, label: 'Take Bath', category: 'bedtime' as const },
  'take-shower': { icon: ShowerHead, label: 'Take Shower', category: 'bedtime' as const },
  'put-on-pajamas': { icon: Moon, label: 'Put On PJs', category: 'bedtime' as const },
  'read-book': { icon: BookOpen, label: 'Read Book', category: 'bedtime' as const },
  'hugs-kisses': { icon: Heart, label: 'Hugs & Kisses', category: 'bedtime' as const },
  'lights-out': { icon: Moon, label: 'Lights Out', category: 'bedtime' as const },
  'bedtime-story': { icon: Book, label: 'Bedtime Story', category: 'bedtime' as const },
  'set-alarm': { icon: Clock, label: 'Set Alarm', category: 'bedtime' as const },
  'calm-music': { icon: Music, label: 'Calm Music', category: 'bedtime' as const },

  // Hygiene Icons
  'shower': { icon: ShowerHead, label: 'Shower', category: 'hygiene' as const },
  'wash-hands': { icon: Droplets, label: 'Wash Hands', category: 'hygiene' as const },
  'floss-teeth': { icon: Sparkles, label: 'Floss Teeth', category: 'hygiene' as const },
  'use-bathroom': { icon: Home, label: 'Use Bathroom', category: 'hygiene' as const },
  'put-on-deodorant': { icon: Sparkles, label: 'Deodorant', category: 'hygiene' as const },
  'clip-nails': { icon: Scissors, label: 'Clip Nails', category: 'hygiene' as const },

  // Meal Time Icons
  'eat-lunch': { icon: Sandwich, label: 'Eat Lunch', category: 'meals' as const },
  'eat-dinner': { icon: Utensils, label: 'Eat Dinner', category: 'meals' as const },
  'have-snack': { icon: Apple, label: 'Have Snack', category: 'meals' as const },
  'drink-water': { icon: GlassWater, label: 'Drink Water', category: 'meals' as const },
  'drink-milk': { icon: Milk, label: 'Drink Milk', category: 'meals' as const },
  'eat-fruit': { icon: Apple, label: 'Eat Fruit', category: 'meals' as const },
  'eat-veggies': { icon: Soup, label: 'Eat Veggies', category: 'meals' as const },
  'set-table': { icon: UtensilsCrossed, label: 'Set Table', category: 'chores' as const },
  'clear-dishes': { icon: Utensils, label: 'Clear Dishes', category: 'chores' as const },

  // School & Learning Icons
  'do-homework': { icon: Pencil, label: 'Do Homework', category: 'school' as const },
  'study': { icon: Book, label: 'Study', category: 'school' as const },
  'practice-reading': { icon: BookOpen, label: 'Practice Reading', category: 'school' as const },
  'practice-math': { icon: Calculator, label: 'Practice Math', category: 'school' as const },
  'check-backpack': { icon: Backpack, label: 'Check Backpack', category: 'school' as const },
  'organize-desk': { icon: Pencil, label: 'Organize Desk', category: 'school' as const },
  'school-supplies': { icon: School, label: 'School Supplies', category: 'school' as const },

  // Chores Icons
  'feed-pet': { icon: Dog, label: 'Feed Pet', category: 'chores' as const },
  'walk-dog': { icon: Dog, label: 'Walk Dog', category: 'chores' as const },
  'water-plants': { icon: Flower2, label: 'Water Plants', category: 'chores' as const },
  'take-out-trash': { icon: Trash2, label: 'Take Out Trash', category: 'chores' as const },
  'clean-room': { icon: Home, label: 'Clean Room', category: 'chores' as const },
  'put-away-toys': { icon: Package, label: 'Put Away Toys', category: 'chores' as const },
  'help-cook': { icon: HandHelping, label: 'Help Cook', category: 'chores' as const },
  'fold-laundry': { icon: Shirt, label: 'Fold Laundry', category: 'chores' as const },
  'vacuum': { icon: Home, label: 'Vacuum', category: 'chores' as const },
  'dust': { icon: Sparkles, label: 'Dust', category: 'chores' as const },

  // Fun & Play Icons
  'play-outside': { icon: TreePine, label: 'Play Outside', category: 'fun' as const },
  'ride-bike': { icon: BikeIcon, label: 'Ride Bike', category: 'fun' as const },
  'play-game': { icon: Gamepad2, label: 'Play Game', category: 'fun' as const },
  'do-puzzle': { icon: Puzzle, label: 'Do Puzzle', category: 'fun' as const },
  'draw-paint': { icon: Palette, label: 'Draw/Paint', category: 'fun' as const },
  'listen-music': { icon: Music, label: 'Listen to Music', category: 'fun' as const },
  'dance': { icon: Smile, label: 'Dance', category: 'fun' as const },
  'build-blocks': { icon: Package, label: 'Build Blocks', category: 'fun' as const },
  'play-instrument': { icon: Music, label: 'Play Instrument', category: 'fun' as const },

  // Exercise & Activity Icons
  'exercise': { icon: Dumbbell, label: 'Exercise', category: 'fun' as const },
  'stretch': { icon: Dumbbell, label: 'Stretch', category: 'fun' as const },
  'sports': { icon: Trophy, label: 'Play Sports', category: 'fun' as const },
  'yoga': { icon: Dumbbell, label: 'Yoga', category: 'fun' as const },

  // General Icons
  'check': { icon: Check, label: 'Complete', category: 'general' as const },
  'checkmark': { icon: CircleCheckBig, label: 'Check', category: 'general' as const },
  'timer': { icon: Timer, label: 'Timer', category: 'general' as const },
  'star': { icon: Star, label: 'Star', category: 'general' as const },
  'trophy': { icon: Trophy, label: 'Trophy', category: 'general' as const },
  'rocket': { icon: Rocket, label: 'Rocket', category: 'general' as const },
  'bell': { icon: Bell, label: 'Reminder', category: 'general' as const },
  'heart': { icon: Heart, label: 'Heart', category: 'general' as const },
  'smile': { icon: Smile, label: 'Happy', category: 'general' as const },
  'sparkles': { icon: Sparkles, label: 'Sparkles', category: 'general' as const },
  'home': { icon: Home, label: 'Home', category: 'general' as const },
} as const;

// Helper function to get icons by category
export function getIconsByCategory(category: RoutineIcon['category']): [RoutineIconKey, RoutineIcon][] {
  return Object.entries(ROUTINE_ICONS).filter(([_, icon]) => icon.category === category) as [RoutineIconKey, RoutineIcon][];
}

// Helper function to get all categories
export function getIconCategories(): RoutineIcon['category'][] {
  return ['morning', 'bedtime', 'hygiene', 'meals', 'school', 'chores', 'fun', 'general'];
}

// Get icon by key with fallback
export function getRoutineIcon(key: string): RoutineIcon {
  return ROUTINE_ICONS[key as RoutineIconKey] || ROUTINE_ICONS['check'];
}

// Predefined routine templates
export interface RoutineTemplate {
  name: string;
  type: 'morning' | 'bedtime' | 'afterschool' | 'custom';
  icon: RoutineIconKey;
  color: string;
  /** Part of the Premium template library; the first four stay free. */
  premium?: boolean;
  steps: {
    title: string;
    icon: RoutineIconKey;
    description?: string;
    duration_seconds?: number;
  }[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    name: 'Morning Routine',
    type: 'morning',
    icon: 'wake-up',
    color: '#fbbf24', // Amber
    steps: [
      { title: 'Wake Up', icon: 'wake-up', duration_seconds: 60 },
      { title: 'Make Bed', icon: 'make-bed', duration_seconds: 120 },
      { title: 'Brush Teeth', icon: 'brush-teeth', duration_seconds: 120 },
      { title: 'Wash Face', icon: 'wash-face', duration_seconds: 60 },
      { title: 'Get Dressed', icon: 'get-dressed', duration_seconds: 180 },
      { title: 'Eat Breakfast', icon: 'eat-breakfast', duration_seconds: 600 },
      { title: 'Pack Backpack', icon: 'pack-backpack', duration_seconds: 120 },
      { title: 'Put On Shoes', icon: 'put-on-shoes', duration_seconds: 60 },
    ],
  },
  {
    name: 'Bedtime Routine',
    type: 'bedtime',
    icon: 'lights-out',
    color: '#6366f1', // Indigo
    steps: [
      { title: 'Put Away Toys', icon: 'put-away-toys', duration_seconds: 300 },
      { title: 'Take Bath', icon: 'take-bath', duration_seconds: 600 },
      { title: 'Brush Teeth', icon: 'brush-teeth', duration_seconds: 120 },
      { title: 'Put On Pajamas', icon: 'put-on-pajamas', duration_seconds: 120 },
      { title: 'Read Bedtime Story', icon: 'bedtime-story', duration_seconds: 600 },
      { title: 'Hugs & Kisses', icon: 'hugs-kisses', duration_seconds: 60 },
      { title: 'Lights Out', icon: 'lights-out', duration_seconds: 60 },
    ],
  },
  {
    name: 'After School Routine',
    type: 'afterschool',
    icon: 'pack-backpack',
    color: '#10b981', // Green
    steps: [
      { title: 'Put Away Backpack', icon: 'pack-backpack', duration_seconds: 60 },
      { title: 'Wash Hands', icon: 'wash-hands', duration_seconds: 60 },
      { title: 'Have a Snack', icon: 'have-snack', duration_seconds: 300 },
      { title: 'Do Homework', icon: 'do-homework', duration_seconds: 1800 },
      { title: 'Play Outside', icon: 'play-outside', duration_seconds: 1800 },
    ],
  },
  {
    name: 'Quick Hygiene',
    type: 'custom',
    icon: 'wash-hands',
    color: '#14b8a6', // Teal
    steps: [
      { title: 'Wash Hands', icon: 'wash-hands', duration_seconds: 60 },
      { title: 'Brush Teeth', icon: 'brush-teeth', duration_seconds: 120 },
      { title: 'Wash Face', icon: 'wash-face', duration_seconds: 60 },
      { title: 'Brush Hair', icon: 'brush-hair', duration_seconds: 60 },
    ],
  },
  // Premium template library
  {
    name: 'School Morning Express',
    type: 'morning',
    icon: 'rocket',
    color: '#f97316',
    premium: true,
    steps: [
      { title: 'Wake Up', icon: 'wake-up', duration_seconds: 60 },
      { title: 'Use the Bathroom', icon: 'use-bathroom', duration_seconds: 120 },
      { title: 'Get Dressed', icon: 'get-dressed', duration_seconds: 180 },
      { title: 'Eat Breakfast', icon: 'eat-breakfast', duration_seconds: 600 },
      { title: 'Brush Teeth', icon: 'brush-teeth', duration_seconds: 120 },
      { title: 'Check Backpack', icon: 'check-backpack', duration_seconds: 60 },
      { title: 'Shoes On', icon: 'put-on-shoes', duration_seconds: 60 },
    ],
  },
  {
    name: 'Homework Hour',
    type: 'afterschool',
    icon: 'do-homework',
    color: '#3b82f6',
    premium: true,
    steps: [
      { title: 'Have a Snack', icon: 'have-snack', duration_seconds: 300 },
      { title: 'Drink Water', icon: 'drink-water', duration_seconds: 60 },
      { title: 'Clear the Desk', icon: 'organize-desk', duration_seconds: 120 },
      { title: 'Do Homework', icon: 'do-homework', duration_seconds: 1500 },
      { title: 'Read for 15 Minutes', icon: 'practice-reading', duration_seconds: 900 },
      { title: "Pack Tomorrow's Bag", icon: 'check-backpack', duration_seconds: 120 },
    ],
  },
  {
    name: 'Weekend Room Reset',
    type: 'custom',
    icon: 'clean-room',
    color: '#8b5cf6',
    premium: true,
    steps: [
      { title: 'Make Bed', icon: 'make-bed', duration_seconds: 120 },
      { title: 'Put Away Toys', icon: 'put-away-toys', duration_seconds: 600 },
      { title: 'Fold Laundry', icon: 'fold-laundry', duration_seconds: 600 },
      { title: 'Dust', icon: 'dust', duration_seconds: 300 },
      { title: 'Vacuum', icon: 'vacuum', duration_seconds: 600 },
      { title: 'Take Out Trash', icon: 'take-out-trash', duration_seconds: 120 },
    ],
  },
  {
    name: 'Pet Care',
    type: 'custom',
    icon: 'feed-pet',
    color: '#f59e0b',
    premium: true,
    steps: [
      { title: 'Feed the Pet', icon: 'feed-pet', duration_seconds: 120 },
      { title: 'Fresh Water Bowl', icon: 'drink-water', duration_seconds: 60 },
      { title: 'Walk the Dog', icon: 'walk-dog', duration_seconds: 900 },
      { title: 'Wash Hands', icon: 'wash-hands', duration_seconds: 60 },
    ],
  },
  {
    name: 'Teen Morning',
    type: 'morning',
    icon: 'shower',
    color: '#0ea5e9',
    premium: true,
    steps: [
      { title: 'Wake Up', icon: 'wake-up', duration_seconds: 60 },
      { title: 'Shower', icon: 'shower', duration_seconds: 600 },
      { title: 'Deodorant', icon: 'put-on-deodorant', duration_seconds: 60 },
      { title: 'Get Dressed', icon: 'get-dressed', duration_seconds: 300 },
      { title: 'Eat Breakfast', icon: 'eat-breakfast', duration_seconds: 600 },
      { title: 'Check Backpack', icon: 'check-backpack', duration_seconds: 120 },
    ],
  },
  {
    name: 'Calm-Down Bedtime',
    type: 'bedtime',
    icon: 'calm-music',
    color: '#a855f7',
    premium: true,
    steps: [
      { title: 'Put On Pajamas', icon: 'put-on-pajamas', duration_seconds: 120 },
      { title: 'Brush Teeth', icon: 'brush-teeth', duration_seconds: 120 },
      { title: 'Floss', icon: 'floss-teeth', duration_seconds: 60 },
      { title: 'Read a Book', icon: 'read-book', duration_seconds: 900 },
      { title: 'Calm Music', icon: 'calm-music', duration_seconds: 300 },
      { title: 'Lights Out', icon: 'lights-out', duration_seconds: 60 },
    ],
  },
  {
    name: 'Sports Practice Prep',
    type: 'custom',
    icon: 'sports',
    color: '#22c55e',
    premium: true,
    steps: [
      { title: 'Eat Some Fruit', icon: 'eat-fruit', duration_seconds: 300 },
      { title: 'Fill Water Bottle', icon: 'drink-water', duration_seconds: 60 },
      { title: 'Practice Clothes On', icon: 'get-dressed', duration_seconds: 300 },
      { title: 'Pack the Gear Bag', icon: 'pack-backpack', duration_seconds: 300 },
      { title: 'Shoes On', icon: 'put-on-shoes', duration_seconds: 120 },
    ],
  },
  {
    name: 'Kitchen Helper',
    type: 'custom',
    icon: 'help-cook',
    color: '#ef4444',
    premium: true,
    steps: [
      { title: 'Wash Hands', icon: 'wash-hands', duration_seconds: 60 },
      { title: 'Set the Table', icon: 'set-table', duration_seconds: 300 },
      { title: 'Help Cook', icon: 'help-cook', duration_seconds: 900 },
      { title: 'Eat Dinner', icon: 'eat-dinner', duration_seconds: 1200 },
      { title: 'Clear the Dishes', icon: 'clear-dishes', duration_seconds: 300 },
    ],
  },
  {
    name: 'Music Practice',
    type: 'custom',
    icon: 'play-instrument',
    color: '#ec4899',
    premium: true,
    steps: [
      { title: 'Warm Up', icon: 'play-instrument', duration_seconds: 300 },
      { title: 'Practice Your Piece', icon: 'play-instrument', duration_seconds: 1200 },
      { title: 'Listen to Something New', icon: 'listen-music', duration_seconds: 300 },
    ],
  },
  {
    name: 'Get Moving',
    type: 'custom',
    icon: 'exercise',
    color: '#14b8a6',
    premium: true,
    steps: [
      { title: 'Stretch', icon: 'stretch', duration_seconds: 120 },
      { title: 'Exercise', icon: 'exercise', duration_seconds: 600 },
      { title: 'Play Outside', icon: 'play-outside', duration_seconds: 1200 },
      { title: 'Drink Water', icon: 'drink-water', duration_seconds: 60 },
    ],
  },
];
