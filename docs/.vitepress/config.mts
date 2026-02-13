import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "MagicWord",
  description: "全栈式 AI 背词解决方案",
  lang: 'zh-CN',
  base: '/MagicWordDocs/', // Repository name

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: 'GitHub', link: 'https://github.com/lijiaxu2021/MagicWord' }
    ],

    sidebar: [
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
          { text: '常见问题', link: '/guide/faq' }
        ]
      }
    ],

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
