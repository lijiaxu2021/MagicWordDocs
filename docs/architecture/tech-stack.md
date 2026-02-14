# 技术栈 (Technology Stack)

MagicWord 结合了现代 Android 开发技术和边缘计算服务。

## Android 客户端

| 层级 (Layer) | 技术 (Technology) | 关键组件 (Key Components) |
| :--- | :--- | :--- |
| **UI** | **Jetpack Compose 1.5.4** | `MainScreen`, `WordsScreen`, `StudyScreen`, `TestScreen` |
| **架构** | **MVVM + StateFlow** | `LibraryViewModel` (核心状态管理) |
| **数据库** | **Room 2.6.1** | `AppDatabase`, `WordDao` (FTS4 全文搜索), `LibraryDao` |
| **网络** | **Retrofit 2.9.0 + OkHttp** | AI API 客户端, GitHub 代理客户端 |
| **并发** | **Kotlin Coroutines + Flow** | 异步操作, 响应式数据流 |
| **后台任务** | **WorkManager 2.9.0** | `SyncWorker` (定期同步/备份) |
| **UI 组件** | **Material3 + Reorderable** | 现代化设计, 列表拖拽排序 |
| **构建系统** | **Gradle KTS 8.0** | Kotlin DSL 配置, KSP 注解处理 |

## 云基础设施 (Cloud Infrastructure)

| 组件 (Component) | 技术 (Technology) | 用途 (Purpose) |
| :--- | :--- | :--- |
| **边缘计算** | **Cloudflare Workers** | Serverless API 网关, CORS 代理, 路由分发 |
| **静态托管** | **GitHub Pages** | 在线词库文件 (`json`) 和索引的全球分发 (CDN) |
| **CI/CD** | **GitHub Actions** | 自动化构建 APK, 自动生成词库索引 (`index.json`) |
| **存储** | **Git Repository** | `magicwordfile` 仓库作为版本控制的数据库 |

## 外部服务 (External Services)

*   **AI 模型**: **SiliconFlow (Qwen2.5-7B-Instruct)**
    *   用于生成单词释义、助记法和批量提取单词。
*   **应用分发**: **GitHub Releases**
    *   托管 APK 安装包，提供版本更新接口。
