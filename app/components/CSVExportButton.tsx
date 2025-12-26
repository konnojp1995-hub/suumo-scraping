'use client';

import { Property } from './PropertyCard';

interface CSVExportButtonProps {
  properties: Property[];
}

export default function CSVExportButton({ properties }: CSVExportButtonProps) {
  const exportToCSV = () => {
    if (properties.length === 0) {
      alert('出力するデータがありません');
      return;
    }

    // カラム名の日本語マッピング
    const headerMap: { [key: string]: string } = {
      'url': 'URL',
      'title': '物件名',
      'address': '所在地',
      'stationWalk': '駅徒歩',
      'floor': '階',
      'rent': '賃料',
      'managementFee': '管理費',
      'deposit': '敷金',
      'keyMoney': '礼金',
      'layout': '間取り',
      'area': '専有面積',
      'propertyType': '建物種別',
      'propertyCode': 'SUUMO物件コード',
      'postedDate': '情報更新日',
    };

    // 最初の物件のキーを使用してヘッダーを生成
    const propertyKeys = Object.keys(properties[0]);
    const headers = propertyKeys.map(key => headerMap[key] || key);
    
    // CSVデータを生成
    const csvRows = [
      headers.join(','),
      ...properties.map(property =>
        propertyKeys.map(key => {
          const value = property[key] || '';
          // カンマや改行を含む場合はダブルクォートで囲む
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    
    // BOMを追加してExcelで文字化けしないようにする
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // ダウンロードリンクを作成
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suumo_search_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportToCSV}
      disabled={properties.length === 0}
      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      CSV出力
    </button>
  );
}

