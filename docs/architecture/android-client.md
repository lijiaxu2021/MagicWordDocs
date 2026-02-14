# Android 应用程序

本文档提供了 MagicWord Android 客户端应用程序的概述，涵盖了其架构模式、技术栈、组件结构和导航系统。Android 应用程序是一个独立的词汇学习应用程序，它使用 Jetpack Compose 进行 UI 开发，Room 进行本地持久化，以及 Kotlin Coroutines 进行异步操作，实现了 MVVM 架构。

**相关页面：**
*   有关核心组件（ViewModel、DAO、构建配置）的详细文档，请参阅 [核心组件](core/index.md)
*   有关各个屏幕实现和 UI 模式，请参阅 [用户界面屏幕](ui/screens.md)
*   有关 AI 集成和间隔重复等横切功能，请参阅 [功能系统](features/index.md)
*   有关应用程序与之通信的云基础设施，请参阅 [云基础设施](cloud/index.md)

## 架构概览

Android 应用程序遵循 **Model-View-ViewModel (MVVM)** 架构，在三个层面上清晰地分离了关注点。

### 架构特征
*   **单向数据流**: UI 屏幕向 ViewModel 发送事件，ViewModel 更新状态，状态更改流回 UI。
*   **单一真实来源**: `LibraryViewModel` 集中了所有应用程序状态和业务逻辑。
*   **响应式状态**: 所有 UI 状态都作为 Kotlin `StateFlow` 属性公开，UI 层收集并观察这些属性。
*   **依赖注入**: 使用工厂模式 (`LibraryViewModelFactory`) 进行手动 DI。

## 技术栈

应用程序构建在现代 Android 开发工具和库之上。下表总结了核心依赖项及其用途：

| 类别 | 库 | 版本 | 目的 |
| :--- | :--- | :--- | :--- |
| **UI 框架** | Jetpack Compose | BOM 2023.08.00 | 声明式 UI 工具包 |
| | Material 3 | (BOM) | Material Design 3 组件 |
| | Navigation Compose | 2.7.5 | 屏幕导航 |
| **数据库** | Room | 2.6.1 | 支持协程的 SQLite ORM |
| **网络** | Retrofit | 2.9.0 | AI API 的 HTTP 客户端 |
| | OkHttp | (transitive) | 文件操作的底层 HTTP |
| | Gson Converter | 2.9.0 | JSON 序列化/反序列化 |
| **后台工作** | WorkManager | 2.9.0 | 计划的后台任务 |
| **UI 工具** | Reorderable | 2.4.3 | 拖放列表重新排序 |
| **语言** | Kotlin | 1.9.x | 主要语言 |
| | Kotlin Coroutines | (via KTX) | 异步编程 |
| **构建工具** | Android Gradle Plugin | 8.x | 构建系统 |
| | KSP | Latest | Room 的注解处理 |

## 构建配置

应用程序配置有以下规格：

**关键构建配置：**
*   **Namespace**: `com.magicword.app`
*   **Application ID**: `com.magicword.app`
*   **Minimum SDK**: API 24 (Android 7.0 Nougat)
*   **Target SDK**: API 34 (Android 14)
*   **Java Compatibility**: Java 8
*   **Kotlin JVM Target**: 1.8
*   **Compose Compiler**: 1.5.4

**签名配置**：
发布构建使用签名配置，该配置从环境变量（用于 CI/CD）读取凭据，或回退到本地默认值。Keystore 路径、密码和别名已参数化以支持自动构建。

## 应用程序结构

### 导航系统
应用程序使用基于标签的导航系统，通过 `HorizontalPager` and `NavigationBar` 实现，以及用于辅助屏幕的覆盖系统。

**导航组件：**
*   **Main Container**: `MainScreen` composable (根导航协调器)
*   **Tab State**: `pagerState` (跟踪当前标签索引 0-3)
*   **Overlay State**: `currentOverlay` (跟踪活动覆盖屏幕)
*   **Tab Animations**: `HorizontalPager` (标签间的滑动手势)
*   **Navigation Bar**: `NavigationBar` (底部标签选择器)

### 初始化和生命周期
`MainScreen` composable 在启动时执行多个初始化任务：
1.  **检查更新**: 调用 `UpdateManager.checkUpdate()` 比较当前版本与最新的 GitHub 版本。
2.  **检查公告**: 调用 `NoticeManager.checkNotice()` 获取并显示未读的系统公告。
3.  **ViewModel 设置**: 使用 `WordDao` 和 `SharedPreferences` 依赖项初始化 `LibraryViewModel`。
4.  **状态收集**: 订阅 `allLibraries`, `currentLibraryId` 和其他 StateFlows。

## 状态管理模式

应用程序实现了**集中式响应式状态管理**模式，其中所有 UI 状态都流经 `LibraryViewModel`。

### 状态流架构

ViewModel 公开三种类型的状态流：

| 类型 | 示例 | 来源 | 更新机制 |
| :--- | :--- | :--- | :--- |
| **数据库支持** | `allWords`, `allLibraries` | `wordDao.getAllWords().asFlow()` | Room 在数据更改时触发发射 |
| **偏好支持** | `currentLibraryId`, `studyLibraryIds` | SharedPreferences listener | 写入偏好后手动发射 |
| **派生/计算** | `dueWords`, `filteredWords` | `combine()` or `flatMapLatest()` | 当依赖项更改时自动重新计算 |

**示例：派生流模式**
`dueWords` StateFlow 通过组合 `currentLibraryId` 和数据库查询计算得出：
`currentLibraryId` → `flatMapLatest` → `wordDao.getDueWords(libraryId).asFlow()` → `dueWords`
当用户切换词库时，`currentLibraryId` 更新，触发新的数据库查询，该查询发射到 `dueWords`，从而重组 UI。

### ViewModel 工厂模式
应用程序使用带有工厂模式的手动依赖注入：
*   确保 ViewModel 具有所需的依赖项（DAO, SharedPreferences）
*   ViewModel 生命周期绑定到 composable 范围
*   配置更改保留 ViewModel 实例

## 数据持久化架构

应用程序使用**双重持久化策略**，结合了用于结构化数据的 Room 数据库和用于轻量级设置的 SharedPreferences。

### 数据库结构
*   **Word**: 存储词汇条目（FTS4 搜索，SM-2 复习字段）
*   **Library**: 将单词组织成集合（支持 JSON 导入/导出）
*   **TestSession**: 活动测试状态（持久化未完成的测试）
*   **TestHistory**: 历史测试结果（跟踪分数、持续时间、时间戳）

所有 DAO 查询方法都返回 Kotlin `Flow` 类型，当数据库更改时自动发射新值，从而实现响应式 UI 更新。

## 网络架构

应用程序使用不同的 HTTP 客户端与两个不同的网络服务集成：

1.  **Retrofit (AI 服务)**
    *   **Base URL**: `https://api.siliconflow.cn/v1/`
    *   **用途**: 单词定义查找、批量文本提取、AI 生成助记符
    *   **转换器**: Gson 用于自动 JSON 序列化

2.  **OkHttp (文件操作)**
    *   **Base URL**: `https://mag.upxuu.com/` (Cloudflare Worker)
    *   **用途**: 下载词库 JSON、上传新词库、下载 APK 更新、获取分页索引
    *   **特性**: 进度跟踪、大文件处理

这种分离确保了 AI 调用可以独立于文件操作重试，并且每种服务类型有不同的超时配置。

## 协程和线程模型

应用程序广泛使用 Kotlin Coroutines 进行异步操作：

### 协程作用域
*   **viewModelScope**: 在 `LibraryViewModel` 内部。用于长时间运行的操作（DB 写入、网络调用）。绑定到 ViewModel 生命周期。
*   **rememberCoroutineScope()**: Composable 函数。用于 UI 触发的操作（导航、一次性操作）。绑定到组合生命周期。
*   **LaunchedEffect**: Composable 函数。用于组合的副作用（初始化、观察者）。在键更改时重新触发。

### 线程策略
*   **数据库操作**: Room 自动在后台线程上运行查询。
*   **网络操作**: Retrofit/OkHttp 默认使用 `Dispatchers.IO`。
*   **状态更新**: ViewModel 在 `Dispatchers.Main` 上发射状态更改以确保 UI 线程安全。
*   **繁重计算**: SM-2 计算和文本解析使用 `Dispatchers.Default`。

## 总结

MagicWord Android 应用程序是一个现代、响应式的移动应用程序，构建于：
*   **架构**: 具有集中状态管理的整洁 MVVM
*   **UI**: 带有 Material 3 设计的 Jetpack Compose
*   **数据**: Room 数据库 + SharedPreferences 双重持久化
*   **网络**: 用于 AI 的 Retrofit，用于文件操作的 OkHttp
*   **并发**: 带有基于 Flow 的响应式流的 Kotlin Coroutines
*   **构建**: 带有自动 CI/CD 签名的 Gradle

该架构优先考虑：
*   **响应性**: 所有状态单向从 ViewModel 流向 UI
*   **可扩展性**: 单个 ViewModel 可以服务多个屏幕
*   **可测试性**: 表现层、业务逻辑和数据层之间清晰分离
*   **可维护性**: 使用 Compose 的声明式 UI 减少了样板代码
