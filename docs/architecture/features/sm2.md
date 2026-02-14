# Spaced Repetition System (SM-2) - 间隔重复系统

本文档描述了 MagicWord 中 SuperMemo-2 (SM-2) 间隔重复算法的实现，该算法基于用户表现优化词汇复习调度。

## 算法概览
SM-2 算法维护三个主要状态变量：
*   **Repetitions (n)**: 连续成功复习次数。
*   **Interval (I)**: 距离下次复习的天数。
*   **Easiness Factor (EF)**: 间隔增长乘数 (默认 2.5)。

## 实现细节

### 核心算法逻辑
在 `LibraryViewModel.processReview()` 中实现：
*   **评分 < 3 (失败)**:
    *   n = 0
    *   I = 1
    *   EF 保持不变 (SuperMemo 官方标准，部分变体可能减少 EF)
*   **评分 >= 3 (成功)**:
    *   n = n + 1
    *   I(1) = 1, I(2) = 6, I(n) = I(n-1) * EF
    *   EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))

### 评分系统
*   **0 (忘记)**: 红色，重置进度。
*   **3 (困难)**: 橙色，EF 减少 (-0.14)。
*   **4 (良好)**: 绿色，EF 不变。
*   **5 (简单)**: 蓝色，EF 增加 (+0.1)。

### 数据模型
`Word` 实体存储 SM-2 状态：
*   `repetitions`, `interval`, `easinessFactor`
*   `nextReviewTime`: 下次复习的 Unix 时间戳
*   `reviewCount`, `correctCount`, `incorrectCount`: 统计数据

## 复习调度

### 到期单词查询
系统使用响应式 Flow 查询到期单词：
*   过滤条件: `nextReviewTime <= System.currentTimeMillis()`
*   范围: 当前选定的 `studyLibraryIds`，如果为空则为 `currentLibraryId`。

### 边缘情况
*   **全局搜索重置**: 如果用户搜索了一个现有单词，系统将其视为“忘记”，重置复习进度。
*   **新单词初始化**: 导入的单词使用默认值初始化，使其立即可供学习。

## 性能特征
*   **processReview()**: O(1) 数据库更新。
*   **getDueWordsForLibraries()**: O(n log n) 索引查询。
*   **间隔增长**: 典型的指数增长 (1天 -> 6天 -> 15天 -> 38天 -> ...)。
