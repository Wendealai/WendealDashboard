/**
 * R&D Report Content Analysis Tool
 * Deep analysis of content processing inconsistencies
 */

class RNDContentAnalyzer {
  constructor() {
    this.issues = [];
    this.analysisResults = {};
  }

  /**
   * Analyze content processing pipeline
   */
  async analyzeContentProcessing() {
    console.log('🔍 Analyzing content processing pipeline...');

    const analysis = {
      contentProcessing: await this.analyzeContentProcessingLogic(),
      cachingBehavior: await this.analyzeCachingBehavior(),
      hashConsistency: await this.analyzeHashConsistency(),
      processingVariations: await this.analyzeProcessingVariations()
    };

    return analysis;
  }

  /**
   * Analyze content processing logic for inconsistencies
   */
  async analyzeContentProcessingLogic() {
    console.log('🔧 Analyzing content processing logic...');

    const testCases = [
      {
        name: 'Simple HTML',
        content: '<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>'
      },
      {
        name: 'HTML without body',
        content: '<html><head><title>Test</title></head><h1>Hello</h1></html>'
      },
      {
        name: 'HTML fragment',
        content: '<h1>Hello</h1><p>World</p>'
      },
      {
        name: 'HTML with encoding issues',
        content: '<html><body><h1>Test �</h1><p>Content with ��� errors</p></body></html>'
      },
      {
        name: 'HTML with scripts',
        content: '<html><head><title>Test</title><script>console.log("test");</script></head><body><h1>Hello</h1></body></html>'
      }
    ];

    const results = {};

    for (const testCase of testCases) {
      console.log(`📄 Testing: ${testCase.name}`);

      const iterations = 5;
      const processedResults = [];

      for (let i = 0; i < iterations; i++) {
        const result = await this.simulateContentProcessing(testCase.content, testCase.name);
        processedResults.push(result);
      }

      // Check consistency
      const allIdentical = processedResults.every(result => result === processedResults[0]);
      const hashVariations = [...new Set(processedResults.map(r => this.simpleHash(r)))];

      results[testCase.name] = {
        consistent: allIdentical,
        hashVariations: hashVariations.length,
        sampleOutput: processedResults[0],
        outputLength: processedResults[0].length,
        variations: hashVariations.length > 1 ? 'Hash variations detected' : 'Consistent'
      };

      console.log(`  - Consistent: ${allIdentical}`);
      console.log(`  - Hash variations: ${hashVariations.length}`);
    }

    return results;
  }

  /**
   * Analyze caching behavior
   */
  async analyzeCachingBehavior() {
    console.log('💾 Analyzing caching behavior...');

    const mockReport = {
      id: 'cache-analysis-test',
      name: 'Cache Analysis Test'
    };

    // Clear any existing cache
    localStorage.removeItem(`rnd-report-content-${mockReport.id}`);
    localStorage.removeItem(`rnd-report-processed-${mockReport.id}`);
    localStorage.removeItem(`rnd-report-hash-${mockReport.id}`);
    localStorage.removeItem(`rnd-report-cache-metadata-${mockReport.id}`);

    const testContent = '<html><head><title>Cache Test</title></head><body><h1>Content</h1></body></html>';
    localStorage.setItem(`rnd-report-content-${mockReport.id}`, testContent);

    const results = {
      cacheHits: 0,
      cacheMisses: 0,
      processingTimes: [],
      cacheEffectiveness: 0
    };

    // Test multiple loads
    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      // Simulate the caching logic from ReportViewer
      const content = localStorage.getItem(`rnd-report-content-${mockReport.id}`);
      const contentHash = await this.generateContentHash(content);
      const storedHash = localStorage.getItem(`rnd-report-hash-${mockReport.id}`);

      const cacheKey = `rnd-report-processed-${mockReport.id}`;
      const cachedContent = localStorage.getItem(cacheKey);
      const cacheMetadataKey = `rnd-report-cache-metadata-${mockReport.id}`;
      const cacheMetadata = JSON.parse(localStorage.getItem(cacheMetadataKey) || '{}');

      const needsReprocessing = !cachedContent ||
                               (storedHash && storedHash !== contentHash) ||
                               !cacheMetadata.processedAt ||
                               !cacheMetadata.processingVersion ||
                               cacheMetadata.processingVersion !== '2.0' ||
                               (Date.now() - cacheMetadata.processedAt > 24 * 60 * 60 * 1000);

      if (needsReprocessing) {
        results.cacheMisses++;
        const processedContent = await this.simulateContentProcessing(content, mockReport.name);
        localStorage.setItem(cacheKey, processedContent);

        const metadata = {
          processedAt: Date.now(),
          contentHash,
          processingVersion: '2.0'
        };
        localStorage.setItem(cacheMetadataKey, JSON.stringify(metadata));
      } else {
        results.cacheHits++;
      }

      const endTime = performance.now();
      results.processingTimes.push(endTime - startTime);
    }

    results.cacheEffectiveness = (results.cacheHits / iterations) * 100;

    return results;
  }

  /**
   * Analyze hash consistency
   */
  async analyzeHashConsistency() {
    console.log('🔐 Analyzing hash consistency...');

    const testContent = '<html><head><title>Hash Test</title></head><body><h1>Content</h1></body></html>';
    const results = {
      hashIterations: [],
      consistent: true,
      variations: 0
    };

    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      const hash = await this.generateContentHash(testContent);
      results.hashIterations.push(hash);

      if (i > 0 && hash !== results.hashIterations[0]) {
        results.consistent = false;
        results.variations++;
      }
    }

    return results;
  }

  /**
   * Analyze processing variations
   */
  async analyzeProcessingVariations() {
    console.log('🔄 Analyzing processing variations...');

    const baseContent = '<html><head><title>Variation Test</title></head><body><h1>Content</h1></body></html>';
    const variations = {
      'Base content': baseContent,
      'With DOCTYPE': '<!DOCTYPE html>' + baseContent,
      'With meta tag': baseContent.replace('<head>', '<head><meta charset="UTF-8">'),
      'With extra whitespace': baseContent.replace('<body>', '<body>\n    '),
      'With comments': baseContent.replace('<body>', '<body><!-- comment -->')
    };

    const results = {};

    for (const [variationName, content] of Object.entries(variations)) {
      console.log(`📝 Testing variation: ${variationName}`);

      const processedResults = [];
      const iterations = 3;

      for (let i = 0; i < iterations; i++) {
        const result = await this.simulateContentProcessing(content, variationName);
        processedResults.push(result);
      }

      const allIdentical = processedResults.every(result => result === processedResults[0]);

      results[variationName] = {
        consistent: allIdentical,
        outputLength: processedResults[0].length,
        sampleOutput: processedResults[0]
      };
    }

    return results;
  }

  /**
   * Simulate content processing (simplified version of actual logic)
   */
  async simulateContentProcessing(content, reportName) {
    // Step 1: Clean encoding errors
    let processedContent = content.replace(/�+/g, '');

    // Step 2: Check for very short content
    if (processedContent.length < 50) {
      processedContent = `<html><head><title>${reportName}</title></head><body><div style="padding: 20px; color: #666; text-align: center;">Content appears to be corrupted or too short.</div></body></html>`;
    }

    // Step 3: Basic HTML structure validation and fixing
    const hasHtmlTag = processedContent.includes('<html') || processedContent.includes('<HTML');
    const hasHeadTag = processedContent.includes('<head') || processedContent.includes('<HEAD');
    const hasBodyTag = processedContent.includes('<body') || processedContent.includes('<BODY');

    if (!hasHtmlTag) {
      processedContent = `<html><head><title>${reportName}</title></head><body>${processedContent}</body></html>`;
    } else if (!hasBodyTag) {
      processedContent = processedContent
        .replace('</head>', '</head><body>')
        .replace('</html>', '</body></html>');
    }

    // Step 4: Add consistent styling wrapper
    const baseStyles = `
      <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background: white; color: #333; }
        body { min-height: 100px; }
        [style*="display: none"] { display: block !important; }
        [style*="visibility: hidden"] { visibility: visible !important; }
        [style*="opacity: 0"] { opacity: 1 !important; }
        [style*="position: fixed"][style*="top: -9999px"], [style*="position: absolute"][style*="left: -9999px"] { position: static !important; }
        [style*="margin-left: -9999px"], [style*="margin-top: -9999px"] { margin: 0 !important; }
        img { max-width: 100%; height: auto; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        [hidden] { display: block !important; }
      </style>
    `;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${reportName}</title>
          ${baseStyles}
        </head>
        <body>
          ${processedContent}
        </body>
      </html>
    `;

    return fullHtml;
  }

  /**
   * Generate content hash
   */
  async generateContentHash(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  /**
   * Simple hash for comparison
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Generate comprehensive report
   */
  generateReport(analysis) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(analysis),
      recommendations: this.generateRecommendations(analysis),
      detailedAnalysis: analysis
    };

    return report;
  }

  /**
   * Generate summary
   */
  generateSummary(analysis) {
    const contentProcessing = analysis.contentProcessing;
    const caching = analysis.cachingBehavior;
    const hashConsistency = analysis.hashConsistency;
    const processingVariations = analysis.processingVariations;

    const totalTests = Object.keys(contentProcessing).length;
    const consistentTests = Object.values(contentProcessing).filter(r => r.consistent).length;
    const cacheEffectiveness = caching.cacheEffectiveness;

    return {
      overallScore: ((consistentTests / totalTests) * 50) + (cacheEffectiveness * 0.3) + (hashConsistency.consistent ? 20 : 0),
      contentConsistency: `${consistentTests}/${totalTests} tests consistent`,
      cacheEffectiveness: `${cacheEffectiveness.toFixed(1)}%`,
      hashConsistency: hashConsistency.consistent ? 'Consistent' : 'Inconsistent',
      processingVariations: Object.values(processingVariations).filter(r => !r.consistent).length > 0 ? 'Variations detected' : 'No variations'
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    const contentProcessing = analysis.contentProcessing;
    const inconsistentTests = Object.entries(contentProcessing).filter(([_, result]) => !result.consistent);

    if (inconsistentTests.length > 0) {
      recommendations.push({
        type: 'critical',
        title: 'Content Processing Inconsistency',
        description: `Found ${inconsistentTests.length} test cases with inconsistent processing results`,
        action: 'Review and standardize content processing logic'
      });
    }

    const caching = analysis.cachingBehavior;
    if (caching.cacheEffectiveness < 80) {
      recommendations.push({
        type: 'warning',
        title: 'Cache Effectiveness Low',
        description: `Cache effectiveness is only ${caching.cacheEffectiveness.toFixed(1)}%`,
        action: 'Optimize caching strategy and increase cache hit rate'
      });
    }

    const hashConsistency = analysis.hashConsistency;
    if (!hashConsistency.consistent) {
      recommendations.push({
        type: 'critical',
        title: 'Hash Generation Inconsistency',
        description: 'Content hash generation is not consistent across iterations',
        action: 'Fix hash generation algorithm to ensure deterministic results'
      });
    }

    const processingVariations = analysis.processingVariations;
    const variationIssues = Object.entries(processingVariations).filter(([_, result]) => !result.consistent);

    if (variationIssues.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Processing Variations Detected',
        description: `Found ${variationIssues.length} content variations that produce different results`,
        action: 'Standardize processing for different content types'
      });
    }

    return recommendations;
  }

  /**
   * Run complete analysis
   */
  async runAnalysis() {
    console.log('🚀 Starting comprehensive R&D content analysis...');

    try {
      const analysis = await this.analyzeContentProcessing();
      const report = this.generateReport(analysis);

      console.log('✅ Analysis completed successfully');
      console.log('📊 Summary:', report.summary);

      return report;
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
  console.log('🔧 R&D Content Analyzer loaded. Run analyzer.runAnalysis() to start.');

  // Make globally available
  window.RNDContentAnalyzer = RNDContentAnalyzer;
}