import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("sync-models", {
    description: "從已配置的供應商同步最新模型清單 (用法: /sync-models <provider_name>)",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const targetProvider = parts[0];

      // 檢查參數一（provider_name）是否為空
      if (!targetProvider) {
        ctx?.ui?.notify("❌ 請提供供應商名稱（必填），例如: /sync-models litellm", "error");
        return;
      }

      const agentDir = path.join(os.homedir(), ".pi", "agent");
      const modelsJsonPath = path.join(agentDir, "models.json");
      const authJsonPath = path.join(agentDir, "auth.json");

      // 1. 讀取現有 models.json
      let modelsData: { providers?: Record<string, any> } = {};
      try {
        modelsData = JSON.parse(await fs.readFile(modelsJsonPath, "utf-8"));
      } catch {
        modelsData = {};
      }
      modelsData.providers = modelsData.providers || {};

      // 2. 讀取現有 auth.json (使用者 /login 儲存的金鑰)
      let authData: Record<string, any> = {};
      try {
        authData = JSON.parse(await fs.readFile(authJsonPath, "utf-8"));
      } catch {
        authData = {};
      }

      const existingProvider = modelsData.providers[targetProvider] || {};
      const envPrefix = targetProvider.toUpperCase().replace(/[^A-Z0-9]/g, "_");

      // 3. 解析 Base URL (無預設值，必須由 models.json 或環境變數提供)
      const rawBaseUrl =
        existingProvider.baseUrl ||
        process.env[`${envPrefix}_BASE_URL`] ||
        process.env.LITELLM_BASE_URL;

      if (!rawBaseUrl) {
        ctx?.ui?.notify(
          `❌ 找不到「${targetProvider}」的 Base URL！請在 models.json 或環境變數 (${envPrefix}_BASE_URL / LITELLM_BASE_URL) 中設定。`,
          "error"
        );
        return;
      }

      const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, "").replace(/\/v1\/?$/i, "");
      const normalizedV1 = `${cleanBaseUrl}/v1`;

      // 4. 解析 API Key (優先從 /login 儲存的 auth.json 取得)
      const authEntry = authData[targetProvider];
      let apiKey =
        authEntry?.apiKey ||
        authEntry?.token ||
        existingProvider.apiKey ||
        process.env[`${envPrefix}_API_KEY`] ||
        process.env.LITELLM_API_KEY ||
        "";

      // 若為環境變數參考格式 ($VAR)，嘗試展開
      let apiKeyConfig = existingProvider.apiKey || `$${envPrefix}_API_KEY`;
      if (typeof apiKey === "string" && apiKey.startsWith("$")) {
        apiKeyConfig = apiKey;
        const envVarName = apiKey.slice(1);
        apiKey = process.env[envVarName] || "";
      }

      ctx?.ui?.notify(`正在向 [${targetProvider}] (${normalizedV1}) 抓取模型清單...`, "info");

      try {
        // 5. 呼叫 /v1/models 端點
        const res = await fetch(`${normalizedV1}/models`, {
          headers: apiKey && !apiKey.startsWith("$") ? { Authorization: `Bearer ${apiKey}` } : {},
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = (await res.json()) as { data?: Array<{ id: string }> };
        const modelList = Array.isArray(data.data) ? data.data : [];

        if (modelList.length === 0) {
          throw new Error("供應商回傳的模型清單為空");
        }

        const models = modelList.map((m) => ({
          id: m.id,
          name: m.id,
        }));

        // 6. 更新並寫入 models.json
        modelsData.providers[targetProvider] = {
          ...existingProvider,
          name: existingProvider.name || targetProvider,
          baseUrl: normalizedV1,
          api: existingProvider.api || "openai-completions",
          apiKey: apiKeyConfig,
          models,
        };

        await fs.mkdir(agentDir, { recursive: true });
        await fs.writeFile(modelsJsonPath, JSON.stringify(modelsData, null, 2), "utf-8");

        ctx?.ui?.notify(
          `✅ 成功為「${targetProvider}」同步 ${models.length} 個模型！\n輸入 /model 即可切換選用。`,
          "info"
        );
      } catch (err: any) {
        ctx?.ui?.notify(`❌ 同步「${targetProvider}」失敗: ${err?.message || String(err)}`, "error");
      }
    },
  });
}
