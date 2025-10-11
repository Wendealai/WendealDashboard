# CRM Module Design

## Overview
Design a CRM module that integrates Twenty CRM platform via iframe embedding into the WendealDashboard. The design follows existing architectural patterns while ensuring security, performance, and seamless user experience.

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Wendeal       │    │   CRM Module    │    │   Twenty CRM    │
│   Dashboard     │◄──►│   (Iframe)      │◄──►│   Instance      │
│                 │    │                 │    │ crm.wendealai.com│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────────────┐
                    │   Security Layer   │
                    │   - CORS Policy    │
                    │   - CSP Headers    │
                    │   - Auth Isolation │
                    └────────────────────┘
```

### Component Architecture

#### CRM Module Structure
```
src/pages/CRM/
├── index.tsx                 # Main CRM page component
├── index.ts                  # Export file
├── styles.css               # CRM-specific styles
└── components/
    ├── CRMContainer.tsx     # Iframe wrapper component
    ├── LoadingState.tsx     # Loading indicator
    ├── ErrorBoundary.tsx    # Error handling
    └── SecurityHeaders.tsx  # Security configuration
```

## Technical Design

### Frontend Integration

#### Route Configuration
- **Path**: `/crm`
- **Component**: Lazy-loaded CRM page
- **Meta Configuration**:
  ```typescript
  {
    title: 'navigation.crm',
    requiresAuth: true,
    roles: ['admin', 'user'],
    icon: 'UserOutlined', // CRM-related icon
  }
  ```

#### Navigation Integration
- Add CRM item to `navigationItems` in `routes.ts`
- Position: After Tools, before Profile
- Icon: `UserOutlined` (contacts/users icon)
- Label: Internationalized 'CRM' text

#### Page Component Design
```typescript
const CRMPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className='crm-page'>
      <div className='page-header'>
        <Title level={2} style={{ fontSize: '22px' }}>
          {t('crm.title')}
        </Title>
      </div>

      <CRMContainer
        src="https://crm.wendealai.com"
        title={t('crm.iframeTitle')}
      />
    </div>
  );
};
```

### Iframe Integration Design

#### CRMContainer Component
```typescript
interface CRMContainerProps {
  src: string;
  title: string;
  className?: string;
}

const CRMContainer: React.FC<CRMContainerProps> = ({
  src,
  title,
  className
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={`crm-container ${className}`}>
      {loading && <LoadingState />}
      {error && <ErrorDisplay error={error} />}

      <iframe
        src={src}
        title={title}
        className="crm-iframe"
        onLoad={() => setLoading(false)}
        onError={() => setError('Failed to load CRM')}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
};
```

#### Security Configuration
```typescript
// Security headers configuration
const SECURITY_HEADERS = {
  'Content-Security-Policy': `
    frame-src https://crm.wendealai.com;
    frame-ancestors 'self';
  `,
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

### Styling Design

#### CSS Architecture
```css
/* CRM Page Styles */
.crm-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.crm-container {
  flex: 1;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.crm-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: var(--card-color);
}

/* Responsive Design */
@media (max-width: 768px) {
  .crm-iframe {
    height: calc(100vh - 200px);
  }
}
```

#### Font Hierarchy (Following Recent Updates)
- **Page Title**: 22px (H1 level)
- **Section Headers**: 18px (H2 level)
- **Component Titles**: 16px (H3 level)
- **Body Text**: 14px
- **Auxiliary Text**: 12px

### Error Handling & Resilience

#### Error Boundary Component
```typescript
class CRMErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <CRMErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

#### Fallback UI Design
```typescript
const CRMErrorFallback: React.FC<{ error: Error | null }> = ({ error }) => (
  <div className="crm-error-fallback">
    <Result
      status="error"
      title="CRM Unavailable"
      subTitle={error?.message || "Unable to load CRM system"}
      extra={
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      }
    />
  </div>
);
```

### Performance Optimization

#### Loading Strategy
- **Lazy Loading**: CRM page is lazy-loaded
- **Iframe Preloading**: Optional preloading for faster access
- **Resource Hints**: DNS prefetch for crm.wendealai.com

#### Caching Strategy
```typescript
// Service worker caching for CRM assets
const CRM_CACHE_NAME = 'crm-cache-v1';
const CRM_URLS = [
  'https://crm.wendealai.com/static/*',
  'https://crm.wendealai.com/assets/*',
];
```

### Cross-Origin Communication

#### PostMessage Integration
```typescript
// Optional: If CRM needs to communicate with dashboard
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // Validate origin
    if (event.origin !== 'https://crm.wendealai.com') return;

    // Handle messages from CRM
    switch (event.data.type) {
      case 'CRM_READY':
        // CRM loaded successfully
        break;
      case 'CRM_ERROR':
        // Handle CRM errors
        break;
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### Testing Strategy

#### Unit Tests
- Component rendering tests
- Error boundary tests
- Loading state tests

#### Integration Tests
- Iframe loading verification
- Cross-origin communication tests
- Security policy validation

#### E2E Tests
- Full CRM loading workflow
- Error handling scenarios
- Responsive behavior validation

### Deployment & Configuration

#### Environment Variables
```env
# CRM Configuration
CRM_URL=https://crm.wendealai.com
CRM_IFRAME_SANDBOX=allow-same-origin allow-scripts allow-forms allow-popups
CRM_IFRAME_REFERRER_POLICY=strict-origin-when-cross-origin
```

#### Build Configuration
- Ensure iframe domain is whitelisted in CSP
- Add CRM domain to CORS allowed origins
- Configure proper security headers

### Monitoring & Analytics

#### Performance Monitoring
- Iframe load time tracking
- Error rate monitoring
- User interaction analytics

#### Security Monitoring
- CSP violation reporting
- Failed iframe load alerts
- Cross-origin communication logs

## Implementation Plan

### Phase 1: Core Implementation
1. Create CRM page component structure
2. Implement basic iframe integration
3. Add route configuration
4. Update navigation menu

### Phase 2: Security & Error Handling
1. Implement security headers
2. Add error boundaries
3. Create loading states
4. Add fallback UI

### Phase 3: Performance & Polish
1. Optimize loading performance
2. Add responsive design
3. Implement caching strategy
4. Add monitoring

### Phase 4: Testing & Deployment
1. Comprehensive testing
2. Performance validation
3. Security audit
4. Production deployment

## Risk Mitigation

### Technical Risks
- **CORS Issues**: Implement proper fallback and error handling
- **Security Vulnerabilities**: Regular security audits and CSP validation
- **Performance Impact**: Monitor and optimize iframe loading

### Business Risks
- **CRM Unavailability**: Implement offline mode and error messaging
- **Integration Complexity**: Start with minimal viable integration
- **User Adoption**: Ensure seamless experience with existing workflow

## Success Metrics

### Technical Metrics
- Iframe load time < 3 seconds
- Error rate < 1%
- Security violations = 0

### User Experience Metrics
- Navigation time < 1 second
- Successful CRM access rate > 99%
- User satisfaction score > 4.5/5

### Business Metrics
- CRM feature adoption rate
- Time saved vs external access
- Integration cost efficiency