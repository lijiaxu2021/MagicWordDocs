# Android 客户端架构

Android 客户端是 MagicWord 系统的核心，采用 MVVM 架构，确保了逻辑与 UI 的分离。

## 核心组件 (Core Components)

### 1. LibraryViewModel (中央状态管理器)
`LibraryViewModel` 是应用状态的单一信源 (Single Source of Truth)，重要性极高。
*   **职责**: 管理所有 UI 状态（当前词库、复习列表、测试会话等）。
*   **实现**: 暴露了 17+ 个 `StateFlow` 属性供 UI 观察。
*   **联动**: 自动响应数据库 (`Room`) 和配置 (`SharedPreferences`) 的变化。

### 2. 数据层 (Data Layer)
*   **WordDao**: 负责单词的增删改查。实现了 FTS4 全文搜索，支持跨词库快速查找。
*   **LibraryDao**: 管理词库元数据。
*   **TestSessionDao**: 持久化测试会话，防止应用意外关闭导致进度丢失。

## 屏幕层级 (Screen Hierarchy)

| 屏幕 (Screen) | 主要功能 |
| :--- | :--- |
| **MainScreen** | 根容器，处理底部导航、通知弹窗和更新检查。 |
| **WordsScreen** | 单词管理核心界面。支持卡片/列表视图切换、搜索、AI 录入。 |
| **StudyScreen** | 复习界面。基于 SM-2 算法调度卡片，提供“认识/不认识”反馈。 |
| **TestScreen** | 测试界面。支持选择题和拼写题，实时反馈结果。 |
| **LibraryManagerScreen** | 词库管理。支持本地词库操作、在线词库浏览与下载、词库上传。 |
| **SettingsScreen** | 设置界面。配置 AI 模型、Key-Kit、日志和 UI 偏好。 |

## 关键流程

### 初始化流程
1.  **Application 启动**: 初始化 `AppDatabase` 和 `AppConfig`。
2.  **MainScreen**: 启动时检查 `notice.json` (通知) 和版本更新。
3.  **ViewModel**: 加载上次使用的 `currentLibraryId`，触发数据流发射。

### 复习算法 (SM-2)
位于 `SM-2Algorithm.kt`，根据用户的评分（0-5）计算：
*   **Ease Factor (EF)**: 单词的难易度因子。
*   **Interval**: 下次复习的间隔天数。
系统每天会自动筛选出 `dueDate <= Today` 的单词进入复习队列。
