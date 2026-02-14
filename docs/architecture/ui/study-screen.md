# StudyScreen - 间隔重复复习

本文档描述了 `StudyScreen` 组件及其与 **SM-2 (SuperMemo-2) 间隔重复算法** 的集成。该系统负责安排和呈现词汇复习，以优化长期记忆。StudyScreen 提供了一个交互式抽认卡界面，用户可以在其中复习根据其表现历史到期的单词。

有关测试系统（多项选择/拼写测验）的信息，请参阅 [TestScreen](test-screen.md)。有关 SM-2 算法数学的详细信息，请参阅 [间隔重复系统](../features/sm2.md)。

## 目的和范围
主要职责：
*   以抽认卡格式显示到期单词，带有问题/答案交互。
*   收集每次复习的用户质量评分 (0-5)。
*   应用 SM-2 算法计算下一次复习间隔。
*   支持多词库复习会话。
*   持久化复习统计信息（重复次数、间隔、难度因子）。
*   提供文本转语音发音支持。

## 系统架构
StudyScreen 作为 Android MVVM 架构的一部分运行，协调 UI 层和 LibraryViewModel 之间的数据操作。
*   `StudyScreen` 是一个无状态 Composable，观察来自 `LibraryViewModel` 的 StateFlows。
*   `dueWords` 是一个组合了 `currentLibraryId` 和 `studyLibraryIds` 的派生 Flow。
*   复习结果通过 `processReview()` 立即触发数据库更新。
*   词库选择持久化到 SharedPreferences 以保持会话连续性。

## SM-2 间隔重复算法
核心学习算法在 `LibraryViewModel.processReview()` 中实现。

**评分标准：**
*   **0 (忘记)**: 完全失败 -> 重置重复次数和间隔。
*   **3 (困难)**: 困难但正确 -> 正常进展。
*   **4 (良好)**: 中等轻松 -> 正常进展，EF 略微增加。
*   **5 (简单)**: 完美回忆 -> 正常进展，EF 最大增加。

## 学习会话流程
StudyScreen 采用自动启动行为，当有到期单词时立即显示抽认卡。
*   `currentWordIndex`: `dueWords` 列表中的索引。
*   `isReviewing`: 抽认卡 UI 是否处于活动状态。
*   `showAnswer`: 当前卡片是否显示答案。

## 词库选择与多词库复习
用户可以选择多个词库同时复习。系统将所有选定词库中的到期单词合并到一个复习队列中。
*   如果未显式选择词库，则默认为当前词库。
*   `getDueWordsForLibraries()` 查询所有选定词库中 `nextReviewTime <= NOW` 的单词。
*   选择通过 `study_library_ids` 键持久化到 SharedPreferences。

## 抽认卡 UI 组件
抽认卡具有三种交互模式：
1.  **问题**: 仅显示单词 + 音标。点击卡片显示答案。
2.  **答案**: 显示完整定义 + 例句。点击评分按钮。
3.  **加载**: 第一张卡片加载前显示空卡片。

**评分按钮：**
*   忘记 (0, 红色)
*   困难 (3, 橙色)
*   良好 (4, 绿色)
*   简单 (5, 蓝色)

**进度指示器**: `LinearProgressIndicator` 显示复习进度。

## 状态管理
StudyScreen 遵循响应式状态管理模式。
*   `dueWords`: 数据库支持的到期单词响应式列表。
*   `studyLibraryIds`: SharedPreferences 支持的选定词库。
*   `isTtsReady`: TTS 引擎状态。
*   `currentLibraryId`: 默认/回退词库。

本地 UI 状态（如 `currentWordIndex`）在配置更改时重置，这是可接受的，因为 `dueWords` 会重新加载，且每次评分都会立即保存进度。

## 文本转语音集成
StudyScreen 集成 Android TextToSpeech API。
*   **初始化**: 语言为美式英语，语速 0.9f。
*   **发音**: 用户点击扬声器图标时调用 `speak()`。
*   **清理**: ViewModel 清除时释放资源。

## 复习数据流
`processReview()` 完成后，数据库中的以下字段会被更新：
*   `repetitions`: 连续正确次数。
*   `interval`: 下次复习天数。
*   `easinessFactor`: 难度乘数。
*   `nextReviewTime`: 下次复习时间戳。
*   `reviewCount`: 总复习次数。
*   `correctCount`/`incorrectCount`: 正确/错误计数。

## 仪表板和会话完成
当没有单词到期或用户退出复习模式时，仪表板提供会话状态。
*   **暂停状态**: 有单词可用但 `isReviewing=false`。
*   **完成状态**: `dueWords.isEmpty()`。

## 词库重命名
用户可以直接从 Study 屏幕的词库选择对话框重命名词库。使用 Room 的 `REPLACE` 策略实现。
