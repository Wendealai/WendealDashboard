/**
 * R&D Report Data Analysis Tool
 * Analyzes localStorage and IndexedDB data consistency issues
 */

class RNDReportAnalyzer {
  constructor() {
    this.issues = [];
    this.recommendations = [];
  }

  /**
   * Analyze localStorage data
   */
  analyzeLocalStorage() {
    console.log('🔍 Analyzing localStorage data...');

    const keys = Object.keys(localStorage);
    const reportKeys = keys.filter(key =>
      key.includes('rnd-report') && !key.includes('progress')
    );

    console.log(`📦 Found ${reportKeys.length} R&D report related keys in localStorage`);

    const analysis = {
      contentKeys: [],
      processedKeys: [],
      hashKeys: [],
      progressKeys: [],
      issues: []
    };

    reportKeys.forEach(key => {
      if (key.includes('content-')) {
        analysis.contentKeys.push(key);
      } else if (key.includes('processed-')) {
        analysis.processedKeys.push(key);
      } else if (key.includes('hash-')) {
        analysis.hashKeys.push(key);
      }
    });

    // Check for orphaned data
    analysis.contentKeys.forEach(contentKey => {
      const reportId = contentKey.replace('rnd-report-content-', '');
      const processedKey = `rnd-report-processed-${reportId}`;
      const hashKey = `rnd-report-hash-${reportId}`;

      const hasProcessed = reportKeys.includes(processedKey);
      const hasHash = reportKeys.includes(hashKey);

      if (!hasProcessed) {
        analysis.issues.push(`Missing processed cache for: ${reportId}`);
      }

      if (!hasHash) {
        analysis.issues.push(`Missing hash for: ${reportId}`);
      }

      // Check content integrity
      const content = localStorage.getItem(contentKey);
      if (content) {
        const length = content.length;
        const hasEncodingErrors = content.includes('�') || content.includes('���');
        const isTooShort = length < 50;

        if (hasEncodingErrors) {
          analysis.issues.push(`Encoding errors detected in: ${reportId} (${length} chars)`);
        }

        if (isTooShort) {
          analysis.issues.push(`Content too short for: ${reportId} (${length} chars)`);
        }

        console.log(`📄 ${reportId}: ${length} chars, encoding issues: ${hasEncodingErrors}, too short: ${isTooShort}`);
      }
    });

    return analysis;
  }

  /**
   * Analyze IndexedDB data
   */
  async analyzeIndexedDB() {
    console.log('💾 Analyzing IndexedDB data...');

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('rnd-reports-db', 1);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;
        const analysis = {
          reports: [],
          categories: [],
          readingProgress: [],
          issues: []
        };

        // Analyze reports store
        const reportTransaction = db.transaction(['reports'], 'readonly');
        const reportStore = reportTransaction.objectStore('reports');
        const reportRequest = reportStore.getAll();

        reportRequest.onsuccess = () => {
          analysis.reports = reportRequest.result || [];
          console.log(`📋 Found ${analysis.reports.length} reports in IndexedDB`);

          // Check for missing localStorage content
          analysis.reports.forEach(report => {
            const contentKey = `rnd-report-content-${report.id}`;
            const hasContent = localStorage.getItem(contentKey) !== null;

            if (!hasContent) {
              analysis.issues.push(`Missing localStorage content for report: ${report.name} (${report.id})`);
            }
          });

          resolve(analysis);
        };

        reportRequest.onerror = () => {
          console.error('❌ Failed to read reports from IndexedDB:', reportRequest.error);
          reject(reportRequest.error);
        };
      };
    });
  }

  /**
   * Check data consistency
   */
  async checkConsistency() {
    console.log('🔍 Checking data consistency...');

    const localStorageAnalysis = this.analyzeLocalStorage();
    const indexedDBAnalysis = await this.analyzeIndexedDB();

    const consistencyReport = {
      localStorage: localStorageAnalysis,
      indexedDB: indexedDBAnalysis,
      summary: {
        totalIssues: localStorageAnalysis.issues.length + indexedDBAnalysis.issues.length,
        orphanedContent: localStorageAnalysis.issues.filter(issue =>
          issue.includes('Missing processed cache') || issue.includes('Missing hash')
        ).length,
        missingContent: indexedDBAnalysis.issues.length,
        encodingIssues: localStorageAnalysis.issues.filter(issue =>
          issue.includes('Encoding errors')
        ).length,
        shortContent: localStorageAnalysis.issues.filter(issue =>
          issue.includes('too short')
        ).length
      }
    };

    return consistencyReport;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(consistencyReport) {
    const recommendations = [];

    if (consistencyReport.summary.orphanedContent > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Orphaned Cache Data',
        description: 'Found cached data without corresponding reports. Consider clearing orphaned caches.',
        action: 'Clear orphaned caches'
      });
    }

    if (consistencyReport.summary.missingContent > 0) {
      recommendations.push({
        type: 'error',
        title: 'Missing Content',
        description: 'Some reports are missing their HTML content in localStorage.',
        action: 'Re-upload missing reports'
      });
    }

    if (consistencyReport.summary.encodingIssues > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Encoding Issues',
        description: 'Detected encoding errors in report content that may cause display issues.',
        action: 'Re-process reports with encoding errors'
      });
    }

    if (consistencyReport.summary.shortContent > 0) {
      recommendations.push({
        type: 'error',
        title: 'Corrupted Content',
        description: 'Some reports have very short or corrupted content.',
        action: 'Re-upload corrupted reports'
      });
    }

    return recommendations;
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(consistencyReport, recommendations) {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>R&D Report Data Analysis</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #e1e5e9;
            padding-bottom: 20px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #007bff;
          }
          .summary-card.error {
            border-left-color: #dc3545;
            background: #f8d7da;
          }
          .summary-card.warning {
            border-left-color: #ffc107;
            background: #fff3cd;
          }
          .issues {
            margin-bottom: 30px;
          }
          .issue-list {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
          }
          .issue-item {
            padding: 8px 0;
            border-bottom: 1px solid #e1e5e9;
          }
          .issue-item:last-child {
            border-bottom: none;
          }
          .recommendations {
            margin-bottom: 30px;
          }
          .recommendation {
            background: #e7f3ff;
            border: 1px solid #b3d4fc;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
          }
          .recommendation.error {
            background: #f8d7da;
            border-color: #f5c6cb;
          }
          .recommendation.warning {
            background: #fff3cd;
            border-color: #ffeaa7;
          }
          .actions {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e1e5e9;
          }
          .btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin: 0 10px;
            font-size: 14px;
          }
          .btn:hover {
            background: #0056b3;
          }
          .btn.danger {
            background: #dc3545;
          }
          .btn.danger:hover {
            background: #c82333;
          }
          .btn.secondary {
            background: #6c757d;
          }
          .btn.secondary:hover {
            background: #545b62;
          }
          .timestamp {
            color: #6c757d;
            font-size: 14px;
            text-align: center;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔍 R&D Report Data Analysis</h1>
            <p>Comprehensive analysis of localStorage and IndexedDB data consistency</p>
          </div>

          <div class="summary">
            <div class="summary-card">
              <h3>📦 localStorage</h3>
              <p><strong>Content Files:</strong> ${consistencyReport.localStorage.contentKeys.length}</p>
              <p><strong>Processed Cache:</strong> ${consistencyReport.localStorage.processedKeys.length}</p>
              <p><strong>Hash Files:</strong> ${consistencyReport.localStorage.hashKeys.length}</p>
            </div>

            <div class="summary-card">
              <h3>💾 IndexedDB</h3>
              <p><strong>Reports:</strong> ${consistencyReport.indexedDB.reports.length}</p>
              <p><strong>Categories:</strong> ${consistencyReport.indexedDB.categories.length}</p>
              <p><strong>Reading Progress:</strong> ${consistencyReport.indexedDB.readingProgress.length}</p>
            </div>

            <div class="summary-card ${consistencyReport.summary.totalIssues > 0 ? 'error' : ''}">
              <h3>⚠️ Issues Found</h3>
              <p><strong>Total Issues:</strong> ${consistencyReport.summary.totalIssues}</p>
              <p><strong>Orphaned Content:</strong> ${consistencyReport.summary.orphanedContent}</p>
              <p><strong>Missing Content:</strong> ${consistencyReport.summary.missingContent}</p>
            </div>
          </div>

          ${consistencyReport.localStorage.issues.length > 0 ? `
          <div class="issues">
            <h2>🔧 localStorage Issues</h2>
            <div class="issue-list">
              ${consistencyReport.localStorage.issues.map(issue => `<div class="issue-item">• ${issue}</div>`).join('')}
            </div>
          </div>
          ` : ''}

          ${consistencyReport.indexedDB.issues.length > 0 ? `
          <div class="issues">
            <h2>🔧 IndexedDB Issues</h2>
            <div class="issue-list">
              ${consistencyReport.indexedDB.issues.map(issue => `<div class="issue-item">• ${issue}</div>`).join('')}
            </div>
          </div>
          ` : ''}

          ${recommendations.length > 0 ? `
          <div class="recommendations">
            <h2>💡 Recommendations</h2>
            ${recommendations.map(rec => `
              <div class="recommendation ${rec.type}">
                <h4>${rec.title}</h4>
                <p>${rec.description}</p>
                <strong>Action:</strong> ${rec.action}
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div class="actions">
            <button class="btn" onclick="clearOrphanedCaches()">Clear Orphaned Caches</button>
            <button class="btn secondary" onclick="refreshAnalysis()">Refresh Analysis</button>
            <button class="btn danger" onclick="clearAllReportData()">Clear All Data</button>
          </div>

          <div class="timestamp">
            Generated on ${new Date().toLocaleString()}
          </div>
        </div>

        <script>
          function clearOrphanedCaches() {
            if (confirm('Are you sure you want to clear orphaned caches? This action cannot be undone.')) {
              const keys = Object.keys(localStorage);
              let cleared = 0;

              keys.forEach(key => {
                if (key.includes('rnd-report-processed-') || key.includes('rnd-report-hash-')) {
                  const reportId = key.includes('processed-')
                    ? key.replace('rnd-report-processed-', '')
                    : key.replace('rnd-report-hash-', '');

                  const contentKey = \`rnd-report-content-\${reportId}\`;
                  const hasContent = localStorage.getItem(contentKey) !== null;

                  if (!hasContent) {
                    localStorage.removeItem(key);
                    cleared++;
                  }
                }
              });

              alert(\`Cleared \${cleared} orphaned cache entries.\`);
              location.reload();
            }
          }

          function refreshAnalysis() {
            location.reload();
          }

          function clearAllReportData() {
            if (confirm('Are you sure you want to clear ALL R&D report data? This will delete all reports, caches, and progress data. This action cannot be undone.')) {
              const keys = Object.keys(localStorage);
              let cleared = 0;

              keys.forEach(key => {
                if (key.includes('rnd-report')) {
                  localStorage.removeItem(key);
                  cleared++;
                }
              });

              // Clear IndexedDB
              indexedDB.deleteDatabase('rnd-reports-db');

              alert(\`Cleared \${cleared} localStorage entries and IndexedDB database.\`);
              location.reload();
            }
          }
        </script>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Run complete analysis
   */
  async runAnalysis() {
    console.log('🚀 Starting R&D Report Data Analysis...');

    try {
      const consistencyReport = await this.checkConsistency();
      const recommendations = this.generateRecommendations(consistencyReport);
      const htmlReport = this.generateHtmlReport(consistencyReport, recommendations);

      // Save HTML report
      const blob = new Blob([htmlReport], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      console.log('✅ Analysis completed successfully');
      console.log('📊 Summary:', consistencyReport.summary);
      console.log('💡 Recommendations:', recommendations.length);

      return {
        consistencyReport,
        recommendations,
        htmlReport,
        downloadUrl: url
      };
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }
}

// Auto-run analysis if script is loaded directly
if (typeof window !== 'undefined') {
  console.log('🔧 R&D Report Analyzer loaded. Run analyzer.runAnalysis() to start.');

  // Make analyzer globally available
  window.RNDReportAnalyzer = RNDReportAnalyzer;
}