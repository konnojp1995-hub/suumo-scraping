'use client';

import PropertyCard, { Property } from './PropertyCard';
import CSVExportButton from './CSVExportButton';

interface SearchResultsProps {
  properties: Property[];
  isLoading?: boolean;
}

export default function SearchResults({ properties, isLoading = false }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">検索中...</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">検索結果がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200">
            検索結果 ({properties.length}件)
          </h2>
          <CSVExportButton properties={properties} />
        </div>
      </div>

      <div className="space-y-4">
        {properties.map((property, index) => (
          <PropertyCard key={index} property={property} />
        ))}
      </div>
    </div>
  );
}


