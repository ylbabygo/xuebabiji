# 51Talk "小学英语学霸笔记" Promotional Landing Page

A responsive, mobile-first promotional landing page for distributing free educational materials with dual-layer security restrictions (device-based and IP-based).

## 🎯 Project Overview

This project implements a complete promotional landing page that allows parents to claim free educational materials for their children. The system includes sophisticated anti-abuse mechanisms to ensure fair distribution while maintaining a smooth user experience.

### Key Features

- **📱 Mobile-First Responsive Design**: Optimized for all device sizes
- **🎨 51Talk Brand Integration**: Consistent with company branding guidelines
- **🔒 Dual-Layer Security**: Device + IP-based claim restrictions (30-day cooldown)
- **🚀 No Authentication Required**: User-friendly anonymous claiming process
- **📋 9 Textbook Versions**: Supports major Chinese elementary English textbook editions
- **🔗 Baidu Netdisk Integration**: Automatic link copying and extraction code handling
- **♿ Accessible WCAG Compliant**: Screen reader and keyboard navigation support
- **📊 Analytics Ready**: Built-in event tracking hooks

## 📁 Project Structure

```
活动领取页/
├── index.html                 # Main landing page
├── css/
│   ├── styles.css            # Main responsive styles
│   └── components.css        # Interactive component styles
├── js/
│   ├── app.js               # Main application logic
│   ├── storage.js           # LocalStorage management
│   └── validation.js        # API validation and calls
├── supabase/
│   └── functions/
│       └── validate-claim/
│           └── index.ts     # Edge function for IP validation
├── assets/
│   └── 51Talk.png          # 51Talk logo
├── README.md                # This file
├── CLAUDE.md               # AI assistant documentation
├── SUPABASE_SETUP.md       # Backend setup guide
└── 51Talk"小学英语学霸笔记"领取活动页需求文档.md  # Requirements document
```

## 🚀 Quick Start

### Prerequisites

- Modern web browser (Chrome 80+, Firefox 75+, Safari 13+)
- Supabase account (for backend functionality)
- Optional: Node.js for local development

### Local Development

1. **Clone or download the project files**
2. **Open `index.html` in your browser**
   - The frontend will work immediately for UI testing
   - Some features will be limited without backend setup

### Production Deployment

1. **Set up Supabase backend** (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
2. **Update configuration** in `js/app.js`:
   ```javascript
   ValidationManager.init(
     'https://your-project.supabase.co', // Your Supabase URL
     'your-anon-key'                    // Your Supabase anon key
   );
   ```
3. **Deploy files** to your web server or CDN
4. **Test the complete flow** to ensure everything works

## 🎨 Supported Textbook Versions

| Version Name | Download Link | Extraction Code |
|-------------|---------------|-----------------|
| 人教版·一起点 | [Link](https://pan.baidu.com/s/1tCTnBVJR27pGb5lBnfNJCg?pwd=talk) | `talk` |
| 人教版·三起点 | [Link](https://pan.baidu.com/s/1VxtrXNOoqeI-jyNl3VYucw?pwd=talk) | `talk` |
| 北师大版 | [Link](https://pan.baidu.com/s/1ehElAltU7dL9OT4K3lU3vw?pwd=talk) | `talk` |
| 冀教版·一起点 | [Link](https://pan.baidu.com/s/1OeLc_dnwdaU0TCEyM6-Ffg?pwd=talk) | `talk` |
| 冀教版·三起点 | [Link](https://pan.baidu.com/s/154u1tF-YzzOXqMmWZHpDRg?pwd=talk) | `talk` |
| 外研社·一起点 | [Link](https://pan.baidu.com/s/1girOir1Mx_pNOeQbc4i-iQ?pwd=talk) | `talk` |
| 外研社·三起点 | [Link](https://pan.baidu.com/s/1ByBQ9O6tnX7bTwOifFq7Jg?pwd=talk) | `talk` |
| 译林版 | [Link](https://pan.baidu.com/s/1Vs2yD0438JUPvmMOK5F89w?pwd=talk) | `talk` |
| 沪教版 | [Link](https://pan.baidu.com/s/1H97VszvcHAaSTJlPLlGMbA?pwd=talk) | `talk` |

## 🔐 Security Features

### Device-Level Restrictions
- **LocalStorage-based tracking** with 30-day expiration
- **Device fingerprinting** for additional validation
- **Automatic cleanup** of expired records
- **Fallback mechanisms** for browsers without LocalStorage

### IP-Level Restrictions
- **Supabase Edge Function** for server-side validation
- **30-day cooldown** per IP address
- **Secure IP extraction** from request headers
- **Rate limiting** with proper HTTP status codes

### Data Protection
- **No PII storage** - only IPs and claimed versions
- **GDPR compliant** data handling
- **Automatic data cleanup** after 6 months
- **Secure API communication** with proper headers

## 🎯 User Journey

1. **Landing**: User sees promotional content and value proposition
2. **Selection**: User selects their textbook version from 9 options
3. **Claim**: User clicks "立即免费领取" button
4. **Validation**: System checks device and IP restrictions
5. **Success**: Modal displays Baidu Netdisk link with auto-copy
6. **Confirmation**: Link opens in new tab, claim recorded

## 🛠️ Technical Architecture

### Frontend Stack
- **HTML5** with semantic markup and accessibility features
- **CSS3** with custom properties and mobile-first responsive design
- **Vanilla JavaScript (ES6+)** with modular architecture
- **LocalStorage API** for client-side data persistence

### Backend Stack
- **Supabase PostgreSQL** for data storage
- **Supabase Edge Functions** for serverless API
- **Row Level Security (RLS)** for data protection
- **RESTful API** with proper HTTP status codes

### Browser Support
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ⚠️ IE 11 (limited support)

## 📊 Performance Features

- **Lazy loading** of non-critical resources
- **Optimized images** with proper sizing
- **Minified CSS/JS** (production ready)
- **Cache-friendly** asset handling
- **Progressive enhancement** for slow connections

## 🧪 Testing

### Manual Testing Checklist

- [ ] **Responsive Design**: Test on mobile, tablet, desktop
- [ ] **Version Selection**: All 9 versions selectable and functional
- [ ] **Claim Flow**: End-to-end process works smoothly
- [ ] **Error Handling**: Network errors, validation errors, restrictions
- [ ] **Accessibility**: Keyboard navigation, screen reader compatibility
- [ ] **Browser Compatibility**: Works across supported browsers
- [ ] **LocalStorage**: Claims persist across sessions
- [ ] **IP Restrictions**: Backend validation prevents abuse

### Automated Testing (Optional)

```bash
# Install testing dependencies
npm install --save-dev cypress

# Run tests
npm run test
```

## 🔧 Configuration

### Environment Variables (Backend)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Frontend Configuration

```javascript
// In js/app.js
ValidationManager.init(
  'https://your-project.supabase.co', // Your Supabase URL
  'your-anon-key'                    // Your Supabase anon key
);
```

### Customization Options

```javascript
// Modify in js/validation.js
const ValidationManager = {
  THIRTY_DAYS_IN_MS: 30 * 24 * 60 * 60 * 1000, // Adjust restriction period
  API_TIMEOUT: 15000,                           // Adjust API timeout
  // Add custom versions or modify existing ones
  VERSION_DATA: { /* ... */ }
}
```

## 📈 Analytics Integration

The application includes hooks for analytics integration:

```javascript
// Track successful claims
function trackClaimSuccess(version) {
  // Implement your analytics here
  // gtag('event', 'claim_success', { version: version });
}

// Track errors
function trackClaimError(error, type) {
  // Implement your analytics here
  // gtag('event', 'claim_error', { error_type: type });
}
```

## 🔍 Debug Mode

Enable debug mode for development:

```javascript
// In browser console
window.AppDebug.getState();     // View application state
window.AppDebug.getStorageInfo(); // View LocalStorage info
window.AppDebug.clearClaim();   // Clear stored claim for testing
window.AppDebug.checkCompatibility(); // Check browser support
```

## 🚨 Troubleshooting

### Common Issues

1. **"应用加载失败" (App Loading Failed)**
   - Check browser console for JavaScript errors
   - Verify all files are correctly loaded
   - Ensure LocalStorage is enabled in browser

2. **"网络连接失败" (Network Connection Failed)**
   - Check Supabase configuration
   - Verify API keys and URLs
   - Check network connectivity

3. **"服务器错误" (Server Error)**
   - Check Edge Function deployment
   - Verify database permissions
   - Check Supabase logs for detailed errors

4. **"Already claimed" when user hasn't claimed**
   - Clear browser LocalStorage
   - Check if user is behind shared proxy/NAT
   - Verify IP extraction in Edge Function

### Debug Steps

1. **Open browser developer tools**
2. **Check Console tab for JavaScript errors**
3. **Check Network tab for failed API calls**
4. **Check Application tab for LocalStorage data**
5. **Use `window.AppDebug` for additional diagnostics**

## 📞 Support

- **Documentation**: Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for backend setup
- **Requirements**: See original requirements document for detailed specifications
- **Issues**: Report bugs or request features through your project management system

## 📄 License

This project is proprietary and confidential property of 51Talk. Unauthorized distribution or modification is prohibited.

---

**© 2024 51Talk. All rights reserved.**

*This promotional landing page is part of 51Talk's commitment to providing quality educational resources to students across China.*