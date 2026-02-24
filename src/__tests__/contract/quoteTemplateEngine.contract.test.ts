import {
  SPARKERY_QUOTE_TEMPLATE_ENGINE_VERSION,
  renderTemplateBundle,
} from '@/pages/Sparkery/quoteCalculator/templateEngine';

describe('quote template engine contracts', () => {
  it('renders single-language bundle when language is en or cn', () => {
    const renderSingleLanguage = (language: 'en' | 'cn'): string =>
      language === 'en' ? 'EN_DOC' : 'CN_DOC';

    expect(
      renderTemplateBundle({
        language: 'en',
        renderSingleLanguage,
      })
    ).toBe('EN_DOC');
    expect(
      renderTemplateBundle({
        language: 'cn',
        renderSingleLanguage,
      })
    ).toBe('CN_DOC');
  });

  it('renders bilingual bundle with deterministic page break order', () => {
    const bundle = renderTemplateBundle({
      language: 'both',
      renderSingleLanguage: (language: 'en' | 'cn') =>
        language === 'cn' ? '<section>CN</section>' : '<section>EN</section>',
    });

    expect(bundle).toContain('<section>CN</section>');
    expect(bundle).toContain('<section>EN</section>');
    expect(bundle.indexOf('<section>CN</section>')).toBeLessThan(
      bundle.indexOf('<section>EN</section>')
    );
    expect(bundle).toContain('<div class="sparkery-page-break"></div>');
  });

  it('exposes a version identifier for template rollout tracking', () => {
    expect(SPARKERY_QUOTE_TEMPLATE_ENGINE_VERSION).toMatch(
      /^\d{4}\.\d{2}\.v\d+$/
    );
  });
});
