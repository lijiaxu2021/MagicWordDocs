# Android 客户端架构

Android 客户端是 MagicWord 系统的核心，采用 **MVVM (Model-View-ViewModel)** 架构，确保了逻辑与 UI 的分离。应用基于 Jetpack Compose 构建 UI，使用 Room 进行本地持久化，并通过 Kotlin Coroutines 处理异步操作。

## 架构概览

### 设计原则
*   **单向数据流 (Unidirectional Data Flow)**: UI 发出事件 -> ViewModel 处理业务 -> 状态更新 -> UI 自动重组。
*   **单一信源 (Single Source of Truth)**: `LibraryViewModel` 是应用状态的核心持有者。
*   **响应式状态**: 所有 UI 状态通过 `StateFlow` 暴露，确保界面与数据实时同步。

## 核心组件 (Core Components)

### 1. LibraryViewModel (中央状态管理器)
`LibraryViewModel` 是应用状态的单一信源，协调所有数据操作和 UI 状态。
*   **职责**: 管理 17+ 个 `StateFlow` 属性（如 `currentLibraryId`, `dueWords`, `testSession` 等）。
*   **实现**: 
    *   通过 `LibraryViewModelFactory` 注入依赖 (`WordDao`, `SharedPreferences`)。
    *   使用 `viewModelScope` 管理协程生命周期。
    *   利用 `flatMapLatest` 和 `combine` 等操作符构建派生状态（例如根据当前词库 ID 自动查询对应的单词列表）。

### 2. 数据层 (Data Layer)
*   **WordDao**: 负责单词的增删改查。
    *   实现了 FTS4 全文搜索 (`searchWords`)。
    *   支持复杂查询（如 `getDueWords` 用于获取复习队列）。
*   **LibraryDao**: 管理词库元数据。
*   **TestSessionDao**: 持久化测试会话，防止应用意外关闭导致进度丢失。
*   **双重持久化策略**:
    *   **Room**: 存储结构化数据（单词、词库、测试历史）。
    *   **SharedPreferences**: 存储轻量级配置（当前词库ID、排序偏好、API设置）。

## 屏幕层级 (Screen Hierarchy)

应用采用 `MainScreen` 作为根容器，使用 `HorizontalPager` 实现底部标签导航。

| 屏幕 (Screen) | 主要功能 | 关键技术 |
| :--- | :--- | :--- |
| **MainScreen** | 根容器，处理导航、通知弹窗和更新检查。 | `Scaffold`, `NavigationBar`, `UpdateManager` |
| **WordsScreen** | 单词管理核心界面。支持卡片/列表视图切换、搜索、AI 录入。 | `LazyColumn`, `Reorderable`, `Optimistic Updates` |
| **StudyScreen** | 复习界面。基于 SM-2 算法调度卡片，提供“认识/不认识”反馈。 | `SM-2 Algorithm`, `TextToSpeech`, `LinearProgressIndicator` |
| **TestScreen** | 测试界面。支持选择题和拼写题，实时反馈结果。 | `QuizState` (Parcelable), `LaunchedEffect` (Auto-save) |
| **LibraryManagerScreen** | 词库管理。支持本地词库操作、在线词库浏览与下载、词库上传。 | `TabRow`, `OkHttp` (Download/Upload) |
| **SettingsScreen** | 设置界面。配置 AI 模型、Key-Kit、日志和 UI 偏好。 | `AppConfig` (Singleton), `DisposableEffect` (Auto-save) |

## 关键流程实现

### 初始化流程
1.  **Application 启动**: 初始化 `AppDatabase` 和 `AppConfig`。
2.  **MainScreen**: 
    *   检查 `notice.json` 获取系统通知。
    *   调用 `UpdateManager.checkUpdate()` 检查新版本。
3.  **ViewModel**: 加载上次使用的 `currentLibraryId`，触发数据流发射，UI 自动显示对应内容。

### 网络架构
应用使用两个独立的 HTTP 客户端以隔离关注点：
1.  **RetrofitClient**: 用于 AI API 通信。
    *   支持动态 Base URL 配置。
    *   自动 JSON 序列化/反序列化。
2.  **OkHttpClient**: 用于文件操作。
    *   下载在线词库 (JSON)。
    *   上传词库到 GitHub 仓库。
    *   下载 APK 更新包。

### 状态管理模式
*   **数据库驱动**: `allWords` 等流直接来自 Room，数据库变更自动触发 UI 更新。
*   **偏好驱动**: `currentLibraryId` 等来自 SharedPreferences，变更时手动触发流发射。
*   **派生状态**: `dueWords` 是 `currentLibraryId` 和 `studyLibraryIds` 的组合派生流。
