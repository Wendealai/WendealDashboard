export type QuoteTemplateLanguage = 'en' | 'cn' | 'both';
export type QuoteTemplateSingleLanguage = 'en' | 'cn';
export type QuoteCustomDocumentType = 'receipt' | 'quote';

export const SPARKERY_QUOTE_TEMPLATE_ENGINE_VERSION = '2026.02.v1';

interface RenderTemplateBundleOptions {
  language: QuoteTemplateLanguage;
  renderSingleLanguage: (language: QuoteTemplateSingleLanguage) => string;
}

export const renderTemplateBundle = ({
  language,
  renderSingleLanguage,
}: RenderTemplateBundleOptions): string => {
  if (language === 'both') {
    return [
      renderSingleLanguage('cn'),
      '<div class="sparkery-page-break"></div>',
      renderSingleLanguage('en'),
    ].join('');
  }

  if (language === 'cn') {
    return renderSingleLanguage('cn');
  }

  return renderSingleLanguage('en');
};
