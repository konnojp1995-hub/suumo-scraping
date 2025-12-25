'use client';

import { useState } from 'react';
import { Property } from './PropertyCard';

export interface SearchConditionsFromUrl {
  prefecture: string;
  city: string;
  propertyType: string;
  minRent: string;
  maxRent: string;
  minArea: string;
  maxArea: string;
}

interface UrlScraperProps {
  onScrape: (url: string) => void;
  isLoading?: boolean;
  conditions?: SearchConditionsFromUrl | null;
}

// 都道府県コードマッピング（taパラメータから）
const PREFECTURE_MAP: { [key: string]: string } = {
  '01': '北海道',
  '02': '青森県',
  '03': '岩手県',
  '04': '宮城県',
  '05': '秋田県',
  '06': '山形県',
  '07': '福島県',
  '08': '茨城県',
  '09': '栃木県',
  '10': '群馬県',
  '11': '埼玉県',
  '12': '千葉県',
  '13': '東京都',
  '14': '神奈川県',
  '15': '新潟県',
  '16': '富山県',
  '17': '石川県',
  '18': '福井県',
  '19': '山梨県',
  '20': '長野県',
  '21': '岐阜県',
  '22': '静岡県',
  '23': '愛知県',
  '24': '三重県',
  '25': '滋賀県',
  '26': '京都府',
  '27': '大阪府',
  '28': '兵庫県',
  '29': '奈良県',
  '30': '和歌山県',
  '31': '鳥取県',
  '32': '島根県',
  '33': '岡山県',
  '34': '広島県',
  '35': '山口県',
  '36': '徳島県',
  '37': '香川県',
  '38': '愛媛県',
  '39': '高知県',
  '40': '福岡県',
  '41': '佐賀県',
  '42': '長崎県',
  '43': '熊本県',
  '44': '大分県',
  '45': '宮崎県',
  '46': '鹿児島県',
  '47': '沖縄県',
};

// 建物の種類マッピング（tsパラメータから）
const PROPERTY_TYPE_MAP: { [key: string]: string } = {
  '01': 'マンション',
  '02': 'アパート',
  '03': '一戸建て・その他',
};

// 市区町村コードマッピング（主要なもののみ）
const CITY_MAP: { [key: string]: string } = {
  '15103': '新潟市中央区',
  '13117': '渋谷区',
  // 他の市区町村コードも必要に応じて追加
};

export function parseUrlConditions(url: string): SearchConditionsFromUrl | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    // 都道府県
    const ta = params.get('ta') || '';
    const prefecture = PREFECTURE_MAP[ta] || `都道府県コード: ${ta}`;

    // 市区町村
    const sc = params.get('sc') || '';
    const city = CITY_MAP[sc] || `市区町村コード: ${sc}`;

    // 建物の種類
    const ts = params.get('ts') || '';
    const propertyType = PROPERTY_TYPE_MAP[ts] || `建物種類コード: ${ts}`;

    // 家賃の下限・上限（万円）
    const cb = params.get('cb') || '0';
    const ct = params.get('ct') || '9999999';
    const minRent = parseFloat(cb).toString();
    const maxRent = parseFloat(ct).toString();

    // 面積の下限・上限（㎡？）
    const mb = params.get('mb') || '0';
    const mt = params.get('mt') || '9999999';
    const minArea = parseFloat(mb).toString();
    const maxArea = parseFloat(mt).toString();

    return {
      prefecture,
      city,
      propertyType,
      minRent,
      maxRent,
      minArea,
      maxArea,
    };
  } catch (error) {
    console.error('URL解析エラー:', error);
    return null;
  }
}

export default function UrlScraper({ onScrape, isLoading = false, conditions }: UrlScraperProps) {
  const [url, setUrl] = useState('');

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleScrape = () => {
    if (!url.trim()) {
      alert('SUUMOのURLを入力してください');
      return;
    }

    if (!url.includes('suumo.jp')) {
      alert('SUUMOのURLを入力してください');
      return;
    }

    onScrape(url.trim());
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        SUUMO URL スクレイピング
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SUUMO検索結果のURL
          </label>
          <input
            type="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://suumo.jp/jj/chintai/ichiran/FR301FC001/?ar=040&ta=15&..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-gray-200"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            SUUMOで検索した結果ページのURLを貼り付けてください
          </p>
        </div>

        {conditions && (
          <div className="bg-gray-50 dark:bg-zinc-800 rounded-md p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              検索条件
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">都道府県:</span>
                <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">
                  {conditions.prefecture}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">市区町村:</span>
                <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">
                  {conditions.city}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">建物の種類:</span>
                <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">
                  {conditions.propertyType}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">家賃:</span>
                <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">
                  {parseFloat(conditions.minRent) > 0 ? `${conditions.minRent}万円` : '下限なし'} ～{' '}
                  {parseFloat(conditions.maxRent) < 9999999 ? `${conditions.maxRent}万円` : '上限なし'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">面積:</span>
                <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">
                  {parseFloat(conditions.minArea) > 0 ? `${conditions.minArea}㎡` : '下限なし'} ～{' '}
                  {parseFloat(conditions.maxArea) < 9999999 ? `${conditions.maxArea}㎡` : '上限なし'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            onClick={handleScrape}
            disabled={isLoading || !url.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'スクレイピング中...' : 'スクレイピング開始'}
          </button>
        </div>
      </div>
    </div>
  );
}


