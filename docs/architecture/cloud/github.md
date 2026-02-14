# GitHub 数据仓库

本文档描述了 `magicwordfile` 仓库，它作为 MagicWord 的数据仓库，存储社区贡献的词汇库。

## 仓库架构
仓库作为一个基于 Git 的 NoSQL 数据库运作。
结构：
```
magicwordfile/
├── index_0.json          # 分页目录
├── num.json              # 元数据
├── tags.json             # 标签统计
└── 1770900184827/        # 词库文件夹 (ID)
    ├── info.json         # 词库元数据
    └── library.json      # 单词数据
```

## 文件格式

### info.json (元数据)
包含 `id`, `name`, `description`, `tags`, `timestamp`, `author`。由 Worker 在上传时生成。

### library.json (数据)
包含单词条目数组。

### 索引文件
*   **index_X.json**: 分页的词库列表，包含下载 URL。
*   **num.json**: 总页数、总条目数。
*   **tags.json**: 聚合的标签频率统计。

## GitHub Actions 自动化
`update_index.yml` 工作流在每次推送时触发：
1.  扫描所有词库文件夹。
2.  重新生成所有索引文件 (`index_*.json`)。
3.  计算统计数据 (`num.json`, `tags.json`)。
4.  提交更改。

这确保存储库始终具有最新的目录索引，无需手动维护。

## 数据访问模式
所有访问都通过 Cloudflare Worker 代理：
*   **客户端**: 请求 `mag.upxuu.com/library/file/...`
*   **Worker**: 转发到 `raw.githubusercontent.com/...` 并添加 CORS 头。

## 缓存与一致性
GitHub Raw CDN 有约 5 分钟的缓存。Worker 通过添加时间戳参数来绕过边缘缓存，但新上传的内容在 CDN 传播前可能有短暂延迟。客户端通过重试逻辑和加载状态处理最终一致性。
