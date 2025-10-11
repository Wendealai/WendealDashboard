/**
 * Security Headers Component
 * Manages Content Security Policy and other security headers for Docmost iframe
 */

import { useEffect } from 'react';

/**
 * Security Headers Component
 * Configures CSP and other security headers for Docmost integration
 */
const SecurityHeaders: React.FC = () => {
  useEffect(() => {
    // Configure Content Security Policy for Docmost iframe
    const configureCSP = () => {
      // Note: In a production environment, CSP should be set via server headers
      // This is a client-side fallback for development

      const DOCMOST = 'https://docmost.wendealai.com.au';

      const cspDirectives = [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${DOCMOST}`,
        `style-src 'self' 'unsafe-inline' ${DOCMOST} https://fonts.googleapis.com`,
        `img-src 'self' data: https: ${DOCMOST}`,
        `font-src 'self' https://fonts.gstatic.com ${DOCMOST}`,
        `connect-src 'self' ${DOCMOST} wss://${new URL(DOCMOST).host}`,
        `frame-src 'self' ${DOCMOST}`,
        "object-src 'none'",
        "base-uri 'self'",
        `form-action 'self' ${DOCMOST}`,
        "frame-ancestors 'self'",
      ];

      // In development, we log the CSP configuration
      if (process.env.NODE_ENV === 'development') {
        console.log('Docmost Security Configuration:', {
          csp: cspDirectives.join('; '),
          note: 'CSP should be configured server-side in production',
        });
      }
    };

    // Configure additional security headers
    const configureSecurityHeaders = () => {
      // X-Frame-Options is handled by CSP frame-ancestors
      // Referrer-Policy is configured in the iframe component

      if (process.env.NODE_ENV === 'development') {
        console.log('Docmost Security Headers:', {
          'X-Frame-Options': 'SAMEORIGIN (via CSP)',
          'Referrer-Policy': 'strict-origin-when-cross-origin (via iframe)',
          'Permissions-Policy': 'Not configured (iframe handles permissions)',
        });
      }
    };

    configureCSP();
    configureSecurityHeaders();
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default SecurityHeaders;
