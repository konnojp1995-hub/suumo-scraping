// データベース接続テスト用のAPIエンドポイント
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: any = {
      connection: 'success',
      timestamp: new Date().toISOString(),
      tables: {} as any,
    };

    // scraping_jobsテーブルを確認
    const { data: jobs, error: jobsError, count: jobsCount } = await supabase
      .from('scraping_jobs')
      .select('*', { count: 'exact', head: true });

    results.tables.scraping_jobs = {
      exists: !jobsError,
      count: jobsCount || 0,
      error: jobsError?.message || null,
    };

    // scraping_executionsテーブルを確認
    const { data: executions, error: executionsError, count: executionsCount } = await supabase
      .from('scraping_executions')
      .select('*', { count: 'exact', head: true });

    results.tables.scraping_executions = {
      exists: !executionsError,
      count: executionsCount || 0,
      error: executionsError?.message || null,
    };

    // propertiesテーブルを確認
    const { data: properties, error: propertiesError, count: propertiesCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    results.tables.properties = {
      exists: !propertiesError,
      count: propertiesCount || 0,
      error: propertiesError?.message || null,
    };

    const allTablesExist = 
      results.tables.scraping_jobs.exists &&
      results.tables.scraping_executions.exists &&
      results.tables.properties.exists;

    if (allTablesExist) {
      return NextResponse.json({
        status: 'success',
        message: '✅ データベース接続成功！すべてのテーブルが存在します。',
        ...results,
      });
    } else {
      return NextResponse.json({
        status: 'partial',
        message: '⚠️ データベース接続は成功しましたが、一部のテーブルが見つかりません。',
        ...results,
        suggestion: 'frontend/supabase/schema.sqlをSupabaseのSQLエディタで実行してください。',
      }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: '❌ データベース接続エラー',
      error: error.message,
      suggestion: '環境変数（NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY）が正しく設定されているか確認してください。',
    }, { status: 500 });
  }
}

