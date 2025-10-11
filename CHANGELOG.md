# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-10-11

### Added

- **Files Module**: New file management module with iframe integration to https://send.wendealai.com
  - Full-screen iframe display with maximum utilization
  - Loading states with skeleton screens and spinners
  - Error handling with retry mechanism (up to 3 attempts)
  - Security sandbox attributes for safe iframe embedding
  - Responsive design for all screen sizes
  - Performance monitoring and error tracking
  - Complete internationalization support

- **File Converter Workflow**: Enhanced Tools module with File Converter functionality
  - Added File Converter workflow card in Tools sidebar
  - Iframe integration to https://vert.wendealai.com
  - Comprehensive error handling and loading states
  - Security sandbox configuration

- **Navigation Updates**: Added Files module to main navigation
  - New Files menu item with FolderOutlined icon
  - Proper routing and permission configuration
  - Updated localization for navigation items

### Technical Improvements

- **Component Architecture**: Created reusable container components
  - FilesContainer with iframe management
  - ToolsWorkflowContainer for workflow integration
  - Consistent error boundaries and security headers
  - Performance monitoring across all iframe integrations

- **Styling Enhancements**: Comprehensive CSS improvements
  - Responsive iframe containers for all screen sizes
  - Dark theme support for all new components
  - Print-friendly styles
  - Accessibility improvements with focus indicators

- **Internationalization**: Complete translation support
  - Added Files module translations in Chinese
  - Updated Tools workflow translations
  - Consistent error message localization

### Dependencies

- Updated package.json version to 0.2.0
- No new dependencies added

### Security

- Enhanced iframe security with sandbox attributes
- CSP policy updates for new iframe integrations
- Secure referrer policy configuration

## [0.1.0] - 2025-10-10

### Added

- **Docmost Module**: Document management system integration
  - Iframe integration to https://docmost.wendealai.com
  - Full-screen display with maximum utilization
  - Loading states and error handling
  - Security sandbox configuration

- **CRM Module**: Customer relationship management system
  - Iframe integration to https://crm.wendealai.com.au
  - Twenty CRM platform integration
  - Error boundaries and performance monitoring
  - Security headers configuration

- **Note Module**: Note-taking functionality
  - Iframe integration to external note service
  - Responsive design and loading states

- **Calendar Module**: Calendar integration
  - Google Calendar iframe embedding
  - Full-screen calendar display
  - Responsive layout adjustments

- **Tools Module Enhancements**: Workflow management system
  - Multiple workflow cards (OCR, Smart Opportunities, etc.)
  - Dynamic workflow selection
  - Settings modal integration

### Technical Improvements

- **Routing System**: Enhanced route configuration
  - Lazy loading for all page components
  - Proper authentication guards
  - Role-based access control

- **Layout System**: Improved main layout
  - Responsive sidebar navigation
  - Dynamic menu generation
  - Better mobile responsiveness

- **Internationalization**: Complete i18n setup
  - Chinese and English translations
  - Dynamic language switching
  - Comprehensive UI text coverage

- **Security**: Enhanced security measures
  - CSP policy implementation
  - Iframe sandbox attributes
  - Secure headers configuration

### Dependencies

- Initial dependency setup with React 18, Ant Design 5, etc.
- Development tools: TypeScript, ESLint, Prettier, Jest

### Infrastructure

- **Build System**: Vite-based build configuration
- **Testing**: Unit and integration test setup
- **Linting**: Pre-commit hooks with Husky
- **Git Workflow**: Branch protection and CI/CD ready

---

## Version History

- **v0.2.0** (2025-10-11): Files module and File Converter workflow
- **v0.1.0** (2025-10-10): Initial release with core modules

---

## Contributing

When contributing to this project, please:

1. Update the CHANGELOG.md file with your changes
2. Follow the existing format
3. Use semantic versioning principles
4. Test your changes thoroughly

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md with release notes
3. Create git tag with version number
4. Push code and tags to GitHub
5. Create GitHub release with changelog content
