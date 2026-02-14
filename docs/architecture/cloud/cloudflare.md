# Cloudflare Worker - API 网关

本文档详细介绍了部署在 `mag.upxuu.com` 的 Cloudflare Worker，它是 MagicWord 系统的中央 API 网关。

## 系统角色
Worker 充当无服务器代理层，启用：
*   **CORS 代理**: 允许 Android 和 Web 客户端访问 GitHub Raw 内容。
*   **上传网关**: 接收客户端上传并通过 GitHub API 提交。
*   **统一 API**: 抽象底层 GitHub 仓库结构。
*   **网络可访问性**: 绕过 GitHub 的区域性网络限制。

## 路由架构
基于路径的路由系统：

| 路由模式 | 方法 | 处理函数 | 目的 |
| :--- | :--- | :--- | :--- |
| `/MagicWordLatest.apk` | GET | `fetchRawFile` | 下载最新 APK |
| `/notice.json` | GET | `fetchRawFile` | 获取系统公告 |
| `/library/file/*` | GET | `fetchRawFile` | 代理词库文件 |
| `/library/upload` | POST | `handleLibraryUpload` | 上传新词库 |
| `/api/*` | ALL | `proxyRequest` | 代理 GitHub REST API |

## 核心功能实现

### fetchRawFile()
代理 GitHub Raw 内容。
*   **缓存控制**: 添加时间戳参数以绕过 Cloudflare 边缘缓存。
*   **CORS**: 注入 `Access-Control-Allow-Origin: *` 头。
*   **Content-Type**: 覆盖 GitHub 的类型设置。

### handleLibraryUpload()
处理两阶段上传流程：
1.  **验证**: 检查名称和内容。
2.  **生成 ID**: 使用时间戳。
3.  **创建 Metadata**: 生成 `info.json`。
4.  **提交**: 调用 `uploadToGithub` 两次（info.json 和 library.json）。

### proxyRequest()
通用 GitHub API 代理。
*   **头部清理**: 移除 Cloudflare 特定头部和敏感头部。
*   **CORS**: 注入跨域头。

## 安全性
*   **Authentication**: 写操作需要 `GITHUB_TOKEN` 环境变量。
*   **Read Access**: 公共读取不需要认证。

## 部署配置
Worker 需要配置 `GH_TOKEN` 环境变量（GitHub Personal Access Token），并绑定到 `mag.upxuu.com` 域名。
