# 云基础设施 (Cloud Infrastructure)

MagicWord 的后端逻辑主要由 Cloudflare Workers 和 GitHub 仓库共同承担。

## Cloudflare Worker: API 网关

部署在 `mag.upxuu.com` 的 Worker 脚本 (`cf.js`) 是系统的核心网关。

### 主要职责
1.  **CORS 处理**: GitHub Raw 内容默认不支持跨域，Worker 代理请求并添加 `Access-Control-Allow-Origin: *` 头。
2.  **网络加速**: 为部分无法直接访问 GitHub 的地区提供中转加速。
3.  **路由分发**: 将不同的 API 路径映射到后端资源。

### 路由表 (Routing)

| 路径 (Path) | 方法 | 用途 | 目标资源 |
| :--- | :--- | :--- | :--- |
| `/MagicWordLatest.apk` | GET | APK 下载直链 | `MagicWord/main` 仓库 |
| `/notice.json` | GET | 系统通知 | `MagicWord/main/notice.json` |
| `/library/file/{path}` | GET | 词库文件代理 | `magicwordfile` 仓库中的 JSON 文件 |
| `/library/upload` | POST | 词库上传 | 调用 GitHub API 提交新文件 |
| `/api/verify-kit` | POST | Key-Kit 验证 | 验证用户密钥并返回 AI 配置 |

## GitHub Data Warehouse: 仓库即数据库

MagicWord 将 `magicwordfile` 仓库作为一个只读数据库使用。

### 目录结构
```text
magicwordfile/
├── index_0.json        # 数据库索引 (第 0 页 - 最新)
├── index_1.json        # 数据库索引 (第 1 页)
├── num.json            # 元数据表 (总页数, 总条目数)
├── tags.json           # 标签聚合表 (分类索引)
└── {timestamp}/        # 具体的词库记录 (Record)
    ├── info.json       # 记录元数据 (作者, 描述, 标签)
    └── library.json    # 实际词库数据 (Base64 编码)
```

### 自动索引 (Automatic Indexing)
每当有新词库上传（Commit）到仓库时，GitHub Actions (`update_index.yml`) 会自动触发：
1.  扫描所有 `{timestamp}` 目录。
2.  提取 `info.json` 中的元数据。
3.  按时间倒序生成分页的 `index_X.json` 文件。
4.  生成全局 `tags.json`。

这相当于传统数据库中的“触发器”和“物化视图”更新过程。
