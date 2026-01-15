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

export default function LogoutWarningModal({ open, onCancel, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/20 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
              Important: Data Deletion Notice
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-300 text-base leading-relaxed space-y-4 font-light" style={{ letterSpacing: '-0.01em', lineHeight: '1.7' }}>
            <p>
              You are about to log out or close the application. Please be aware of the following:
            </p>
            
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-white">All session data will be permanently deleted:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 ml-2">
                <li>Database connections and credentials</li>
                <li>Query results and executed queries</li>
                <li>Uploaded files and processed data</li>
                <li>Chart configurations and visualizations</li>
                <li>Any unsaved work or temporary data</li>
              </ul>
            </div>

            <p className="text-amber-300 font-medium">
              <strong>This action cannot be undone.</strong> All data will be immediately and permanently removed from your browser session. 
              No data is stored on our servers, so recovery is not possible.
            </p>

            <p className="text-slate-400 text-sm">
              If you have important work, please ensure you have downloaded or exported all necessary files and data before proceeding.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 mt-6">
          <AlertDialogCancel 
            onClick={onCancel}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            I Understand - Log Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
