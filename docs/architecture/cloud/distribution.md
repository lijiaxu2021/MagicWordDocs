# 更新与通知分发

本文档描述了 MagicWord 的应用更新和系统通知分发机制。

## 系统架构
*   **Notice System**: 基于 `notice.json` 文件。
*   **Update System**: 基于 GitHub Releases 和代理下载。

## 通知系统
`notice.json` 文件位于主仓库根目录。
字段：`title`, `content`, `versionCode`, `timestamp`.
客户端启动时通过 Worker 获取此文件，并根据 `versionCode` 决定是否显示给用户。

## 更新分发
### 版本检查
UpdateManager 通过 Worker 代理查询 GitHub Releases API。
端点：`/api/repos/lijiaxu2021/MagicWord/releases/latest`

### APK 下载
下载 URL 指向 Worker 的稳定端点：`/MagicWordLatest.apk`。
这确保了下载始终通过代理，绕过 GitHub 的速率限制和网络阻断。

## Cloudflare Worker 路由
| 路由 | 目标 | 头部 |
| :--- | :--- | :--- |
| `/notice.json` | 仓库中的 `notice.json` | `Content-Type: application/json` |
| `/MagicWordLatest.apk` | 仓库中的 APK 文件 | `Content-Type: application/vnd.android.package-archive` |

## 数据流总结
1.  客户端启动 -> 请求 `/notice.json`。
2.  客户端检查更新 -> 请求 API -> 比较版本。
3.  用户确认更新 -> 请求 `/MagicWordLatest.apk` -> Worker 代理 GitHub Raw -> 流式下载。
