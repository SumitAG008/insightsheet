// Largest single upload for this subscription, in MB. The server decides (plan limits, or none while
// the operator has switched limits off with UPLOAD_LIMIT_MB=off); Infinity means no limit.
export function maxUploadMb(subscription) {
  if (subscription && Object.prototype.hasOwnProperty.call(subscription, 'max_upload_mb')) {
    return subscription.max_upload_mb == null ? Infinity : Number(subscription.max_upload_mb);
  }
  return subscription && String(subscription.plan || '').startsWith('premium') ? 500 : 10;
}

export function uploadLimitLabel(mb) {
  return Number.isFinite(mb) ? `${mb}MB` : 'no size limit';
}
