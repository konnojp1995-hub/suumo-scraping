interface LineTextMessage {
  type: 'text';
  text: string;
}

interface LinePushMessageRequest {
  to: string;
  messages: LineTextMessage[];
}

interface LineBroadcastMessageRequest {
  messages: LineTextMessage[];
}

/**
 * LINE Messaging APIを使用してブロードキャストメッセージを送信（友だち全員に配信）
 */
export async function sendLineBroadcastMessage(
  message: string
): Promise<boolean> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKENが設定されていません');
    return false;
  }

  try {
    // メッセージが長すぎる場合は分割（LINE Messaging APIは1メッセージ最大5000文字）
    const maxLength = 5000;
    const messages: LineTextMessage[] = [];
    
    if (message.length <= maxLength) {
      messages.push({ type: 'text', text: message });
    } else {
      // 長いメッセージを分割
      let remaining = message;
      while (remaining.length > 0) {
        const chunk = remaining.substring(0, maxLength);
        messages.push({ type: 'text', text: chunk });
        remaining = remaining.substring(maxLength);
      }
    }

    const requestBody: LineBroadcastMessageRequest = {
      messages: messages,
    };

    console.log(`LINEブロードキャスト送信リクエスト:`, {
      messageCount: messages.length,
      firstMessageLength: messages[0]?.text.length || 0,
    });

    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      console.log(`LINEブロードキャスト通知を送信しました（${messages.length}件のメッセージ）`);
      return true;
    } else {
      const errorText = await response.text();
      console.error('LINEブロードキャスト通知の送信に失敗しました:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('LINEブロードキャスト通知の送信エラー:', error);
    return false;
  }
}

/**
 * LINE Messaging APIを使用してプッシュメッセージを送信（個別ユーザー向け）
 */
export async function sendLinePushMessage(
  userId: string,
  message: string
): Promise<boolean> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKENが設定されていません');
    return false;
  }

  if (!userId || userId.trim() === '') {
    console.error('LINE_USER_IDが設定されていません、または空です');
    console.error('現在のUSER_ID値:', userId ? `"${userId}"` : 'undefined');
    return false;
  }

  // ユーザーIDのフォーマット確認（LINEのユーザーIDは通常33文字の英数字）
  const trimmedUserId = userId.trim();
  if (trimmedUserId.length < 10) {
    console.error(`LINE_USER_IDの値が短すぎます: "${trimmedUserId}"`);
    console.error('ユーザーIDはLINE Developersコンソールの「あなたのユーザーID」で確認できます');
    return false;
  }

  try {
    // メッセージが長すぎる場合は分割（LINE Messaging APIは1メッセージ最大5000文字）
    const maxLength = 5000;
    const messages: LineTextMessage[] = [];
    
    if (message.length <= maxLength) {
      messages.push({ type: 'text', text: message });
    } else {
      // 長いメッセージを分割
      let remaining = message;
      while (remaining.length > 0) {
        const chunk = remaining.substring(0, maxLength);
        messages.push({ type: 'text', text: chunk });
        remaining = remaining.substring(maxLength);
      }
    }

    const requestBody: LinePushMessageRequest = {
      to: trimmedUserId,
      messages: messages,
    };

    console.log(`LINE通知送信リクエスト:`, {
      to: trimmedUserId.substring(0, 10) + '...', // セキュリティのため一部のみ表示
      messageCount: messages.length,
      firstMessageLength: messages[0]?.text.length || 0,
    });

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      console.log(`LINE通知を送信しました（${messages.length}件のメッセージ）`);
      return true;
    } else {
      const errorText = await response.text();
      console.error('LINE通知の送信に失敗しました:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('LINE通知の送信エラー:', error);
    return false;
  }
}

/**
 * スクレイピング結果をLINEに通知（CSVデータ付き）
 * ブロードキャストモード（友だち全員に配信）または個別送信
 */
export async function sendLineNotificationWithCSV(
  searchConditions: string,
  csvContent: string,
  propertyCount: number,
  useBroadcast: boolean = true
): Promise<boolean> {
  // メッセージ本文を作成
  let message = `【SUUMOスクレイピング完了】\n\n`;
  message += `検索条件:\n${searchConditions}\n\n`;
  message += `抽出件数: ${propertyCount}件\n\n`;
  
  // CSVデータを追加（長い場合は一部のみ）
  const maxCsvLength = 4500; // ヘッダー分の余裕を持たせる
  if (csvContent.length <= maxCsvLength) {
    message += `CSVデータ:\n\`\`\`\n${csvContent}\n\`\`\``;
  } else {
    message += `CSVデータ（最初の一部のみ表示）:\n\`\`\`\n`;
    // 最初の数行を取得
    const lines = csvContent.split('\n');
    let csvPreview = '';
    for (const line of lines) {
      if ((csvPreview + line + '\n').length > maxCsvLength) {
        break;
      }
      csvPreview += line + '\n';
    }
    message += csvPreview;
    message += `\n...（全${lines.length}行中、一部のみ表示）\n\`\`\``;
    message += `\n\n※完全なデータはブラウザでCSVダウンロードしてください。`;
  }

  // ブロードキャストモード（友だち全員に配信）
  if (useBroadcast) {
    return await sendLineBroadcastMessage(message);
  }

  // 個別送信モード（特定のユーザーに送信）
  const userId = process.env.LINE_USER_ID;
  if (!userId) {
    console.error('LINE_USER_IDが設定されていません（ブロードキャストモードを使用するか、LINE_USER_IDを設定してください）');
    // フォールバック: ブロードキャストを使用
    console.log('ブロードキャストモードに切り替えます');
    return await sendLineBroadcastMessage(message);
  }

  return await sendLinePushMessage(userId, message);
}

