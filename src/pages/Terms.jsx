// Terms of Service. When the text changes, update TERMS_VERSION and TERMS_DATE, and tell paid customers 30 days ahead (section 14).
import React from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import PlanLimitsTable from '@/components/subscription/PlanLimitsTable';
import { LIMIT_LABELS } from '@/lib/planLimits';
import RegionalCompliance, { RegionNote } from '@/components/legal/RegionalCompliance';
import { useRegion } from '@/lib/region';
import { COMPANY, companyLine } from '@/lib/company';

export const TERMS_VERSION = '2.0';
export const TERMS_DATE = '3 October 2026';

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">{title}</h2>
      <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Terms() {
  const [region] = useRegion();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">Terms of Service</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Version {TERMS_VERSION} · effective {TERMS_DATE}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-10 space-y-8">
          <Section id="agreement" title="1. The agreement">
            <p>
              These terms are an agreement between you and meldra (&quot;meldra&quot;, &quot;we&quot;, &quot;us&quot;), the company named on your
              invoice or order form, for the use of meldra.ai, its apps, and the meldra API (the &quot;Service&quot;). Our{' '}
              <Link className="text-blue-700 underline" to="/privacy">Privacy Policy</Link> and{' '}
              <Link className="text-blue-700 underline" to="/disclaimer">Disclaimer</Link> form part of these terms.
            </p>
            <p>
              If you use the Service for an organisation (a university, hospital, insurer, company or other body), you confirm you
              may accept these terms for it, and &quot;you&quot; includes that organisation. Where an organisation has signed an order form
              or enterprise agreement with us, that document wins over these terms where they differ.
            </p>
            <p>You must be at least 18, or the age of majority where you live, to create an account.</p>
          </Section>

          <Section id="accounts" title="2. Accounts and security">
            <p>
              Keep your sign-in details and API keys confidential. You are responsible for everything done with your account or keys.
              An account is for one named person: do not share it. A subscription can be signed in on a limited number of devices at once.
              Tell us at once at security@meldra.ai if you think your account has been misused.
            </p>
          </Section>

          <Section id="limits" title="3. Plans, limits and fair use">
            <p>
              Each plan has limits on file size, rows, pages, OCR pages, conversions, AI questions, uploads, files processed at the
              same time and requests per minute. The current figures are below and on your{' '}
              <Link className="text-blue-700 underline" to="/usage">Plan and usage</Link> page. They are enforced automatically.
            </p>
            <PlanLimitsTable keys={Object.keys(LIMIT_LABELS)} region={region} />
            <p>
              To keep the Service fast and available for everyone, we may queue, slow down, or decline requests when they go over a
              limit or when the Service is under heavy load. A declined request is not a breach of these terms by us, and the
              website retries automatically where it can. Monthly allowances reset on the 1st of each month (UTC); unused allowances
              do not roll over.
            </p>
            <p>You must not try to get around limits, including by:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>opening several free accounts for one person or organisation;</li>
              <li>sharing one account or seat between people;</li>
              <li>using scripts, bots or automated access other than the documented meldra API with your own key;</li>
              <li>splitting work to evade per-file limits in a way that overloads the Service.</li>
            </ul>
            <p>
              We may change limits. For paid plans we will give at least 30 days&apos; notice of any reduction during a paid term, and
              a reduction you do not accept lets you cancel and receive a refund of fees paid for the rest of that term. We may change
              Free plan limits at any time.
            </p>
          </Section>

          <Section id="organisations" title="4. Organisation licences">
            <ul className="list-disc ml-6 space-y-1">
              <li>
                A licence gives a number of seats for a fixed term. Each seat is for one named person at a time. Seats can be moved
                to another person, but not shared.
              </li>
              <li>
                Your organisation&apos;s admins add and remove people, and are responsible for removing people who leave. Admins can see
                each member&apos;s usage counts (not file names or contents) and a history of membership changes.
              </li>
              <li>
                If you turn on sign-up by email domain, anyone with a working email address at that domain can take a free seat until all
                seats are used.
              </li>
              <li>
                When a licence ends, members keep access for a grace period (normally 14 days) and then move to their own plan. Data
                that members chose to store in meldra stays available to them under their own plan&apos;s terms.
              </li>
              <li>
                Licences renew only by a new order or invoice. Seats added during a term are charged pro rata for the rest of the term.
              </li>
              <li>Pilots are for evaluation, may have lower limits, and may end on the date in the pilot order.</li>
            </ul>
          </Section>

          <Section id="payment" title="5. Fees and payment">
            <p>
              Fees are shown on the pricing page or in your order form and are payable in advance. Prices exclude taxes such as GST
              or VAT, which we add where required. Invoices are due within 30 days unless your order form says otherwise. If an
              invoice is overdue by more than 30 days after a reminder, we may suspend paid features until it is paid.
            </p>
            <p>
              Except where the law or your order form gives you a right to one, fees are not refundable, and there are no partial
              refunds for unused allowances, seats or time. Consumers in the UK and EU keep their statutory cancellation rights.
              We may change prices for future terms; the price for a term already paid does not change.
            </p>
          </Section>

          <Section id="data" title="6. Your files and data">
            <p>
              You own the files and data you upload. You give us permission to process them only to provide the Service to you.
              Files processed on our servers are held in memory only while the result is produced and are not stored, except for
              data you choose to save (for example in the meldra lakehouse), which you can delete at any time. We do not use your
              files to train AI models.
            </p>
            <p>
              You must have the right to upload the data you use, including any lawful basis needed to process other people&apos;s
              personal data. For organisations, we process personal data in your files as your processor; our data processing
              agreement is available on request from legal@meldra.ai and applies when signed or referenced in an order form.
            </p>
          </Section>

          <Section id="sensitive" title="7. Sensitive and regulated data">
            <p>
              Unless you have a signed agreement with us that covers it, do not upload: patient-identifiable health records or
              clinical data; payment card numbers; government identity numbers in bulk (such as Aadhaar, passport or National
              Insurance numbers); passwords or credentials; or data subject to export controls. The Service is not designed or
              certified for clinical decisions, emergency use, or the safety-critical control of equipment.
            </p>
          </Section>

          <Section id="ai" title="8. AI features">
            <p>
              AI answers, summaries, mappings and extracted data can be incomplete or wrong. Check them before you rely on them.
              AI features use third-party model providers through their business APIs. They receive only the text needed to answer
              the request, and their API terms do not allow them to train their models on it.
            </p>
          </Section>

          <Section id="acceptable-use" title="9. Acceptable use">
            <p>You must not use the Service to:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>break the law, infringe others&apos; rights, or process data you have no right to process;</li>
              <li>upload malware, or files designed to crash or overload the Service;</li>
              <li>test, probe or attack our security, or interfere with other customers;</li>
              <li>copy, resell or build a competing service from the Service, except through the API as permitted;</li>
              <li>reverse engineer the Service except where the law allows it.</li>
            </ul>
          </Section>

          <Section id="availability" title="10. Availability and support">
            <p>
              We aim for high availability but do not guarantee uninterrupted service on Free, Pro or Team plans. Planned maintenance
              is announced in advance where possible. Service levels, uptime commitments and service credits apply only where set out
              in an order form or enterprise agreement, and service credits are then the sole remedy for missing them.
            </p>
          </Section>

          <Section id="suspension" title="11. Suspension and termination">
            <p>
              We may suspend or restrict access immediately where needed to protect the Service, other customers or the law, for
              example during abuse, an attack or overload, and will restore it once the cause is resolved. For other breaches of
              these terms, we will tell you and give you a reasonable time to fix the breach where it can be fixed. You can stop using
              the Service and delete your account at any time from Settings.
            </p>
          </Section>

          <Section id="liability" title="12. Liability">
            <p>
              Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything
              else that cannot be limited by law, or your statutory rights as a consumer.
            </p>
            <p>
              Subject to that, neither party is liable for loss of profit, revenue, business, goodwill or data, or for indirect or
              consequential loss. Our total liability arising from the Service in any 12 months is limited to the fees you paid us
              in those 12 months, or £100 if you use the Service free of charge. You are responsible for keeping your own copies of
              your files and results.
            </p>
          </Section>

          <Section id="your-region" title="13. Your region">
            <p>
              Prices, tax and the rights below depend on where you are. We work out your region from your location when you visit; prices and plans are offered only for that region.
              Nothing in these terms takes away rights your local law gives you.
            </p>
            <RegionNote region={region} />
            <RegionalCompliance region={region} />
          </Section>

          <Section id="general" title="14. General">
            <p>
              We may update these terms. We will give at least 30 days&apos; notice of material changes by email or in the app; the
              change applies to paid plans from the next renewal unless it is needed for legal or security reasons. Continuing to
              use the Service after a change takes effect means you accept it.
            </p>
            <p>
              These terms are governed by the laws of England and Wales, and the courts of England and Wales have exclusive
              jurisdiction, unless your order form states otherwise. If any part of these terms is unenforceable, the rest still
              applies. Questions: {COMPANY.legalEmail}.
              {companyLine() ? ` The Service is provided by ${companyLine()}.` : ''}
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
