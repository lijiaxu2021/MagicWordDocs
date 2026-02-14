# 开发与部署

本文档概述了 MagicWord 的开发工作流、构建系统和部署基础设施。

详细文档：
*   [构建配置](build.md)
*   [CI/CD 管道](ci-cd.md)
*   [发布流程](release.md)

## 开发环境
*   **JDK**: 17 (Temurin)
*   **Android SDK**: API 34
*   **Kotlin**: 1.9.x
*   **Gradle**: Wrapper 管理

## 构建系统
基于 Gradle Kotlin DSL (`build.gradle.kts`)。
*   **版本控制**: `versionCode` (整数) 和 `versionName` (语义化字符串)。
*   **签名**: 双模式配置（CI/CD 使用环境变量，本地使用默认值）。
*   **依赖管理**: 使用版本目录和 BOM。

## CI/CD 概览
使用 GitHub Actions 进行自动化：
*   **Feature 分支**: 构建并上传 Artifact。
*   **Main 分支**: 构建、签名、创建 Release、更新仓库 APK。

## 发布策略
三层分发系统：
1.  **GitHub Actions Artifacts**: 临时构建产物。
2.  **GitHub Releases**: 版本化归档。
3.  **Repository File**: `MagicWordLatest.apk` (用于自更新系统)。
