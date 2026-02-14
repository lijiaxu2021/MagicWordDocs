# 云基础设施

本文档涵盖了 MagicWord 的无服务器后端架构，该架构使用 Cloudflare Workers 作为 API 网关，使用 GitHub 仓库作为数据存储。

详细组件文档：
*   [Cloudflare Worker - API 网关](cloudflare.md)
*   [GitHub 数据仓库](github.md)
*   [更新与通知分发](distribution.md)

## 架构概览
MagicWord 采用三层无服务器架构：
1.  **Cloudflare Worker**: 边缘计算网关，处理 CORS 和路由。
2.  **GitHub 应用仓库**: 存储 APK 发布和系统公告。
3.  **GitHub 数据仓库**: 存储词汇库，带有自动索引。

## 关键设计决策
*   **无后端服务器**: 所有计算在边缘 (Cloudflare) 或通过 GitHub Actions 完成。
*   **GitHub 作为数据库**: 词库存储为 JSON 文件，利用 Git 版本控制。
*   **CORS 代理**: Cloudflare Worker 解决跨域访问问题。
*   **自动索引**: GitHub Actions 在上传时重新生成目录元数据。
