import { supabase, supabaseAdmin } from '../../lib/supabase';
import { Property } from '../components/PropertyCard';

// サーバーサイドではadminクライアントを使用、クライアントサイドでは通常のクライアントを使用
const dbClient = supabaseAdmin || supabase;

export interface ScrapingJob {
  id?: string;
  name: string;
  search_url: string;
  job_type: 'manual' | 'scheduled';
  schedule_time1?: string; // HH:MM:SS形式
  schedule_time2?: string;
  is_active?: boolean;
}

export interface ScrapingExecution {
  id?: string;
  job_id: string;
  status: 'running' | 'completed' | 'failed';
  total_scraped?: number;
  new_properties?: number;
  error_message?: string;
  execution_type: 'manual' | 'scheduled';
}

/**
 * スクレイピングジョブを作成
 */
export async function createScrapingJob(job: ScrapingJob): Promise<string | null> {
  try {
    const { data, error } = await dbClient
      .from('scraping_jobs')
      .insert({
        name: job.name,
        search_url: job.search_url,
        job_type: job.job_type,
        schedule_time1: job.schedule_time1 || null,
        schedule_time2: job.schedule_time2 || null,
        is_active: job.is_active ?? true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('ジョブ作成エラー:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('ジョブ作成処理中のエラー:', error);
    return null;
  }
}

/**
 * スクレイピングジョブを取得
 */
export async function getScrapingJob(jobId: string) {
  try {
    const { data, error } = await dbClient
      .from('scraping_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('ジョブ取得エラー:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('ジョブ取得処理中のエラー:', error);
    return null;
  }
}

/**
 * 全てのスクレイピングジョブを取得
 */
export async function getAllScrapingJobs() {
  try {
    const { data, error } = await dbClient
      .from('scraping_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ジョブ一覧取得エラー:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('ジョブ一覧取得処理中のエラー:', error);
    return [];
  }
}

/**
 * スクレイピング実行履歴を作成
 */
export async function createScrapingExecution(
  execution: ScrapingExecution
): Promise<string | null> {
  try {
    const { data, error } = await dbClient
      .from('scraping_executions')
      .insert({
        job_id: execution.job_id,
        status: execution.status,
        total_scraped: execution.total_scraped || 0,
        new_properties: execution.new_properties || 0,
        error_message: execution.error_message || null,
        execution_type: execution.execution_type,
      })
      .select('id')
      .single();

    if (error) {
      console.error('実行履歴作成エラー:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('実行履歴作成処理中のエラー:', error);
    return null;
  }
}

/**
 * スクレイピング実行履歴を更新
 */
export async function updateScrapingExecution(
  executionId: string,
  updates: Partial<ScrapingExecution>
) {
  try {
    const { error } = await dbClient
      .from('scraping_executions')
      .update(updates)
      .eq('id', executionId);

    if (error) {
      console.error('実行履歴更新エラー:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('実行履歴更新処理中のエラー:', error);
    return false;
  }
}

/**
 * 物件情報を一括保存
 */
export async function saveProperties(
  executionId: string,
  properties: Property[]
): Promise<number> {
  if (properties.length === 0) {
    return 0;
  }

  try {
    const propertyData = properties.map(prop => ({
      execution_id: executionId,
      property_code: prop.propertyCode || '',
      url: prop.url,
      title: prop.title || '',
      address: prop.address || '',
      station_walk: prop.stationWalk || '',
      floor: prop.floor || '',
      rent: prop.rent || '',
      management_fee: prop.managementFee || '',
      deposit: prop.deposit || '',
      key_money: prop.keyMoney || '',
      layout: prop.layout || '',
      area: prop.area || '',
      property_type: prop.propertyType || '',
      posted_date: prop.postedDate || '',
    }));

    // バッチで挿入（Supabaseは一度に大量のデータを挿入できる）
    const { error } = await dbClient
      .from('properties')
      .insert(propertyData);

    if (error) {
      console.error('物件情報保存エラー:', error);
      // ユニーク制約違反（重複）の場合は一部が保存されている可能性がある
      // エラーを無視して続行するか、エラーを返すかは要件による
      throw error;
    }

    return properties.length;
  } catch (error) {
    console.error('物件情報保存処理中のエラー:', error);
    throw error;
  }
}

/**
 * 実行履歴一覧を取得
 */
export async function getScrapingExecutions(limit = 50) {
  try {
    const { data, error } = await dbClient
      .from('scraping_executions')
      .select(`
        *,
        scraping_jobs (
          id,
          name,
          search_url
        )
      `)
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('実行履歴一覧取得エラー:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('実行履歴一覧取得処理中のエラー:', error);
    return [];
  }
}

/**
 * 実行履歴詳細を取得
 */
export async function getScrapingExecution(executionId: string) {
  try {
    const { data, error } = await dbClient
      .from('scraping_executions')
      .select(`
        *,
        scraping_jobs (
          id,
          name,
          search_url
        )
      `)
      .eq('id', executionId)
      .single();

    if (error) {
      console.error('実行履歴詳細取得エラー:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('実行履歴詳細取得処理中のエラー:', error);
    return null;
  }
}

/**
 * 今日の指定時刻に未実行のジョブを取得（キュー管理用）
 * @param targetTime 対象時刻（'09:15:00' または '22:15:00'）
 * @returns 未実行のジョブの配列
 */
export async function getPendingJobsForTime(targetTime: string) {
  try {
    // 現在時刻（JST）を取得
    const now = new Date();
    const jstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    
    // 今日の日付を取得（JST）
    const todayStart = new Date(jstTime);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(jstTime);
    todayEnd.setHours(23, 59, 59, 999);
    
    // 対象時刻をDateオブジェクトに変換
    const [hours, minutes] = targetTime.split(':').map(Number);
    const targetDateTime = new Date(jstTime);
    targetDateTime.setHours(hours, minutes, 0, 0);
    
    // アクティブな定期実行ジョブを取得（schedule_time1またはschedule_time2が対象時刻）
    const { data: jobs, error: jobsError } = await dbClient
      .from('scraping_jobs')
      .select('*')
      .eq('job_type', 'scheduled')
      .eq('is_active', true)
      .or(`schedule_time1.eq.${targetTime},schedule_time2.eq.${targetTime}`);
    
    if (jobsError) {
      console.error('ジョブ取得エラー:', jobsError);
      return [];
    }
    
    if (!jobs || jobs.length === 0) {
      return [];
    }
    
    // 各ジョブについて、今日の対象時刻以降に完了した実行履歴があるか確認
    const pendingJobs = [];
    
    for (const job of jobs) {
      const { data: executions, error: execError } = await dbClient
        .from('scraping_executions')
        .select('id, status, executed_at')
        .eq('job_id', job.id)
        .eq('execution_type', 'scheduled')
        .gte('executed_at', todayStart.toISOString())
        .lte('executed_at', todayEnd.toISOString())
        .order('executed_at', { ascending: false })
        .limit(10);
      
      if (execError) {
        console.error(`ジョブ ${job.id} の実行履歴取得エラー:`, execError);
        // エラーが発生してもそのジョブは未実行として扱う
        pendingJobs.push(job);
        continue;
      }
      
      // 対象時刻以降に完了した実行履歴があるかチェック
      const hasCompletedExecution = executions?.some((exec: any) => {
        const execTime = new Date(exec.executed_at);
        return execTime >= targetDateTime && exec.status === 'completed';
      });
      
      // 未実行または失敗のみの場合、キューに追加
      if (!hasCompletedExecution) {
        pendingJobs.push(job);
      }
    }
    
    return pendingJobs;
  } catch (error) {
    console.error('未実行ジョブ取得処理中のエラー:', error);
    return [];
  }
}

/**
 * 実行履歴に紐づく物件一覧を取得
 */
export async function getExecutionProperties(executionId: string) {
  try {
    const { data, error } = await dbClient
      .from('properties')
      .select('*')
      .eq('execution_id', executionId)
      .order('scraped_at', { ascending: false });

    if (error) {
      console.error('物件一覧取得エラー:', error);
      return [];
    }

    // Property型に変換
    return (data || []).map(prop => ({
      url: prop.url,
      title: prop.title || '',
      address: prop.address || '',
      stationWalk: prop.station_walk || '',
      floor: prop.floor || '',
      rent: prop.rent || '',
      managementFee: prop.management_fee || '',
      deposit: prop.deposit || '',
      keyMoney: prop.key_money || '',
      layout: prop.layout || '',
      area: prop.area || '',
      propertyType: prop.property_type || '',
      propertyCode: prop.property_code || '',
      postedDate: prop.posted_date || '',
    } as Property));
  } catch (error) {
    console.error('物件一覧取得処理中のエラー:', error);
    return [];
  }
}

/**
 * 指定時刻に実行すべきジョブを取得
 */
export async function getScheduledJobsByTime(time: string): Promise<ScrapingJob[]> {
  try {
    const { data, error } = await dbClient
      .from('scraping_jobs')
      .select('*')
      .eq('job_type', 'scheduled')
      .eq('is_active', true)
      .or(`schedule_time1.eq.${time},schedule_time2.eq.${time}`);

    if (error) {
      console.error('スケジュールジョブ取得エラー:', error);
      return [];
    }

    return (data || []) as ScrapingJob[];
  } catch (error) {
    console.error('スケジュールジョブ取得処理中のエラー:', error);
    return [];
  }
}

