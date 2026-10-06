import React, { useMemo, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { backendApi, meldraAi } from '@/api/meldraClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';

export default function SupportChatWidget({ page, className }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  const normalizeAssistantText = (text) => {
    const raw = String(text || '');
    return raw
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z0-9_-]*\n?/, '').replace(/```\s*$/, ''))
      .replace(/^\s*>\s?/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const isAuthed = useMemo(() => {
    try {
      return !!meldraAi?.auth?.isAuthenticated?.();
    } catch {
      return false;
    }
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const pageCtx = page || window?.location?.pathname || '';
      const res = file
        ? await backendApi.support.chatWithFile(text, file, { page: pageCtx })
        : await backendApi.support.chat(text, { page: pageCtx });
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: normalizeAssistantText(res?.answer || t('support_chat_no_response')) },
      ]);
      setFile(null);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: normalizeAssistantText(e?.message || t('support_chat_failed')) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={className || ''}>
      <div className="support-chat-anchor fixed bottom-6 right-6 z-[60]">
        {open && (
          <div className="mb-4 w-[360px] max-w-[calc(100vw-3rem)] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('support_chat_title')}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                aria-label={t('common_close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isAuthed ? (
              <div className="p-4">
                <div className="text-sm text-slate-700 dark:text-slate-200 font-medium">{t('support_chat_sign_in_required')}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('support_chat_please_log_in')}</div>
                <div className="mt-3">
                  <Button onClick={() => meldraAi?.auth?.redirectToLogin?.()} className="w-full bg-blue-600 hover:bg-blue-700">
                    {t('support_chat_go_to_login')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {t('support_chat_helper_text')}
                </div>

                <div className="px-4 pb-3 max-h-[280px] overflow-auto space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {t('support_chat_empty_prompt')}
                    </div>
                  ) : (
                    messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={
                          m.role === 'user'
                            ? 'ml-auto max-w-[85%] rounded-2xl bg-blue-600 text-white px-3 py-2 text-sm whitespace-pre-wrap'
                            : 'mr-auto max-w-[85%] rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm whitespace-pre-wrap'
                        }
                      >
                        {m.content}
                      </div>
                    ))
                  )}

                  {loading && (
                    <div className="mr-auto max-w-[85%] rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('support_chat_thinking')}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 p-3">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('support_chat_placeholder')}
                    className="min-h-[70px] bg-white dark:bg-slate-900"
                    disabled={loading}
                  />
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".docx,.xlsx,.xls,.pptx,.md,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs"
                      disabled={loading}
                    />
                    {file && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t('common_attached')}: {file.name}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button onClick={handleSend} disabled={loading || !input.trim()} className="bg-blue-600 hover:bg-blue-700">
                      <Send className="w-4 h-4 mr-2" />
                      {t('common_send')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center"
          aria-label={open ? t('support_chat_aria_close') : t('support_chat_aria_open')}
        >
          {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
