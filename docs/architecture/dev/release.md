# Release Process - 发布流程

本文档描述了创建 MagicWord 新版本的流程。

## 版本管理
在 `app/build.gradle.kts` 中：
1.  **versionCode**: 必须递增 (+1)。
2.  **versionName**: 更新语义版本 (x.y.z)。

## 自动化发布工作流
一旦代码推送到 `main` 分支，GitHub Actions 自动执行：
1.  构建签名 APK。
2.  创建 GitHub Release (Tag: `v{versionName}`)。
3.  上传 APK 资产。
4.  更新 `MagicWordLatest.apk`。

## 手动发布清单
1.  **更新版本**: 修改 `build.gradle.kts`。
2.  **提交**: `git commit -m "chore: bump version to x.y.z"`
3.  **推送**: `git push origin main`
4.  **监控**: 在 GitHub Actions 页面查看进度。
5.  **验证**: 检查 GitHub Release 页面和自更新功能。

## 故障排除
*   **签名失败**: 检查 Secrets 配置。
*   **发布未创建**: 确保推送到的是 `main` 分支。
*   **更新失败**: 检查 `MagicWordLatest.apk` 是否成功提交。
