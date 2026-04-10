import React from 'react';

export default function SupplierRiskDueDiligence() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Supplier Risk &amp; Due Diligence</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Supplier screening, ESG scorecards, evidence collection, remediation workflows, and assurance-ready exports.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">What you’ll manage here</h2>
          <ul className="mt-3 list-disc pl-5 text-slate-700 dark:text-slate-200 space-y-1">
            <li>Supplier registry and tiering</li>
            <li>Risk screening (country/sector, allegations, sanctions)</li>
            <li>Supplier questionnaires and evidence vault</li>
            <li>Corrective action plans and remediation tracking</li>
            <li>Regulatory reporting packs (LkSG / CSDDD)</li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Next build steps</h2>
          <ol className="mt-3 list-decimal pl-5 text-slate-700 dark:text-slate-200 space-y-1">
            <li>Define supplier data model + API endpoints</li>
            <li>Add evidence linking UI and task workflows</li>
            <li>Add screening integrations and scheduled refresh</li>
            <li>Build exports for assurance and regulatory reporting</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
