# SumMi Blog

个人 AI 技术博客，使用 Markdown 写作，自动构建为静态 HTML。

## 写新文章

1. 在 `content/` 目录创建 `.md` 文件：

```markdown
---
title: 文章标题
date: 2024-11-26
tags: [tag1, tag2]
description: 文章简介，会显示在首页列表
---

这里是文章正文，支持 Markdown 语法...

## 二级标题

- 列表项
- **粗体** 和 *斜体*

> 引用文字

\`\`\`python
# 代码块
print("Hello")
\`\`\`
```

2. 运行构建命令：

```bash
npm run build
```

3. 提交并推送：

```bash
git add .
git commit -m "Add new post: 文章标题"
git push
```

Vercel 会自动部署更新。

## 项目结构

```
snow-blog/
├── content/          # Markdown 文章源文件
│   ├── article1.md
│   └── article2.md
├── posts/            # 生成的 HTML 文章页面
├── index.html        # 首页
├── build.js          # 构建脚本
└── package.json
```

## 本地预览

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080
```
