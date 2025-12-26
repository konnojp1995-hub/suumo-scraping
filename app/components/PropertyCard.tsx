'use client';

export interface Property {
  url: string;
  title: string;
  address: string; // 所在地
  stationWalk: string; // 駅徒歩
  floor: string; // 階
  rent: string; // 賃料
  managementFee: string; // 管理費
  deposit: string; // 敷金
  keyMoney: string; // 礼金
  layout: string; // 間取り
  area: string; // 専有面積
  propertyType: string; // 建物種別
  propertyCode: string; // SUUMO物件コード
  postedDate: string; // 情報更新日
  [key: string]: string;
}

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="flex flex-col space-y-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            {property.title || '物件名なし'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {property.address || '住所情報なし'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs sm:text-sm">
          {property.address && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">所在地</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">{property.address}</p>
            </div>
          )}
          {property.stationWalk && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">駅徒歩</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">{property.stationWalk}</p>
            </div>
          )}
          {property.floor && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">階</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">{property.floor}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500 dark:text-gray-400">賃料</span>
            <p className="font-medium text-gray-800 dark:text-gray-200">{property.rent || '0円'}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">管理費</span>
            <p className="font-medium text-gray-800 dark:text-gray-200">{property.managementFee || '0円'}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">敷金</span>
            <p className="font-medium text-gray-800 dark:text-gray-200">{property.deposit || '0円'}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">礼金</span>
            <p className="font-medium text-gray-800 dark:text-gray-200">{property.keyMoney || '0円'}</p>
          </div>
          {property.layout && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">間取り</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">{property.layout}</p>
            </div>
          )}
          {property.area && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">専有面積</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">{property.area}</p>
            </div>
          )}
          {property.propertyType && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">建物種別</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">{property.propertyType}</p>
            </div>
          )}
          {property.propertyCode && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">SUUMO物件コード</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">{property.propertyCode}</p>
            </div>
          )}
        </div>

        {property.url && (
          <div className="pt-2">
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium underline break-all"
            >
              {property.url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

