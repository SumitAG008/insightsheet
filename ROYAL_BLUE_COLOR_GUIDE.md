# Royal Blue Light Theme - Color Transformation Guide

This document provides the color mappings to transform all pages from dark purple/slate theme to royal blue light theme.

## Color Mappings

### Backgrounds
```
OLD → NEW
from-slate-950 via-purple-950 to-slate-950 → from-blue-50 via-indigo-50 to-blue-100
bg-slate-900 → bg-white OR bg-blue-50
bg-slate-800 → bg-blue-50
bg-slate-950 → bg-blue-50
bg-purple-900 → bg-blue-100
```

### Cards & Containers
```
OLD → NEW
bg-slate-900/90 border-slate-700/50 → bg-white border-blue-200 shadow-lg
bg-slate-900/80 border-slate-700/50 → bg-white border-blue-200 shadow-md
bg-slate-800/50 border-slate-700/50 → bg-blue-50 border-blue-200
backdrop-blur-xl → backdrop-blur-xl (keep)
```

### Text Colors
```
OLD → NEW
text-white → text-blue-900 (headers)
text-slate-300 → text-blue-800 (body)
text-slate-400 → text-blue-700 (secondary)
text-purple-300 → text-blue-700
text-purple-400 → text-blue-600
text-pink-400 → text-indigo-600
```

### Buttons & Interactive Elements
```
OLD → NEW
from-purple-600 to-pink-600 → from-blue-600 to-indigo-600
from-purple-500 to-pink-600 → from-blue-600 to-indigo-600
bg-purple-600 → bg-blue-600
bg-slate-700 hover:bg-slate-600 → bg-blue-200 hover:bg-blue-300
```

### Badges
```
OLD → NEW
bg-purple-500/20 text-purple-300 border-purple-500/30 → bg-blue-500/20 text-blue-700 border-blue-500/30
bg-purple-600/20 text-purple-300 → bg-blue-600/20 text-blue-700
bg-emerald-500/20 text-emerald-300 → bg-emerald-500/20 text-emerald-700 (keep green but adjust text)
```

### Icons
```
OLD → NEW
text-purple-400 → text-blue-600
text-purple-500 → text-blue-600
text-pink-400 → text-indigo-600
text-emerald-400 → text-emerald-600 (keep green)
```

### Borders
```
OLD → NEW
border-slate-700 → border-blue-200
border-slate-700/50 → border-blue-200
border-slate-700/30 → border-blue-100
border-purple-800/30 → border-blue-200
border-purple-500/30 → border-blue-300
```

### Modals & Overlays
```
OLD → NEW
bg-black/80 → bg-blue-900/80 backdrop-blur-sm
bg-slate-900 → bg-white
```

### Tabs
```
OLD → NEW
bg-slate-900/80 → bg-white border border-blue-200
```

### Alert/Notice Boxes
```
OLD → NEW (by type)
bg-amber-500/10 border-amber-500/30 text-amber-200 → bg-amber-50 border-amber-300 text-amber-800
bg-emerald-500/10 border-emerald-500/30 text-emerald-200 → bg-emerald-50 border-emerald-300 text-emerald-800
bg-red-500/10 border-red-500/30 text-red-200 → bg-red-50 border-red-300 text-red-800
```

## Implementation Examples

### Before (Dark Theme):
```jsx
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 py-12">
  <div className="bg-slate-900/90 border border-slate-700/50 rounded-xl p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Title</h2>
    <p className="text-slate-300">Description</p>
    <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
      Action
    </Button>
  </div>
</div>
```

### After (Royal Blue Light Theme):
```jsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 py-12">
  <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-lg">
    <h2 className="text-2xl font-bold text-blue-900 mb-4">Title</h2>
    <p className="text-blue-800">Description</p>
    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
      Action
    </Button>
  </div>
</div>
```

## Pages Updated
✅ Layout.jsx (Header/Navigation/Footer)
✅ Pricing.jsx

## Pages Pending Update
- Upload.jsx
- Dashboard.jsx
- AgenticAI.jsx
- FileToPPT.jsx
- FilenameCleaner.jsx
- SheetManager.jsx
- Reconciliation.jsx
- AccountingToolkit.jsx
- ProjectTracker.jsx
- UserGuide.jsx
- Demo.jsx
- UserManagement.jsx
- AdminDashboard.jsx
- Login.jsx
- Register.jsx
- All other pages...

## Quick Find & Replace Patterns

Use these regex patterns for bulk updates (review before applying):

1. Main background: `from-slate-950 via-purple-950 to-slate-950` → `from-blue-50 via-indigo-50 to-blue-100`
2. Card backgrounds: `bg-slate-900/90 backdrop-blur-xl border border-slate-700/50` → `bg-white backdrop-blur-xl border border-blue-200 shadow-lg`
3. Headers: `text-white` (in h1, h2, h3) → `text-blue-900`
4. Body text: `text-slate-300` → `text-blue-800`
5. Button gradients: `from-purple-600 to-pink-600` → `from-blue-600 to-indigo-600`

## Notes
- Keep emerald/green colors for success messages and positive indicators
- Keep amber/orange colors for warnings
- Keep red colors for errors/dangers
- Admin-specific elements can use amber-600/orange-600 for distinction
- Always add shadow-lg or shadow-md to white cards for depth
- Ensure text contrast meets WCAG AA standards (4.5:1 for body, 3:1 for large text)
