/**
 * PI WEB Custom Fonts Plugin
 * 載入本地字型：更紗黑體 (Sarasa Mono TC / Sarasa Term TC)
 * 特性：中英文等寬完美 1:2 對齊，非常適合 Terminal、CodeMirror 與程式開發
 */

const FONT_FAMILY = "Sarasa Mono TC";
const FONT_STYLE_ID = "pi-web-sarasa-font-style";

export default {
  async activate(context) {
    // 1. 動態解析字型檔的相對 URL（透過 ESM import.meta.url 自動對齊 pi-web 靜態伺服器路徑）
    const fontUrl = new URL("./SarasaMonoTC-Regular.ttf", import.meta.url).href;

    // 2. 注入 @font-face 與全域覆寫樣式
    if (!document.getElementById(FONT_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = FONT_STYLE_ID;
      style.textContent = `
        @font-face {
          font-family: "${FONT_FAMILY}";
          src: local("${FONT_FAMILY}"),
               local("Sarasa Mono TC Regular"),
               local("Sarasa Term TC"),
               local("Sarasa-Mono-TC"),
               url("${fontUrl}") format("truetype");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }

        /* 全域 UI 變數與字體替換 */
        :root {
          --pi-control-font-family: "${FONT_FAMILY}", system-ui, -apple-system, sans-serif !important;
          --pi-control-monospace-font-family: "${FONT_FAMILY}", ui-monospace, monospace !important;
          --pi-mono: "${FONT_FAMILY}", ui-monospace, monospace !important;
          font-family: "${FONT_FAMILY}", system-ui, sans-serif !important;
        }

        /* 終端機 (xterm.js)、CodeMirror 程式碼檢視區、輸入框、按鈕 */
        .xterm,
        .xterm-rows,
        .xterm-screen,
        .cm-scroller,
        .cm-content,
        textarea,
        input,
        code,
        pre,
        kbd,
        samp {
          font-family: "${FONT_FAMILY}", ui-monospace, monospace !important;
        }
      `;
      document.head.appendChild(style);
    }

    // 3. 嘗試使用 FontFace API 預加載
    if ("fonts" in document) {
      try {
        const fontFace = new FontFace(FONT_FAMILY, `url("${fontUrl}") format("truetype")`, {
          weight: "400",
          style: "normal",
        });
        const loadedFont = await fontFace.load();
        document.fonts.add(loadedFont);
        console.log(`[pi-web-custom-fonts] ${FONT_FAMILY} 字型已成功載入！`);
      } catch (err) {
        console.warn(`[pi-web-custom-fonts] FontFace 預加載提示 (已由 CSS 降級處理):`, err);
      }
    }
  },

  deactivate() {
    const style = document.getElementById(FONT_STYLE_ID);
    if (style) style.remove();
    console.log(`[pi-web-custom-fonts] ${FONT_FAMILY} 已卸載。`);
  },
};
