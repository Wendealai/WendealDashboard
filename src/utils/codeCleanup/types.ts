/**
 * Code Cleanup Utility Types
 *
 * Defines TypeScript interfaces and types for the code cleanup and maintenance system.
 * These types provide a structured way to represent analysis results, cleanup actions,
 * and validation data throughout the cleanup process.
 */

/**
 * Cleanup analysis result containing comprehensive codebase analysis
 */
export interface CleanupAnalysis {
  /** Analysis timestamp */
  timestamp: string;
  /** Analysis duration in milliseconds */
  duration: number;
  /** Total files analyzed */
  filesAnalyzed: number;
  /** Issues found during analysis */
  issuesFound: {
    syntaxErrors: number;
    unusedImports: number;
    deadCode: number;
    unusedFiles: number;
    circularDeps: number;
  };
  /** Cleanup recommendations */
  recommendations: CleanupRecommendation[];
  /** Overall risk assessment */
  riskAssessment: RiskLevel;
}

/**
 * Individual cleanup recommendation
 */
export interface CleanupRecommendation {
  /** Unique recommendation ID */
  id: string;
  /** Recommendation type */
  type: 'remove' | 'fix' | 'refactor' | 'review';
  /** Target file path */
  file: string;
  /** Human-readable description */
  description: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Whether this can be automated */
  automated: boolean;
  /** Expected impact description */
  impact: string;
}

/**
 * Risk assessment levels
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Syntax error information
 */
export interface SyntaxError {
  /** File path where error occurred */
  file: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** Error message */
  message: string;
  /** Error code/category */
  code: string;
  /** Whether this is fixable */
  fixable: boolean;
  /** Suggested fix (if available) */
  suggestion?: string;
}

/**
 * Unused import information
 */
export interface UnusedImport {
  /** File path */
  file: string;
  /** Import statement */
  importStatement: string;
  /** Unused identifiers */
  unusedIdentifiers: string[];
  /** Line number */
  line: number;
  /** Whether safe to remove */
  safeToRemove: boolean;
}

/**
 * Dead code analysis result
 */
export interface DeadCodeResult {
  /** Files with dead code */
  files: DeadCodeFile[];
  /** Total lines of dead code */
  totalDeadLines: number;
  /** Dead code percentage */
  deadCodePercentage: number;
}

/**
 * Dead code in a specific file
 */
export interface DeadCodeFile {
  /** File path */
  file: string;
  /** Dead code regions */
  deadRegions: DeadCodeRegion[];
  /** Total dead lines in this file */
  deadLines: number;
}

/**
 * Dead code region information
 */
export interface DeadCodeRegion {
  /** Start line number */
  startLine: number;
  /** End line number */
  endLine: number;
  /** Dead code content */
  content: string;
  /** Reason why it's considered dead */
  reason: string;
}

/**
 * Dependency analysis result
 */
export interface DependencyGraph {
  /** Module nodes */
  nodes: ModuleNode[];
  /** Dependency edges */
  edges: DependencyEdge[];
  /** Isolated modules (no dependencies) */
  isolatedModules: string[];
}

/**
 * Module node in dependency graph
 */
export interface ModuleNode {
  /** Module file path */
  file: string;
  /** Module type */
  type: 'component' | 'service' | 'utility' | 'config' | 'other';
  /** Whether module is used */
  isUsed: boolean;
  /** Module size in bytes */
  size: number;
}

/**
 * Dependency edge between modules
 */
export interface DependencyEdge {
  /** Source module */
  from: string;
  /** Target module */
  to: string;
  /** Dependency type */
  type: 'import' | 'require' | 'dynamic';
  /** Whether this dependency is valid */
  isValid: boolean;
}

/**
 * Circular dependency information
 */
export interface CircularDependency {
  /** Involved modules */
  modules: string[];
  /** Cycle path */
  cycle: string[];
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
}

/**
 * Cleanup action performed
 */
export interface CleanupAction {
  /** Unique action ID */
  id: string;
  /** Action type */
  type: 'file_removal' | 'import_cleanup' | 'syntax_fix' | 'config_update';
  /** Target file or resource */
  target: string;
  /** Action description */
  description: string;
  /** Whether action was executed */
  executed: boolean;
  /** Whether action was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Timestamp of execution */
  executedAt?: string;
}

/**
 * Cleanup result summary
 */
export interface CleanupResult {
  /** Files successfully removed */
  filesRemoved: number;
  /** Import statements cleaned */
  importsCleaned: number;
  /** Errors fixed */
  errorsFixed: number;
  /** Build status after cleanup */
  buildStatus: 'success' | 'failed' | 'warnings';
  /** Test status after cleanup */
  testStatus: 'passed' | 'failed' | 'skipped';
  /** Any issues encountered */
  issues: string[];
}

/**
 * Performance metrics before/after cleanup
 */
export interface CleanupMetrics {
  /** Bundle size reduction in bytes */
  bundleSizeReduction: number;
  /** Build time change in milliseconds */
  buildTimeChange: number;
  /** Test coverage change percentage */
  testCoverageChange: number;
  /** Lines of code removed */
  linesOfCodeRemoved: number;
  /** Files removed count */
  filesRemoved: number;
}

/**
 * Complete cleanup report
 */
export interface CleanupReport {
  /** Analysis results */
  analysis: CleanupAnalysis;
  /** Actions performed */
  actions: CleanupAction[];
  /** Final results */
  results: CleanupResult;
  /** Performance metrics */
  metrics: CleanupMetrics;
  /** Generated timestamp */
  generatedAt: string;
}

/**
 * Build validation result
 */
export interface BuildResult {
  /** Whether build was successful */
  success: boolean;
  /** Build duration in milliseconds */
  duration: number;
  /** Final bundle size in bytes */
  bundleSize: number;
  /** Build warnings */
  warnings: string[];
  /** Build errors */
  errors: string[];
  /** Generated timestamp */
  timestamp: string;
}

/**
 * Test execution result
 */
export interface TestResult {
  /** Whether tests passed */
  passed: boolean;
  /** Total test count */
  totalTests: number;
  /** Passed test count */
  passedTests: number;
  /** Failed test count */
  failedTests: number;
  /** Test coverage percentage */
  coverage: number;
  /** Test execution duration */
  duration: number;
  /** Failed test details */
  failures: TestFailure[];
}

/**
 * Individual test failure information
 */
export interface TestFailure {
  /** Test suite name */
  suite: string;
  /** Test case name */
  test: string;
  /** Failure message */
  message: string;
  /** Stack trace */
  stackTrace?: string;
}

/**
 * Runtime validation result
 */
export interface RuntimeValidationResult {
  /** Whether application started successfully */
  started: boolean;
  /** Application URL */
  url?: string;
  /** Console errors */
  consoleErrors: string[];
  /** Network errors */
  networkErrors: string[];
  /** Page load time */
  loadTime?: number;
  /** Memory usage */
  memoryUsage?: number;
}

/**
 * Backup operation result
 */
export interface BackupResult {
  /** Unique backup ID */
  id: string;
  /** Backup timestamp */
  timestamp: string;
  /** Files backed up */
  files: string[];
  /** Total backup size in bytes */
  size: number;
  /** Backup location */
  location: string;
  /** Whether backup was successful */
  success: boolean;
}

/**
 * Rollback operation result
 */
export interface RollbackResult {
  /** Whether rollback was successful */
  success: boolean;
  /** Files restored */
  filesRestored: string[];
  /** Rollback timestamp */
  timestamp: string;
  /** Any errors during rollback */
  errors: string[];
}

/**
 * Validation result for potential cleanup actions
 */
export interface ValidationResult {
  /** Whether the action is valid */
  valid: boolean;
  /** Validation issues */
  issues: string[];
  /** Whether it's safe to proceed */
  safeToProceed: boolean;
  /** Risk level */
  riskLevel: RiskLevel;
  /** Validation timestamp */
  timestamp: string;
}

/**
 * File analysis result
 */
export interface FileAnalysis {
  /** File path */
  path: string;
  /** File extension */
  extension: string;
  /** File size in bytes */
  size: number;
  /** Lines of code */
  linesOfCode: number;
  /** Import statements */
  imports: string[];
  /** Export statements */
  exports: string[];
  /** Dependencies */
  dependencies: string[];
  /** Syntax errors */
  syntaxErrors: SyntaxError[];
  /** Whether file is used */
  isUsed: boolean;
  /** Usage count */
  usageCount: number;
}

/**
 * Component usage analysis
 */
export interface ComponentUsage {
  /** Component name */
  name: string;
  /** File path */
  file: string;
  /** Import locations */
  importedIn: string[];
  /** Render locations */
  renderedIn: string[];
  /** Whether component is used */
  isUsed: boolean;
  /** Usage count */
  usageCount: number;
  /** Props usage */
  propsUsage: Record<string, number>;
}

/**
 * Service usage analysis
 */
export interface ServiceUsage {
  /** Service name */
  name: string;
  /** File path */
  file: string;
  /** Methods defined */
  methods: string[];
  /** Methods used */
  methodsUsed: string[];
  /** Usage count */
  usageCount: number;
  /** Whether service is used */
  isUsed: boolean;
}

/**
 * Configuration analysis result
 */
export interface ConfigAnalysis {
  /** Config file path */
  file: string;
  /** Config type */
  type: 'webpack' | 'eslint' | 'typescript' | 'jest' | 'other';
  /** Unused entries */
  unusedEntries: string[];
  /** Invalid entries */
  invalidEntries: string[];
  /** Optimization suggestions */
  suggestions: string[];
}

/**
 * Code cleanup configuration
 */
export interface CleanupConfig {
  /** Files/directories to include in analysis */
  includePatterns: string[];
  /** Files/directories to exclude from analysis */
  excludePatterns: string[];
  /** Whether to create backups */
  createBackups: boolean;
  /** Backup directory */
  backupDir: string;
  /** Risk tolerance level */
  riskTolerance: RiskLevel;
  /** Whether to run in dry-run mode */
  dryRun: boolean;
  /** Maximum files to process in one batch */
  batchSize: number;
  /** Timeout for analysis operations */
  timeout: number;
}

