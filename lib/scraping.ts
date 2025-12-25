/**
 * スクレイピング共通モジュール
 * GitHub ActionsとVercel APIの両方で使用
 */

import * as cheerio from 'cheerio';
import { Property } from '@/app/components/PropertyCard';

/**
 * 検索結果ページから物件URLリストを抽出
 */
export function extractPropertyUrls(html: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];

  const cassetteItems = $('.cassetteitem');
  console.log(`  .cassetteitemの数: ${cassetteItems.length}`);

  cassetteItems.each((index, element) => {
    const $el = $(element);
    let found = false;
    
    // /chintai/jnc_または/chintai/jc_で始まるリンクを探す
    $el.find('a[href*="/chintai/"]').each((i, linkEl) => {
      const href = $(linkEl).attr('href') || '';
      if (href && href !== 'javascript:void(0)' && /\/chintai\/(jnc|jc)_\d+/.test(href)) {
        const url = href.startsWith('http')
          ? href
          : href.startsWith('/')
          ? `https://suumo.jp${href}`
          : '';
        
        if (url && !urls.includes(url)) {
          urls.push(url);
          found = true;
        }
        return false; // break
      }
    });

    if (!found) {
      console.log(`  .cassetteitem[${index + 1}]からURLを抽出できませんでした`);
    }
  });

  console.log(`  抽出されたURL数: ${urls.length}件`);
  return urls;
}

/**
 * 物件詳細ページから情報を抽出
 */
export async function scrapePropertyDetail(page: any, propertyUrl: string): Promise<Property | null> {
  try {
    await page.goto(propertyUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(1500); // 並列処理では少し短めに設定
    const html = await page.content();
    const $ = cheerio.load(html);

    // 物件タイトル
    const title = $('h1').first().text().trim() || '物件名なし';
    console.log(`  タイトル: ${title}`);
    
    // 情報を取得するヘルパー関数（テーブルの「項目名」から値を取得）
    const getTableValue = (labelText: string): string => {
      let value = '';
      // すべてのテーブルを確認
      $('table').each((i, table) => {
        $(table).find('tr').each((j, row) => {
          const cells = $(row).find('td, th');
          // 2列のテーブルの場合、各セルを確認
          cells.each((k, cell) => {
            const cellText = $(cell).text().trim();
            // 項目名に一致するセルを見つけたら、次のセルが値
            if (cellText === labelText || cellText.includes(labelText)) {
              // 次のセルを取得
              const nextCell = cells.eq(k + 1);
              if (nextCell.length > 0) {
                value = nextCell.text().trim();
                return false;
              }
            }
          });
          if (value) return false;
        });
        if (value) return false;
      });
      return value;
    };

    // 所在地（テーブルの「所在地」行から）
    let address = getTableValue('所在地');
    console.log(`  所在地: ${address}`);

    // 駅徒歩（テーブルの「駅徒歩」行から）
    let stationWalk = getTableValue('駅徒歩');
    if (!stationWalk) {
      stationWalk = getTableValue('最寄駅');
    }
    console.log(`  駅徒歩: ${stationWalk}`);

    // 階（テーブルの「階」行から）
    let floor = getTableValue('階');
    console.log(`  階: ${floor}`);

    // 間取り（テーブルの「間取り」行から）
    let layout = getTableValue('間取り');
    console.log(`  間取り: ${layout}`);

    // 専有面積（テーブルの「専有面積」行から）
    let area = getTableValue('専有面積');
    console.log(`  専有面積: ${area}`);

    // 建物種別（テーブルの「建物種別」行から）
    let propertyType = getTableValue('建物種別');
    console.log(`  建物種別: ${propertyType}`);

    // 賃料と管理費（.property_view_note-listから取得）
    let rent = '';
    let managementFee = '';
    const firstNoteList = $('.property_view_note-list').first();
    if (firstNoteList.length > 0) {
      // 賃料（.property_view_note-emphasis クラスのテキスト）
      rent = firstNoteList.find('.property_view_note-emphasis').text().trim() || '';
      
      // 管理費・共益費（2番目のspanのテキストから抽出）
      const feeText = firstNoteList.find('span').eq(1).text().trim() || '';
      if (feeText) {
        const feeMatch = feeText.match(/管理費[・共益費]*[：:]\s*(.+)/);
        if (feeMatch) {
          managementFee = feeMatch[1].trim();
          // &nbsp;をスペースに変換
          managementFee = managementFee.replace(/\u00A0/g, ' ').trim();
          if (managementFee === '-' || managementFee === 'なし') {
            managementFee = '';
          }
        }
      }
    }
    console.log(`  賃料: ${rent}, 管理費: ${managementFee}`);

    // 敷金・礼金（2番目の.property_view_note-listから取得）
    let deposit = '';
    let keyMoney = '';
    const secondNoteList = $('.property_view_note-list').eq(1);
    if (secondNoteList.length > 0) {
      // 敷金（最初のspanのテキストから抽出）
      const depositText = secondNoteList.find('span').first().text().trim() || '';
      if (depositText) {
        const depositMatch = depositText.match(/敷金[：:]\s*(.+)/);
        if (depositMatch) {
          deposit = depositMatch[1].trim();
          // &nbsp;をスペースに変換
          deposit = deposit.replace(/\u00A0/g, ' ').trim();
          if (deposit === '-' || deposit === 'なし') {
            deposit = '';
          }
        }
      }
      
      // 礼金（2番目のspanのテキストから抽出）
      const keyMoneyText = secondNoteList.find('span').eq(1).text().trim() || '';
      if (keyMoneyText) {
        const keyMoneyMatch = keyMoneyText.match(/礼金[：:]\s*(.+)/);
        if (keyMoneyMatch) {
          keyMoney = keyMoneyMatch[1].trim();
          // &nbsp;をスペースに変換
          keyMoney = keyMoney.replace(/\u00A0/g, ' ').trim();
          if (keyMoney === '-' || keyMoney === 'なし') {
            keyMoney = '';
          }
        }
      }
    }
    console.log(`  敷金: ${deposit}, 礼金: ${keyMoney}`);

    // SUUMO物件コードを抽出
    let propertyCode = '';
    // clipkeyのhidden inputから取得を試みる（最も確実）
    const clipkeyInput = $('#clipkey');
    if (clipkeyInput.length > 0) {
      propertyCode = clipkeyInput.attr('value') || '';
    }
    // テーブルから「SUUMO物件コード」を探す（フォールバック）
    if (!propertyCode) {
      propertyCode = getTableValue('SUUMO物件コード') || getTableValue('物件コード');
    }
    console.log(`  SUUMO物件コード: ${propertyCode}`);

    // 情報更新日を抽出
    let postedDate = getTableValue('情報更新日');
    console.log(`  情報更新日: ${postedDate}`);

    // 金額が空の場合は「0円」を設定
    if (!rent) rent = '0円';
    if (!managementFee) managementFee = '0円';
    if (!deposit) deposit = '0円';
    if (!keyMoney) keyMoney = '0円';

    return {
      url: propertyUrl,
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
      propertyCode,
      postedDate,
    };
  } catch (error) {
    console.error('物件詳細ページのスクレイピングエラー:', error);
    return null;
  }
}

/**
 * 検索結果ページからスクレイピング実行
 */
export async function scrapePropertiesFromUrl(
  searchUrl: string,
  page: any,
  maxItems: number = 50
): Promise<Property[]> {
  console.log('ページにアクセス中:', searchUrl);
  
  // ページにアクセス
  const response = await page.goto(searchUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  
  // レスポンスステータスを確認
  const status = response?.status();
  console.log('HTTPステータス:', status);
  
  if (status && status >= 400) {
    throw new Error(`ページが見つかりません（HTTP ${status}）: ${searchUrl}`);
  }
  
  console.log('ページ読み込み完了');

  // 物件リストが表示されるまで待機
  try {
    await page.waitForSelector('.cassetteitem, .property, a[href*="/chintai/jnc"]', { 
      timeout: 15000 
    });
    console.log('物件リストの表示を確認');
  } catch (error) {
    console.warn('物件リストのセレクタが見つかりませんでした。続行します。');
  }

  // 追加の待機時間（JavaScriptの実行を確実に待つ）
  await page.waitForTimeout(5000);

  console.log('HTMLを取得中...');
  // HTMLを取得
  const html = await page.content();
  console.log('HTML取得完了、サイズ:', html.length);
  
  // エラーページかどうかを判定
  const title = await page.title();
  console.log('ページタイトル:', title);
  
  const hasErrorTitle = title.includes('見つかりません') || title.includes('404') || title.includes('Not Found');
  const hasPropertyList = html.includes('cassetteitem') || html.includes('property') || html.includes('物件情報');
  
  console.log('エラータイトル:', hasErrorTitle, '物件リスト存在:', hasPropertyList);
  
  if (hasErrorTitle && !hasPropertyList) {
    throw new Error('アクセスしようとしたページが見つかりません。URLが正しくない可能性があります。');
  }
  
  console.log('物件情報を抽出中...');
  // 検索結果ページから物件URLリストを抽出
  const propertyUrls = extractPropertyUrls(html);
  console.log(`抽出された物件URL数: ${propertyUrls.length}件`);

  // 最大抽出件数に制限
  const urlsToScrape = propertyUrls.slice(0, maxItems);
  console.log(`最大件数制限により${urlsToScrape.length}件に制限しました`);

  // 10件ずつのバッチに分割して並列処理
  const BATCH_SIZE = 10;
  const properties: Property[] = [];
  
  // URLリストを10件ずつのバッチに分割
  const batches: string[][] = [];
  for (let i = 0; i < urlsToScrape.length; i += BATCH_SIZE) {
    batches.push(urlsToScrape.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`${batches.length}個のバッチに分割しました（各バッチ最大${BATCH_SIZE}件）`);

  // 各バッチを順次処理（バッチ内は並列処理）
  const context = page.context();
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\nバッチ${batchIndex + 1}/${batches.length}を処理中（${batch.length}件）...`);
    
    // バッチ内の各URLに対して独立したpageオブジェクトを作成
    const batchPromises = batch.map(async (propertyUrl, indexInBatch) => {
      const globalIndex = batchIndex * BATCH_SIZE + indexInBatch + 1;
      const batchPage = await context.newPage();
      
      try {
        console.log(`  物件${globalIndex}/${urlsToScrape.length}: ${propertyUrl} にアクセス中...`);
        const propertyDetail = await scrapePropertyDetail(batchPage, propertyUrl);
        
        if (propertyDetail) {
          console.log(`  物件${globalIndex} 抽出成功: ${propertyDetail.title}`);
          return propertyDetail;
        } else {
          console.log(`  物件${globalIndex} 抽出失敗`);
          return null;
        }
      } catch (error) {
        console.error(`  物件${globalIndex} のスクレイピングエラー:`, error);
        return null;
      } finally {
        await batchPage.close();
      }
    });

    // バッチ内のすべての処理が完了するまで待機
    const batchResults = await Promise.all(batchPromises);
    
    // 成功した物件情報を追加
    for (const result of batchResults) {
      if (result) {
        properties.push(result);
      }
    }
    
    console.log(`バッチ${batchIndex + 1}完了: ${batchResults.filter(r => r !== null).length}件抽出成功`);
    
    // バッチ間で少し待機（サーバー負荷軽減）
    if (batchIndex < batches.length - 1) {
      await page.waitForTimeout(500);
    }
  }

  console.log('\nすべての物件情報の抽出完了、物件数:', properties.length);
  return properties;
}

