# Requirements Document

## Introduction

Smart-opportunities is a new workflow feature that allows users to discover business opportunities by analyzing market data based on industry, city, and country parameters. The feature integrates with external APIs to fetch and display relevant business opportunities in an interactive dashboard format.

## Alignment with Product Vision

This feature enhances the Wendeal Dashboard by providing actionable business intelligence, helping users make informed decisions about market opportunities and business expansion strategies.

## Requirements

### Requirement 1: Smart Opportunities Workflow Interface

**User Story:** As a business user, I want to input industry, city, and country parameters to discover relevant business opportunities, so that I can make informed decisions about market expansion.

#### Acceptance Criteria

1. WHEN user clicks on "Smart-opportunities" workflow card THEN system SHALL display a split-panel interface with input form on top and data display on bottom
2. WHEN user enters industry domain (e.g., barber, real estate agency) THEN system SHALL validate input and prepare for workflow execution
3. WHEN user enters city name THEN system SHALL validate input format and prepare for workflow execution
4. WHEN user enters country name THEN system SHALL validate input format and prepare for workflow execution
5. WHEN user clicks "Start Workflow" button THEN system SHALL send POST request to https://n8n.wendealai.com/webhook/Smart-opportunities with the three parameters

### Requirement 2: Airtable Integration and Data Display

**User Story:** As a business user, I want to view business opportunities data in a structured table format, so that I can easily analyze and compare different opportunities.

#### Acceptance Criteria

1. WHEN workflow execution completes THEN system SHALL fetch data from Airtable using API key patfGnnRL4S6RxVeN.75a5ba3336d01e4e0072af47788f7f9408ba9055fc6e04b70aa8763042e9499a
2. WHEN data is fetched from Airtable base appU7ykK2mZQZv444 THEN system SHALL display it in a responsive table format
3. WHEN user interacts with table THEN system SHALL support sorting, filtering, and pagination
4. WHEN data fetch fails THEN system SHALL display appropriate error message with retry option

### Requirement 3: Workflow Integration

**User Story:** As a system user, I want the Smart-opportunities workflow to be properly integrated into the existing Information Dashboard workflow system.

#### Acceptance Criteria

1. WHEN user clicks Smart-opportunities workflow card THEN system SHALL update selectedWorkflow state to 'smart-opportunities'
2. WHEN workflow is selected THEN system SHALL display SmartOpportunities component in the right panel
3. WHEN workflow completes THEN system SHALL update workflow status and last execution time

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: SmartOpportunities component should handle only opportunity discovery logic
- **Modular Design**: Separate Airtable client from UI components
- **Dependency Management**: Use existing project patterns for API calls and state management
- **Clear Interfaces**: Define TypeScript interfaces for all data structures

### Performance
- Page load time should be under 2 seconds
- API calls should have appropriate loading states
- Table rendering should be optimized for large datasets (1000+ records)

### Security
- API keys should be properly secured and not exposed in client-side code
- Input validation should prevent injection attacks
- HTTPS should be used for all external API calls

### Reliability
- Handle network failures gracefully with retry mechanisms
- Provide meaningful error messages to users
- Maintain data consistency during workflow execution

### Usability
- Form inputs should have clear labels and validation feedback
- Loading states should be clearly indicated
- Error messages should be user-friendly and actionable
- Table should be responsive on mobile devices