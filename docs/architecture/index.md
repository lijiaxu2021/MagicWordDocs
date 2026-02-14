# 系统架构概览

本文档详细介绍了 MagicWord 的三层无服务器架构、组件交互以及数据流模式。

## 架构概览

MagicWord 采用 **三层无服务器架构 (Three-Tier Serverless Architecture)**，在消除传统后端数据库成本的同时，提供了完整的词库管理和共享能力。

### 系统分层

1.  **第一层：Android 客户端 (Tier 1)**
    *   **职责**: 处理所有用户交互、本地数据持久化 (Room Database) 和应用状态管理。
    *   **特性**: 客户端是一个自包含单元，核心功能（单词管理、复习）可完全离线运行。
    *   **架构**: 采用 MVVM (Model-View-ViewModel) 架构，基于 Jetpack Compose 构建 UI。

2.  **第二层：云基础设施 (Tier 2)**
    *   **Cloudflare Workers**: 充当智能 API 网关和代理层，处理跨域 (CORS) 问题，路由请求，并作为轻量级后端逻辑层。
    *   **GitHub Data Warehouse**: 利用 GitHub 仓库 (`magicwordfile`) 作为版本控制的数据库，利用 GitHub Pages 进行静态内容分发 (CDN)。
    *   **GitHub Actions**: 充当计算层，负责在词库上传时自动生成索引 (`index.json`) 和元数据 (`tags.json`)。

3.  **第三层：外部服务 (Tier 3)**
    *   **AI 服务**: 直接连接 SiliconFlow (Qwen2.5-7B-Instruct) 等 AI 提供商，用于生成单词释义和例句。
    *   **应用分发**: 通过 GitHub Releases 托管 APK 安装包和版本管理。

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

## 无服务器架构设计 (Serverless Design)

### 为什么选择 Serverless?
MagicWord 通过以下设计消除了传统 VPS 和数据库成本：
*   **API 网关**: Cloudflare Workers (免费额度极大)。
*   **数据库**: GitHub Repository (免费存储，Git 版本控制)。
*   **计算**: GitHub Actions (每月 2000 分钟免费构建时间)。
*   **CDN**: GitHub Pages (全球免费分发)。

这种架构在用户量增长时具有极高的成本效益和扩展性。
