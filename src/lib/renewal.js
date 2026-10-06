// What to tell someone about their organisation's licence renewal. `org` is the organisation summary
// from /api/org/me (renewal_stage: d90, d60, d30, d7, grace or expired; null once renewed).

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
};

export function renewalNotice(org, role) {
  const stage = org?.renewal_stage;
  if (!stage) return null;
  const isAdmin = role === 'owner' || role === 'admin';
  const name = org.name || 'Your organisation';
  const end = fmt(org.end_date);

  if (stage === 'grace') {
    const until = fmt(org.grace_ends);
    return {
      urgent: true,
      canRenew: isAdmin,
      text: isAdmin
        ? `${name}'s meldra licence ended on ${end}. Your team keeps access until ${until}; renew to keep it after that.`
        : `${name}'s meldra licence has ended. You keep access until ${until}. Ask your organisation's admin about renewal.`,
    };
  }
  if (stage === 'expired') {
    return isAdmin
      ? { urgent: true, canRenew: true, text: `${name}'s meldra licence has ended and members are on their own plans. Renew to restore access.` }
      : null;
  }
  if (!isAdmin) return null;
  const days = Math.max(0, Number(org.days_left ?? 0));
  return {
    urgent: stage === 'd7',
    canRenew: true,
    text: `${name}'s meldra licence ends on ${end} (${days} day${days === 1 ? '' : 's'}). Renew now to keep your team's access, mappings and templates without a gap.`,
  };
}
