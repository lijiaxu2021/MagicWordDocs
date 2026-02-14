# TestScreen - 测验功能

本文档描述了 `TestScreen` 组件中实现的测验系统，该系统提供两种测试模式（多项选择和拼写）用于词汇评估。该系统包括会话持久化、测试历史跟踪和自动单词统计更新。

有关学习模式中使用的 SM-2 间隔重复算法的信息，请参阅 [StudyScreen](study-screen.md)。

## 架构概览
测试系统围绕三个主要的 UI 组件（`TestScreen`, `QuizChoiceMode`, `QuizSpellMode`）构建，这些组件与 `LibraryViewModel` 交互以进行状态管理和持久化。系统支持通过数据库支持的会话存储来恢复中断的测试，并维护全面的测试历史。

## 组件分解

### TestScreen - 主容器
`TestScreen` composable 充当测验功能的编排层，管理标签导航并协调测试模式和历史视图。
*   **标签管理**: "选择题" 和 "拼写"。
*   **测试源显示**: 当 `testCandidates` 处于活动状态时显示 "正在测试选中单词"。
*   **历史访问**: 打开全屏历史记录。
*   **会话恢复**: `LaunchedEffect` 将保存的会话与 UI 状态同步。
*   **自动保存**: 监控 `choiceQuizState` 更改并通过 `saveTestSession` 持久化。

### QuizState - Parcelable 状态持有者
`QuizState` 数据类封装了所有测验进度信息，并实现了 `Parcelable` 以在配置更改中存活。
*   **设计理由**: 存储索引而不是完整的 `Word` 对象。
*   **自定义 Saver**: 使用 `Saver` 模式与 `rememberSaveable` 集成。

### 多项选择模式 - QuizChoiceMode
**单词过滤逻辑**: 测试前基于最近的复习活动过滤单词（24小时冷却），防止过度测试。如果所有单词都被过滤掉，则回退到完整列表。

**测验流程和选项生成**:
每个问题显示英文单词并提供四个选项（正确的中文定义 + 三个干扰项）。
*   **干扰项**: 随机打乱并取 3 个。
*   **即时反馈**: 正确（绿色），错误（红色）。
*   **自动推进**: 选择答案后 1 秒自动进入下一题。

**测试完成和统计更新**:
测验完成时触发：
1.  **保存测试历史**: 创建带有序列化结果的 `TestHistory` 记录。
2.  **清除会话**: 从数据库中删除 `TestSession`。
3.  **更新单词统计**: 更新每个单词的 `correctCount`/`incorrectCount`。

### 拼写模式 - QuizSpellMode
拼写模式显示中文定义，要求用户输入正确的英文单词。测试主动回忆。
*   **输入法**: `OutlinedTextField` with `ImeAction.Done`。
*   **验证**: 不区分大小写的比较。
*   **进度跟踪**: 使用 `rememberSaveable`。
*   **限制**: 目前不保存详细的测试历史记录到 `TestHistory`（未来增强）。

## 会话持久化系统
`TestSession` 实体存储活动测试状态，以便在应用终止后恢复。
*   **恢复逻辑**: 检查 `savedSession.libraryId` 是否匹配当前测试源。
*   **自动保存逻辑**: 每次状态更改都会触发 `saveTestSession`。

## 测试历史系统
**TestHistory 实体**:
存储带有完整问题详情的历史测试结果（序列化为 JSON）。
字段：`totalQuestions`, `correctCount`, `testType`, `questionsJson` (List<TestResultItem>)。

**历史 UI 组件**:
*   `TestHistoryScreen`: 按时间顺序显示测试会话列表。
*   `TestHistoryDetailScreen`: 显示已完成测试的单个问题结果。

## ViewModel 集成
*   **测试相关 State Flows**: 公开 `testSession`, `testHistory` 等。
*   **测试候选者选择**: `testCandidates` 机制允许用户测试特定的单词子集（例如，从 WordsScreen 选择）。
*   **单词统计更新**: `WordDao.updateWordStats` 更新性能指标。

## 状态管理架构
*   **本地 UI 状态**: `rememberSaveable` 处理配置更改。
*   **会话状态**: 数据库支持，用于进程死亡存活。
*   **历史状态**: 直接的 Room Flow。
*   **瞬态**: `showHistoryScreen` 使用 `remember`。

## 总结
TestScreen 测验系统实现了一个健壮的测试框架：
*   **测试模式**: 多项选择（即时反馈）和拼写（基于输入）。
*   **会话持久化**: 数据库支持，在进程死亡中存活。
*   **历史跟踪**: 存储详细的测试结果。
*   **智能过滤**: 24小时冷却以防止过度测试。
*   **状态恢复**: 多级持久化确保无数据丢失。
