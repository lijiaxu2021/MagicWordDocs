# WordsScreen - 词汇管理

本文档涵盖了 `WordsScreen` 组件，这是 MagicWord Android 应用程序中词汇管理的主要界面。该屏幕提供双重查看模式（沉浸式卡片学习和高效的列表管理）、集成的 AI 驱动的单词导入、搜索功能和全面的编辑功能。

有关间隔重复复习功能，请参阅 [StudyScreen](study-screen.md)。有关测验功能，请参阅 [TestScreen](test-screen.md)。

## 架构概览

`WordsScreen` 实现了双模式界面架构，由 `isListMode` 布尔状态控制。

### 显示模式

#### 卡片模式 (Card Mode)
提供使用 Jetpack Compose `VerticalPager` 的沉浸式全屏学习体验。
*   **Pager State**: `rememberPagerState(pageCount = { words.size })`
*   **单词显示**: `WordCard` composable 显示完整单词详情。
*   **复习跟踪**: 在页面查看时增加 `reviewCount`。
*   **索引持久化**: 将当前页面保存到 SharedPreferences 和 DB，以便在重新进入时恢复。
*   **长按操作**: 切换到列表模式。
*   **侧边面板**: 可选的快速导航列表。

**索引恢复逻辑**: 当切换词库或返回卡片模式时，屏幕会恢复上次查看的位置。通过 `LibraryViewModel.getInitialLastIndex(libraryId)` 获取初始值，并在 `LaunchedEffect` 中滚动。

#### 列表模式 (List Mode)
提供高效的批量管理，支持多选、重新排序和批处理操作。
*   **重新排序**: 使用 `sh.calvin.reorderable` 库。拖动时自动将排序选项切换为 `CUSTOM`。
*   **选择状态**: `Set<Int>` 跟踪选中的单词 ID。
*   **批处理操作**: 测试、删除。

## 搜索系统

搜索系统通过单个搜索栏提供两种不同的功能：

### 本地搜索 (过滤 + 滚动)
在文本输入时触发，提供即时反馈。
*   **卡片模式**: 搜索栏更新以提供视觉反馈。
*   **列表模式**: 自动滚动到第一个匹配的单词。

### 全局 AI 搜索
按 Enter/搜索键触发，执行全局查找和 AI 导入。
*   **流程**: 检查本地数据库 -> 如果未找到，调用 `handleGlobalSearch` -> AI 导入单个单词。
*   **导航**: 如果在其他词库中找到或导入成功，自动切换词库并滚动到该单词。

## 批量导入系统

批量导入功能使用 AI 从长文本段落中提取词汇。

### 导入流程
1.  **单词提取**: `viewModel.bulkImport(text)`。AI 识别可学习的单词/短语。关键规则：短语中的空格替换为下划线。
2.  **分块并行处理**:
    *   **分块**: 3 个单词一组。
    *   **并发**: 3 个并行块。
    *   **重试**: 每个块最多重试 3 次。
    *   **同步**: 使用线程安全的集合跟踪导入的单词。
3.  **AI 定义**: 获取单词的 JSON 定义（词元、音标、释义、例句）。

### UI 组件
*   **Bulk Import Sheet**: `ModalBottomSheet` 显示输入字段和实时日志流 (`importLogs`)。

## 单词编辑

### 编辑对话框架构
*   **触发**: 列表模式单击，或卡片模式编辑按钮。
*   **更新**: 调用 `viewModel.updateWord(word)` 持久化更改。

## 排序系统

*   **排序选项**: 枚举 (`CREATED_AT_DESC`, `ALPHA_ASC`, `CUSTOM` 等)。
*   **持久化**: 保存到 SharedPreferences。
*   **自动切换**: 手动重新排序时自动切换到 `CUSTOM`。

## 侧边列表面板 (Side List Panel)
仅在卡片模式下可见的快速导航列表。
*   **自动居中**: 使用视口高度计算使选定项居中。
*   **视觉样式**: 选中项高亮显示。

## 文本转语音集成
*   **初始化**: 速度设置为 0.9f 以提高清晰度。
*   **UI 集成**: 卡片模式和编辑对话框中的扬声器图标。

## 导航集成

### 跳转导航系统
支持从其他屏幕（如 `WordListScreen`）进行编程式导航。
*   **处理**: `WordsScreen` 观察 `pendingJumpWordId`，强制进入卡片模式并滚动到目标单词。

### 词库切换
*   **滑动手势**: 从左边缘水平滑动打开词库管理器。
*   **标题栏点击**: 点击词库名称打开管理器。

## 批处理操作

*   **测试选定单词**: 过滤选定列表 -> `viewModel.setTestCandidates` -> 跳转到测试屏幕。
*   **删除选定单词**: `viewModel.deleteWords`。
*   **全选/取消全选**: 切换选择状态。

## 状态同步与配置更改
*   **反应式数据流**: UI 观察 StateFlows (`allWords`)，Compose 自动重组。
*   **状态保存**: `isListMode` 等 UI 状态在旋转时重置，但 ViewModel 状态和数据库数据保持不变。Pager 位置通过 `LaunchedEffect` 恢复。
