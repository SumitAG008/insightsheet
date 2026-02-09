# Logo Setup Guide - Meldra

## ✅ Logo Updated!

Your Meldra logo has been integrated into the application!

---

## 📁 Logo File Location

Your logo file should be at:
```
public/meldra.png
```

### Logo Requirements:
- **Format**: PNG (recommended) or SVG
- **Size**: At least 512x512px for best quality
- **Background**: Transparent (PNG) or solid color
- **File name**: `meldra.png` (case-sensitive)

---

## 🎨 Where Logo Appears

### 1. **Navigation Bar (Top)**
- Left side of navigation
- Shows logo + "Meldra" text
- Appears on all pages

### 2. **Footer**
- Footer section
- Logo + company name

### 3. **Mobile Menu**
- Hamburger menu
- Logo at top

---

## 🔧 How to Update Logo

### Option 1: Replace Existing File
1. Replace `public/meldra.png` with your new logo
2. Keep the same filename: `meldra.png`
3. Refresh the browser

### Option 2: Use Different Filename
1. Add your logo to `public/` folder
2. Update `src/components/branding/Logo.jsx`:
   ```jsx
   <img src="/your-logo-name.png" ... />
   ```

### Option 3: Use SVG Logo
1. Add `meldra.svg` to `public/` folder
2. Update `src/components/branding/Logo.jsx`:
   ```jsx
   <img src="/meldra.svg" ... />
   ```

---

## 🎯 Logo Component Usage

The logo is now a reusable component:

```jsx
import Logo from '@/components/branding/Logo';

// Small logo
<Logo size="small" />

// Medium logo (default)
<Logo size="medium" />

// Large logo
<Logo size="large" />

// Logo without text
<Logo showText={false} />
```

---

## 🌐 Website Name

If you want to update the website name or add your domain:

### Update in `src/components/branding/Logo.jsx`:
```jsx
<h1 className="...">Your Website Name</h1>
<p className="...">Your Tagline</p>
```

### Update Footer:
Edit `src/pages/Layout.jsx` footer section

---

## ✅ Checklist

- [x] Logo component created
- [x] Logo added to navigation
- [x] Logo added to footer
- [x] Fallback icon if logo fails to load
- [ ] Your logo file in `public/meldra.png`
- [ ] Logo displays correctly
- [ ] Tested on different screen sizes

---

## 🐛 Troubleshooting

### Logo Not Showing?
1. **Check file path**: Should be `public/meldra.png`
2. **Check filename**: Must be exact match (case-sensitive)
3. **Check file format**: PNG or SVG
4. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
5. **Check console**: Look for 404 errors

### Logo Too Small/Large?
- Edit `src/components/branding/Logo.jsx`
- Adjust `sizes` object values

### Want Different Styling?
- Edit `src/components/branding/Logo.jsx`
- Modify className or add custom styles

---

## 📝 Next Steps

1. **Add your logo file** to `public/meldra.png`
2. **Test** - Refresh browser and check navigation
3. **Customize** - Update text, colors, or styling if needed
4. **Update website name** - Change "Meldra" to your actual website name if different

---

## 💡 Pro Tips

1. **Use SVG** for best quality at all sizes
2. **Optimize PNG** - Use tools like TinyPNG to reduce file size
3. **Test on mobile** - Ensure logo looks good on small screens
4. **Dark mode** - Consider how logo looks in dark theme

---

**Your logo is now integrated! Just add your logo file to `public/meldra.png` and it will appear everywhere!** 🎉
