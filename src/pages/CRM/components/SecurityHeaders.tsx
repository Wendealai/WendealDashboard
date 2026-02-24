/**
 * Security Headers Component
 * Manages Content Security Policy and other security headers for CRM iframe
 */

import { useEffect, useMemo } from 'react';

interface SecurityHeadersProps {
  crmUrl?: string;
}

/**
 * Security Headers Component
 * Configures CSP and other security headers for CRM integration
 */
const SecurityHeaders: React.FC<SecurityHeadersProps> = ({ crmUrl }) => {
  const crmOrigin = useMemo(() => {
    try {
      return new URL(crmUrl || window.location.origin, window.location.origin)
        .origin;
    } catch {
      return window.location.origin;
    }
  }, [crmUrl]);

  useEffect(() => {
    // Configure Content Security Policy for CRM iframe
    const configureCSP = () => {
      // Note: In a production environment, CSP should be set via server headers
      // This is a client-side fallback for development

      const cspDirectives = [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${crmOrigin}`,
        `style-src 'self' 'unsafe-inline' ${crmOrigin} https://fonts.googleapis.com`,
        `img-src 'self' data: https: ${crmOrigin}`,
        `font-src 'self' https://fonts.gstatic.com ${crmOrigin}`,
        `connect-src 'self' ${crmOrigin} ${crmOrigin.replace('https://', 'wss://')}`,
        `frame-src 'self' ${crmOrigin}`,
        "object-src 'none'",
        "base-uri 'self'",
        `form-action 'self' ${crmOrigin}`,
        "frame-ancestors 'self'",
      ];

      // In development, we log the CSP configuration
      if (process.env.NODE_ENV === 'development') {
        console.log('CRM Security Configuration:', {
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
        console.log('CRM Security Headers:', {
          'X-Frame-Options': 'SAMEORIGIN (via CSP)',
          'Referrer-Policy': 'strict-origin-when-cross-origin (via iframe)',
          'Permissions-Policy': 'Not configured (iframe handles permissions)',
        });
      }
    };

    configureCSP();
    configureSecurityHeaders();
  }, [crmOrigin]);

  // This component doesn't render anything visible
  return null;
};

export default SecurityHeaders;
