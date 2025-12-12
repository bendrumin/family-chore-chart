# Security Audit Report
Generated: $(date)

## 🔴 Critical Issues

### 1. Dependency Vulnerabilities

#### Root Package (`package.json`)
- **16 vulnerabilities** (7 moderate, 9 high)
  - `esbuild <=0.24.2` - Moderate: Development server request vulnerability
  - `path-to-regexp 4.0.0 - 6.2.2` - High: Backtracking regex vulnerability
  - `undici <=5.28.5` - Moderate: Insufficient randomness & DoS vulnerability
  - All via `vercel` package dependencies

**Recommendation:**
```bash
npm audit fix
# If breaking changes, consider updating vercel to latest version
npm update vercel
```

#### Frontend Package (`frontend/package.json`)
- **1 moderate vulnerability**
  - `nodemailer <7.0.7` - Email domain interpretation conflict

**Recommendation:**
```bash
cd frontend
npm update nodemailer
```

### 2. XSS (Cross-Site Scripting) Risks

**Found 114+ instances of `innerHTML` usage** - High Risk

Many instances directly set `innerHTML` with user-controlled or dynamic content:

**Examples:**
- `frontend/script.js:43` - Toast messages
- `frontend/script.js:4089` - Child name in template strings
- `frontend/script.js:5262` - Chore entry HTML
- `frontend/script.js:7200` - Modal content with user data

**Risk:** If any user input (names, chore names, messages) contains malicious HTML/JS, it could execute.

**Recommendations:**
1. **Use `textContent` instead of `innerHTML` for user data:**
   ```javascript
   // ❌ Bad
   element.innerHTML = userInput;
   
   // ✅ Good
   element.textContent = userInput;
   ```

2. **For HTML templates, use a sanitization library:**
   ```bash
   npm install DOMPurify
   ```
   ```javascript
   import DOMPurify from 'dompurify';
   element.innerHTML = DOMPurify.sanitize(htmlString);
   ```

3. **Use template literals with explicit escaping:**
   ```javascript
   const escapeHtml = (str) => {
       const div = document.createElement('div');
       div.textContent = str;
       return div.innerHTML;
   };
   element.innerHTML = `<div>${escapeHtml(userName)}</div>`;
   ```

### 3. Sensitive Data in localStorage

**Found 52 instances of localStorage usage**

**Critical Issues:**
- Session data stored in localStorage (`chorestar_session`, `chorestar_pin_session`)
- PIN sessions in localStorage (line 77, 216, 321, 421, 530 in `api-client.js`)

**Risk:** localStorage is accessible to any script on the domain. XSS attacks can steal session data.

**Recommendations:**
1. **Move sensitive session data to httpOnly cookies** (handled server-side)
2. **Use sessionStorage instead of localStorage** for temporary session data
3. **Encrypt sensitive data before storing** in localStorage if it must be stored client-side
4. **Implement Content Security Policy (CSP)** headers

## 🟡 Medium Priority Issues

### 4. Input Validation

**Good:** Contact form has validation and honeypot fields
**Needs Improvement:**
- Some user inputs (names, chore names) may not be sanitized before database insertion
- Email validation should be stricter (use regex or library)
- Password validation is minimal (only length check)

**Recommendations:**
```javascript
// Add input sanitization
const sanitizeInput = (input) => {
    return input.trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .substring(0, 255); // Limit length
};

// Validate email properly
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
```

### 5. API Key Exposure Risk

**Found:** Environment variables checked in client-side code
- `frontend/api/health.js` - Checks for PayPal keys (but doesn't expose them)
- `frontend/api/create-paypal-checkout.js` - Uses server-side env vars (✅ Good)

**Status:** ✅ API keys appear to be server-side only (good practice)

### 6. Supabase Query Security

**Status:** ✅ Queries use Supabase client which handles parameterization
- All queries use `.from()`, `.select()`, `.insert()` methods (safe)
- No raw SQL strings found
- RLS (Row Level Security) should be enabled in Supabase

**Recommendation:** Verify RLS policies are properly configured in Supabase dashboard

## 🟢 Low Priority / Best Practices

### 7. Content Security Policy (CSP)

**Missing:** No CSP headers found

**Recommendation:** Add CSP headers to prevent XSS:
```javascript
// In vercel.json or server config
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://api.dicebear.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;"
        }
      ]
    }
  ]
}
```

### 8. Rate Limiting

**Found:** Contact form has rate limiting (✅ Good)
- Uses localStorage to track last submission
- 24-hour cooldown

**Recommendation:** Also implement server-side rate limiting

### 9. Password Security

**Current:** Minimum 6 characters
**Recommendation:** 
- Increase to 8+ characters
- Require mix of uppercase, lowercase, numbers
- Consider password strength meter

## 📋 Action Items

### Immediate (Critical)
1. ✅ Update `nodemailer` in frontend package
2. ✅ Review and fix `innerHTML` usage (prioritize user input)
3. ✅ Move session data from localStorage to httpOnly cookies
4. ✅ Add input sanitization for all user inputs

### Short Term (High Priority)
5. ✅ Update Vercel package to fix dependency vulnerabilities
6. ✅ Implement DOMPurify for HTML sanitization
7. ✅ Add CSP headers
8. ✅ Review Supabase RLS policies

### Long Term (Best Practices)
9. ✅ Implement server-side rate limiting
10. ✅ Add password strength requirements
11. ✅ Regular security audits (monthly)
12. ✅ Set up automated dependency scanning (Dependabot, Snyk)

## 🔍 Automated Scanning Tools

### Recommended Tools:
1. **npm audit** - Already run ✅
2. **Snyk** - Free tier available
   ```bash
   npm install -g snyk
   snyk test
   ```
3. **OWASP ZAP** - Web app security scanner
4. **ESLint security plugin**
   ```bash
   npm install --save-dev eslint-plugin-security
   ```

## 📝 Notes

- Supabase queries appear safe (parameterized)
- No hardcoded secrets found in code ✅
- Contact form has good anti-spam measures ✅
- Environment variables properly used ✅

---

**Next Steps:** Start with critical issues (#1-3), then move to high priority items.

