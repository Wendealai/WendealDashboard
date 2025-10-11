## v0.1.0 (2025-10-11)

- feat(docmost): 将 iframe 指向 `https://docmost.wendealai.com.au`
- chore(security): 更新全局 CSP 与客户端安全头，允许 Docmost `.com.au` 域名嵌入与表单提交
- chore(sandbox): 扩展 iframe `sandbox`，包含 `allow-top-navigation`、`allow-popups-to-escape-sandbox`、`allow-storage-access-by-user-activation`
- docs: 新增端到端验证建议与 Cloudflare Tunnel 反向代理说明（避免第三方 Cookie 阻拦）

说明：此次发布聚焦 Docmost 登录重定向问题的合规修复，采用同站域名与适当的 CSP/sandbox 权限，提升登录体验的可靠性。
