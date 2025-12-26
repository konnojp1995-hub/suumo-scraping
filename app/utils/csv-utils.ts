import { Property } from '@/app/components/PropertyCard';

export function generateCSVContent(properties: Property[]): string {
  if (properties.length === 0) {
    return '';
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

  return csvRows.join('\n');
}






