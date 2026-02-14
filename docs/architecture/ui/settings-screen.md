# SettingsScreen & Configuration

本文档涵盖了 `SettingsScreen` UI 组件和 `AppConfig` 单例，它们共同管理 MagicWord 中的应用程序范围配置。设置系统提供了用于配置 AI 集成参数、个性化选项、系统首选项以及独特的 **Key-Kit** 身份验证机制（简化多参数 API 配置）的用户界面。

有关更新检查和下载功能的信息，请参阅 [更新系统](../features/update.md)。

## 架构概览
配置系统遵循具有即时 UI 响应性的**三层持久化模型**。系统使用 `DisposableEffect` 在用户离开设置屏幕时触发配置持久化，确保所有更改自动保存。

## AppConfig 单例
`AppConfig` 是应用程序范围配置的**单一真实来源**，作为 Kotlin `object` (单例) 实现。

**配置属性：**
*   `apiKey` (String): AI 服务 API 认证密钥。
*   `modelName` (String): AI 模型标识符 (默认: "Qwen/Qwen2.5-7B-Instruct")。
*   `serverUrl` (String): AI 服务基础 URL (通过 Key-Kit 设置)。
*   `userPersona` (String): AI 个性化的用户上下文。
*   `saveLocationId` (Int): 新单词导入的目标词库 ID (-1 = 当前词库)。

**初始化与持久化：**
*   `init(Context)`: 在应用启动时从 SharedPreferences 加载配置。
*   `saveConfig()`: 将内存中的更改原子地提交到 SharedPreferences。

## Key-Kit 验证系统
**Key-Kit** 系统将多参数 API 配置的复杂性抽象为单个验证密钥，减少了设置过程中的用户摩擦。

**实现细节：**
1.  **动态 Retrofit 客户端**: 构建针对 `https://mag.upxuu.com/` 的临时实例。
2.  **验证请求**: 发送 `VerifyKitRequest(kitKey)` 到 `/verify-kit` 端点。
3.  **批量更新**: 如果有效，更新 `apiKey`, `modelName`, `baseUrl`。
4.  **重新加载触发**: 调用 `AppConfig.reload(context)` 刷新基础 URL。
5.  **UI 状态**: 仅在 `!isVerifyingKit` 时启用按钮。

## 配置类别

### AI 配置部分
*   **Key-Kit 输入**: 用于批量凭据更新的单行文本框。
*   **API Key 字段**: 只读显示 (可手动覆盖)。
*   **模型名称字段**: 可编辑文本框。

### 个性化部分
*   **用户角色 (User Persona)**: 多行文本框，传递给 AI 以获取个性化示例/助记符。
*   **保存位置**: 下拉菜单选择目标词库。特殊条目 "跟随当前" 设置为 -1。

### 系统首选项部分
*   **启用日志**: 开关 ("enable_log")。
*   **自动更新**: 开关 ("auto_update")。

这两个设置持久化到 "app_settings" SharedPreferences 文件（与 AppConfig 分开）。

### 链接与关于部分
可点击的 ListItem 组件：
*   **文档**: 跳转到文档网站。
*   **GitHub 仓库**: 跳转到源码。
*   **开发者博客**: 跳转到博客。
*   **日志列表**: 导航到日志查看器。
*   **关于**: 导航到关于对话框。

## 持久化机制
**两层 SharedPreferences 架构**：
1.  **app_config**: AI 配置和核心设置。
2.  **app_settings**: UI 状态和系统偏好。

**保存触发器**: `saveAllConfig()` 函数由 `onDispose` 触发（导航返回、配置更改、后台运行），确保自动持久化。

## 更新管理集成
设置屏幕通过 `UpdateManager` 提供更新检查 UI。
*   **版本显示**: ListItem 显示当前版本。
*   **点击操作**: 触发 `checkUpdate()`。
*   **状态**: 显示 "Checking..." 或版本号。

## 日志管理 UI
**LogListScreen 组件**:
*   **获取日志**: `LogUtil.getAllLogFiles()`。
*   **显示列表**: LazyColumn 显示日志文件。
*   **操作**: 点击查看详情，点击分享图标调用 `shareLogFile`。
*   **分享实现**: 使用 Android `FileProvider` 安全地向外部应用公开日志文件。

## 状态管理模式
*   **本地状态初始化**: 所有可编辑设置使用 "read-on-mount" 模式，创建配置的本地副本。
*   **跨组件依赖**: 保存位置下拉菜单依赖于 `LibraryViewModel.allLibraries`。

## UI 布局结构
使用 `Divider` 组件在视觉上分隔逻辑部分。部分标题使用 `MaterialTheme.typography.titleSmall`。

## 相关组件
*   **UpdateDialog**: 显示发布说明和更新操作。
*   **AboutDialog**: 显示版本和作者信息。
*   **LogDetailDialog**: 只读文本查看器显示日志内容。
