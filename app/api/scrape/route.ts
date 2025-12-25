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

// 検索結果ページから物件URLリストを抽出
function extractPropertyUrls(html: string): string[] {
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

// 物件詳細ページから情報を抽出
async function scrapePropertyDetail(page: any, propertyUrl: string): Promise<Property | null> {
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
    
    // デバッグ: 最初の物件のHTMLの一部を出力（テーブル部分）
    const tableHtml = $('table').first().html()?.substring(0, 1000) || '';
    if (tableHtml) {
      console.log(`  テーブルHTML（最初の1000文字）: ${tableHtml}`);
    }

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
    // 構造: <div class="property_view_note-list">
    //        <span class="property_view_note-emphasis">5.5万円</span>
    //        <span>管理費・共益費:&nbsp;-</span>
    //       </div>
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
    // 構造: <div class="property_view_note-list">
    //        <span>敷金:&nbsp;11万円</span>
    //        <span>礼金:&nbsp;-</span>
    //        ...
    //       </div>
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
  
  let executionId: string | null = null; // エラーハンドリング用にスコープ外で定義
  
  try {
    const body = await request.json();
    const searchUrl = body.url;
    const jobId = body.jobId as string | undefined; // ジョブID（定期実行の場合）
    const executionType: 'manual' | 'scheduled' = body.executionType || 'manual';
    
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
      
      console.log('ページ読み込み完了');

      // 物件リストが表示されるまで待機（.cassetteitemまたは物件リンクが表示されるまで）
      try {
        await page.waitForSelector('.cassetteitem, .property, a[href*="/chintai/jnc"]', { 
          timeout: 15000 
        });
        console.log('物件リストの表示を確認');
      } catch (error) {
        console.warn('物件リストのセレクタが見つかりませんでした。続行します。');
      }

      // 追加の待機時間（JavaScriptの実行を確実に待つ）
      // networkidleの代わりに、少し長めに待機
      await page.waitForTimeout(5000);

      console.log('HTMLを取得中...');
      // HTMLを取得
      const html = await page.content();
      console.log('HTML取得完了、サイズ:', html.length);
      
      // エラーページかどうかをより正確に判定
      // タイトルタグを確認
      const title = await page.title();
      console.log('ページタイトル:', title);
      
      // タイトルにエラーが含まれているか確認
      const hasErrorTitle = title.includes('見つかりません') || title.includes('404') || title.includes('Not Found');
      
      // HTMLに物件リストの要素が含まれているか確認（cheerioで確認する前）
      const hasPropertyList = html.includes('cassetteitem') || html.includes('property') || html.includes('物件情報');
      
      console.log('エラータイトル:', hasErrorTitle, '物件リスト存在:', hasPropertyList);
      
      // エラータイトルがあり、かつ物件リストが存在しない場合のみエラーとする
      // HTMLに「見つかりません」が含まれていても、物件リストがあれば正常なページとみなす
      if (hasErrorTitle && !hasPropertyList) {
        throw new Error('アクセスしようとしたページが見つかりません。URLが正しくない可能性があります。');
      }
      
      console.log('物件情報を抽出中...');
      // 検索結果ページから物件URLリストを抽出
      const propertyUrls = extractPropertyUrls(html);
      console.log(`抽出された物件URL数: ${propertyUrls.length}件`);

      // 最大抽出件数を50件に制限
      const urlsToScrape = propertyUrls.slice(0, 50);
      console.log(`最大件数制限により${urlsToScrape.length}件に制限しました（リクエスト: 最大50件）`);

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

