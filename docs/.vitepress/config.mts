import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "MagicWord",
  description: "全栈式 AI 背词解决方案",
  lang: 'zh-CN',
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: '架构文档', link: '/architecture/' },
      { text: 'GitHub', link: 'https://github.com/lijiaxu2021/MagicWord' }
    ],

    sidebar: {
      '/architecture/': [
        {
          text: '核心架构',
          items: [
            { text: '系统架构', link: '/architecture/core/system-architecture' },
            { text: '核心组件', link: '/architecture/core/components' },
            { text: 'LibraryViewModel', link: '/architecture/core/library-viewmodel' },
            { text: '数据层与持久化', link: '/architecture/core/data-layer' },
          ]
        },
        {
          text: '用户界面',
          items: [
            { text: '屏幕概览', link: '/architecture/ui/screens' },
            { text: 'MainScreen', link: '/architecture/ui/main-screen' },
            { text: 'WordsScreen', link: '/architecture/ui/words-screen' },
            { text: 'StudyScreen', link: '/architecture/ui/study-screen' },
            { text: 'TestScreen', link: '/architecture/ui/test-screen' },
            { text: 'LibraryManager', link: '/architecture/ui/library-manager' },
            { text: 'SettingsScreen', link: '/architecture/ui/settings-screen' },
          ]
        },
        {
          text: '功能系统',
          items: [
            { text: '功能概览', link: '/architecture/features/' },
            { text: 'AI 集成', link: '/architecture/features/ai-integration' },
            { text: '间隔重复 (SM-2)', link: '/architecture/features/sm2' },
            { text: '更新系统', link: '/architecture/features/update' },
          ]
        },
        {
          text: '云基础设施',
          items: [
            { text: '云架构概览', link: '/architecture/cloud/' },
            { text: 'Cloudflare Gateway', link: '/architecture/cloud/cloudflare' },
            { text: 'GitHub 数据仓库', link: '/architecture/cloud/github' },
            { text: '分发系统', link: '/architecture/cloud/distribution' },
          ]
        },
        {
          text: '开发与部署',
          items: [
            { text: '开发概览', link: '/architecture/dev/' },
            { text: '构建配置', link: '/architecture/dev/build' },
            { text: 'CI/CD 管道', link: '/architecture/dev/ci-cd' },
            { text: '发布流程', link: '/architecture/dev/release' },
          ]
        }
      ],
      '/guide/': [
        {
          text: '开始使用',
          items: [
            { text: '简介与安装', link: '/guide/getting-started' },
          ]
        },
        {
          text: '核心功能',
          items: [
            { text: '📚 词库管理', link: '/guide/library' },
            { text: '🧠 记忆与复习', link: '/guide/study' },
            { text: '🤖 AI 智能助手', link: '/guide/ai' },
            { text: '☁️ 在线词库共享', link: '/guide/online' },
            { text: '📝 测试与统计', link: '/guide/test' },
          ]
        },
        {
          text: '其他',
          items: [
            { text: '⚙️ 设置与配置', link: '/guide/settings' },
            { text: '常见问题 (FAQ)', link: '/guide/faq' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lijiaxu2021/MagicWord' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present MagicWord Team'
    },

    search: {
      provider: 'local'
    }
  }
})
