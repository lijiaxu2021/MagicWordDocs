# 系统架构概览

本文档详细介绍了 MagicWord 的三层无服务器架构、数据流模式以及独特的更新系统设计。

## 三层无服务器架构 (Three-Tier Serverless Architecture)

MagicWord 采用创新的无服务器架构，在消除传统后端数据库成本的同时，提供了完整的词库管理和共享能力。

### 1. 客户端层 (Client Tier)
*   **Android App**: 采用 MVVM 架构的 Native 应用，负责所有用户交互、本地数据持久化 (Room) 和业务逻辑处理。客户端是“重”客户端，核心功能（单词管理、复习算法）完全本地化，不依赖网络。

### 2. 边缘代理层 (Edge Proxy Tier)
*   **Cloudflare Workers**: 充当智能 API 网关。
    *   **职责**: 处理 CORS、路由分发、Key-Kit 验证。
    *   **优势**: 全球边缘部署，低延迟，免费额度高。

### 3. 数据仓库层 (Data Warehouse Tier)
*   **GitHub Repository**: 作为 NoSQL 数据库使用。
    *   **存储**: `magicwordfile` 仓库存储 JSON 格式的词库数据。
    *   **计算**: GitHub Actions 充当触发器，自动生成索引和聚合数据。
    *   **分发**: GitHub Pages/Raw CDN 负责静态内容的高速分发。

## 数据流模式 (Data Flow Patterns)

系统基于 Kotlin Coroutines 和 StateFlow 实现了响应式的单向数据流。

### 1. 本地 CRUD 流 (Local CRUD Flow)
本地数据库操作通过 Room 的 Flow 自动触发 UI 更新：
*   **Action**: 用户添加/删除单词。
*   **Data**: `WordDao` 更新 SQLite 数据库。
*   **Emission**: `LibraryViewModel` 订阅的数据库 Flow 自动发出新数据。
*   **UI**: 界面自动重组 (Recomposition) 显示最新内容。

### 2. 远程获取流 (Remote Fetch Flow)
在线词库浏览和下载流程：
1.  **Loading**: 设置 `isNetworkLoading = true`。
2.  **Fetch**: 通过 Retrofit 请求 Cloudflare Worker (代理 GitHub Raw)。
3.  **Result**: 更新 `onlineLibraries` 状态。
4.  **Complete**: 清除 Loading 状态。

### 3. 派生流 (Derived Flow)
例如“今日复习”列表的生成：
*   结合 `currentLibraryId` 和 `studyLibraryIds`。
*   使用 `flatMapLatest` 动态查询数据库中符合 SM-2 算法复习时间的单词。
*   任何上游状态变化都会自动触发重新查询。

## 更新系统架构 (Update System)

MagicWord 拥有独立的自更新机制，不依赖应用商店。

### 1. 版本检测
*   应用启动时，`UpdateManager` 通过 Cloudflare Worker 请求 GitHub Releases API (`/api/repos/.../releases/latest`)。
*   对比本地 `BuildConfig.VERSION_NAME` 和远程 Tag 名称（语义化版本比较）。

### 2. 差异化下载
*   如果发现新版本，直接从 `mag.upxuu.com/MagicWordLatest.apk` 下载。
*   Worker 会将其重定向到 GitHub Releases 的最新 Assets，并处理跨域问题。

### 3. 权限安全
*   针对 Android 8.0+，自动检测 `REQUEST_INSTALL_PACKAGES` 权限。
*   如果未授权，引导用户跳转到系统设置页开启“允许安装未知来源应用”。
*   使用 `FileProvider` 安全地共享下载的 APK 文件给系统安装器。
