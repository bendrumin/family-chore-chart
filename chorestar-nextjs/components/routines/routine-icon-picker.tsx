'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getIconsByCategory, getIconCategories, type RoutineIconKey, type RoutineIcon } from '@/lib/constants/routine-icons';

interface RoutineIconPickerProps {
  currentIcon?: string | null;
  onSelect: (icon: RoutineIconKey) => void;
  category?: RoutineIcon['category'];
}

export function RoutineIconPicker({ currentIcon, onSelect, category }: RoutineIconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RoutineIcon['category'] | 'all'>(category || 'all');

  // Get icons to display
  const categories = getIconCategories();
  const allIcons = selectedCategory === 'all'
    ? Object.entries(require('@/lib/constants/routine-icons').ROUTINE_ICONS) as [RoutineIconKey, RoutineIcon][]
    : getIconsByCategory(selectedCategory);

  // Filter by search term
  const filteredIcons = searchTerm
    ? allIcons.filter(([key, icon]) =>
        icon.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        key.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allIcons;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div>
        <Label htmlFor="icon-search">Search Icons</Label>
        <Input
          id="icon-search"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Category Filter */}
      {!category && (
        <div>
          <Label htmlFor="category-filter">Category</Label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as RoutineIcon['category'] | 'all')}
            className="w-full mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Icon Grid */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 max-h-80 overflow-y-auto">
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
          {filteredIcons.map(([key, icon]) => {
            const IconComponent = icon.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all hover:scale-105 hover:shadow-md ${
                  currentIcon === key
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
                title={icon.label}
              >
                <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
                <span className="text-[8px] sm:text-[9px] mt-1 text-center truncate w-full">
                  {icon.label.split(' ').slice(0, 2).join(' ')}
                </span>
              </button>
            );
          })}
        </div>

        {filteredIcons.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No icons found matching "{searchTerm}"
          </div>
        )}
      </div>

      {/* Preview */}
      {currentIcon && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {(() => {
            const iconData = require('@/lib/constants/routine-icons').ROUTINE_ICONS[currentIcon as RoutineIconKey];
            if (!iconData) return <div className="text-3xl">{currentIcon}</div>;
            const IconComponent = iconData.icon;
            return (
              <>
                <IconComponent className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="text-sm font-medium">{iconData.label}</div>
                  <div className="text-xs text-gray-500 capitalize">{iconData.category}</div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
