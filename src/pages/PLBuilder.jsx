import { useState, useEffect } from 'react';
import { backendApi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, Sparkles, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

export default function PLBuilder() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [llmAssistHeadersOnly, setLlmAssistHeadersOnly] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [context, setContext] = useState({
    company_name: '',
    currency: 'USD',
    period_type: 'monthly',
  });

  const examplePrompts = [
    t('pl_builder_example_prompt_1'),
    t('pl_builder_example_prompt_2'),
    t('pl_builder_example_prompt_3'),
    t('pl_builder_example_prompt_4'),
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(t('pl_builder_toast_enter_description'));
      return;
    }

    if (!backendConnected) {
      const msg = backendError || t('pl_builder_backend_not_connected');
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const blob = file
        ? await backendApi.files.generatePLWithFile(prompt, context, file, {
            timeoutMs: 120000,
            llmAssistHeadersOnly,
            candidateId: selectedCandidateId || preview?.candidate_id || undefined,
          })
        : await backendApi.files.generatePL(prompt, context);

      if (!blob || typeof blob.size !== 'number' || blob.size <= 0) {
        throw new Error(t('pl_builder_err_empty_file'));
      }

      const ct = String(blob.type || '').toLowerCase();
      const isExcel = ct.includes('spreadsheetml') || ct.includes('ms-excel') || ct === 'application/octet-stream' || ct === '';
      if (!isExcel) {
        throw new Error(t('pl_builder_err_not_excel'));
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Profit_Loss_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(t('pl_builder_toast_generated_downloaded'));
      setPrompt('');
      setFile(null);
      setPreview(null);
      setPreviewError(null);
      setSelectedCandidateId('');
    } catch (err) {
      const msg = err?.message ? String(err.message) : t('pl_builder_err_generate_failed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);

    try {
      const res = await backendApi.files.plExtractionPreview(file, { timeoutMs: 60000 });
      setPreview(res);
      if (res?.ok) {
        setSelectedCandidateId(res.candidate_id || '');
      }
      if (!res?.ok) {
        setPreviewError(res?.message || t('pl_builder_preview_not_detected'));
      }
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExampleClick = (example) => {
    setPrompt(example);
  };

  // Check backend connection
  const [backendConnected, setBackendConnected] = useState(true);
  const [backendError, setBackendError] = useState(null);

  useEffect(() => {
    // Check if backend is reachable
    const checkBackend = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8001' : '');
        if (!API_URL) {
          throw new Error('API URL not configured');
        }
        const response = await fetch(`${API_URL}/api/health`, { method: 'GET' });
        if (!response.ok) throw new Error('Backend not responding');
        setBackendConnected(true);
        setBackendError(null);
      } catch (err) {
        setBackendConnected(false);
        setBackendError(t('file_analyzer_err_backend_not_connected'));
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    handlePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('pl_builder_title')}</h1>
        <p className="text-muted-foreground">
          {t('pl_builder_subtitle')}
        </p>
      </div>

      {!backendConnected && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('common_backend_connection_required')}</strong> {backendError || t('common_backend_server_not_reachable')}
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('pl_builder_describe_title')}
          </CardTitle>
          <CardDescription>
            {t('pl_builder_describe_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prompt">{t('pl_builder_prompt_label')}</Label>
            <Textarea
              id="prompt"
              placeholder={t('pl_builder_prompt_placeholder')}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="pl-file">{t('pl_builder_attach_optional')}</Label>
            <input
              id="pl-file"
              type="file"
              accept=".docx,.xlsx,.xls,.pptx,.md,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full mt-2 text-foreground file:text-foreground file:bg-transparent file:border-0"
              disabled={loading}
            />
            {file && (
              <div className="text-xs text-muted-foreground mt-1">
                {t('pl_builder_attached')} {file.name}
              </div>
            )}
          </div>

          {file && (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="llm-headers-only"
                  checked={llmAssistHeadersOnly}
                  onCheckedChange={(v) => setLlmAssistHeadersOnly(Boolean(v))}
                  disabled={loading}
                />
                <div className="space-y-1">
                  <Label htmlFor="llm-headers-only">{t('pl_builder_ai_assist_headers_only')}</Label>
                  <div className="text-xs text-muted-foreground">
                    {t('pl_builder_ai_assist_headers_only_desc')}
                  </div>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{t('pl_builder_extraction_preview')}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={previewLoading || loading}
                  >
                    {previewLoading ? t('common_analyzing') : t('pl_builder_refresh_preview')}
                  </Button>
                </div>

                {previewError && (
                  <div className="mt-2 text-sm text-destructive">{previewError}</div>
                )}

                {preview?.ok && (
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    {Array.isArray(preview.candidates) && preview.candidates.length > 1 && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">{t('pl_builder_choose_detected_statement')}</div>
                        <Select
                          value={selectedCandidateId}
                          onValueChange={(v) => setSelectedCandidateId(v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t('pl_builder_select_candidate')} />
                          </SelectTrigger>
                          <SelectContent>
                            {preview.candidates.map((c) => (
                              <SelectItem key={c.candidate_id} value={String(c.candidate_id)}>
                                {String(c.sheet || 'Sheet')} · {String(c.layout || 'layout')} · {c.period_count}p · {c.line_item_count} items
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>{t('pl_builder_periods_detected', { count: preview.period_count })}</div>
                    <div>{t('pl_builder_line_items_detected', { count: preview.line_item_count })}</div>
                    <div>{t('pl_builder_nonzero_cells', { count: preview.nonzero_cells })}</div>
                    {typeof preview.confidence === 'number' && (
                      <div>{t('pl_builder_confidence_pct', { pct: Math.round(preview.confidence * 100) })}</div>
                    )}
                    {preview.recommendation && (
                      <div>{t('pl_builder_recommendation')}: {String(preview.recommendation)}</div>
                    )}
                    {Array.isArray(preview.reasons) && preview.reasons.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {preview.reasons[0]}
                      </div>
                    )}
                    {Array.isArray(preview.warnings) && preview.warnings.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {preview.warnings[0]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="company">{t('pl_builder_company_name_optional')}</Label>
              <Input
                id="company"
                type="text"
                value={context.company_name}
                onChange={(e) => setContext({ ...context, company_name: e.target.value })}
                placeholder={t('pl_builder_company_placeholder')}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="currency">{t('pl_builder_currency')}</Label>
              <Select
                value={context.currency}
                onValueChange={(v) => setContext({ ...context, currency: v })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t('pl_builder_select_currency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="period">{t('pl_builder_period_type')}</Label>
              <Select
                value={context.period_type}
                onValueChange={(v) => setContext({ ...context, period_type: v })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t('pl_builder_select_period')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t('pl_builder_period_monthly')}</SelectItem>
                  <SelectItem value="quarterly">{t('pl_builder_period_quarterly')}</SelectItem>
                  <SelectItem value="yearly">{t('pl_builder_period_yearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('pl_builder_generating')}
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {t('pl_builder_generate')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('pl_builder_example_prompts_title')}</CardTitle>
          <CardDescription>
            {t('pl_builder_example_prompts_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="w-full text-left p-3 border rounded-md hover:bg-accent transition-colors text-foreground"
              >
                <p className="text-sm">{example}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('pl_builder_what_you_get')}</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>{t('pl_builder_benefit_1')}</li>
                <li>{t('pl_builder_benefit_2')}</li>
                <li>{t('pl_builder_benefit_3')}</li>
                <li>{t('pl_builder_benefit_4')}</li>
                <li>{t('pl_builder_benefit_5')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
