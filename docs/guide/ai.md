# AI 辅助功能 (AI Integration)

MagicWord 深度集成了生成式 AI，彻底告别手动输入释义的繁琐。应用使用 **Qwen2.5-7B-Instruct** 等大语言模型，自动生成单词的详细解释、音标、例句和记忆方法。

## 1. 自动录入 (Auto Entry)

这是最常用的 AI 功能，适用于快速添加生词。

### 操作流程
1.  在主界面顶部的 **搜索框** 中输入一个英文单词（例如 "serendipity"）。
2.  点击键盘上的 **回车/搜索** 键。
3.  **智能判断**:
    *   如果本地词库已存在该词，会自动跳转到该单词卡片。
    *   如果本地不存在，系统会自动发起 **AI 请求**。
4.  **AI 生成**: 约 1-3 秒后，单词自动入库，包含：
    *   **中文释义**: 结合语境的精准翻译。
    *   **音标**: 标准 IPA 音标。
    *   **例句**: 中英对照例句。
    *   **记忆法**: 词根词缀拆解或联想记忆。

## 2. 批量导入 (Bulk Import)

适用于从文章、教材中整理单词表。

### 智能分块处理
为了防止 AI 超时或遗漏，MagicWord 采用了 **分块 (Chunking)** 处理机制：
1.  您输入的 100 个单词会被自动拆分为多个小批次（每批 3-5 个）。
2.  App 并行发送多个请求。
3.  **自动重试**: 如果某一批次失败，系统会自动重试 3 次。
4.  **实时反馈**: 导入面板下方会实时显示进度日志（如 "Processing chunk 1/20..."）。

### 短语保护
系统会自动识别多词短语（如 "give up"），在发送给 AI 前将其转换为下划线连接形式 ("give_up")，防止被 AI 误拆分为两个单词。

## 3. 配置 AI 模型

MagicWord 支持灵活的 AI 配置，满足不同用户的需求。

### Key-Kit 快速配置 (推荐)
如果您有管理员提供的 **Key-Kit** (例如 `vip-001`)：
1.  进入 **Settings** -> **Key-Kit 初始化**。
2.  输入 Key 并验证。
3.  系统自动下发 API Key、模型名称和 Base URL。
4.  **优势**: 无需手动配置复杂的参数，且支持云端动态更新模型。

### 手动配置 (高级)
如果您想使用自己的 API 服务（如 OpenAI, SiliconFlow）：
1.  进入 **Settings**。
2.  **API Key**: 输入您的 `sk-...` 密钥。
3.  **Model Name**: 输入模型名称（如 `gpt-4o`, `deepseek-chat`）。
4.  **User Persona**: 设置您的“用户画像”（例如“我是托福考生”），AI 会根据此画像生成更贴合您需求的例句。

## 4. Prompt 设计 (技术细节)

为了确保 AI 输出的 JSON 格式稳定可用，我们设计了严格的 Prompt：

```text
You are a strict JSON data generator. Analyze this English word: "$text"
Return a SINGLE JSON Object.

STRICT JSON FORMAT RULES:
1. "word": String (The LEMMA/ROOT form)
2. "phonetic": String
3. "senses": Object (Key-Value pairs)
   - Keys: "sense_1", "sense_2"
   - Value: { "pos": "...", "meaning": "..." }
4. "definition_en": String
5. "example": String (Format: "En sentence. Cn translation.")
6. "memory_method": String
7. "forms": Object (past, participle, plural)

IMPORTANT: Valid JSON syntax. No trailing commas.
NO MARKDOWN. NO COMMENTS. ONLY JSON.
```
