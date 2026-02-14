# MainScreen & Navigation

本文档描述了 `MainScreen` composable，它是 MagicWord Android 应用程序的主要导航中心和入口点。它协调四个主要功能屏幕之间的基于标签的导航，管理覆盖屏幕（设置、词库管理、个人资料），并处理关键的初始化任务，包括更新检查和系统公告。

有关通过 MainScreen 访问的各个功能屏幕的详细信息，请参阅：
*   [StudyScreen](study-screen.md) 用于间隔重复复习
*   [WordsScreen](words-screen.md) 用于词汇管理
*   [TestScreen](test-screen.md) 用于测验功能
*   [LibraryManagerScreen](library-manager.md) 用于词库操作
*   [SettingsScreen](settings-screen.md) 用于配置

有关 MainScreen 集成的中央状态管理层的信息，请参阅 [LibraryViewModel](../core/library-viewmodel.md)。

## 架构概览

MainScreen 实现了**双层导航模式**：用于主要功能的基于标签的水平分页器，以及用于辅助屏幕的模态覆盖系统。该 composable 管理初始化副作用（更新检查、公告），并充当 UI 和业务逻辑层之间的集成点。

## 导航结构

### 基于标签的主要导航
MainScreen 使用 Jetpack Compose 的 `HorizontalPager` 实现可滑动的标签导航。通过 `Screen` 密封类定义了四个标签：

| 索引 | 路由 | 标签 | 图标 | 屏幕组件 |
| :--- | :--- | :--- | :--- | :--- |
| 0 | study | 学习 | School | `StudyScreen()` |
| 1 | words | 词库 | Book | `WordsScreen()` |
| 2 | test | 测试 | CheckCircle | `TestScreen()` |
| 3 | list | 单词表 | List | `WordListScreen()` |

### Pager 实现
导航使用以下方式实现：
*   `PagerState`: 维护当前页面索引和处理滚动动画
*   `HorizontalPager`: 渲染带有水平滑动手势的页面
*   `NavigationBar`: 显示带有页面选择指示器的底部标签栏

## 初始化系统

MainScreen 在首次组合时使用 `LaunchedEffect(Unit)` 执行关键初始化任务。这确保了在用户与应用程序交互之前显示更新检查和公告。

### 更新检查流
通过 `UpdateManager.checkUpdate()` 从服务器获取版本信息。如果检测到新版本，它将填充 `updateInfo` 并设置 `showUpdateDialog = true`，触发更新对话框显示。

### 公告检查流
使用 `NoticeManager.checkNotice()` 检查系统公告。公告系统向用户显示他们尚未确认的重要通知。

### 对话框系统
*   **更新对话框**: 提供完整的更新工作流（初始提示 -> 下载进度 -> 安装触发）。
*   **公告对话框**: 显示来自服务器的公告（标题、内容），带有“我知道了”按钮以标记为已读。

这两个对话框都使用 `onDismissRequest` 处理程序，防止在关键操作（如下载更新）期间被关闭。

## 标签管理

### Pager 配置
`HorizontalPager` 配置为：
*   `pageCount`: 4
*   `userScrollEnabled`: true (允许滑动手势)
*   `state`: `pagerState`

每个页面都包裹在 `SlideInEntry` 动画组件中以实现平滑过渡。

### 标签切换机制
1.  **用户点击导航栏**: 点击底部图标切换。
2.  **用户滑动手势**: 直接滑动内容区域。
3.  **编程式导航**: 子屏幕可以通过回调触发标签切换。例如，WordsScreen 的 `onJumpToTest` 回调。

### 跳转事件处理
ViewModel 可以通过设置 `pendingJumpWordId` 来触发跳转到 Words 标签。这种机制允许从其他屏幕进行深度链接或编程式导航。

## 覆盖系统

覆盖系统提供模态导航，而不影响主要标签导航状态。

### 覆盖路由逻辑
使用基于 `currentOverlay` 的条件渲染：
*   `settings`: 显示 `SettingsScreen`
*   `library_manager`: 显示 `LibraryManagerScreen`
*   `profile`: 显示 `ProfileScreen`
*   `logs`: 显示 `LogListScreen`
*   `about`: 显示 `AboutScreen`

### 覆盖触发器
覆盖层通过传递给子屏幕的回调触发：
*   `onOpenSettings` -> `currentOverlay = "settings"`
*   `onManageLibraries` -> `currentOverlay = "library_manager"`
*   `onOpenProfile` -> `currentOverlay = "profile"`
*   `onNavigateToLogs` -> `currentOverlay = "logs"`
*   `onNavigateToAbout` -> `currentOverlay = "about"`

覆盖系统提供分层返回导航：Logs 和 About 返回到 Settings，而 Settings 返回到主屏幕 (null)。

## 状态管理

### 本地状态
MainScreen 使用 Compose 状态原语管理多个本地状态：
*   `isLoggedIn`: 身份验证状态
*   `showUpdateDialog`, `updateInfo`, `downloadProgress`, `isDownloading`: 更新相关状态
*   `showNoticeDialog`, `currentNotice`: 公告相关状态
*   `currentOverlay`: 跟踪活动覆盖屏幕
*   `pagerState`: 管理标签导航状态

### ViewModel 集成
MainScreen 与 `LibraryViewModel` 集成以访问全局应用程序状态，例如当前词库名称。

## 集成点

### 子屏幕回调
子屏幕接收回调以与 MainScreen 的覆盖系统交互。这种基于回调的架构保持了单向数据流，并防止子屏幕直接操作父状态。

## 总结

MainScreen 作为 MagicWord UI 的架构基石，实现了：
*   **双层导航**: 基于标签的主要导航和用于辅助屏幕的模态覆盖
*   **初始化逻辑**: 应用启动时的自动更新检查和系统公告显示
*   **状态协调**: 与 `LibraryViewModel` 集成以进行响应式状态管理
*   **灵活路由**: 支持通过跳转事件和回调进行编程式导航
*   **用户体验**: 平滑动画、进度指示器和关键操作期间的不可关闭对话框
