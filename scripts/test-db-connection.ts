// Supabaseデータベース接続テストスクリプト
// 実行方法: npx tsx scripts/test-db-connection.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルを読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ 環境変数が設定されていません:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testConnection() {
  console.log('🔍 Supabaseデータベース接続をテストしています...\n');

  try {
    // 1. テーブル一覧を取得
    console.log('1. テーブル一覧を取得中...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      // information_schemaにアクセスできない場合は、直接テーブルにアクセスしてみる
      console.log('   (information_schemaにアクセスできません。直接テーブルにアクセスを試みます...)');
    } else {
      console.log('   ✓ テーブル一覧:', tables?.map((t: any) => t.table_name).join(', ') || 'なし');
    }

    // 2. scraping_jobsテーブルを確認
    console.log('\n2. scraping_jobsテーブルを確認中...');
    const { data: jobs, error: jobsError, count: jobsCount } = await supabase
      .from('scraping_jobs')
      .select('*', { count: 'exact', head: true });

    if (jobsError) {
      console.error('   ❌ scraping_jobsテーブルにアクセスできません:', jobsError.message);
      console.error('   → テーブルが存在しない可能性があります。schema.sqlを実行してください。');
    } else {
      console.log(`   ✓ scraping_jobsテーブル: ${jobsCount || 0}件のレコード`);
    }

    // 3. scraping_executionsテーブルを確認
    console.log('\n3. scraping_executionsテーブルを確認中...');
    const { data: executions, error: executionsError, count: executionsCount } = await supabase
      .from('scraping_executions')
      .select('*', { count: 'exact', head: true });

    if (executionsError) {
      console.error('   ❌ scraping_executionsテーブルにアクセスできません:', executionsError.message);
    } else {
      console.log(`   ✓ scraping_executionsテーブル: ${executionsCount || 0}件のレコード`);
    }

    // 4. propertiesテーブルを確認
    console.log('\n4. propertiesテーブルを確認中...');
    const { data: properties, error: propertiesError, count: propertiesCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    if (propertiesError) {
      console.error('   ❌ propertiesテーブルにアクセスできません:', propertiesError.message);
    } else {
      console.log(`   ✓ propertiesテーブル: ${propertiesCount || 0}件のレコード`);
    }

    // 5. 接続成功の確認
    console.log('\n✅ データベース接続は成功しました！');
    console.log('\n📊 データベースの状態:');
    console.log(`   - スクレイピングジョブ: ${jobsCount || 0}件`);
    console.log(`   - 実行履歴: ${executionsCount || 0}件`);
    console.log(`   - 物件情報: ${propertiesCount || 0}件`);

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error.message);
    if (error.message.includes('Invalid API key')) {
      console.error('\n💡 解決策:');
      console.error('   - SUPABASE_SERVICE_ROLE_KEYが正しいか確認してください');
      console.error('   - Supabase Dashboard > Settings > API からService Role Keyを確認してください');
    } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
      console.error('\n💡 解決策:');
      console.error('   - frontend/supabase/schema.sqlをSupabaseのSQLエディタで実行してください');
    }
    process.exit(1);
  }
}

testConnection();

