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
          text: '系统架构',
          items: [
            { text: '架构概览', link: '/architecture/' },
            { text: '技术栈', link: '/architecture/tech-stack' },
            { text: 'Android 客户端', link: '/architecture/android-client' },
            { text: '云基础设施', link: '/architecture/cloud' },
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
            { text: '设置与常见问题', link: '/guide/faq' }
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
