# LottoOS

台灣彩券（大樂透、威力彩、今彩 539）的選號與統計小工具。純前端網頁，資料只存在使用者自己的瀏覽器裡。

> 開獎是隨機的。這個工具只供娛樂和統計參考，沒辦法提高中獎機率。

## 功能

- **選號**：最新開獎與下次開獎日、五種選號方法（最常出現、近期趨勢、冷熱混搭、兩種學習模型）、號碼統計圖表、開獎紀錄。
- **實驗室**：進階分析工具（Prophet、連號分析、矩陣、蒙地卡羅等）。
- **回測**：用歷史資料檢驗各種選法過去的表現。
- **遊樂場**：拉霸機等小遊戲。
- **我的**：收藏的號碼（開獎後自動對獎，並統計各種選法的成績）、求籤、設定與備份。
- 中文 / English、深色 / 淺色、可加到手機主畫面。

## 開發

需要 Node.js 18 以上。

```bash
npm install
npm run dev      # 開發伺服器 http://localhost:5173
npm test         # 單元測試（Vitest）
npm run lint     # ESLint
npm run build    # 正式版輸出到 dist/
```

## 專案結構

| 路徑 | 內容 |
| --- | --- |
| `src/App.jsx` | 外殼：導覽、設定保存、收藏與對獎流程 |
| `src/components/` | 畫面元件（`Workspace` 是選號頁，`Sidebar` 是「我的」面板） |
| `src/utils/prize.js` | 三種彩券的對獎規則 |
| `src/utils/drawSchedule.js` | 期號推算、下次開獎日 |
| `src/utils/prediction.js` | 統計式選號方法 |
| `src/utils/lstmModel.js` | 學習模型（TensorFlow.js，第一次使用時才下載） |
| `src/config/` | 彩種、背景主題、導覽設定 |
| `src/i18n/` | 中英文字典 |
| `src/data/` | 開獎資料（JSON）與籤詩 |
| `api/update-lottery.js` | 每日自動更新開獎資料的 Vercel Cron 端點 |

## 開獎資料如何更新

部署在 Vercel。`vercel.json` 設定每天 13:30 UTC（台灣時間 21:30）呼叫 `/api/update-lottery`，
它會抓取當月開獎結果，把新的期別寫回 GitHub 上的 `src/data/*.json`，Vercel 隨後自動重新部署。

需要的環境變數（設定在 Vercel，不要寫進程式碼）：

- `CRON_SECRET`：保護更新端點。
- GitHub 寫入權杖與儲存庫資訊：見 `api/_lib/githubContents.js`。

補抓某個月份：以 `Authorization: Bearer <CRON_SECRET>` 呼叫 `/api/update-lottery?month=YYYY-MM`，加上 `&dryRun=true` 可以只看結果不寫入。

## 使用者資料

所有資料都放在瀏覽器的 localStorage：

| Key | 內容 |
| --- | --- |
| `lottery_vault` | 收藏的號碼與對獎結果 |
| `lottery_user_entries` | 手動補登的開獎紀錄 |
| `lottery_settings` | 彩種、背景、淺色模式、音效等設定 |
| `lottery_lang` | 語言 |

「我的 → 設定 → 你的資料」可以匯出與匯入備份。

## 已知限制

- 下次開獎日是依固定星期推算，不含節慶加開。
- 威力彩的統計式選號只選第一區；第二區要到實驗室另外選，兩者目前不會合成一張完整的彩券。
- 沒有離線支援：加到主畫面後仍需要網路才能開啟。

## 安全性

- 更新端點 `/api/update-lottery` 只接受 GET，且必須帶 `Authorization: Bearer <CRON_SECRET>`。`CRON_SECRET` 沒設定或少於 16 個字元時一律拒絕。
- 端點只能讀寫三個開獎資料檔，寫入前逐筆檢查期別、日期格式、號碼範圍與重複。
- `LOTTERY_BOT_GITHUB_TOKEN` 請使用 fine-grained token，只授權這個儲存庫的 Contents 讀寫。
- 匯入的備份和 localStorage 裡的資料都會逐欄位重建，不認得的欄位會被丟掉（`src/utils/sanitize.js`）。
- `vercel.json` 設定了內容安全政策等安全標頭。`script-src` 包含 `'wasm-unsafe-eval'`，因為 TensorFlow.js 需要 WebAssembly。
- 相關測試：`api/_tests/`、`src/utils/sanitize.test.js`。
