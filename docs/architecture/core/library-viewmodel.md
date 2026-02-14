# LibraryViewModel - 中央状态管理器

`LibraryViewModel` 是 MagicWord Android 应用程序的重量级核心，作为所有应用程序状态的单一真实来源，并协调 UI 层和数据层之间的操作。

本文档涵盖：
*   ViewModel 的架构和职责
*   通过 17+ StateFlows 进行状态管理
*   按功能领域分组的核心操作
*   数据流模式和响应式转换
*   与 Room 数据库、网络服务和 AI API 的集成点

有关 Room 数据库结构和 DAO 实现的信息，请参阅 [数据层与持久化](data-layer.md)。有关使用此 ViewModel 的 UI 屏幕实现，请参阅 [用户界面屏幕](../ui/screens.md)。

## 架构概览

`LibraryViewModel` 扩展了 Android 的 `ViewModel` 类，并通过 `LibraryViewModelFactory` 实例化，该工厂注入依赖项：用于数据库访问的 `WordDao` 和用于轻量级持久化的 `SharedPreferences`。

## 状态管理系统

ViewModel 公开了 **17+ StateFlows**，UI 屏幕通过 Jetpack Compose 的 `collectAsState()` 进行观察。这种响应式模式确保了当底层数据更改时自动更新 UI。

### 主要 StateFlows

| StateFlow | 类型 | 来源 | 目的 |
| :--- | :--- | :--- | :--- |
| `currentLibraryId` | `StateFlow<Int>` | SharedPreferences | 用于单词管理的活动词库 |
| `studyLibraryIds` | `StateFlow<Set<Int>>` | SharedPreferences | 选择用于间隔重复的词库 |
| `allWords` | `Flow<List<Word>>` | 派生 (DAO + sort) | 当前词库中的单词，已排序 |
| `dueWords` | `Flow<List<Word>>` | 派生 (DAO + study IDs) | 跨选定词库到期复习的单词 |
| `sortOption` | `StateFlow<SortOption>` | SharedPreferences | 当前排序模式 |
| `searchResults` | `StateFlow<List<Word>>` | DAO 查询 | FTS4 搜索结果 |
| `globalSearchResult` | `StateFlow<Word?>` | AI 导入 + DAO | 全局搜索/AI 导入的结果 |
| `isGlobalSearching` | `StateFlow<Boolean>` | 操作标志 | 全局搜索的加载状态 |
| `importLogs` | `StateFlow<List<String>>` | 操作日志 | 批量导入/导出的实时日志 |
| `isImporting` | `StateFlow<Boolean>` | 操作标志 | 导入操作的加载状态 |

### 测试与会话状态

| StateFlow | 类型 | 目的 |
| :--- | :--- | :--- |
| `testType` | `StateFlow<TestType>` | 选择 CHOICE 或 SPELL 模式 |
| `testCandidates` | `StateFlow<List<Word>?>` | 选择用于测试的单词 |
| `testSession` | `StateFlow<TestSession?>` | 活动测试会话（持久化到 DB） |
| `testHistory` | `Flow<List<TestHistory>>` | 所有完成的测试记录 |

### 在线词库状态

| StateFlow | 类型 | 目的 |
| :--- | :--- | :--- |
| `onlineLibraries` | `StateFlow<List<OnlineLibrary>>` | 在线词库的分页列表 |
| `onlineTags` | `StateFlow<List<Pair<String, Int>>>` | 可用标签和计数 |
| `isNetworkLoading` | `StateFlow<Boolean>` | 网络操作状态 |

### 其他状态

| StateFlow | 类型 | 目的 |
| :--- | :--- | :--- |
| `allLibraries` | `Flow<List<Library>>` | 所有本地词库 (直接 DAO Flow) |
| `allWordLists` | `Flow<List<WordList>>` | 自定义单词列表集合 |
| `currentWordListId` | `StateFlow<Int>` | 活动单词列表选择 |
| `pendingJumpWordId` | `StateFlow<Int?>` | 跨词库导航目标 |
| `isTtsReady` | `StateFlow<Boolean>` | 文本转语音引擎状态 |

### 派生 Flow 构建

ViewModel 使用 Kotlin Flow 操作符创建响应式的、派生的状态。采用了两种关键模式：

**模式 1: 使用 `flatMapLatest` 的组合状态**
`allWords` Flow 组合了两个独立的 StateFlows (`currentLibraryId` 和 `sortOption`) 并在任一更改时触发新的数据库查询。

**模式 2: 多源 Flow 组合**
`dueWords` Flow 支持选择多个词库进行学习。如果没有选择学习词库，它默认为当前词库。

## 核心操作（按领域）

### 词库管理操作
ViewModel 提供完整的词库 CRUD 操作，具有自动当前词库切换和学习选择验证。
*   `switchLibrary(libraryId)`: 更新 `_currentLibraryId` 并持久化。
*   `addLibrary(name)`: 创建新词库。
*   `deleteLibrary(libraryId)`: 删除词库中的所有单词，然后删除词库本身；如果删除了当前词库，则切换到词库 1。
*   `renameLibrary(libraryId, newName)`: 更新名称。
*   `toggleStudyLibrary(libraryId)`: 添加/移除学习选择。

### 单词 CRUD 操作
*   `updateWord(word)`: 单个单词更新。
*   `deleteWord(word)`: 单个单词删除。
*   `deleteWords(ids)`: 批量删除。
*   `updateWords(words)`: 用于重新排序的批量更新。
*   `searchWords(query)`: 使用 FTS4 进行全文搜索。
*   `handleGlobalSearch(query)`: 全局精确匹配搜索；如果未找到，触发 AI 导入。

### SM-2 算法实现
`processReview()` 函数实现 SuperMemo-2 间隔重复算法。质量评分范围从 0 (Blackout) 到 5 (Perfect)。
*   **< 3 (Reset)**: 间隔重置为 1 天，重复次数重置为 0。
*   **≥ 3 (Advance)**: 间隔增加 (`I(n)=I(n-1)*EF`)，Ease Factor 更新。

### AI 集成操作
**单个单词导入**: `importSingleWord()` 在全局搜索未找到现有单词时调用。它向 AI API 发送结构化提示，请求标准化的 JSON 格式（词元、音标、释义、例句、助记符）。

**批量导入管道**: `bulkImport()` 实现了一个复杂的多阶段 AI 管道，具有重试逻辑和并行处理。
*   **分块处理**: 3 个单词一组以防止超时。
*   **重试队列**: 失败的块重新排队最多 3 次。
*   **并发**: 使用 `async` 和 `awaitAll()` 并行处理最多 3 个批次。

### 导入/导出操作
*   **导出词库**: `exportLibrary()` 支持将单个或多个词库导出为 JSON 文件。
*   **导入词库**: `importLibraryJson()` 处理两种格式（新 ExportPackage 格式和旧单词列表格式），并通过 `_importLogs` 提供详细进度。

### 测试管理操作
ViewModel 管理测试会话，支持中途应用关闭的持久化。
*   `setTestType()`: 选择模式。
*   `saveTestSession()`: 将当前会话持久化到 DB。
*   `saveTestResult()`: 在历史表中记录完成的测试。
*   在 `init` 块中恢复 ID 为 1 的现有 `TestSession`。

### 在线词库操作
ViewModel 与 Cloudflare Worker API 接口，以浏览、搜索、下载和上传社区词库。
*   **获取在线词库**: `fetchOnlineLibraries()` 实现带客户端过滤的分页加载。
*   **上传词库**: `uploadLibraryPackage()` 将本地词库上传到社区目录。
*   **下载词库**: `downloadAndImportLibrary()` 获取词库 JSON 并导入。
*   **标签管理**: `fetchOnlineTags()` 加载 `tags.json` 用于 UI 过滤。

### 文本转语音操作
ViewModel 管理 `TextToSpeech` 引擎实例。
*   `initTts(context)`: 初始化 TTS。
*   `speak(text)`: 如果引擎就绪则朗读文本。
*   `onCleared()`: 停止并关闭 TTS 引擎。

### 导航操作
*   `jumpToWord(libraryId, wordId)`: 切换到目标词库并设置 `_pendingJumpWordId`。UI 观察此状态以滚动到目标单词。

## 集成点

### WordDao 集成
ViewModel 调用 `WordDao` 方法进行所有数据库操作，包括 `getWordsByLibrary` (Reactive Flow), `searchWords` (FTS4), `insertWord`, `deleteLibrary` 等。

### SharedPreferences 集成
ViewModel 使用 `SharedPreferences` 进行轻量级持久化（`current_library_id`, `sort_option` 等）。StateFlows 从 prefs 初始化，并在更改时更新 prefs。

### RetrofitClient 集成
使用 `RetrofitClient.api` 进行 AI API 调用 (`chat`)。

### OkHttpClient 集成
使用自己的 `OkHttpClient` 实例进行直接 HTTP 调用（Cloudflare Worker API），用于下载索引文件、上传词库等。

### AppConfig 集成
从 `AppConfig` 单例读取全局配置（`modelName`, `saveLocationId`, `userPersona`）。

## 生命周期管理
`LibraryViewModel` 扩展 `ViewModel`，提供生命周期感知的状态管理。
*   **init**: 验证学习词库 ID，恢复测试会话。
*   **onCleared**: 释放 TTS 资源。
*   **协程作用域**: 所有异步操作在 `viewModelScope` 中启动。
*   **持久化保证**: Room 数据库和 SharedPreferences 在应用重启后存活；`TestSession` 表启用中途测试恢复。
