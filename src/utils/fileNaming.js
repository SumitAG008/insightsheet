// utils/fileNaming.js - Consistent file naming utility for downloads
/**
 * Generate download filename with original name + timestamp + extension
 * Format: originalname_YYYYMMDD_HHMMSS_mmm.extension
 * 
 * @param {string} originalFilename - Original file name (e.g., "data.xlsx")
 * @param {string} extension - File extension (e.g., ".pptx", ".xlsx", ".zip")
 * @param {string} prefix - Optional prefix (e.g., "processed_", "export_")
 * @returns {string} Formatted filename
 */
export function generateDownloadFilename(originalFilename, extension, prefix = '') {
  // Get original name without extension
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
  
  // Generate timestamp: YYYYMMDD_HHMMSS_mmm
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}_${milliseconds}`;
  
  // Clean original name (remove special chars, limit length)
  const cleanName = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50); // Limit to 50 chars
  
  // Ensure extension starts with dot
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  
  // Combine: prefix + cleanName + timestamp + extension
  return `${prefix}${cleanName}_${timestamp}${ext}`;
}

/**
 * Download blob with proper filename
 * @param {Blob} blob - File blob to download
 * @param {string} filename - Filename for download
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
