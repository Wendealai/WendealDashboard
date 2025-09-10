# Tasks Document

- [x] 1. Create TypeScript interfaces for Smart Opportunities
  - File: src/types/smartOpportunities.ts
  - Define OpportunityRecord, WorkflowParameters, AirtableConfig interfaces
  - Extend existing workflow types for integration
  - Purpose: Establish type safety for Smart Opportunities feature
  - _Leverage: src/types/workflow.ts, src/types/index.ts_
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create Airtable service for data fetching
  - File: src/services/airtableService.ts
  - Implement AirtableClient class with API methods
  - Add error handling and retry logic
  - Purpose: Provide data access layer for Airtable integration
  - _Leverage: Airtable.js library, existing service patterns_
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Create Airtable service unit tests
  - File: src/services/__tests__/airtableService.test.ts
  - Test API methods with mocked responses
  - Test error handling and edge cases
  - Purpose: Ensure Airtable service reliability
  - _Leverage: existing test patterns, MSW for API mocking_
  - _Requirements: 2.1, 2.2_

- [x] 4. Create InputForm component for parameter input
  - File: src/pages/InformationDashboard/components/InputForm.tsx
  - Implement form with industry, city, country fields
  - Add validation and loading states
  - Purpose: Handle user input for workflow parameters
  - _Leverage: Ant Design Form components, existing validation patterns_
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 5. Create AirtableTable component for data display
  - File: src/pages/InformationDashboard/components/AirtableTable.tsx
  - Implement table with sorting and pagination
  - Add loading and error states
  - Purpose: Display Airtable data in structured format
  - _Leverage: Ant Design Table, existing ResultPanel patterns_
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Create main SmartOpportunities component
  - File: src/pages/InformationDashboard/components/SmartOpportunities.tsx
  - Implement split-panel layout (input form + table)
  - Integrate with Airtable service and workflow system
  - Purpose: Main component orchestrating the entire feature
  - _Leverage: existing component patterns, workflow integration_
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 7. Update WorkflowSidebar to add Smart Opportunities card
  - File: src/pages/InformationDashboard/components/WorkflowSidebar.tsx
  - Add new workflow card for Smart Opportunities
  - Integrate with existing workflow selection logic
  - Purpose: Enable users to select and trigger Smart Opportunities workflow
  - _Leverage: existing WorkflowCard component, workflow patterns_
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 8. Update InformationDashboard to handle Smart Opportunities
  - File: src/pages/InformationDashboard/InformationDashboard.tsx
  - Add conditional rendering for SmartOpportunities component
  - Update title and layout logic
  - Purpose: Integrate Smart Opportunities into main dashboard
  - _Leverage: existing workflow selection patterns_
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 9. Create SmartOpportunities component unit tests
  - File: src/pages/InformationDashboard/components/__tests__/SmartOpportunities.test.tsx
  - Test component rendering and user interactions
  - Test workflow integration and data flow
  - Purpose: Ensure component reliability and proper integration
  - _Leverage: existing test patterns, React Testing Library_
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [ ] 10. Create InputForm component unit tests
  - File: src/pages/InformationDashboard/components/__tests__/InputForm.test.tsx
  - Test form validation and submission
  - Test loading and error states
  - Purpose: Ensure form reliability and user experience
  - _Leverage: existing test patterns, React Testing Library_
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 11. Create AirtableTable component unit tests
  - File: src/pages/InformationDashboard/components/__tests__/AirtableTable.test.tsx
  - Test table rendering and data display
  - Test sorting, pagination, and error states
  - Purpose: Ensure table functionality and data presentation
  - _Leverage: existing test patterns, React Testing Library_
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 12. Create integration tests for Smart Opportunities workflow
  - File: src/__tests__/integration/smartOpportunities.test.tsx
  - Test complete workflow from input to data display
  - Test error scenarios and recovery
  - Purpose: Ensure end-to-end functionality and integration
  - _Leverage: existing integration test patterns_
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [ ] 13. Update workflow types and exports
  - File: src/types/workflow.ts
  - Add SmartOpportunities workflow type
  - Update exports in index files
  - Purpose: Ensure proper type integration across the application
  - _Leverage: existing type definitions_
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 14. Add environment configuration for Airtable
  - File: .env.local (add to .gitignore)
  - Configure Airtable API key and base ID
  - Add environment variable validation
  - Purpose: Secure API configuration and deployment readiness
  - _Leverage: existing environment configuration patterns_
  - _Requirements: 2.1, 2.2_

- [ ] 15. Add error boundaries and error handling
  - File: src/pages/InformationDashboard/components/ErrorBoundary.tsx
  - Implement error boundary for SmartOpportunities
  - Add user-friendly error messages
  - Purpose: Improve error handling and user experience
  - _Leverage: existing error handling patterns_
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 16. Add loading states and performance optimizations
  - File: src/pages/InformationDashboard/components/SmartOpportunities.tsx (enhance)
  - Add skeleton loading for table data
  - Implement lazy loading for large datasets
  - Purpose: Improve perceived performance and user experience
  - _Leverage: existing loading patterns, React.lazy_
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 17. Add accessibility improvements
  - File: src/pages/InformationDashboard/components/SmartOpportunities.tsx (enhance)
  - Add ARIA labels and keyboard navigation
  - Ensure proper focus management
  - Purpose: Make the feature accessible to all users
  - _Leverage: existing accessibility patterns_
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 18. Final integration and testing
  - Test complete workflow in development environment
  - Verify API integration with Airtable
  - Test error scenarios and edge cases
  - Purpose: Ensure production readiness and bug-free deployment
  - _Leverage: existing testing and deployment patterns_
  - _Requirements: All requirements_