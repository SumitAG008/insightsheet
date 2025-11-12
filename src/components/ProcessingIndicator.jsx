/**
 * Processing Indicator Component
 *
 * Shows users which processing method is being used and why
 * Helps users understand the value of Pro/Enterprise tiers
 */

import React from 'react';
import { Server, Monitor, Zap, Lock, AlertCircle, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export function ProcessingMethodBadge({ method, fileSize }) {
  if (method === 'backend') {
    return (
      <Badge className="bg-blue-600 flex items-center gap-1">
        <Server className="w-3 h-3" />
        <span>Backend Processing</span>
        <Zap className="w-3 h-3" />
      </Badge>
    );
  }

  return (
    <Badge className="bg-emerald-600 flex items-center gap-1">
      <Monitor className="w-3 h-3" />
      <span>Browser Processing</span>
      <Lock className="w-3 h-3" />
    </Badge>
  );
}

export function ProcessingAlert({ message, method }) {
  const Icon = method === 'backend' ? Server : Lock;
  const colorClasses = method === 'backend'
    ? 'bg-blue-900/20 border-blue-500/30'
    : 'bg-emerald-900/20 border-emerald-500/30';

  const iconColor = method === 'backend' ? 'text-blue-400' : 'text-emerald-400';
  const textColor = method === 'backend' ? 'text-blue-200' : 'text-emerald-200';

  return (
    <Alert className={`${colorClasses} mb-4`}>
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <AlertDescription className={textColor}>
        <div>
          <strong>{message.icon} {message.title}</strong>
          <p className="text-sm mt-1">{message.message}</p>
          {message.note && (
            <p className="text-xs mt-2 opacity-80">{message.note}</p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function UpgradePrompt({ upgradeMessage, currentTier }) {
  const navigate = useNavigate();

  if (!upgradeMessage) return null;

  return (
    <Alert className="bg-purple-900/20 border-purple-500/30 mb-4">
      <Crown className="w-4 h-4 text-purple-400" />
      <AlertDescription className="text-purple-200">
        <div>
          <div className="flex items-center justify-between mb-2">
            <strong className="text-lg">{upgradeMessage.title}</strong>
            <Badge variant="outline" className="border-purple-400 text-purple-300">
              Current: {currentTier}
            </Badge>
          </div>

          <p className="text-sm mb-3">{upgradeMessage.message}</p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {upgradeMessage.features.map((feature, idx) => (
              <div key={idx} className="text-xs text-purple-100">
                {feature}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(createPageUrl('Pricing'))}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {upgradeMessage.ctaText}
            </Button>
            <span className="text-sm text-purple-300">
              Starting at {upgradeMessage.price}
            </span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function FileSizeWarning({ fileSize, limit, tier }) {
  const sizeMB = (fileSize / 1024 / 1024).toFixed(2);
  const limitMB = (limit / 1024 / 1024).toFixed(0);
  const percentage = (fileSize / limit) * 100;

  const colorClass = percentage > 90
    ? 'bg-red-900/20 border-red-500/30'
    : percentage > 70
    ? 'bg-amber-900/20 border-amber-500/30'
    : 'bg-blue-900/20 border-blue-500/30';

  const iconColor = percentage > 90
    ? 'text-red-400'
    : percentage > 70
    ? 'text-amber-400'
    : 'text-blue-400';

  const textColor = percentage > 90
    ? 'text-red-200'
    : percentage > 70
    ? 'text-amber-200'
    : 'text-blue-200';

  return (
    <Alert className={colorClass}>
      <AlertCircle className={`w-4 h-4 ${iconColor}`} />
      <AlertDescription className={textColor}>
        <div className="flex items-center justify-between">
          <div>
            <strong>File Size: {sizeMB} MB</strong>
            <p className="text-sm">
              {tier.toUpperCase()} tier limit: {limitMB} MB ({percentage.toFixed(0)}% used)
            </p>
          </div>
          {percentage > 90 && (
            <Badge variant="outline" className="border-red-400 text-red-300">
              Near Limit
            </Badge>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function ProcessingComparison() {
  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-6 mb-6">
      <h3 className="text-xl font-bold text-purple-200 mb-4">
        Processing Methods Comparison
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Browser Processing */}
        <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-6 h-6 text-emerald-400" />
            <h4 className="font-bold text-emerald-200">Browser Processing</h4>
          </div>

          <div className="space-y-2 text-sm text-emerald-100">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>100% private - data never leaves your device</span>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Instant - no network latency</span>
            </div>
            <div className="flex items-start gap-2">
              <Monitor className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Works offline after page load</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-500/30">
            <p className="text-xs text-emerald-300">
              <strong>Best for:</strong> Files up to 5MB, privacy-conscious users
            </p>
          </div>
        </div>

        {/* Backend Processing */}
        <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-6 h-6 text-blue-400" />
            <h4 className="font-bold text-blue-200">Backend Processing</h4>
            <Badge className="bg-purple-600 text-xs">Pro/Enterprise</Badge>
          </div>

          <div className="space-y-2 text-sm text-blue-100">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Much faster for large files (50MB+)</span>
            </div>
            <div className="flex items-start gap-2">
              <Server className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Handles millions of rows efficiently</span>
            </div>
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Processed in memory only, immediately deleted</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-500/30">
            <p className="text-xs text-blue-300">
              <strong>Best for:</strong> Large files (5MB-500MB), complex operations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
