# 快速开始

本指南涵盖了构建和开发 MagicWord Android 应用程序所需的初始设置，包括环境先决条件、构建配置、API 密钥管理和配置系统架构。有关整体系统架构和组件交互的信息，请参阅 [系统架构](../architecture/core/system-architecture.md)。有关特定 Android 组件和 UI 屏幕的详细信息，请参阅 [Android 应用程序](../architecture/ui/screens.md)。

## 目的和范围

本文档提供以下分步说明：
*   设置开发环境
*   了解构建配置和签名要求
*   配置 API 密钥和应用程序设置
*   在本地和通过 CI/CD 构建 Android 应用程序
*   了解 `AppConfig` 和 `SharedPreferences` 持久化系统

## 先决条件

构建 MagicWord 需要以下工具和版本：

| 要求 | 版本 | 备注 |
| :--- | :--- | :--- |
| **JDK** | 17 | Gradle 构建系统需要 |
| **Android Studio** | 2023.1.1+ | 推荐 Arctic Fox 或更新版本 |
| **Android SDK** | API 34 (compile) | 最低 API 24 (Android 7.0) |
| **Kotlin** | 1.9.10+ | 与 Android Studio 捆绑 |
| **Gradle** | 8.2+ | 通过 wrapper 管理 |

## 初始设置

### 克隆仓库
```bash
git clone https://github.com/lijiaxu2021/MagicWord.git
```

### 在 Android Studio 中打开
1.  启动 Android Studio
2.  选择 **File → Open**
3.  导航到克隆的 `MagicWord` 目录
4.  点击 **OK** 导入 Gradle 项目
5.  等待 Gradle 同步完成

该项目使用 Kotlin DSL 进行 Gradle 配置，主要构建文件位于 `app/build.gradle.kts`。Gradle wrapper (`./gradlew`) 进行了版本管理，并将在首次构建时自动下载依赖项。

## 配置系统架构

MagicWord 使用三层配置架构来管理应用程序设置、API 凭据和用户偏好。

### 配置组件

#### AppConfig 单例
`AppConfig` 对象 (`app/src/main/java/com/magicword/app/utils/AppConfig.kt`) 管理全局应用程序设置：

| 属性 | 类型 | 默认值 | 目的 |
| :--- | :--- | :--- | :--- |
| `apiKey` | String | "" | AI 服务 API 密钥（单词定义需要） |
| `modelName` | String | "Qwen/Qwen2.5-7B-Instruct" | AI 模型标识符 |
| `serverUrl` | String | "" | AI 服务基础 URL |
| `userPersona` | String | "" | 个性化 AI 响应的用户身份 |
| `saveLocationId` | Int | -1 | 新单词的目标词库 ID（-1 = 当前词库） |

**关键方法：**
*   `init(context)`: 在应用启动时从 `SharedPreferences` 加载配置
*   `saveConfig(...)`: 持久化配置更改
*   `isConfigured()`: 验证 API 密钥是否已设置

#### SharedPreferences 文件
使用两个单独的偏好文件：
1.  **app_config**: AI 配置和持久化设置
2.  **app_settings**: UI 状态和系统偏好（日志记录、自动更新）

## 构建配置

### Gradle 构建文件结构
主要构建配置定义在 `app/build.gradle.kts` 中。

**核心依赖项：**
*   **Jetpack Compose** (BOM 2023.08.00): UI 框架
*   **Room** (2.6.1): 本地数据库 (SQLite with KSP)
*   **Retrofit** (2.9.0): AI API 的网络客户端
*   **WorkManager** (2.9.0): 后台同步
*   **Reorderable** (2.4.3): 拖放列表重新排序

### 签名配置

#### 本地开发 vs. CI/CD
MagicWord 发布构建需要 APK 签名。签名配置在 CI/CD 中使用环境变量，在本地开发中回退到本地文件。

**设置本地 Keystore：**
对于本地开发，创建一个 keystore 文件。
> **重要**：切勿将 keystore 文件提交到版本控制。它应该列在 `.gitignore` 中。

**CI/CD 签名 (GitHub Actions)：**
CI/CD 管道从 Base64 编码的密钥中解码 keystore：
1.  **解码 Keystore**: 将 `KEYSTORE_BASE64` 密钥转换为二进制文件
2.  **设置环境变量**: 提供签名凭据
3.  **构建签名 APK**: 执行 `./gradlew assembleRelease`

**必需的 GitHub Secrets：**
*   `KEYSTORE_BASE64`: Base64 编码的 keystore 文件
*   `KEY_ALIAS`: Keystore 密钥别名
*   `KEY_PASSWORD`: 密钥密码
*   `STORE_PASSWORD`: Keystore 密码

## 必需的 API 密钥和 Secrets

### AI 服务配置
MagicWord 需要 AI API 凭据用于单词定义和批量导入功能。这些通过 **Key-Kit 系统** 或手动配置进行管理。

#### Key-Kit 系统（推荐）
Key-Kit 系统提供集中的凭据管理：
1.  用户在设置屏幕输入 Kit key
2.  应用调用 `/verify-kit` 端点
3.  服务器验证密钥并返回配置（`apiKey`, `model`, `baseUrl`）
4.  配置持久化到 `SharedPreferences`

#### 手动配置
或者，直接在设置屏幕中配置。这些值可以通过 `OutlinedTextField` 组件编辑。

### 配置持久化
通过 `DisposableEffect` 退出设置屏幕时，所有配置更改都会保存。`saveAllConfig()` 函数同时持久化到 `AppConfig` 单例和 `SharedPreferences`。

## 构建应用程序

### 本地构建命令

**Debug 构建 (未签名):**
```bash
./gradlew assembleDebug
```
输出: `app/build/outputs/apk/debug/app-debug.apk`

**Release 构建 (已签名):**
```bash
./gradlew assembleRelease
```
输出: `app/build/outputs/apk/release/app-release.apk`
> 注意：Release 构建需要 keystore 配置。

### Gradle 任务
*   **Clean**: `./gradlew clean` (删除构建产物)
*   **Compile**: `./gradlew compileDebugKotlin` (编译不打包)
*   **Test**: `./gradlew test` (运行单元测试)
*   **Lint**: `./gradlew lint` (静态分析)
*   **Dependencies**: `./gradlew dependencies` (查看依赖树)

## CI/CD 管道概览

### GitHub Actions 工作流
自动化构建管道定义在 `.github/workflows/android.yml` 中。它在推送到 `main` 或 `feature/native-android` 分支时触发。

### 构建产物
管道生成三个 APK 产物：
1.  **Actions Artifact**: `MagicWord-vX.X.X` 上传到 GitHub Actions
2.  **Release Asset**: `MagicWord-vX.X.X.apk` 附加到 GitHub Release
3.  **Latest APK**: `MagicWordLatest.apk` 提交到仓库根目录（供更新系统使用）

### 版本提取
管道使用 `grep` 和 `awk` 提取 `versionName`，用于发布标记和 APK 命名。
