# LibraryManagerScreen - 词库操作

本文档涵盖了 `LibraryManagerScreen` 组件，该组件提供了一个双标签界面，用于管理本地词汇库和访问在线词库目录。该屏幕使用户能够：
*   **本地标签 (Local Tab)**: 创建、删除、切换词库，并上传词库包与社区共享。
*   **在线标签 (Online Tab)**: 浏览、搜索、按标签过滤并从 GitHub 支持的目录下载词库。

有关词库数据持久化和数据库操作的信息，请参阅 [数据层与持久化](../core/data-layer.md)。有关处理在线词库操作的 Cloudflare Worker API 网关的详细信息，请参阅 [Cloudflare Worker - API 网关](../cloud/cloudflare.md)。有关 GitHub 存储结构，请参阅 [GitHub 数据仓库](../cloud/github.md)。

## 屏幕架构
`LibraryManagerScreen` 实现了基于 `TabRow` 的双界面，具有两个主要模式：
*   **本地词库 (Local)**: 管理本地存储的词库。
*   **在线词库 (Online)**: 浏览社区共享的词库。

## 本地词库管理

### UI 组件和布局
`LocalLibraryTab` 显示带有选择复选框、状态指示器和操作按钮的可滚动词库列表。
*   **关键状态管理**:
    *   `selectedLibraries`: 跟踪哪些词库被选中以上传。
    *   `currentLibraryId`: 指示活动词库。
    *   `importLogs`: 显示操作反馈。

### CRUD 操作
*   **创建词库**: `viewModel.addLibrary(name)`。插入新词库并自动生成 ID。
*   **删除词库**: `viewModel.deleteLibrary(id)`。默认词库 (ID=1) 受保护无法删除。
*   **切换词库**: 持久化到 SharedPreferences 并触发响应式 UI 更新。

### 导出和上传
导出系统支持使用 `ExportPackage` 进行多词库打包。
**上传实现**:
1.  **生成 JSON**: 序列化选定的词库。
2.  **Base64 编码**: 防止 HTTP 传输问题。
3.  **构建请求体**: 添加元数据（名称、描述、标签）。
4.  **POST 到 Worker**: 发送到 `https://mag.upxuu.com/library/upload`。
5.  **处理响应**: 更新日志并在成功时刷新在线列表。

## 在线词库目录

### 数据模型和索引结构
在线词库系统使用由 GitHub Actions 管理的分页索引架构。
*   `OnlineLibrary` 结构包含 ID（时间戳）、名称、描述、作者、标签和下载 URL。

### 浏览和分页
在线标签实现了渐进式分页，带有自动加载更多触发器。
*   **初始加载**: 获取 `num.json` 以确定总页数。
*   **批量处理**: 每次用户操作尝试获取 10 项。
*   **多页获取**: 如果过滤减少了结果，自动获取下一页（最多 5 次尝试）。
*   **加载更多触发器**: LazyColumn 监控滚动位置，并在 `index >= size - 3` 时触发。
*   **追加策略**: 新项追加到现有列表。

### 搜索和标签过滤
**标签系统**: 从 `tags.json` 获取聚合元数据。UI 使用 `FilterChip` 组件在可折叠抽屉中显示标签。
**客户端过滤**: 获取索引页面后，搜索和过滤逻辑完全在客户端进行。
*   **手动搜索**: 通过 OutlinedTextField。
*   **自动搜索**: `searchOnlineLibraries(query, tag)` 重置分页。

### 下载和导入
**下载流程**:
1.  **尝试新格式**: 解析为 `ExportPackage`（多词库）。
2.  **回退到旧格式**: 如果失败，尝试解析为 `List<Word>`。
3.  **创建新词库**: 每个导入的词库获得新的 ID。
4.  **单词分配**: 所有单词重新分配到新词库 ID。
5.  **网络调用**: 获取 `library.json`。

## 状态流摘要
LibraryManagerScreen 协调来自 `LibraryViewModel` 的多个响应式状态流：
*   `allLibraries`: 本地词库。
*   `currentLibraryId`: 活动词库。
*   `onlineLibraries`: 获取的在线目录。
*   `onlineTags`: 可用的过滤标签。
*   `isNetworkLoading`: 网络状态。
*   `importLogs`: 操作反馈。

## 错误处理和加载状态
*   **进度指示器**: `LinearProgressIndicator` (初始加载), `CircularProgressIndicator` (加载更多)。
*   **状态消息**: 显示来自 `importLogs` 的最后日志条目。
*   **空状态**: 在线标签显示重试按钮。
*   **异常记录**: 网络错误通过 `LogUtil` 记录，用户可见错误添加到 `importLogs`。
