# 数据层与持久化

本文档描述了 MagicWord Android 应用程序的数据持久化架构。它涵盖了 Room 数据库结构、实体定义、数据访问对象 (DAO)、SharedPreferences 使用和数据流模式。

有关 `LibraryViewModel` 如何协调这些数据操作的信息，请参阅 [LibraryViewModel - 中央状态管理器](library-viewmodel.md)。有关数据如何与云基础设施同步的详细信息，请参阅 [云基础设施](../cloud/index.md)。

数据层实现了**三层持久化层次结构**：
1.  **临时**: Compose 管理的内存状态 (`rememberSaveable`)
2.  **轻量级**: SharedPreferences 用于设置和简单的键值对
3.  **持久**: Room SQLite 数据库用于结构化、可查询的数据

## 数据库架构概览

应用程序使用 Room 作为持久化库，提供 SQLite 之上的抽象层，具有编译时 SQL 验证和 Kotlin Coroutines/Flow 集成。

### 实体概览表

| 实体 | 表名 | 主键 | 目的 | 关键关系 |
| :--- | :--- | :--- | :--- | :--- |
| **Word** | `words` | `id` (自增) | 存储带有 SM-2 元数据的词汇条目 | 通过 `libraryId` 引用 Library |
| **Library** | `libraries` | `id` (自增) | 将单词分组为集合 | Word 实体的父级 |
| **TestSession** | `test_session` | `id` (默认 1) | 持久化进行中的测试状态 | 存储 `libraryId` 用于上下文 |
| **TestHistory** | `test_history` | `id` (自增) | 记录完成的测试结果 | 存储 `questionsJson` 数组 |
| **WordList** | `word_lists` | `id` (自增) | 自定义单词分组/标签 | 与 Word 多对多 |
| **WordFTS** | `word_fts` | `rowid` | 全文搜索虚拟表 | 镜像 `Word.word` 字段 |

## 核心实体

### Word 实体
`Word` 实体是中心数据结构，存储词汇项目以及间隔重复元数据、定义和使用统计信息。

**关键字段：**
*   `sensesJson`: JSON 编码的单词含义映射 (e.g., `{"sense_1": {"pos": "n", "meaning": "含义"}}`)
*   `formsJson`: JSON 编码的单词变体
*   `repetitions`: SM-2 算法：连续正确复习次数
*   `interval`: SM-2 算法：距离下次复习的天数
*   `easinessFactor`: SM-2 算法：难度修饰符 (默认 2.5)
*   `nextReviewTime`: 单词到期复习的 Unix 时间戳 (ms)
*   `sortOrder`: `SortOption.CUSTOM` 模式的自定义排序

### Library 实体
`Library` 实体表示单词的命名集合。应用程序支持具有独立单词集的多个词库。
*   `id = 1` 是默认词库，不能被删除。
*   `lastIndex` 跟踪用户在卡片复习模式中的位置。
*   删除级联：删除词库会删除所有关联的单词。

### 测试相关实体
*   **TestSession**: 持久化进行中的测试状态，允许在应用重启或标签切换后恢复。在每个问题回答时保存，在测试完成时清除。
*   **TestHistory**: 记录完成的测试结果用于历史分析。字段包括 `totalQuestions`, `correctCount`, `testType`, `durationSeconds`, `questionsJson`。

## 数据访问对象 (DAOs)

### WordDao 接口
`WordDao` 将所有数据库操作整合到一个接口中。

**核心查询方法：**
*   `getWordsByLibrary()`: `SELECT * FROM words WHERE libraryId = ?` (用于显示)
*   `getDueWordsForLibraries()`: `SELECT * FROM words WHERE libraryId IN (?) AND nextReviewTime < ?` (用于复习)
*   `searchWords()`: `SELECT * FROM word_fts WHERE word_fts MATCH ?` (FTS4 全文搜索)
*   `findWordGlobal()`: 全局精确匹配查找

**FTS4 全文搜索：**
数据库包含一个使用 SQLite FTS4 扩展的虚拟 `word_fts` 表，用于高效的子字符串匹配。它镜像 `words` 表中的 `word` 字段，支持前缀匹配。

### 库管理方法
*   `getAllLibraries()`: 返回 `Flow<List<Library>>`
*   `insertLibrary()`: 创建/更新词库 (REPLACE 策略)
*   `deleteLibrary()`: 删除词库

### 测试持久化方法
*   `saveTestSession()`, `getTestSession()`, `clearTestSession()`
*   `insertTestHistory()`, `getAllTestHistory()`
*   `updateWordStats()`: 更新单词的 `correctCount`/`incorrectCount`

## SharedPreferences 使用

应用程序使用 SharedPreferences 处理需要快速同步访问或不适合数据库模型的轻量级、非关系型状态。

**持久化状态映射：**
*   `current_library_id` (Int): 活动词库选择
*   `study_library_ids` (StringSet): 多词库复习选择
*   `sort_option` (String): 单词列表排序顺序
*   `last_index_{libraryId}` (Int): 卡片滚动位置（混合持久化模式：立即写入 Prefs，异步同步到 DB）
*   `app_settings`: UI 状态和系统偏好

## 数据流模式

### 响应式 StateFlow 架构
数据层通过 Kotlin Flow 操作符与 ViewModel 集成，创建响应式数据流。

**Flow 组合模式：**
*   **多源响应式**: `combine()` + `flatMapLatest()`。例如 `dueWords` 过滤器组合了 `currentLibraryId` + `studyLibraryIds` + 当前时间。
*   **查询切换**: `flatMapLatest()`。当参数更改时取消上一个查询。
*   **派生数据**: `map()`。在客户端转换数据库结果。

### 持久化策略决策树
*   **使用 Room**: 具有关系的数据，需要复杂查询，需要响应式更新。
*   **使用 SharedPreferences**: 简单键值对，需要快速同步访问，设置/配置数据。
*   **使用内存状态**: 临时 UI 状态，派生/计算值，瞬态错误消息。

## 导出和导入数据模型

应用程序定义了专门的数据类，用于词库导出/导入和在线词库操作期间的 JSON 序列化。

### 导出包结构
*   **导出流程**: 选择目标词库 -> 聚合数据 (Library + Words) -> 构建 `ExportPackage` -> Gson 序列化 -> 写入文件。
*   **导入流程**: 解析 JSON (`ExportPackage` 或旧格式) -> 创建新 Library -> 插入 Words (重置 ID, 更新 libraryId)。

### 在线词库模型
`OnlineLibrary` 数据类表示来自 GitHub 托管索引的词库条目。
*   **索引获取**: 从 `mag.upxuu.com/library/index_{page}.json` 下载。
*   **下载**: 获取 `library.json` 并导入。

## 数据库迁移策略
目前的实现并未显示显式的迁移逻辑。对于模式更改（添加列、创建表），Room 需要 `Migration` 对象。建议实施标准的 Room 迁移模式。
