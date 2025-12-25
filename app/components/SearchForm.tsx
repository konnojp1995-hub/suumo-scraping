'use client';

import { useState } from 'react';

export interface SearchConditions {
  prefecture: string;
  city: string;
  minArea: string;
  maxArea: string;
  minRent: string;
  maxRent: string;
  isDetached: boolean | null;
  postedDate: string;
}

interface SearchFormProps {
  onSearch: (conditions: SearchConditions) => void;
  isLoading?: boolean;
}

const PREFECTURES = [
  '選択してください',
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

export default function SearchForm({ onSearch, isLoading = false }: SearchFormProps) {
  const [conditions, setConditions] = useState<SearchConditions>({
    prefecture: '',
    city: '',
    minArea: '',
    maxArea: '',
    minRent: '',
    maxRent: '',
    isDetached: null,
    postedDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(conditions);
  };

  const handleChange = (field: keyof SearchConditions, value: string | boolean | null) => {
    setConditions(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        検索条件
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 都道府県 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            都道府県
          </label>
          <select
            value={conditions.prefecture}
            onChange={(e) => handleChange('prefecture', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-gray-200"
          >
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref === '選択してください' ? '' : pref}>
                {pref}
              </option>
            ))}
          </select>
        </div>

        {/* 市区町村 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            市区町村
          </label>
          <input
            type="text"
            value={conditions.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="例: 渋谷区"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-gray-200"
          />
        </div>

        {/* 面積（最小） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            面積（最小）㎡
          </label>
          <input
            type="number"
            value={conditions.minArea}
            onChange={(e) => handleChange('minArea', e.target.value)}
            placeholder="例: 20"
            min="0"
            step="0.1"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-gray-200"
          />
        </div>

        {/* 面積（最大） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            面積（最大）㎡
          </label>
          <input
            type="number"
            value={conditions.maxArea}
            onChange={(e) => handleChange('maxArea', e.target.value)}
            placeholder="例: 50"
            min="0"
            step="0.1"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-gray-200"
          />
        </div>

        {/* 賃料（最小） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            賃料（最小）円
          </label>
          <input
            type="number"
            value={conditions.minRent}
            onChange={(e) => handleChange('minRent', e.target.value)}
            placeholder="例: 50000"
            min="0"
            step="1000"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-gray-200"
          />
        </div>

        {/* 賃料（最大） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            賃料（最大）円
          </label>
          <input
            type="number"
            value={conditions.maxRent}
            onChange={(e) => handleChange('maxRent', e.target.value)}
            placeholder="例: 150000"
            min="0"
            step="1000"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-gray-200"
          />
        </div>

        {/* 戸建て */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            戸建て
          </label>
          <select
            value={conditions.isDetached === null ? '' : conditions.isDetached ? 'true' : 'false'}
            onChange={(e) => {
              const value = e.target.value;
              handleChange('isDetached', value === '' ? null : value === 'true');
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-gray-200"
          >
            <option value="">指定なし</option>
            <option value="true">戸建てのみ</option>
            <option value="false">マンションのみ</option>
          </select>
        </div>

        {/* 掲載日時 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            掲載日時（以降）
          </label>
          <input
            type="date"
            value={conditions.postedDate}
            onChange={(e) => handleChange('postedDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '検索中...' : '検索'}
        </button>
      </div>
    </form>
  );
}


