# 系统架构

本与之提供了 MagicWord 三层系统架构的详细说明，包括 Android 客户端应用程序、Cloudflare Worker 代理层和基于 GitHub 的数据仓库。它涵盖了组件交互、数据流模式和网络拓扑，这些使得系统的词汇学习和共享功能成为可能。

有关特定 Android UI 组件和屏幕的信息，请参阅 [用户界面屏幕](../ui/screens.md)。有关构建配置的详细信息，请参阅 [构建配置](../dev/build.md)。有关云基础设施部署的信息，请参阅 [云基础设施](../cloud/infrastructure.md)。

## 架构概览

MagicWord 实现了**三层无服务器架构**，消除了对传统后端服务器的需求，同时为词库提供了完整的 CRUD（增删改查）能力。

### 系统层级

*   **第 1 层 (Android 客户端)**
    处理所有用户交互、本地持久化和应用程序状态。客户端是一个独立的单元，可以在离线状态下运行核心词汇管理和复习功能。

*   **第 2 层 (云基础设施)**
    使用无服务器架构，其中 Cloudflare Workers 充当智能 API 网关，GitHub 同时充当存储（通过 GitHub Pages）和计算（通过 GitHub Actions），无需数据库服务器即可实现动态词库发现。

*   **第 3 层 (外部服务)**
    提供 AI 驱动的单词定义和应用程序更新。直接访问 AI 服务以避免定义生成的代理延迟。

## Android 客户端架构

Android 应用程序遵循 **MVVM (Model-View-ViewModel) 架构**，具有由 Kotlin Coroutines 和 StateFlow 驱动的单向数据流。

### 核心组件职责

| 组件 | 职责 | 关键方法/属性 |
| :--- | :--- | :--- |
| **LibraryViewModel** | 所有应用程序状态的单一真实来源。协调 UI 和数据层。 | 17+ StateFlows, `processReview()`, `bulkImport()`, `handleGlobalSearch()` |
| **WordDao** | 用于单词 CRUD 操作的 Room DAO，带有 FTS4 全文搜索。 | `searchWords()`, `getDueWordsForLibraries()`, `getWordsByLibrary()` |
| **LibraryDao** | 管理词库元数据（名称、描述、最后索引）。 | `getAllLibraries()`, `insertLibrary()`, `deleteLibrary()` |
| **TestSessionDao** | 持久化测试会话状态以实现可恢复性。 | `saveTestSession()`, `getTestSession()`, `clearTestSession()` |
| **RetrofitClient** | 用于 AI API 调用（单词定义、批量提取）的 HTTP 客户端。 | 配置为 Qwen/SiliconFlow 端点 |
| **OkHttpClient** | 用于文件操作（词库下载、APK 更新）的直接 HTTP 客户端。 | 被 `LibraryViewModel` 和 `UpdateManager` 使用 |
| **SharedPreferences** | 用于当前词库 ID、排序选项、学习选择的轻量级持久化。 | Keys: `current_library_id`, `sort_option`, `study_library_ids` |
| **AppConfig** | 全局配置（API 密钥、模型名称、用户角色）的单例。 | `modelName`, `apiKey`, `userPersona`, `saveLocationId` |

## LibraryViewModel: 中央状态管理器

`LibraryViewModel` 是重量级的核心（重要性：47.90%），通过响应式 StateFlow 管理所有应用程序状态。

### StateFlow 架构

#### 持久化状态 (与 SharedPreferences 同步)
*   `currentLibraryId: StateFlow<Int>`: 当前活动词库
*   `studyLibraryIds: StateFlow<Set<Int>>`: 学习模式选择的词库
*   `sortOption: StateFlow<SortOption>`: 当前单词排序方法

#### 派生状态 (从数据库计算)
*   `allWords: Flow<List<Word>>`: 当前词库中的单词（应用了排序）
*   `dueWords: Flow<List<Word>>`: 基于 SM-2 算法到期复习的单词
*   `allLibraries: Flow<List<Library>>`: 所有可用词库
*   `testHistory: Flow<List<TestHistory>>`: 所有测试结果

#### 瞬态 (UI 驱动)
*   `searchResults: StateFlow<List<Word>>`: 搜索查询结果
*   `globalSearchResult: StateFlow<Word?>`: AI 搜索结果
*   `testSession: StateFlow<TestSession?>`: 活动测试会话（持久化到 Room）
*   `testCandidates: StateFlow<List<Word>?>`: 当前测试的单词
*   `testType: StateFlow<TestType>`: 选择或拼写模式

#### 加载/状态
*   `isImporting: StateFlow<Boolean>`: 批量导入进行中
*   `importLogs: StateFlow<List<String>>`: 实时导入日志
*   `isGlobalSearching: StateFlow<Boolean>`: AI 搜索进行中
*   `isNetworkLoading: StateFlow<Boolean>`: 在线词库获取状态
*   `isTtsReady: StateFlow<Boolean>`: 文本转语音初始化状态

#### 在线词库状态
*   `onlineLibraries: StateFlow<List<OnlineLibrary>>`: 可用的云端词库

### 数据流模式

MagicWord 根据操作类型实现三种不同的数据流模式。

1.  **本地 CRUD 流**
    本地 CRUD 操作通过数据库查询的 Flow 发射触发自动 UI 更新。ViewModel 订阅数据库 Flow，每当底层表发生变化时，Flow 就会发射新数据。

2.  **远程获取流**
    远程操作更新加载状态，获取数据，更新结果状态，并清除加载状态。这种模式防止了竞争条件并提供清晰的 UI 反馈。

3.  **派生流 (响应式计算)**
    `dueWords` Flow 通过组合 `currentLibraryId` 和 `studyLibraryIds` 计算得出，然后使用 `flatMapLatest` 查询数据库。对任一源 Flow 的任何更改都会触发新的数据库查询和发射。

## 云基础设施: Cloudflare Worker

部署在 Cloudflare Workers 上的 `cf.js` 脚本充当系统的 API 网关，抽象了 GitHub 的原始内容交付并处理 CORS 问题。

### 路由详情

| 路由 | 方法 | 目的 | 目标仓库 | 函数 |
| :--- | :--- | :--- | :--- | :--- |
| `/MagicWordLatest.apk` | GET | APK 下载 | `MagicWord/main` | `fetchRawFile()` |
| `/notice.json` | GET | 系统公告 | `MagicWord/main` | `fetchRawFile()` |
| `/library/file/{path}` | GET | 代理词库文件 | `magicwordfile/main` | `fetchRawFile()` |
| `/library/upload` | POST | 上传新词库 | `magicwordfile/main` | `handleLibraryUpload()` |
| `/api/{path}` | GET/POST | 代理 GitHub API | GitHub API | `proxyRequest()` |

### 上传网关实现
上传路由接收带有 Base64 编码词库内容的 JSON 负载，并创建带时间戳的文件夹结构。

## GitHub 数据仓库

`magicwordfile` 仓库充当静态文件数据库，通过 GitHub Actions 进行自动索引。

### 仓库结构
```
magicwordfile/
├── .github/workflows/update_index.yml    # 自动索引工作流
├── index_0.json                          # 第 0 页（最新的 10 个词库）
├── index_1.json                          # 第 1 页（接下来的 10 个）
├── num.json                              # 元数据：totalPages, totalItems
├── tags.json                             # 标签统计：[{name, count}]
├── 1770900184827/                        # 词库文件夹（时间戳）
│   ├── info.json                         # {id, name, description, tags, timestamp, author}
│   └── library.json                      # [{word, definitionCn, ...}]
└── 1770900184828/
    ├── info.json
    └── library.json
```

### GitHub Actions 自动化
`update_index.yml` 工作流在每次推送时触发以重新生成索引：
1.  **扫描文件夹**: 枚举所有时间戳目录
2.  **解析元数据**: 读取每个 `info.json` 以提取名称、描述、标签
3.  **排序**: 按时间戳排序（降序，最新的在前）
4.  **分页**: 分成 10 个一组，生成 `index_0.json`, `index_1.json` 等
5.  **生成 num.json**: 写入 `{totalPages, totalItems, pageSize, lastUpdated}`
6.  **生成 tags.json**: 聚合所有带有计数的标签，按流行度排序
7.  **提交**: 将所有生成的文件推送回仓库

## 关键设计模式

### 1. 无服务器后端架构
系统通过利用以下技术消除了传统数据库服务器：
*   **GitHub 作为存储**: 仓库充当持久化数据层
*   **GitHub Actions 作为计算**: 自动化工作流处理索引和聚合
*   **Cloudflare Workers 作为网关**: 边缘计算处理请求路由和 CORS

这种设计提供了：
*   **零基础设施成本**（GitHub + Cloudflare 的免费层）
*   **全球 CDN 分发**（GitHub Raw + Cloudflare 边缘网络）
*   **自动扩展**（本质上是无服务器的）
*   **基于 Git 的版本控制**（所有数据更改都是可审计的提交）

### 2. 响应式状态管理
Android 客户端实现**单向数据流**模式：
用户操作 → ViewModel 方法 → 数据层更新 → Flow 发射 → StateFlow 更新 → UI 重组

### 3. 混合数据持久化
三层持久化层次结构针对不同的数据生命周期进行了优化：
*   **临时**: 内存状态 + `rememberSaveable` (UI 瞬态)
*   **轻量级**: SharedPreferences (用户偏好)
*   **持久**: Room 数据库 (词汇数据、测试结果)

### 4. 网络抽象层
Cloudflare Worker 抽象了 GitHub 的限制：
*   **CORS 绕过**: 添加 `Access-Control-Allow-Origin: *` 头
*   **缓存控制**: 附加时间戳以防止陈旧内容
*   **API 网关**: 所有云操作的统一端点
*   **区域可访问性**: 绕过某些网络中的 GitHub 访问限制

## 性能特征

### Android 客户端
*   **数据库查询**: Room 查询通过协程在后台线程上执行
*   **FTS4 搜索**: 全文搜索索引实现亚毫秒级单词查找
*   **分页**: 在线词库逐页加载（每页 10 项）以减少内存占用
*   **并发 AI 调用**: 批量导入使用并行协程（最大 3 个并发）和重试队列

### 云基础设施
*   **边缘计算**: Cloudflare Workers 在 CDN 边缘节点执行（~50ms 全球延迟）
*   **静态文件交付**: GitHub Raw 内容通过全球 CDN 提供
*   **GitHub Actions 延迟**: 索引重新生成在上传后几秒钟内触发，并在 ~10-30 秒内完成

## 安全注意事项

### 身份验证
*   **GitHub Token**: 写入操作（词库上传）需要。配置为 Cloudflare Worker 环境变量，从不向客户端公开。
*   **API Keys**: AI 服务密钥存储在 `AppConfig` 单例中，由用户提供并存储在 SharedPreferences 中，直接传输到 AI 服务（不通过代理）。

### 数据验证
*   **上传清理**: Worker 在 GitHub 提交之前验证必填字段（name, contentBase64）。
*   **JSON 解析**: 客户端围绕 Gson 解析进行 try-catch 包装以处理格式错误的数据。
*   **Base64 编码**: 所有文件内容作为 Base64 传输以防止编码问题。
