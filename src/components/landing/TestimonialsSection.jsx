import React from 'react';
import { ShieldCheck, Star, Award, Zap, CheckCircle2 } from 'lucide-react';

const testimonials = [
  {
    quote: "InsightSheet cut our monthly P&L deck preparation time from 8 hours down to 5 seconds. The fact that it processes files strictly in-memory without saving client data gave our CISO total peace of mind.",
    author: "David Miller, CPA",
    title: "Partner & Head of Audit",
    company: "Apex Accounting Advisory",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    metrics: "Saved 30+ hrs/month"
  },
  {
    quote: "As an ESG consultant, converting complex Scope 1-3 carbon metrics into client PowerPoint slides was always a bottleneck. InsightSheet automates the visual charts instantly while guaranteeing zero file retention.",
    author: "Elena Rostova",
    title: "Senior ESG Director",
    company: "GreenSphere Global",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    metrics: "5x Faster Reports"
  },
  {
    quote: "The Zero File Storage architecture is a game changer for FP&A teams. We get the intelligence of generative AI without exposing sensitive board metrics or valuation models to third-party databases.",
    author: "Marcus Vance",
    title: "VP of Financial Planning",
    company: "Vanguard Tech Solutions",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    metrics: "100% CISO Approved"
  }
];

const trustBadges = [
  { title: "Zero File Retention", desc: "Files processed 100% in-memory (RAM) and deleted immediately", icon: ShieldCheck },
  { title: "SOC 2 & GDPR Ready", desc: "Built to adhere to global enterprise security standards", icon: Award },
  { title: "5-Second Execution", desc: "Lightning fast processing of 10,000+ row datasets", icon: Zap },
  { title: "Zero AI Model Training", desc: "Your financial numbers are never logged or trained on", icon: CheckCircle2 }
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-slate-950 text-white relative overflow-hidden">
      {/* Background Subtle Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Trusted by Enterprise Finance & Advisory Leaders
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Loved by Analysts. Approved by CISOs.
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            See how top accounting firms, FP&A directors, and ESG agencies use InsightSheet to automate board presentations without compromising data privacy.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 transition-all duration-300 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-xl shadow-xl hover:shadow-blue-500/5 group"
            >
              <div>
                {/* Rating & Metric Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    {item.metrics}
                  </span>
                </div>

                {/* Quote */}
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">
                  "{item.quote}"
                </p>
              </div>

              {/* Author Footer */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-800/80">
                <img
                  src={item.avatar}
                  alt={item.author}
                  className="w-11 h-11 rounded-full object-cover border border-blue-500/30"
                />
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                    {item.author}
                  </h4>
                  <p className="text-xs text-slate-400">{item.title}</p>
                  <p className="text-xs text-blue-400/80 font-medium">{item.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise Trust Badges Grid */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustBadges.map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <div key={idx} className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white mb-1">{badge.title}</h5>
                    <p className="text-xs text-slate-400 leading-snug">{badge.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
