# 构建配置

本文档详细介绍了 MagicWord Android 应用程序的 Gradle 构建配置。它涵盖了插件架构、编译设置、CI/CD 环境的签名配置、构建变体和依赖项管理。

有关使用此配置的 CI/CD 管道的信息，请参阅 [CI/CD 管道](ci-cd.md)。有关发布流程的详细信息，请参阅 [发布流程](release.md)。

## 构建系统概览

MagicWord 使用 **Gradle with Kotlin DSL** (`build.gradle.kts`) 进行构建配置。构建系统通过五个 Gradle 插件进行配置，支持 Android 开发、Kotlin 编译、注解处理和数据类序列化。

### 插件架构
位于 `app/build.gradle.kts` 的插件配置建立了构建管道：

| 插件 | 目的 | 关键功能 |
| :--- | :--- | :--- |
| `com.android.application` | 核心 Android 构建插件 | APK/AAB 生成，资源处理，清单合并 |
| `org.jetbrains.kotlin.android` | Kotlin 语言支持 | Kotlin 编译，协程，扩展 |
| `com.google.devtools.ksp` | Kotlin 符号处理 | Room 数据库代码生成（比 kapt 快） |
| `kotlin-parcelize` | Parcelable 序列化 | 数据类的自动 Parcelable 实现 |

## Android 配置

`android` 块定义了 SDK 要求、应用程序标识和版本控制策略。

### SDK 级别要求
*   `compileSdk = 34`: 编译时 API 级别 (Android 14)
*   `targetSdk = 34`: 运行时行为目标
*   `minSdk = 24`: 最低支持版本 (Android 7.0 Nougat)

### 应用程序标识
*   `namespace`: `com.magicword.app`
*   `applicationId`: `com.magicword.app`

### 版本控制方案
*   `versionCode`: 单调递增的整数（当前：22）
*   `versionName`: 显示给用户的语义版本字符串（当前："0.0.21"）

## 签名配置

MagicWord 实现了**双模式签名系统**，支持本地开发和 CI/CD 环境。配置自动检测环境变量并回退到本地构建的默认值。

### 配置详情
签名配置 (`app/build.gradle.kts`) 实现基于环境变量的凭据注入：

| 配置属性 | 环境变量 | 默认回退 | 目的 |
| :--- | :--- | :--- | :--- |
| `storeFile` | `KEYSTORE_PATH` | `release.jks` | Keystore 文件路径 |
| `storePassword` | `STORE_PASSWORD` | `password` | Keystore 密码 |
| `keyAlias` | `KEY_ALIAS` | `alias` | 密钥别名 |
| `keyPassword` | `KEY_PASSWORD` | `password` | 密钥密码 |

### CI/CD 集成
在 GitHub Actions 工作流中，keystore 文件从 base64 编码的 secret 解码并写入 `app/release.jks`。环境变量在调用 Gradle 之前从 GitHub Secrets 设置。

## 构建类型和变体

MagicWord 定义了两种具有不同签名和优化行为的构建类型：

### Release 构建类型
*   **签名**: 使用生产凭据的 `release` 签名配置
*   **混淆 (Minification)**: 已禁用 (`isMinifyEnabled = false`)，以简化调试同时保持性能
*   **ProGuard**: 定义了规则但未主动混淆
*   **输出**: 生成适合通过 GitHub Releases 分发的签名 APK

### Debug 构建类型
*   **签名**: 使用默认 Android debug keystore
*   **输出**: 生成用于开发的未签名或 debug 签名的 APK

## 编译设置

### Java 和 Kotlin 兼容性
*   **Java Compatibility**: Java 8
*   **Kotlin JVM Target**: Java 8
*   **理由**: 提供现代语言功能同时保持与 `minSdk = 24` 的兼容性

### 构建特性
*   `compose = true`: 启用 Jetpack Compose UI 框架
*   `buildConfig = true`: 生成带有版本信息的 `BuildConfig` 类

### Compose 配置
*   `kotlinCompilerExtensionVersion = "1.5.4"`: 必须与 Kotlin 编译器版本匹配

## 依赖项

MagicWord 的依赖图包括 UI 框架、持久化库、网络客户端和实用程序库。

### 核心依赖项（按类别）

**UI 框架 (AndroidX + Jetpack Compose)**
*   `core-ktx`, `lifecycle-runtime-ktx`, `activity-compose`
*   `compose-bom` (2023.08.00): Material 3, Icons Extended
*   `navigation-compose` (2.7.5)

**数据持久化 (Room)**
*   `room-runtime` (2.6.1)
*   `room-ktx` (2.6.1)
*   `room-compiler` (ksp)

**网络层 (Retrofit)**
*   `retrofit` (2.9.0)
*   `converter-gson` (2.9.0)

**实用程序库**
*   `work-runtime-ktx` (2.9.0): 后台任务
*   `reorderable` (2.4.3): 拖放重新排序

**测试依赖项**
*   Unit Testing: `junit`
*   Instrumentation: `androidx.test.ext:junit`, `espresso-core`
*   Compose Testing: `ui-test-junit4`
*   Debug Tooling: `ui-tooling`

## 构建输出和产物

### Release 构建
*   **命令**: `./gradlew assembleRelease`
*   **输出**: `app/build/outputs/apk/release/app-release.apk`
*   **特征**: 使用生产 keystore 签名，嵌入版本名称，适合分发

### Debug 构建
*   **命令**: `./gradlew assembleDebug`
*   **输出**: `app/build/outputs/apk/debug/app-debug.apk`
*   **特征**: Debug 签名，无优化，包含调试符号

## 配置管理

### 版本管理
版本更新需要手动编辑 `app/build.gradle.kts`：
1.  增加 `versionCode`
2.  更新 `versionName`
3.  提交更改并打上匹配的 tag

### 环境特定配置
*   **本地构建**: 使用默认值或 `local.properties`（不推荐）。
*   **CI/CD 构建**: GitHub Secrets 必须包含 `KEYSTORE_BASE64`, `STORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`。

## 总结

MagicWord 构建配置实现了现代 Android 构建系统：
*   **Kotlin DSL**: 类型安全的构建配置
*   **插件架构**: 启用代码生成和编译
*   **双模式签名**: 支持本地和 CI/CD 构建
*   **现代 SDK 目标**: Android 14 (API 34)
*   **可重现构建**: 版本锁定的依赖项和显式签名配置
