# CI/CD Pipeline - 持续集成与部署

本文档描述了基于 GitHub Actions 的自动化构建管道。

## 工作流架构
定义在 `.github/workflows/android.yml` 中。

### 触发器
*   **Push**: `main`, `feature/native-android`
*   **Pull Request**: `main`

### 构建步骤
1.  **环境设置**: Ubuntu Runner, JDK 17.
2.  **Keystore 解码**: 从 `KEYSTORE_BASE64` Secret 解码 `release.jks`。
3.  **构建**: `./gradlew assembleRelease`。
4.  **版本提取**: 从 build.gradle.kts 解析版本名。
5.  **Artifact 上传**: 上传 APK 到 Actions 存储。

### 发布自动化 (仅 Main 分支)
1.  **重命名 APK**: 生成版本化文件名 (`MagicWord-vX.X.X.apk`)。
2.  **创建 Release**: 使用 `softprops/action-gh-release` 创建 GitHub Release。
3.  **仓库部署**: 将 `MagicWordLatest.apk` 提交到仓库根目录，供更新系统使用。

## Secrets 管理
必须配置以下 Secrets：
*   `KEYSTORE_BASE64`: Base64 编码的 keystore。
*   `KEY_ALIAS`: 密钥别名。
*   `KEY_PASSWORD`: 密钥密码。
*   `STORE_PASSWORD`: Keystore 密码。
*   `GITHUB_TOKEN`: 自动提供，用于发布和提交。

## 更新系统集成
管道将 `MagicWordLatest.apk` 提交到仓库，Cloudflare Worker 代理此文件。这确保了更新 URL 永远不变，简化了客户端逻辑。
