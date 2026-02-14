# 用户界面屏幕

本页面提供了使用 Jetpack Compose 构建的 Android 应用程序用户界面层的概述。它记录了屏幕层次结构、导航架构和管理用户如何与 MagicWord 词汇学习系统交互的状态管理模式。

**详细文档：**
*   主要导航中心: [MainScreen & Navigation](main-screen.md)
*   词汇管理: [WordsScreen - Vocabulary Management](words-screen.md)
*   间隔重复学习: [StudyScreen - Spaced Repetition Review](study-screen.md)
*   测验功能: [TestScreen - Quiz Functionality](test-screen.md)
*   词库操作: [LibraryManagerScreen - Library Operations](library-manager.md)
*   应用程序设置: [SettingsScreen & Configuration](settings-screen.md)

有关为所有屏幕提供动力的中央状态管理组件，请参阅 [LibraryViewModel - 中央状态管理器](../core/library-viewmodel.md)。

## 导航架构

应用程序使用基于标签的导航模式，通过 Jetpack Compose Foundation 的 `HorizontalPager` 实现。导航结构区分了**主要屏幕**（通过底部导航访问）和**覆盖屏幕**（显示为主要内容之上的全屏模态）。

### 主要导航实现
主要导航使用 `HorizontalPager` 与同步的底部导航栏状态。

| 屏幕 | 路由 | 图标 | 索引 | 目的 |
| :--- | :--- | :--- | :--- | :--- |
| **StudyScreen** | "study" | School | 0 | SM-2 间隔重复复习 |
| **WordsScreen** | "words" | Book | 1 | 词汇卡片/列表管理 |
| **TestScreen** | "test" | CheckCircle | 2 | 多项选择和拼写测验 |
| **WordListScreen** | "list" | List | 3 | 自定义单词列表分组 |

### 覆盖系统实现
覆盖层使用基于可空 `currentOverlay` 状态变量的条件渲染。当非空时，覆盖屏幕替换整个 `Scaffold` 内容，有效地实现了没有 NavHost 的模态导航模式。

## 状态管理架构

所有 UI 屏幕遵循单向数据流模式，其中 `LibraryViewModel` 充当单一真实来源。屏幕通过 `StateFlow.collectAsState()` 观察状态，并通过 ViewModel 函数调用触发操作。

### 常见状态模式

| 状态类型 | 实现 | 示例用法 |
| :--- | :--- | :--- |
| **数据库支持** | `StateFlow<List<T>>` from DAO | `allWords`, `dueWords`, `allLibraries` |
| **派生状态** | `combine()` / `flatMapLatest()` | `dueWords` 组合了词库选择 + 复习状态 |
| **仅 UI 状态** | `remember { mutableStateOf() }` | `isListMode`, `showSearch`, `editingWord` |
| **持久 UI 状态** | SharedPreferences via ViewModel | `currentLibraryId`, 排序选项 |
| **加载状态** | `StateFlow<Boolean>` | `isImporting`, `isGlobalSearching` |

## 屏幕间通信

屏幕通过共享的 `LibraryViewModel` 实例而不是直接函数调用进行通信。这实现了去耦的、响应式通信。

### 跨屏幕导航机制
*   **跳转到测试**: `WordsScreen` 触发回调，`MainScreen` 处理标签切换。

## 屏幕生命周期模式

### 初始化模式
每个屏幕使用 `LaunchedEffect(Unit)` 进行一次性设置任务。

### 状态恢复模式
屏幕通过 ViewModel 使用 SharedPreferences 恢复其最后状态（例如，滚动位置）。

## 常见 UI 组件

### 模式切换模式
`WordsScreen` 使用 `AnimatedContent` 实现双模式界面（卡片/列表）：
*   **Card Mode**: `VerticalPager`，沉浸式学习，滑动导航。
*   **List Mode**: `LazyColumn`，批量操作，排序，选择。

### 搜索集成
全局搜索集成到持久搜索栏中，支持本地 FTS4 搜索和 AI 驱动的全局查找。

### 对话框管理模式
屏幕使用可空状态变量来控制对话框可见性。

## 系统集成点

*   **更新系统集成**: `MainScreen` 与 `UpdateManager` 集成以在启动时检查应用程序更新。
*   **公告系统集成**: 公告系统显示从服务器获取的公告。
*   **AI 导入集成**: 批量导入功能使用带有实时日志流的 `ModalBottomSheet`。

## 屏幕职责摘要

| 屏幕 | 文件 | 主要职责 | 关键状态 |
| :--- | :--- | :--- | :--- |
| **MainScreen** | `MainScreen.kt` | 导航协调，标签管理，更新/公告处理 | `pagerState`, `currentOverlay` |
| **WordsScreen** | `WordsScreen.kt` | 词汇显示（卡片/列表），编辑，批量导入，搜索 | `allWords`, `isListMode`, `selectedWords` |
| **StudyScreen** | `StudyScreen.kt` | SM-2 复习闪卡，词库过滤，进度跟踪 | `dueWords`, `studyLibraryIds` |
| **TestScreen** | `TestScreen.kt` | 测验执行，答案验证，历史跟踪 | `testSession`, `testCandidates` |
| **WordListScreen** | `WordListScreen.kt` | 自定义单词分组，列表管理 | 词库中的单词选择 |
| **LibraryManagerScreen** | `LibraryManagerScreen.kt` | 本地/在线词库 CRUD，下载/上传 | `allLibraries`, `onlineLibraries` |
| **SettingsScreen** | `SettingsScreen.kt` | AI 配置，Key-Kit 验证，日志访问 | `AppConfig` 单例 |
