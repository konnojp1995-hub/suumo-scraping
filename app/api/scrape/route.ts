import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { Property } from '@/app/components/PropertyCard';
import { sendLineNotificationWithCSV } from '../line-messaging';
import { generateCSVContent } from '@/app/utils/csv-utils';
import { filterDuplicateProperties } from '@/app/utils/duplicate-checker';
import {
  createScrapingExecution,
  updateScrapingExecution,
  saveProperties,
  getScrapingJob,
} from '@/app/utils/db-operations';
import { scrapePropertiesFromUrl, scrapePropertyDetail, extractPropertyUrls } from '@/lib/scraping';

// 以下の関数は共通モジュール lib/scraping.ts に移動しました
// 互換性のため、extractProperties関数のみ残します

// 物件情報を抽出（旧関数、互換性のため残す）
function extractProperties(html: string, baseUrl: string): Property[] {
  const $ = cheerio.load(html);
  const properties: Property[] = [];

  // デバッグ: HTMLの構造を確認
  console.log('HTMLサイズ:', html.length);
  console.log('.cassetteitemの数:', $('.cassetteitem').length);
  console.log('物件リンクの数:', $('a[href*="/chintai/"]').length);
  
  // 最初の数件のリンクを確認
  $('a[href*="/chintai/"]').slice(0, 5).each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    console.log(`リンク${i + 1}: ${href} - ${text.substring(0, 50)}`);
  });

  const isValidProperty = (p: Property) => {
    // SUUMOの物件URLパターン: /chintai/jnc_XXXXXXXX/ または /chintai/jc_XXXXXXXX/
    const hasDetailUrl = /\/chintai\/(jnc|jc)_\d+/.test(p.url);
    const hasData = p.rent || p.area || p.layout || p.address;
    const isNavigation = p.title === '賃貸' || p.url === baseUrl || p.title === '物件検索';
    return hasDetailUrl && hasData && !isNavigation;
  };

  // SUUMOの実際のHTML構造に基づくセレクタ
  // 物件リストは通常 .cassetteitem クラスで囲まれている
  $('.cassetteitem').each((index, element) => {
    try {
      const $el = $(element);
      
      // 物件タイトルとURL（複数のパターンを試す）
      // SUUMOの物件URLパターン: /chintai/jnc_XXXXXXXX/ または /chintai/jc_XXXXXXXX/
      // まず、/chintai/jnc_または/chintai/jc_で始まるリンクを直接探す
      let titleLink = $el.find('a[href*="/chintai/jnc_"], a[href*="/chintai/jc_"]').first();
      let relativeUrl = titleLink.length > 0 ? titleLink.attr('href') || '' : '';
      
      // 見つからない場合、すべての/chintai/リンクをチェック
      if (!relativeUrl || !/\/chintai\/(jnc|jc)_\d+/.test(relativeUrl)) {
        $el.find('a[href*="/chintai/"]').each((i, linkEl) => {
          const href = $(linkEl).attr('href') || '';
          // javascript:void(0)を除外し、jnc_またはjc_で始まるURLを探す
          if (href && href !== 'javascript:void(0)' && /\/chintai\/(jnc|jc)_\d+/.test(href)) {
            titleLink = $(linkEl);
            relativeUrl = href;
            return false; // break
          }
        });
      }
      
      // タイトルを取得
      const title = $el.find('.cassetteitem_other-title, h2, h3').first().text().trim() || 
                    titleLink.text().trim() || '物件名なし';
      
      const url = relativeUrl.startsWith('http')
        ? relativeUrl
        : relativeUrl.startsWith('/')
        ? `https://suumo.jp${relativeUrl}`
        : '';

      // URL抽出結果をログに出力（早期リターンの前に）
      // SUUMOの物件URLパターン: /chintai/jnc_XXXXXXXX/ または /chintai/jc_XXXXXXXX/
      if (!url || !/\/chintai\/(jnc|jc)_\d+/.test(url)) {
        console.log(`物件${index + 1}: URLが無効または抽出失敗 - relativeUrl: ${relativeUrl}, url: ${url}`);
        return;
      }
      
      console.log(`物件${index + 1} URL抽出成功: ${url}`);

      // SUUMOの物件情報は.cassetteitem_table内のテーブル構造に表示されている
      // 物件情報は建物単位（.cassetteitem）と部屋単位（.cassetteitem_rooms tr）で構成される
      const table = $el.find('.cassetteitem_table').first();
      const detailCols = $el.find('.cassetteitem_detail-col1, .cassetteitem_detail-col2, .cassetteitem_detail-col3');
      
      // 所在地（.cassetteitem_detail-col1の最初の行から）
      let address = '';
      const detailCol1 = $el.find('.cassetteitem_detail-col1').first();
      if (detailCol1.length > 0) {
        // 所在地は通常、最初のテキストノード
        address = detailCol1.contents().filter(function() {
          return this.nodeType === 3; // テキストノード
        }).first().text().trim() || detailCol1.text().split('\n')[0].trim();
      }
      
      // 駅徒歩情報（所在地の後に表示される駅名と徒歩時間）
      let stationWalk = '';
      const stationInfo = $el.find('.cassetteitem_detail-col1').find('div, a').filter(function() {
        const text = $(this).text();
        return text.includes('駅') || text.includes('歩');
      }).first();
      stationWalk = stationInfo.text().trim() || '';

      // 建物種別（.cassetteitem_other-titleから）
      let propertyType = '';
      const otherTitle = $el.find('.cassetteitem_other-title').first();
      propertyType = otherTitle.text().trim();
      if (!propertyType) {
        // 「賃貸一戸建て」「賃貸マンション」などのテキストから抽出
        const typeText = $el.text();
        if (typeText.includes('一戸建て') || typeText.includes('戸建て')) {
          propertyType = '一戸建て';
        } else if (typeText.includes('マンション')) {
          propertyType = 'マンション';
        } else if (typeText.includes('アパート')) {
          propertyType = 'アパート';
        }
      }

      // テーブルから部屋情報を取得（最初の部屋の情報を使用）
      const firstRoomRow = table.find('tbody tr').first();
      
      // 階（テーブルの1列目）
      let floor = firstRoomRow.find('td').eq(0).text().trim() || '';

      // 賃料と管理費（テーブルの2列目、.cassetteitem_price--rentから）
      let rent = '';
      let managementFee = '';
      const priceCell = firstRoomRow.find('td').eq(1);
      const rentText = priceCell.find('.cassetteitem_price--rent').text().trim() || priceCell.text().trim();
      // 賃料と管理費を分離（例: "10万円 -" や "8.5万円 / 5000円"）
      const rentMatch = rentText.match(/(\d+[,，.]?\d*)\s*万円/);
      if (rentMatch) {
        rent = `${rentMatch[1]}万円`;
        const feeMatch = rentText.match(/[/|]\s*(\d+[,，.]?\d*)\s*円/);
        managementFee = feeMatch ? `${feeMatch[1]}円` : '';
      } else {
        rent = rentText;
      }

      // 敷金・礼金（テーブルの3列目）
      let deposit = '';
      let keyMoney = '';
      const depositKeyCell = firstRoomRow.find('td').eq(2).text().trim();
      // 敷金と礼金を分離（例: "10万円 / 10万円"）
      const depositMatch = depositKeyCell.match(/(\d+[,，.]?\d*)\s*万円/);
      if (depositMatch) {
        deposit = `${depositMatch[1]}万円`;
        const keyMoneyMatch = depositKeyCell.match(/[/|]\s*(\d+[,，.]?\d*)\s*万円/);
        keyMoney = keyMoneyMatch ? `${keyMoneyMatch[1]}万円` : '';
      } else {
        deposit = depositKeyCell;
      }

      // 間取り（テーブルの4列目、.cassetteitem_detail-col2）
      let layout = firstRoomRow.find('td').eq(3).text().trim() || 
                   $el.find('.cassetteitem_detail-col2').first().text().trim() || '';
      if (!layout) {
        const layoutMatch = $el.text().match(/(\d+[LDKSR]+)/);
        layout = layoutMatch ? layoutMatch[1] : '';
      }

      // 専有面積（テーブルの5列目、.cassetteitem_detail-col3）
      let area = firstRoomRow.find('td').eq(4).text().trim() || 
                 $el.find('.cassetteitem_detail-col3').first().text().trim() || '';
      if (!area) {
        const areaMatch = $el.text().match(/(\d+\.?\d*)\s*㎡/);
        area = areaMatch ? `${areaMatch[1]}㎡` : '';
      }

      // 築年数（参考）
      let age = $el.find('.cassetteitem_detail-col4').text().trim() || '';

      // 掲載日（参考）
      let postedDate = $el.find('.cassetteitem_detail-col6').text().trim() || '';

      const prop: Property = {
        url,
        title,
        address,
        stationWalk,
        floor,
        rent,
        managementFee,
        deposit,
        keyMoney,
        layout,
        area,
        propertyType,
        age,
        postedDate,
      };

      // 物件情報の詳細をログに出力
      console.log(`物件${index + 1} 詳細情報:`, {
        title: prop.title || '(タイトルなし)',
        url: prop.url || '(URLなし)',
        address: prop.address || '(所在地なし)',
        stationWalk: prop.stationWalk || '(駅徒歩なし)',
        floor: prop.floor || '(階なし)',
        rent: prop.rent || '(賃料なし)',
        managementFee: prop.managementFee || '(管理費なし)',
        deposit: prop.deposit || '(敷金なし)',
        keyMoney: prop.keyMoney || '(礼金なし)',
        layout: prop.layout || '(間取りなし)',
        area: prop.area || '(面積なし)',
        propertyType: prop.propertyType || '(建物種別なし)',
        isValid: isValidProperty(prop)
      });
      
      // 最初の物件のHTMLをデバッグ用に出力
      if (index === 0) {
        console.log('最初の物件のHTML（最初の500文字）:', $el.html()?.substring(0, 500));
      }

      if (isValidProperty(prop)) {
        properties.push(prop);
      }
    } catch (error) {
      console.error('物件情報の抽出エラー:', error);
    }
  });

  // もし上記のセレクタで取得できない場合、より一般的なセレクタを試す
  if (properties.length === 0) {
    // フォールバック: より一般的なセレクタを使用
    $('article, [class*="property"], [class*="item"]').each((index, element) => {
      try {
        const $el = $(element);
        const titleLink = $el.find('a[href*="/chintai/"]').first();
        const title = titleLink.text().trim() || $el.find('h2, h3').first().text().trim();
        const relativeUrl = titleLink.attr('href') || '';
        const url = relativeUrl.startsWith('http')
          ? relativeUrl
          : relativeUrl.startsWith('/')
          ? `https://suumo.jp${relativeUrl}`
          : '';

        if (!title || !url) return;

        // 詳細情報をテキストから抽出
        const detailText = $el.text();
        const rentMatch = detailText.match(/(\d+[,，]\d+|\d+)\s*円/);
        const areaMatch = detailText.match(/(\d+\.?\d*)\s*㎡/);
        const layoutMatch = detailText.match(/(\d+[LDKSR]+)/);
        const addressMatch = detailText.match(/([都道府県市区町村\d\-]+)/);

        const prop: Property = {
          url,
          title,
          address: addressMatch ? addressMatch[1] : '',
          rent: rentMatch ? `${rentMatch[1]}円` : '',
          area: areaMatch ? `${areaMatch[1]}㎡` : '',
          layout: layoutMatch ? layoutMatch[1] : '',
          age: '',
          floor: '',
          postedDate: '',
        };

        if (isValidProperty(prop)) {
          properties.push(prop);
        }
      } catch (error) {
        console.error('物件情報の抽出エラー（フォールバック）:', error);
      }
    });
  }

  // URLで重複を除外
  const unique = new Map<string, Property>();
  properties.forEach((p) => {
    if (!unique.has(p.url)) {
      unique.set(p.url, p);
    }
  });

  return Array.from(unique.values());
}

export async function POST(request: NextRequest) {
  console.log('API Route: リクエスト受信');
  
  // 環境変数でスクレイピング実行を制御
  const SCRAPING_EXECUTOR = process.env.SCRAPING_EXECUTOR || 'local'; // 'local' | 'github-actions'
  
  // GitHub Actionsで実行する設定の場合、定期実行は拒否
  const body = await request.json().catch(() => ({}));
  const executionType: 'manual' | 'scheduled' = body.executionType || 'manual';
  
  if (SCRAPING_EXECUTOR === 'github-actions' && executionType === 'scheduled') {
    return NextResponse.json(
      {
        success: false,
        error: '定期実行のスクレイピングはGitHub Actionsで実行されます。Vercel環境では手動実行のみ利用可能です。',
      },
      { status: 503 }
    );
  }
  
  let executionId: string | null = null; // エラーハンドリング用にスコープ外で定義
  
  try {
    const searchUrl = body.url;
    const jobId = body.jobId as string | undefined; // ジョブID（定期実行の場合）
    
    if (!searchUrl || typeof searchUrl !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'URLが指定されていません',
          properties: [],
        },
        { status: 400 }
      );
    }

    console.log('スクレイピングURL:', searchUrl);
    console.log('実行タイプ:', executionType);
    if (jobId) {
      console.log('ジョブID:', jobId);
    }

    // ジョブ情報を取得（定期実行の場合）
    let job = null;
    if (jobId) {
      job = await getScrapingJob(jobId);
      if (!job) {
        return NextResponse.json(
          {
            success: false,
            error: '指定されたジョブが見つかりません',
            properties: [],
          },
          { status: 404 }
        );
      }
    }

    // 実行履歴を作成（ステータス: running）
    executionId = jobId
      ? await createScrapingExecution({
          job_id: jobId,
          status: 'running',
          execution_type: executionType,
        })
      : null;

    console.log('Playwrightをインポート中...');
    // Playwrightを動的にインポート（Turbopackの問題を回避）
    const { chromium } = await import('playwright');
    console.log('Playwrightインポート完了');
    
    console.log('ブラウザを起動中...');
    // Playwrightでブラウザを起動
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.log('ブラウザ起動完了');
    
    try {
      console.log('新しいコンテキストとページを作成中...');
      // User-Agentを設定してコンテキストを作成（ボット検出を回避）
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      const page = await context.newPage();

      console.log('ページにアクセス中:', searchUrl);
      // ページにアクセス
      const response = await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded', // domcontentloadedに変更（より早く応答）
        timeout: 60000, // タイムアウトを60秒に延長
      });
      
      // レスポンスステータスを確認
      const status = response?.status();
      console.log('HTTPステータス:', status);
      
      if (status && status >= 400) {
        throw new Error(`ページが見つかりません（HTTP ${status}）: ${searchUrl}`);
      }
      
      console.log('物件情報を抽出中...');
      // 共通モジュールを使用してスクレイピング実行
      const properties = await scrapePropertiesFromUrl(searchUrl, page, 50);

      // 重複チェック（定期実行の場合のみ、過去14日間の実行履歴と比較）
      let newProperties = properties;
      let duplicateCount = 0;
      
      if (executionType === 'scheduled') {
        console.log('重複チェックを実行中（過去14日間の定期実行を対象）...');
        // 定期実行の場合、すべての定期実行ジョブの過去14日間をチェック
        const duplicateResult = await filterDuplicateProperties(
          properties,
          jobId, // jobIdは引数として渡すが、checkAllScheduledJobs=trueのため無視される
          14, // 過去14日間
          true // すべての定期実行ジョブを対象にする
        );
        newProperties = duplicateResult.newProperties;
        duplicateCount = duplicateResult.duplicateCount;
        console.log(`重複チェック完了: 新規${newProperties.length}件、重複${duplicateCount}件（過去14日間の定期実行と比較）`);
      }

      // データベースに保存（実行履歴IDがある場合のみ）
      let savedCount = 0;
      if (executionId) {
        try {
          console.log('データベースに保存中...');
          savedCount = await saveProperties(executionId, newProperties);
          console.log(`${savedCount}件の物件情報を保存しました`);
          
          // 実行履歴を更新（ステータス: completed）
          await updateScrapingExecution(executionId, {
            status: 'completed',
            total_scraped: properties.length,
            new_properties: newProperties.length,
          });
        } catch (error) {
          console.error('データベース保存エラー:', error);
          // エラーが発生しても処理は続行
        }
      }

      // LINE通知を送信（定期実行の場合のみ）
      if (executionType === 'scheduled' && executionId) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const resultUrl = `${baseUrl}/results/${executionId}`;
        const searchConditions = job 
          ? `ジョブ名: ${job.name}\n検索URL: ${searchUrl}\n\n詳細: ${resultUrl}`
          : `検索URL: ${searchUrl}\n\n詳細: ${resultUrl}`;
        
        // CSVデータはLINE通知には含めない（URLのみ）
        sendLineNotificationWithCSV(searchConditions, '', newProperties.length)
          .then(success => {
            if (success) {
              console.log('LINE通知を送信しました');
            } else {
              console.warn('LINE通知の送信に失敗しました（詳細は上記のエラーログを確認してください）');
            }
          })
          .catch(error => {
            console.error('LINE通知の送信に失敗しました（処理は続行）:', error);
          });
      }

      await browser.close();
      console.log('ブラウザを閉じました');

      return NextResponse.json({
        success: true,
        properties: newProperties, // 重複除外後の物件リストを返す
        count: newProperties.length,
        totalScraped: properties.length,
        duplicateCount: duplicateCount,
        executionId: executionId,
      });
    } catch (error) {
      console.error('スクレイピング処理中のエラー:', error);
      
      // 実行履歴を更新（ステータス: failed）
      if (executionId) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        await updateScrapingExecution(executionId, {
          status: 'failed',
          error_message: errorMessage,
        }).catch(err => console.error('実行履歴更新エラー:', err));
      }
      
      await browser.close().catch(err => console.error('ブラウザクローズエラー:', err));
      throw error;
    }
  } catch (error) {
    console.error('スクレイピングエラー:', error);
    const errorMessage = error instanceof Error 
      ? `${error.message} (${error.stack})` 
      : '不明なエラーが発生しました';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        properties: [],
      },
      { status: 500 }
    );
  }
}

