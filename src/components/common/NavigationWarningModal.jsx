// components/common/NavigationWarningModal.jsx - Professional navigation warning
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
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

export default function NavigationWarningModal({ open, onCancel, onConfirm, action = 'navigate' }) {
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/20 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
              Unsaved Work Warning
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-300 text-base leading-relaxed space-y-4 font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>
            <p>
              You are about to {action === 'cancel' ? 'cancel' : 'leave'} this page. Please be aware:
            </p>
            
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-white">All your work will be permanently deleted:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 ml-2">
                <li>Uploaded files and processing settings</li>
                <li>Preview changes and custom rules</li>
                <li>Any unsaved configurations</li>
              </ul>
            </div>

            <p className="text-amber-300 font-medium">
              <strong>This application does not store any data.</strong> All processing occurs in your browser, and all data is immediately deleted when you navigate away or close the application.
            </p>

            <p className="text-slate-400 text-sm">
              If you have important work, please ensure you have downloaded all processed files before proceeding.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 mt-6">
          <AlertDialogCancel 
            onClick={onCancel}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Stay on Page
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Continue & Lose Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
