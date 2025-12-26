import { supabase, supabaseAdmin } from '../../lib/supabase';
import { Property } from '../components/PropertyCard';

/**
 * 重複物件をフィルタリング
 * @param properties スクレイピングで取得した物件リスト
 * @param jobId ジョブID（指定された場合、そのジョブの過去の実行履歴から重複チェック）
 * @param daysToCheck 過去何日間をチェックするか（定期実行の場合のみ有効、デフォルト: 14日）
 * @param checkAllScheduledJobs 定期実行の場合、すべての定期実行ジョブを対象にするか（デフォルト: false、jobIdが指定されている場合のみそのジョブを対象）
 * @returns 新規物件リストと重複件数
 */
export async function filterDuplicateProperties(
  properties: Property[],
  jobId?: string,
  daysToCheck?: number,
  checkAllScheduledJobs: boolean = false
): Promise<{ newProperties: Property[]; duplicateCount: number }> {
  const propertyCodes = properties
    .map(p => p.propertyCode)
    .filter((code): code is string => !!code && code.trim() !== '');

  if (propertyCodes.length === 0) {
    return { newProperties: properties, duplicateCount: 0 };
  }

  try {
    // Supabaseクライアント（admin権限が必要な場合はsupabaseAdminを使用）
    const client = supabaseAdmin || supabase;

    // 既存の物件コードを取得
    let query = client
      .from('properties')
      .select('property_code')
      .in('property_code', propertyCodes);

    // 過去N日間をチェックする場合（定期実行の場合）
    if (daysToCheck && daysToCheck > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToCheck);
      
      if (checkAllScheduledJobs) {
        // すべての定期実行ジョブの過去N日間の実行履歴を取得
        const { data: executions, error: execError } = await client
          .from('scraping_executions')
          .select('id')
          .eq('execution_type', 'scheduled')
          .gte('executed_at', cutoffDate.toISOString());

        if (execError) {
          console.error('実行履歴の取得エラー:', execError);
          // エラーの場合は全件チェックにフォールバック
        } else if (executions && executions.length > 0) {
          const executionIds = executions.map(e => e.id);
          query = query.in('execution_id', executionIds);
          console.log(`過去${daysToCheck}日間の定期実行履歴: ${executions.length}件`);
        } else {
          // 実行履歴がない場合は全て新規として扱う
          console.log(`過去${daysToCheck}日間の定期実行履歴がありません`);
          return { newProperties: properties, duplicateCount: 0 };
        }
      } else if (jobId) {
        // 特定のジョブの過去N日間の実行履歴を取得
        const { data: executions, error: execError } = await client
          .from('scraping_executions')
          .select('id')
          .eq('job_id', jobId)
          .gte('executed_at', cutoffDate.toISOString());

        if (execError) {
          console.error('実行履歴の取得エラー:', execError);
          // エラーの場合は全件チェックにフォールバック
        } else if (executions && executions.length > 0) {
          const executionIds = executions.map(e => e.id);
          query = query.in('execution_id', executionIds);
          console.log(`ジョブID=${jobId}の過去${daysToCheck}日間の実行履歴: ${executions.length}件`);
        } else {
          // 実行履歴がない場合は全て新規として扱う
          console.log(`ジョブID=${jobId}の過去${daysToCheck}日間の実行履歴がありません`);
          return { newProperties: properties, duplicateCount: 0 };
        }
      }
    } else if (jobId) {
      // 特定のジョブの過去の実行履歴のみをチェックする場合（期間制限なし）
      const { data: executions, error: execError } = await client
        .from('scraping_executions')
        .select('id')
        .eq('job_id', jobId);

      if (execError) {
        console.error('実行履歴の取得エラー:', execError);
        // エラーの場合は全件チェックにフォールバック
      } else if (executions && executions.length > 0) {
        const executionIds = executions.map(e => e.id);
        query = query.in('execution_id', executionIds);
      } else {
        // 実行履歴がない場合は全て新規として扱う
        return { newProperties: properties, duplicateCount: 0 };
      }
    }

    const { data: existingCodes, error } = await query;

    if (error) {
      console.error('重複チェックエラー:', error);
      // エラーの場合は全て新規として扱う（データベース接続エラー等）
      return { newProperties: properties, duplicateCount: 0 };
    }

    const existingCodeSet = new Set(
      existingCodes?.map(p => p.property_code) || []
    );

    const newProperties = properties.filter(
      p => !p.propertyCode || !existingCodeSet.has(p.propertyCode)
    );

    return {
      newProperties,
      duplicateCount: properties.length - newProperties.length,
    };
  } catch (error) {
    console.error('重複チェック処理中のエラー:', error);
    // エラーの場合は全て新規として扱う
    return { newProperties: properties, duplicateCount: 0 };
  }
}

