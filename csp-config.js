/**
 * CSP配置说明
 * 用于Wendeal Dashboard的Content Security Policy配置
 */

// CSP指令说明
const CSP_DIRECTIVES = {
  'default-src': "'self'",
  'script-src': [
    "'self'",
    "'unsafe-inline'", // 允许内联脚本（Airtable需要）
    "'unsafe-eval'",   // 允许eval（某些库需要）
    "https://*.airtable.com",
    "https://*.stripe.com",
    "https://m.stripe.network",
    "https://js.stripe.com",
    "https://*.stripe.network"
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // 允许内联样式
    "https://*.airtable.com",
    "https://fonts.googleapis.com"
  ],
  'img-src': [
    "'self'",
    "data:", // 允许data: URLs
    "https:", // 允许HTTPS图片
    "blob:"  // 允许blob URLs
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com",
    "https://*.airtable.com"
  ],
  'connect-src': [
    "'self'",
    "https://*.airtable.com",
    "https://*.stripe.com",
    "https://m.stripe.network",
    "https://js.stripe.com",
    "https://api.airtable.com",
    "wss://*.airtable.com" // WebSocket连接
  ],
  'frame-src': [
    "'self'",
    "https://*.airtable.com",
    "https://*.stripe.com",
    "https://m.stripe.network",
    "https://js.stripe.com"
  ],
  'object-src': "'none'", // 禁止object/embed/applet
  'base-uri': "'self'",
  'form-action': "'self'",
  'frame-ancestors': "'self'",
  'upgrade-insecure-requests': true
};

// 生成CSP字符串
function generateCSPString(directives) {
  return Object.entries(directives)
    .map(([directive, value]) => {
      if (Array.isArray(value)) {
        return `${directive} ${value.join(' ')}`;
      } else if (typeof value === 'boolean' && value) {
        return directive;
      } else if (typeof value === 'string') {
        return `${directive} ${value}`;
      }
      return null;
    })
    .filter(Boolean)
    .join('; ');
}

// 开发环境CSP（更宽松）
const DEV_CSP = generateCSPString(CSP_DIRECTIVES);

// 生产环境CSP（更严格）
const PROD_CSP = generateCSPString({
  ...CSP_DIRECTIVES,
  'script-src': [
    "'self'",
    "https://*.airtable.com",
    "https://*.stripe.com",
    "https://m.stripe.network",
    "https://js.stripe.com"
    // 移除 'unsafe-inline' 和 'unsafe-eval' 用于生产环境
  ],
  'style-src': [
    "'self'",
    "https://*.airtable.com",
    "https://fonts.googleapis.com"
    // 移除 'unsafe-inline' 用于生产环境
  ]
});

console.log('🚀 CSP配置说明:');
console.log('');
console.log('📋 开发环境CSP:');
console.log(DEV_CSP);
console.log('');
console.log('📋 生产环境CSP:');
console.log(PROD_CSP);
console.log('');
console.log('🔧 已配置的允许域名:');
console.log('  • Airtable: *.airtable.com, api.airtable.com');
console.log('  • Stripe: *.stripe.com, m.stripe.network, js.stripe.com');
console.log('  • Google Fonts: fonts.googleapis.com, fonts.gstatic.com');
console.log('');
console.log('✅ 配置已应用到:');
console.log('  • vite.config.ts (开发服务器头部)');
console.log('  • index.html (meta标签fallback)');

export { CSP_DIRECTIVES, DEV_CSP, PROD_CSP, generateCSPString };
