/**
 * 51Talk Promotional Landing Page - Main Application
 * Handles all UI interactions and application logic
 */

// Application State
const AppState = {
  selectedVersion: null,
  isProcessing: false,
  isRestricted: false,
  versions: []
};

// DOM Elements
const Elements = {
  versionsGrid: null,
  claimButton: null,
  successModal: null,
  modalClose: null,
  errorToast: null,
  toastClose: null,
  restrictionNotice: null,
  claimedVersion: null,
  linkInput: null,
  copyLinkBtn: null,
  copyCodeBtn: null,
  openLinkBtn: null,
  errorMessage: null
};

/**
 * Initialize the application
 */
function initApp() {
  console.log('Initializing 51Talk Promotional Landing Page...');

  // Check for required dependencies
  if (typeof StorageManager === 'undefined') {
    console.error('StorageManager not found');
    showError('应用加载失败，请刷新页面重试');
    return;
  }

  if (typeof ValidationManager === 'undefined') {
    console.error('ValidationManager not found');
    showError('应用加载失败，请刷新页面重试');
    return;
  }

  // Initialize ValidationManager with environment variables
  const supabaseUrl = process.env?.NEXT_PUBLIC_SUPABASE_URL || window.ENV?.SUPABASE_URL || 'YOUR_SUPABASE_URL';
  const supabaseAnonKey = process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || window.ENV?.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

  ValidationManager.init(supabaseUrl, supabaseAnonKey);

  // Check if using demo/development credentials
  if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('⚠️ Using placeholder Supabase credentials. Please configure environment variables for production.');
    // Enable demo mode as fallback
    ValidationManager.demoMode = true;
  }

  // Get DOM elements
  cacheElements();

  // Initialize versions
  initializeVersions();

  // Check for existing claim
  checkExistingClaim();

  // Setup event listeners
  setupEventListeners();

  // Setup analytics (if needed)
  setupAnalytics();

  console.log('Application initialized successfully');
}

/**
 * Cache DOM elements for better performance
 */
function cacheElements() {
  Elements.versionsGrid = document.querySelector('.versions-grid');
  Elements.claimButton = document.getElementById('claimButton');
  Elements.successModal = document.getElementById('successModal');
  Elements.modalClose = document.getElementById('modalClose');
  Elements.errorToast = document.getElementById('errorToast');
  Elements.toastClose = document.getElementById('toastClose');
  Elements.restrictionNotice = document.getElementById('restrictionNotice');
  Elements.claimedVersion = document.getElementById('claimedVersion');
  Elements.linkInput = document.getElementById('linkInput');
  Elements.copyLinkBtn = document.getElementById('copyLink');
  Elements.copyCodeBtn = document.getElementById('copyCode');
  Elements.openLinkBtn = document.getElementById('openLink');
  Elements.errorMessage = document.getElementById('errorMessage');

  // Validate essential elements
  const essentialElements = [
    Elements.versionsGrid,
    Elements.claimButton,
    Elements.successModal
  ];

  const missingElements = essentialElements.filter(el => !el);
  if (missingElements.length > 0) {
    console.error('Missing essential DOM elements:', missingElements);
    showError('页面加载不完整，请刷新页面重试');
  }
}

/**
 * Initialize version cards
 */
function initializeVersions() {
  const versions = ValidationManager.getAvailableVersions();
  AppState.versions = versions;

  // Clear existing content
  Elements.versionsGrid.innerHTML = '';

  // Create version cards
  versions.forEach(version => {
    const card = createVersionCard(version);
    Elements.versionsGrid.appendChild(card);
  });

  console.log(`Initialized ${versions.length} version cards`);
}

/**
 * Create a version card element
 * @param {string} version - Version name
 * @returns {HTMLElement} Version card element
 */
function createVersionCard(version) {
  const card = document.createElement('div');
  card.className = 'version-card';
  card.setAttribute('role', 'option');
  card.setAttribute('aria-selected', 'false');
  card.setAttribute('data-version', version);

  card.innerHTML = `
    <span class="version-name">${escapeHtml(version)}</span>
    <div class="selection-indicator"></div>
  `;

  // Add click handler
  card.addEventListener('click', () => selectVersion(version));

  return card;
}

/**
 * Handle version selection
 * @param {string} version - Selected version
 */
function selectVersion(version) {
  if (AppState.isProcessing || AppState.isRestricted) {
    return;
  }

  // Update state
  AppState.selectedVersion = version;

  // Update UI
  updateVersionSelection(version);
  updateClaimButton();
}

/**
 * Update version selection UI
 * @param {string} selectedVersion - Selected version name
 */
function updateVersionSelection(selectedVersion) {
  const cards = document.querySelectorAll('.version-card');

  cards.forEach(card => {
    const version = card.getAttribute('data-version');
    const isSelected = version === selectedVersion;

    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-selected', isSelected.toString());
  });
}

/**
 * Update claim button state and text
 */
function updateClaimButton() {
  const button = Elements.claimButton;
  const buttonText = button.querySelector('.button-text');

  if (AppState.isProcessing) {
    button.disabled = true;
    button.classList.add('loading');
    buttonText.textContent = '正在验证...';
  } else if (AppState.isRestricted) {
    button.disabled = true;
    button.classList.remove('loading');
    buttonText.textContent = '已领取过资料';
  } else if (AppState.selectedVersion) {
    button.disabled = false;
    button.classList.remove('loading');
    buttonText.textContent = '立即免费领取';
  } else {
    button.disabled = true;
    button.classList.remove('loading');
    buttonText.textContent = '请先选择一个版本';
  }
}

/**
 * Check for existing claim and update UI accordingly
 */
function checkExistingClaim() {
  const hasValidClaim = StorageManager.hasValidClaim();

  if (hasValidClaim) {
    AppState.isRestricted = true;
    const claimedVersion = StorageManager.getClaimedVersion();
    const remainingDays = StorageManager.getRemainingDays();

    // Show restriction notice
    showRestrictionNotice(claimedVersion, remainingDays);

    // Disable version selection
    disableVersionSelection();

    // Update claim button
    updateClaimButton();

    console.log(`Device restricted. Previously claimed: ${claimedVersion}, Remaining days: ${remainingDays}`);
  }
}

/**
 * Show restriction notice
 * @param {string} version - Previously claimed version
 * @param {number} remainingDays - Days remaining until restriction expires
 */
function showRestrictionNotice(version, remainingDays) {
  const notice = Elements.restrictionNotice;
  if (!notice) return;

  const message = notice.querySelector('.notice-message p');
  if (message) {
    message.textContent = `每个设备30天内仅可领取一次，请${remainingDays}天后再试。如需其他版本，请更换设备或联系客服。`;
  }

  notice.hidden = false;
}

/**
 * Disable version selection
 */
function disableVersionSelection() {
  const cards = document.querySelectorAll('.version-card');
  cards.forEach(card => {
    card.classList.add('disabled');
    card.setAttribute('aria-disabled', 'true');
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Claim button
  if (Elements.claimButton) {
    Elements.claimButton.addEventListener('click', handleClaimClick);
  }

  // Modal close
  if (Elements.modalClose) {
    Elements.modalClose.addEventListener('click', hideSuccessModal);
  }

  // Toast close
  if (Elements.toastClose) {
    Elements.toastClose.addEventListener('click', hideErrorToast);
  }

  // Copy buttons
  if (Elements.copyLinkBtn) {
    Elements.copyLinkBtn.addEventListener('click', copyLink);
  }

  if (Elements.copyCodeBtn) {
    Elements.copyCodeBtn.addEventListener('click', copyCode);
  }

  // Open link button
  if (Elements.openLinkBtn) {
    Elements.openLinkBtn.addEventListener('click', openLink);
  }

  // Modal backdrop click
  if (Elements.successModal) {
    const backdrop = Elements.successModal.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', hideSuccessModal);
    }
  }

  // Escape key handling
  document.addEventListener('keydown', handleKeyDown);

  // Visibility change handling
  document.addEventListener('visibilitychange', handleVisibilityChange);

  console.log('Event listeners setup complete');
}

/**
 * Handle claim button click
 */
async function handleClaimClick() {
  if (!AppState.selectedVersion || AppState.isProcessing || AppState.isRestricted) {
    return;
  }

  console.log(`Processing claim for version: ${AppState.selectedVersion}`);

  try {
    // Set processing state
    AppState.isProcessing = true;
    updateClaimButton();

    // Process the claim
    const result = await ValidationManager.processClaim(AppState.selectedVersion);

    if (result.success) {
      // Show success modal
      showSuccessModal(result.version, result.versionData);

      // Track successful claim
      trackClaimSuccess(result.version);

    } else {
      // Show error
      showError(result.error);

      // Track failed claim
      trackClaimError(result.error, result.type);
    }

  } catch (error) {
    console.error('Claim processing error:', error);
    showError('处理请求时发生错误，请稍后再试');
    trackClaimError(error.message, 'unexpected_error');

  } finally {
    // Reset processing state
    AppState.isProcessing = false;
    updateClaimButton();
  }
}

/**
 * Show success modal
 * @param {string} version - Claimed version
 * @param {Object} versionData - Version data with link and code
 */
function showSuccessModal(version, versionData) {
  if (!Elements.successModal || !versionData) return;

  // Update modal content
  if (Elements.claimedVersion) {
    Elements.claimedVersion.textContent = version;
  }

  if (Elements.linkInput) {
    Elements.linkInput.value = versionData.link;
  }

  // Show modal
  Elements.successModal.hidden = false;

  // Trigger reflow for animation
  Elements.successModal.offsetHeight;

  Elements.successModal.classList.add('show');

  // Auto-copy functionality
  setTimeout(() => {
    autoCopyLink(versionData.link, versionData.code);
  }, 500);

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  console.log(`Success modal shown for version: ${version}`);
}

/**
 * Hide success modal
 */
function hideSuccessModal() {
  if (!Elements.successModal) return;

  Elements.successModal.classList.remove('show');

  // Wait for animation to complete
  setTimeout(() => {
    Elements.successModal.hidden = true;
    document.body.style.overflow = '';
  }, 300);
}

/**
 * Show error toast
 * @param {string} message - Error message
 */
function showError(message) {
  if (!Elements.errorToast || !Elements.errorMessage) return;

  Elements.errorMessage.textContent = message;
  Elements.errorToast.hidden = false;

  // Trigger reflow for animation
  Elements.errorToast.offsetHeight;

  Elements.errorToast.classList.add('show');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideErrorToast();
  }, 5000);
}

/**
 * Hide error toast
 */
function hideErrorToast() {
  if (!Elements.errorToast) return;

  Elements.errorToast.classList.remove('show');

  // Wait for animation to complete
  setTimeout(() => {
    Elements.errorToast.hidden = true;
  }, 300);
}

/**
 * Copy link to clipboard
 */
async function copyLink() {
  if (!Elements.linkInput || !Elements.copyLinkBtn) return;

  const link = Elements.linkInput.value;

  try {
    await navigator.clipboard.writeText(link);

    // Update button state
    const originalText = Elements.copyLinkBtn.textContent;
    Elements.copyLinkBtn.textContent = '已复制！';
    Elements.copyLinkBtn.classList.add('copied');

    setTimeout(() => {
      Elements.copyLinkBtn.textContent = originalText;
      Elements.copyLinkBtn.classList.remove('copied');
    }, 2000);

  } catch (error) {
    console.error('Failed to copy link:', error);
    // Fallback: select text for manual copying
    Elements.linkInput.select();
  }
}

/**
 * Copy extraction code to clipboard
 */
async function copyCode() {
  if (!Elements.copyCodeBtn) return;

  const code = 'talk';

  try {
    await navigator.clipboard.writeText(code);

    // Update button state
    const originalText = Elements.copyCodeBtn.textContent;
    Elements.copyCodeBtn.textContent = '已复制！';
    Elements.copyCodeBtn.classList.add('copied');

    setTimeout(() => {
      Elements.copyCodeBtn.textContent = originalText;
      Elements.copyCodeBtn.classList.remove('copied');
    }, 2000);

  } catch (error) {
    console.error('Failed to copy code:', error);
    showError('复制失败，请手动复制提取码：talk');
  }
}

/**
 * Auto-copy link and code
 * @param {string} link - Link to copy
 * @param {string} code - Code to copy
 */
async function autoCopyLink(link, code) {
  try {
    // Copy both link and code
    await navigator.clipboard.writeText(`${link} 提取码：${code}`);
    console.log('Auto-copy successful');
  } catch (error) {
    console.error('Auto-copy failed:', error);
    // Fallback: try copying link only
    try {
      await navigator.clipboard.writeText(link);
    } catch (fallbackError) {
      console.error('Fallback copy also failed:', fallbackError);
    }
  }
}

/**
 * Open Baidu Netdisk link
 */
function openLink() {
  if (!Elements.linkInput) return;

  const link = Elements.linkInput.value;

  try {
    // Validate URL
    const url = new URL(link);

    // Open in new tab
    window.open(url.href, '_blank', 'noopener,noreferrer');

    // Track link click
    trackLinkClick(link);

  } catch (error) {
    console.error('Invalid URL:', error);
    showError('链接无效，请手动复制链接');
  }
}

/**
 * Handle keyboard events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyDown(event) {
  // Escape key closes modal
  if (event.key === 'Escape') {
    if (!Elements.successModal.hidden) {
      hideSuccessModal();
    }
    if (!Elements.errorToast.hidden) {
      hideErrorToast();
    }
  }

  // Enter key on claim button
  if (event.key === 'Enter' && document.activeElement === Elements.claimButton) {
    handleClaimClick();
  }
}

/**
 * Handle visibility change
 */
function handleVisibilityChange() {
  // Resume/restart animations when page becomes visible
  if (!document.hidden) {
    // Any cleanup or state refresh can go here
    console.log('Page became visible');
  }
}

/**
 * Setup analytics (placeholder)
 */
function setupAnalytics() {
  // Initialize analytics if needed
  console.log('Analytics setup placeholder');
}

/**
 * Track successful claim
 * @param {string} version - Claimed version
 */
function trackClaimSuccess(version) {
  console.log(`Claim successful: ${version}`);
  // Implement analytics tracking here
}

/**
 * Track claim error
 * @param {string} error - Error message
 * @param {string} type - Error type
 */
function trackClaimError(error, type) {
  console.log(`Claim error: ${type} - ${error}`);
  // Implement analytics tracking here
}

/**
 * Track link click
 * @param {string} link - Clicked link
 */
function trackLinkClick(link) {
  console.log(`Link clicked: ${link}`);
  // Implement analytics tracking here
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check browser compatibility
 * @returns {Object} Compatibility check result
 */
function checkCompatibility() {
  const features = {
    localStorage: StorageManager.isLocalStorageAvailable(),
    clipboard: !!navigator.clipboard,
    fetch: !!window.fetch,
    es6: typeof Promise !== 'undefined' && typeof Arrow !== 'undefined'
  };

  const isCompatible = Object.values(features).every(Boolean);

  return {
    isCompatible,
    features,
    missingFeatures: Object.entries(features)
      .filter(([_, supported]) => !supported)
      .map(([feature]) => feature)
  };
}

/**
 * Handle application errors gracefully
 * @param {Error} error - Error to handle
 */
function handleAppError(error) {
  console.error('Application error:', error);

  // Show user-friendly error message
  if (error.message.includes('StorageManager')) {
    showError('浏览器存储不可用，请检查浏览器设置');
  } else if (error.message.includes('ValidationManager')) {
    showError('验证模块加载失败，请刷新页面重试');
  } else {
    showError('应用发生错误，请刷新页面重试');
  }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Handle uncaught errors
window.addEventListener('error', (event) => {
  handleAppError(event.error || new Error(event.message));
});

window.addEventListener('unhandledrejection', (event) => {
  handleAppError(new Error(event.reason));
});

// Expose utility functions for debugging
window.AppDebug = {
  getState: () => AppState,
  getStorageInfo: () => StorageManager.getStorageInfo(),
  clearClaim: () => {
    StorageManager.clearClaimInfo();
    location.reload();
  },
  checkCompatibility
};