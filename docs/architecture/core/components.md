# 核心组件

本文档描述了支持 MagicWord Android 应用程序的基础组件。这些组件构成了支持所有功能实现的架构骨干，包括词汇管理、间隔重复、AI 集成和测试功能。

涉及的三个核心组件是：
1.  **LibraryViewModel**: 协调所有数据操作和 UI 状态的中央状态管理器
2.  **数据持久化层**: Room 数据库和 SharedPreferences 用于持久和轻量级存储
3.  **构建配置**: Gradle 设置、依赖项和签名配置

有关 ViewModel 的详细实现，请参阅 [LibraryViewModel - 中央状态管理器](library-viewmodel.md)。有关数据库模式和 DAO 操作，请参阅 [数据层与持久化](data-layer.md)。有关构建系统的详细信息，请参阅 [构建配置](../dev/build.md)。

## 组件架构概览

核心组件遵循清晰的关注点分离，ViewModel 充当 UI 和数据层之间的中央协调器。

### 组件职责矩阵

| 组件 | 主要职责 | 关键操作 | 持久化 |
| :--- | :--- | :--- | :--- |
| **LibraryViewModel** | 状态管理，业务逻辑协调 | 17+ StateFlow 属性，数据编排 | 无 (内存中) |
| **WordDao / Room** | 数据访问和持久化 | CRUD 操作，FTS4 搜索，复杂查询 | SQLite 数据库 |
| **SharedPreferences** | 轻量级配置存储 | 当前词库 ID，排序选项，学习选择 | XML 文件 |
| **AppConfig** | 全局应用程序设置 | AI 模型配置，Key-Kit 验证，用户角色 | 单例 + SharedPreferences |
| **RetrofitClient** | AI API 通信 | 单词定义获取，批量导入处理 | 无 |
| **OkHttpClient** | 直接 HTTP 操作 | 在线词库浏览，文件下载，上传 | 无 |
| **TextToSpeech** | 音频发音 | 单词/短语发音播放 | 无 |

## LibraryViewModel: 中央状态管理器

`LibraryViewModel` 类充当应用程序状态的单一真实来源。重要性得分为 47.90，它是代码库中最关键的组件。

### ViewModel 状态属性

**关键 StateFlow 属性：**

| 属性 | 类型 | 目的 | 持久化 |
| :--- | :--- | :--- | :--- |
| `currentLibraryId` | `StateFlow<Int>` | 用于单词查看的活动词库 | SharedPreferences |
| `studyLibraryIds` | `StateFlow<Set<Int>>` | 选择用于学习/复习的词库 | SharedPreferences |
| `allWords` | `Flow<List<Word>>` | 当前词库中的单词（已排序） | 派生自 Room + sortOption |
| `dueWords` | `Flow<List<Word>>` | 准备复习的单词（SM-2 过滤） | 派生自 Room + studyLibraryIds |
| `sortOption` | `StateFlow<SortOption>` | 当前单词列表排序模式 | SharedPreferences |
| `testSession` | `StateFlow<TestSession?>` | 活动测试状态（进度/答案） | Room |
| `importLogs` | `StateFlow<List<String>>` | 实时导入进度消息 | 仅内存 |
| `isImporting` | `StateFlow<Boolean>` | 批量导入加载指示器 | 仅内存 |
| `onlineLibraries` | `StateFlow<List<OnlineLibrary>>` | 来自 GitHub 的浏览/搜索结果 | 仅内存 |
| `globalSearchResult` | `StateFlow<Word?>` | SearchScreen 的 AI 查找结果 | 仅内存 |

### 带有 Flow 操作符的派生状态
ViewModel 使用 Kotlin Flow 操作符来创建响应式的、派生的状态。例如：`allWords` Flow 组合了两个独立的 StateFlows (`currentLibraryId` 和 `sortOption`) 并在任一更改时触发新的数据库查询。

### ViewModel 初始化和生命周期
ViewModel 在其 `init` 块中执行初始化任务：
*   **验证学习词库选择**: 从持久化选择中删除无效的词库 ID
*   **恢复测试会话**: 从数据库加载未完成的测试
*   **初始化 TTS 引擎**: 通过 `initTts(context)` 从 MainActivity 调用

生命周期清理在 `onCleared()` 中：
*   停止并关闭 TextToSpeech 引擎

## 数据持久化策略

应用程序实现了两层持久化策略，针对不同的数据访问模式进行了优化。

### 何时使用各层

**Room 数据库 (持久，复杂查询):**
*   带有复习元数据（SM-2 算法字段）的词汇单词
*   词库定义和元数据
*   测试会话（用于崩溃恢复）
*   测试历史（用于分析）
*   单词列表（自定义分组）

**SharedPreferences (快速访问，简单值):**
*   当前词库 ID（在每个屏幕上频繁读取）
*   学习词库选择（Set 持久化）
*   排序选项（枚举值）
*   每个词库的最后查看单词索引（乐观更新）
*   当前单词列表 ID

**理由**: SharedPreferences 为频繁访问的配置值提供同步、零延迟的读取。Room 用于需要复杂查询（FTS4 搜索，JOIN 操作，排序/过滤）的关系数据。

### 乐观更新模式
对于像 WordsScreen 中的卡片滑动这样的性能关键操作，ViewModel 使用乐观更新模式：这确保了零延迟的 UI 更新，同时保持数据库一致性。

## 构建配置和依赖项

Gradle 构建配置定义了应用程序的编译设置、依赖项管理和签名配置。

### 关键依赖项

| 依赖项 | 版本 | 目的 |
| :--- | :--- | :--- |
| `androidx.room:room-runtime` | 2.6.1 | 数据库访问层 |
| `com.squareup.retrofit2:retrofit` | 2.9.0 | AI API HTTP 客户端 |
| `androidx.compose:compose-bom` | 2023.08.00 | Jetpack Compose UI 框架 |
| `sh.calvin.reorderable` | 2.4.3 | 拖放重新排序 |
| `androidx.work:work-runtime-ktx` | 2.9.0 | 后台任务调度 |

### 签名配置
构建系统通过环境变量回退支持 CI/CD（GitHub Actions）和本地开发：
*   **CI/CD 流程**: GitHub Actions 工作流从 secrets 中解码 base64 编码的 keystore，设置环境变量 (`KEYSTORE_PATH`, `STORE_PASSWORD` 等)，Gradle 在发布构建期间读取这些变量。

### 编译器选项
*   `compileSdk`: 34 (最新稳定 Android API)
*   `minSdk`: 24 (Android 7.0)
*   `targetSdk`: 34 (Play Store 提交需要)
*   `jvmTarget`: 1.8

## 集成模式

### ViewModel 工厂模式
`LibraryViewModel` 需要构造函数依赖项 (`WordDao`, `SharedPreferences`)，需要自定义工厂 `LibraryViewModelFactory`。

### 协程作用域管理
所有异步操作都在 `viewModelScope` 中启动，以实现自动生命周期管理：
*   当 ViewModel 被清除时自动取消协程
*   通过 `CoroutineExceptionHandler` 处理异常
*   结构化并发防止内存泄漏

### 网络层分离
ViewModel 使用两个 HTTP 客户端用于不同目的：
*   **RetrofitClient**: 类型安全的 API 接口，用于 AI 响应的自动 JSON 反序列化
*   **OkHttpClient**: 直接 HTTP 访问，用于文件下载、多部分上传、原始响应处理

### Compose 中的 State Flow 观察
UI 屏幕使用 `collectAsState()` 扩展观察 ViewModel 状态：
*   当 StateFlow 发射新值时自动更新 UI
*   在配置更改（旋转、主题更改）中存活
*   当 Composable 离开组合时取消收集

## 总结

核心组件形成了具有清晰关注点分离的强大基础：
*   **LibraryViewModel** 集中了状态管理
*   **双层持久化** 针对不同的访问模式进行了优化
*   **构建配置** 支持 CI/CD 和本地开发
*   **集成模式** 利用 Kotlin Coroutines 和 Compose 进行响应式编程
