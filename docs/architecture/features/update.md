# Update System - 更新系统

更新系统提供应用内更新功能，使 MagicWord 能够直接向用户分发新版本，无需通过应用商店。这对于网络受限区域的用户至关重要。

## 架构概览
更新系统实现了一个三层架构：
1.  **无服务器分发**: GitHub Releases 作为分发平台。
2.  **代理访问**: 所有 API 调用通过 Cloudflare Worker 路由。
3.  **权限安全安装**: 自动处理 Android 8.0+ 的未知来源权限。

## 核心组件

### UpdateManager 单例
集中处理所有更新操作。
*   **PROXY_BASE_URL**: `https://mag.upxuu.com`
*   **LATEST_RELEASE_URL**: 指向 Cloudflare 代理的 API 端点。

### 更新检测流程
1.  **检查更新**: `MainScreen` 启动时调用 `checkUpdate()`。
2.  **版本比较**: 语义化版本比较 (Semantic Versioning)。
    *   移除 "v" 前缀。
    *   按 "." 分割并比较数字部分。
3.  **下载 URL**: 构建指向代理的 URL (`/MagicWordLatest.apk`)，而不是 GitHub 直接链接。

### APK 下载与安装
*   **下载**: 使用 OkHttp 流式下载，支持进度跟踪。
*   **安装 (Android 8.0+)**:
    *   检查 `canRequestPackageInstalls()`。
    *   如果被拒绝，引导用户去设置。
    *   使用 `FileProvider` 安全地暴露 APK 文件。

## UI 集成
*   **MainScreen**: 启动时自动检查，显示更新对话框。
*   **SettingsScreen**: 手动检查更新。
*   **对话框**: 显示版本号、发布说明、进度条。

## 错误处理
*   **网络故障**: `checkUpdate` 返回 null，静默失败。
*   **权限拒绝**: 用户取消权限授权时，需要手动重试。
*   **跳过版本**: 用户可以选择跳过特定版本，版本号持久化到 SharedPreferences。
