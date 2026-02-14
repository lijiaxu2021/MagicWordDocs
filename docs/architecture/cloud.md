# 云基础设施 (Cloud Infrastructure)

MagicWord 的后端逻辑主要由 Cloudflare Workers 和 GitHub 仓库共同承担，实现了完全的无服务器 (Serverless) 架构。

## Cloudflare Worker: API 网关

部署在 `mag.upxuu.com` 的 Worker 脚本 (`cf.js`) 是系统的核心网关。

### 1. 核心职责
*   **CORS 代理**: GitHub Raw 内容默认不支持跨域，Worker 代理请求并添加 `Access-Control-Allow-Origin: *` 头，使 Android 和 Web 客户端能直接访问资源。
*   **上传网关**: 接收客户端上传的词库 JSON，通过 GitHub API 提交到 `magicwordfile` 仓库。
*   **路由分发**: 将统一的 API 域名映射到不同的 GitHub 仓库资源（APK 仓库 vs 数据仓库）。
*   **Key-Kit 验证**: 提供 `/api/verify-kit` 接口，验证用户密钥并返回 AI 配置（API Key、模型名称）。

### 2. 路由表 (Routing Table)

| 路径 (Path) | 方法 | 用途 | 目标资源 |
| :--- | :--- | :--- | :--- |
| `/MagicWordLatest.apk` | GET | APK 下载直链 | `MagicWord/main` 仓库 |
| `/notice.json` | GET | 系统通知 | `MagicWord/main/notice.json` |
| `/library/file/{path}` | GET | 词库文件代理 | `magicwordfile` 仓库中的 JSON 文件 |
| `/library/upload` | POST | 词库上传 | 调用 GitHub API 提交新文件 |
| `/api/verify-kit` | POST | Key-Kit 验证 | 查询 D1 数据库验证密钥 |
| `/api/*` | ALL | 通用代理 | 转发请求到 GitHub REST API |

### 3. 上传流程 (Upload Workflow)
1.  **客户端**: 将词库元数据 (`info.json`) 和内容 (`library.json`) Base64 编码后发送 POST 请求。
2.  **Worker**: 
    *   验证必填字段。
    *   生成以时间戳命名的唯一目录 ID (例如 `1770969114913`)。
    *   调用 GitHub Contents API (`PUT`) 将文件提交到 `magicwordfile` 仓库。
3.  **响应**: 返回生成的 Library ID，客户端据此刷新列表。

## GitHub Data Warehouse: 仓库即数据库

MagicWord 将 `magicwordfile` 仓库 (lijiaxu2021/magicwordfile) 作为一个基于 Git 的 NoSQL 数据库使用。

### 1. 存储结构
```text
magicwordfile/
├── .github/workflows/update_index.yml  # 自动索引脚本
├── index_0.json                        # 数据库索引 (第 0 页 - 最新)
├── index_1.json                        # 数据库索引 (第 1 页)
├── num.json                            # 元数据表 (总页数, 总条目数)
├── tags.json                           # 标签聚合表 (分类索引)
└── {timestamp}/                        # 具体的词库记录 (Record)
    ├── info.json                       # 记录元数据 (作者, 描述, 标签)
    └── library.json                    # 实际词库数据 (Base64 编码)
```

### 2. 自动索引系统 (Automatic Indexing)
每当有新词库上传（Commit）到仓库时，GitHub Actions 会自动触发 `update_index.yml` 工作流：
1.  **扫描**: 遍历仓库中所有 `{timestamp}` 目录。
2.  **提取**: 读取每个目录下的 `info.json` 元数据。
3.  **分页**: 按时间倒序排序，每页 10 条生成 `index_X.json`。
4.  **聚合**: 统计所有标签出现频率，生成 `tags.json`。
5.  **提交**: 将生成的索引文件 Commit 回仓库。

这一过程实现了“写入即索引”，虽然有约 30 秒的延迟（Action 执行时间），但对于词库分享场景完全可接受。

### 3. 缓存与一致性
*   **GitHub Raw CDN**: 有约 5 分钟的缓存。
*   **Worker 策略**: 为了获取最新内容，Worker 在代理请求时会追加 `?t=${Date.now()}` 参数，强制绕过 Cloudflare 边缘缓存，确保用户能立即下载刚上传的词库。
