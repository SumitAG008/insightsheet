// components/common/LogoutWarningModal.jsx - Professional logout warning
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n';

export default function LogoutWarningModal({ open, onCancel, onConfirm }) {
  const { t } = useI18n();
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/20 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
              {t('logout_notice_title')}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-300 text-base leading-relaxed space-y-4 font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>
            <p>
              {t('logout_notice_intro')}
            </p>
            
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-white">{t('logout_notice_list_title')}</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 ml-2">
                <li>{t('logout_notice_item_db_connections')}</li>
                <li>{t('logout_notice_item_query_results')}</li>
                <li>{t('logout_notice_item_uploaded_files')}</li>
                <li>{t('logout_notice_item_charts')}</li>
                <li>{t('logout_notice_item_unsaved_work')}</li>
              </ul>
            </div>

            <p className="text-amber-300 font-medium">
              <strong>{t('logout_notice_irreversible_strong')}</strong> {t('logout_notice_irreversible_body')}
            </p>

            <p className="text-slate-400 text-sm">
              {t('logout_notice_reminder')}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 mt-6">
          <AlertDialogCancel 
            onClick={onCancel}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            {t('common_cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {t('logout_notice_confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
