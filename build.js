#!/usr/bin/env node

/**
 * SumMi Blog Builder
 *
 * 简单的静态博客构建脚本
 * - 读取 content/*.md 文件
 * - 解析 frontmatter 元数据
 * - 转换 Markdown 为 HTML
 * - 生成文章页面和首页文章列表
 *
 * 使用方法: node build.js
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// 配置
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
    contentDir: './content',
    outputDir: './posts',
    templateDir: './templates',
    indexFile: './index.html'
};

// ═══════════════════════════════════════════════════════════════════════════
// Frontmatter 解析器
// ═══════════════════════════════════════════════════════════════════════════

function parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return { metadata: {}, content };
    }

    const metadata = {};
    const frontmatter = match[1];
    const markdown = match[2];

    // 解析 YAML-like frontmatter
    frontmatter.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim();
            let value = line.slice(colonIndex + 1).trim();

            // 处理数组 [tag1, tag2]
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(s => s.trim());
            }

            metadata[key] = value;
        }
    });

    return { metadata, content: markdown };
}

// ═══════════════════════════════════════════════════════════════════════════
// Markdown 转 HTML（简化版）
// ═══════════════════════════════════════════════════════════════════════════

function markdownToHtml(markdown) {
    let html = markdown;

    // 代码块 ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<pre><code class="language-${lang}">${escapedCode.trim()}</code></pre>`;
    });

    // 行内代码 `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 标题 ##
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 引用 >
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    // 合并连续的 blockquote
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

    // 粗体 **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 斜体 *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 链接 [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // 无序列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // 分割线
    html = html.replace(/^---$/gm, '<hr>');

    // 段落（两个换行）
    html = html.split('\n\n').map(para => {
        para = para.trim();
        if (!para) return '';
        if (para.startsWith('<')) return para; // 已经是 HTML
        return `<p>${para}</p>`;
    }).join('\n\n');

    // 清理多余换行
    html = html.replace(/\n{3,}/g, '\n\n');

    return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// 文章页面模板（含阅读进度条、代码复制、评论系统）
// ═══════════════════════════════════════════════════════════════════════════

function generateArticlePage(metadata, content) {
    const tags = Array.isArray(metadata.tags)
        ? metadata.tags.map(t => `<span class="tag">${t}</span>`).join('')
        : '';

    const date = new Date(metadata.date);
    const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.title} · SumMi</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f7f7f8;
            --bg-tertiary: #ececec;
            --text-primary: #0d0d0d;
            --text-secondary: #6e6e80;
            --text-tertiary: #8e8ea0;
            --border-color: #e5e5e5;
            --card-bg: rgba(255, 255, 255, 0.8);
            --code-bg: #f6f8fa;
            --blur: 20px;
            --accent-color: #0d0d0d;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-primary: #0d0d0d;
                --bg-secondary: #1a1a1a;
                --bg-tertiary: #2a2a2a;
                --text-primary: #ececec;
                --text-secondary: #9a9a9a;
                --text-tertiary: #6e6e6e;
                --border-color: #2a2a2a;
                --card-bg: rgba(26, 26, 26, 0.8);
                --code-bg: #1e1e1e;
                --accent-color: #ffffff;
            }
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.8;
            min-height: 100vh;
        }

        /* ═══════════════════════════════════════════════════════════
           阅读进度条
           ═══════════════════════════════════════════════════════════ */
        .progress-bar {
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: var(--accent-color);
            z-index: 1000;
            transition: width 0.1s ease-out;
        }

        nav {
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 100;
            padding: 16px 24px;
            background: var(--card-bg);
            backdrop-filter: blur(var(--blur));
            -webkit-backdrop-filter: blur(var(--blur));
            border-bottom: 1px solid var(--border-color);
        }

        .nav-content {
            max-width: 800px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .back-link {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: color 0.2s;
        }

        .back-link:hover { color: var(--text-primary); }
        .back-link svg { width: 16px; height: 16px; }

        .logo {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
            text-decoration: none;
        }

        .article-container {
            max-width: 720px;
            margin: 0 auto;
            padding: 120px 24px 80px;
        }

        .article-header {
            margin-bottom: 48px;
            padding-bottom: 32px;
            border-bottom: 1px solid var(--border-color);
        }

        .article-meta {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 20px;
            font-size: 14px;
            color: var(--text-tertiary);
        }

        .article-tags { display: flex; gap: 8px; margin-top: 20px; }

        .tag {
            font-size: 12px;
            padding: 4px 10px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            color: var(--text-secondary);
        }

        .article-title {
            font-size: 36px;
            font-weight: 600;
            line-height: 1.3;
            margin-bottom: 16px;
        }

        .article-subtitle {
            font-size: 18px;
            color: var(--text-secondary);
        }

        .article-content { font-size: 17px; line-height: 1.9; }
        .article-content h2 { font-size: 24px; font-weight: 600; margin: 48px 0 20px; }
        .article-content h3 { font-size: 20px; font-weight: 600; margin: 36px 0 16px; }
        .article-content p { margin-bottom: 20px; }
        .article-content ul, .article-content ol { margin: 20px 0; padding-left: 24px; }
        .article-content li { margin-bottom: 10px; }

        .article-content blockquote {
            margin: 28px 0;
            padding: 20px 24px;
            background: var(--bg-secondary);
            border-left: 3px solid var(--text-tertiary);
            border-radius: 0 8px 8px 0;
            color: var(--text-secondary);
            font-style: italic;
        }

        .article-content code {
            font-family: 'SF Mono', Consolas, monospace;
            font-size: 0.9em;
            padding: 2px 6px;
            background: var(--code-bg);
            border-radius: 4px;
        }

        /* ═══════════════════════════════════════════════════════════
           代码块 + 复制按钮
           ═══════════════════════════════════════════════════════════ */
        .code-block {
            position: relative;
            margin: 24px 0;
        }

        .code-block pre {
            margin: 0;
            padding: 20px;
            padding-top: 40px;
            background: var(--code-bg);
            border-radius: 8px;
            overflow-x: auto;
        }

        .code-block pre code {
            padding: 0;
            background: none;
            font-size: 14px;
            line-height: 1.6;
        }

        .code-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: var(--bg-tertiary);
            border-radius: 8px 8px 0 0;
            font-size: 12px;
            color: var(--text-tertiary);
        }

        .copy-btn {
            padding: 4px 10px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 12px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
        }

        .copy-btn:hover {
            background: var(--bg-secondary);
            color: var(--text-primary);
        }

        .copy-btn.copied {
            background: #10b981;
            color: white;
            border-color: #10b981;
        }

        .article-content > pre {
            margin: 24px 0;
            padding: 20px;
            background: var(--code-bg);
            border-radius: 8px;
            overflow-x: auto;
        }

        .article-content > pre code {
            padding: 0;
            background: none;
            font-size: 14px;
            line-height: 1.6;
        }

        .article-content hr {
            border: none;
            height: 1px;
            background: var(--border-color);
            margin: 48px 0;
        }

        .article-footer {
            margin-top: 60px;
            padding-top: 32px;
            border-top: 1px solid var(--border-color);
        }

        .author-card {
            display: flex;
            gap: 20px;
            align-items: center;
            padding: 24px;
            background: var(--bg-secondary);
            border-radius: 12px;
        }

        .author-avatar {
            width: 56px; height: 56px;
            background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        .author-info h4 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
        .author-info p { font-size: 14px; color: var(--text-secondary); }

        /* ═══════════════════════════════════════════════════════════
           评论区域
           ═══════════════════════════════════════════════════════════ */
        .comments-section {
            margin-top: 48px;
            padding-top: 32px;
            border-top: 1px solid var(--border-color);
        }

        .comments-section h3 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 24px;
            color: var(--text-primary);
        }

        footer {
            text-align: center;
            padding: 40px 24px;
            border-top: 1px solid var(--border-color);
            margin-top: 60px;
        }

        footer p { font-size: 13px; color: var(--text-tertiary); }
        footer .secret { margin-top: 8px; font-size: 12px; opacity: 0.5; }

        @media (max-width: 768px) {
            .article-title { font-size: 28px; }
            .article-content { font-size: 16px; }
        }
    </style>
</head>
<body>

    <!-- 阅读进度条 -->
    <div class="progress-bar" id="progressBar"></div>

    <nav>
        <div class="nav-content">
            <a href="../index.html" class="back-link">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Back to home
            </a>
            <a href="../index.html" class="logo">SumMi</a>
        </div>
    </nav>

    <article class="article-container">
        <header class="article-header">
            <div class="article-meta">
                <span>${dateStr}</span>
            </div>
            <h1 class="article-title">${metadata.title}</h1>
            <p class="article-subtitle">${metadata.description || ''}</p>
            <div class="article-tags">${tags}</div>
        </header>

        <div class="article-content" id="articleContent">
            ${content}
        </div>

        <footer class="article-footer">
            <div class="author-card">
                <div class="author-avatar">✦</div>
                <div class="author-info">
                    <h4>SumMi</h4>
                    <p>AI enthusiast exploring the boundaries of machine intelligence.</p>
                </div>
            </div>

            <!-- 评论系统 (Giscus) -->
            <div class="comments-section">
                <h3>Comments</h3>
                <script src="https://giscus.app/client.js"
                    data-repo="SummerMi/blog"
                    data-repo-id=""
                    data-category="General"
                    data-category-id=""
                    data-mapping="pathname"
                    data-strict="0"
                    data-reactions-enabled="1"
                    data-emit-metadata="0"
                    data-input-position="top"
                    data-theme="preferred_color_scheme"
                    data-lang="en"
                    data-loading="lazy"
                    crossorigin="anonymous"
                    async>
                </script>
                <noscript>
                    <p style="color: var(--text-tertiary); font-size: 14px;">
                        Enable JavaScript to view comments.
                    </p>
                </noscript>
            </div>
        </footer>
    </article>

    <footer>
        <p>© 2024 SumMi · Exploring AI</p>
        <p class="secret">Loving you is a lonely secret.</p>
    </footer>

    <script>
        // ═══════════════════════════════════════════════════════════
        // 阅读进度条
        // ═══════════════════════════════════════════════════════════
        const progressBar = document.getElementById('progressBar');

        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrollTop / docHeight) * 100;
            progressBar.style.width = progress + '%';
        });

        // ═══════════════════════════════════════════════════════════
        // 代码复制按钮
        // ═══════════════════════════════════════════════════════════
        document.querySelectorAll('pre code').forEach((codeBlock, index) => {
            const pre = codeBlock.parentElement;

            // 检查是否已经被包装
            if (pre.parentElement.classList.contains('code-block')) return;

            // 获取语言
            const className = codeBlock.className || '';
            const langMatch = className.match(/language-(\\w+)/);
            const lang = langMatch ? langMatch[1] : 'code';

            // 创建包装器
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block';

            // 创建头部
            const header = document.createElement('div');
            header.className = 'code-header';
            header.innerHTML = \`
                <span>\${lang}</span>
                <button class="copy-btn" data-index="\${index}">Copy</button>
            \`;

            // 包装
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(header);
            wrapper.appendChild(pre);
        });

        // 复制功能
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('copy-btn')) {
                const btn = e.target;
                const codeBlock = btn.closest('.code-block');
                const code = codeBlock.querySelector('code').textContent;

                try {
                    await navigator.clipboard.writeText(code);
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');

                    setTimeout(() => {
                        btn.textContent = 'Copy';
                        btn.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    btn.textContent = 'Failed';
                    setTimeout(() => {
                        btn.textContent = 'Copy';
                    }, 2000);
                }
            }
        });
    </script>

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 生成首页文章列表 HTML
// ═══════════════════════════════════════════════════════════════════════════

function generatePostsListHtml(posts) {
    return posts.map(post => {
        const date = new Date(post.metadata.date);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const tags = Array.isArray(post.metadata.tags)
            ? post.metadata.tags.slice(0, 2).map(t => `<span class="tag">${t}</span>`).join('\n                            ')
            : '';

        return `                <a href="posts/${post.slug}.html" class="post-card">
                    <div class="post-date">
                        <div class="day">${day}</div>
                        <div class="month">${month}</div>
                    </div>
                    <div class="post-content">
                        <h3>${post.metadata.title}</h3>
                        <p>${post.metadata.description || ''}</p>
                        <div class="post-tags">
                            ${tags}
                        </div>
                    </div>
                </a>`;
    }).join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// 主构建函数
// ═══════════════════════════════════════════════════════════════════════════

function build() {
    console.log('🔨 Building blog...\n');

    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // 读取所有 Markdown 文件
    const files = fs.readdirSync(CONFIG.contentDir)
        .filter(f => f.endsWith('.md'));

    if (files.length === 0) {
        console.log('⚠️  No markdown files found in content/');
        return;
    }

    const posts = [];

    // 处理每个 Markdown 文件
    files.forEach(file => {
        const slug = file.replace('.md', '');
        const filePath = path.join(CONFIG.contentDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');

        // 解析 frontmatter 和内容
        const { metadata, content } = parseFrontmatter(raw);

        // 转换 Markdown 为 HTML
        const htmlContent = markdownToHtml(content);

        // 生成文章页面
        const articleHtml = generateArticlePage(metadata, htmlContent);

        // 写入文件
        const outputPath = path.join(CONFIG.outputDir, `${slug}.html`);
        fs.writeFileSync(outputPath, articleHtml);

        console.log(`✅ ${file} → posts/${slug}.html`);

        posts.push({ slug, metadata });
    });

    // 按日期排序（最新的在前）
    posts.sort((a, b) => new Date(b.metadata.date) - new Date(a.metadata.date));

    // 更新首页文章列表
    if (fs.existsSync(CONFIG.indexFile)) {
        let indexHtml = fs.readFileSync(CONFIG.indexFile, 'utf-8');

        // 替换文章列表
        const postsListHtml = generatePostsListHtml(posts);
        const postsListRegex = /<div class="posts-list">([\s\S]*?)<\/div>\s*<\/section>/;

        if (indexHtml.match(postsListRegex)) {
            indexHtml = indexHtml.replace(
                postsListRegex,
                `<div class="posts-list">\n${postsListHtml}\n            </div>\n        </section>`
            );
            fs.writeFileSync(CONFIG.indexFile, indexHtml);
            console.log(`\n✅ Updated index.html with ${posts.length} posts`);
        }
    }

    console.log('\n🎉 Build complete!');
}

// 运行构建
build();
