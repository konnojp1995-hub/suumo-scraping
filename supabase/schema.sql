-- SUUMO物件スクレイピングツール データベーススキーマ
-- SupabaseのSQLエディタでこのファイルの内容を実行してください

-- 1. スクレイピングジョブテーブル（検索条件とスケジュール設定）
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  search_url TEXT NOT NULL,
  job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('manual', 'scheduled')),
  schedule_time1 TIME,
  schedule_time2 TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- 2. スクレイピング実行履歴テーブル
CREATE TABLE IF NOT EXISTS scraping_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES scraping_jobs(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  total_scraped INTEGER DEFAULT 0,
  new_properties INTEGER DEFAULT 0,
  error_message TEXT,
  execution_type VARCHAR(20) NOT NULL CHECK (execution_type IN ('manual', 'scheduled'))
);

-- 3. 物件情報テーブル
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES scraping_executions(id) ON DELETE CASCADE,
  property_code VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  title VARCHAR(500),
  address TEXT,
  station_walk TEXT,
  floor VARCHAR(100),
  rent VARCHAR(100),
  management_fee VARCHAR(100),
  deposit VARCHAR(100),
  key_money VARCHAR(100),
  layout VARCHAR(100),
  area VARCHAR(100),
  property_type VARCHAR(100),
  posted_date VARCHAR(100),
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_code)
);

-- 4. インデックス（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_properties_execution_id ON properties(execution_id);
CREATE INDEX IF NOT EXISTS idx_properties_property_code ON properties(property_code);
CREATE INDEX IF NOT EXISTS idx_executions_job_id ON scraping_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON scraping_executions(executed_at DESC);

-- 5. RLS（Row Level Security）の設定
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- ポリシー: 全員が読み書き可能（本番環境では適切に設定してください）
DROP POLICY IF EXISTS "Enable all operations for all users" ON scraping_jobs;
CREATE POLICY "Enable all operations for all users" ON scraping_jobs 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON scraping_executions;
CREATE POLICY "Enable all operations for all users" ON scraping_executions 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON properties;
CREATE POLICY "Enable all operations for all users" ON properties 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);






