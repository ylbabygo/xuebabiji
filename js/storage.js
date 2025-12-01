/**
 * 51Talk Storage Management Module
 * Handles LocalStorage operations for device-based claim restrictions
 */

const StorageManager = {
  // Configuration constants
  STORAGE_KEY: '51talk_claim_info',
  THIRTY_DAYS_IN_MS: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds

  /**
   * Get claim information from LocalStorage
   * @returns {Object|null} Claim info or null if not found
   */
  getClaimInfo() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const claimInfo = JSON.parse(stored);

      // Validate the structure of stored data
      if (!this.isValidClaimInfo(claimInfo)) {
        this.clearClaimInfo();
        return null;
      }

      return claimInfo;
    } catch (error) {
      console.warn('Failed to read claim info from LocalStorage:', error);
      this.clearClaimInfo();
      return null;
    }
  },

  /**
   * Save claim information to LocalStorage
   * @param {string} version - The claimed version
   * @param {Date} [claimedAt=new Date()] - Claim timestamp
   */
  setClaimInfo(version, claimedAt = new Date()) {
    try {
      const expiryDate = new Date(claimedAt.getTime() + this.THIRTY_DAYS_IN_MS);

      const claimInfo = {
        version: version,
        claimedAt: claimedAt.toISOString(),
        expiresAt: expiryDate.toISOString(),
        deviceFingerprint: this.generateDeviceFingerprint()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(claimInfo));

      return claimInfo;
    } catch (error) {
      console.error('Failed to save claim info to LocalStorage:', error);
      return null;
    }
  },

  /**
   * Check if device has a valid (non-expired) claim
   * @returns {boolean} True if device has valid claim
   */
  hasValidClaim() {
    const claimInfo = this.getClaimInfo();

    if (!claimInfo) {
      return false;
    }

    const now = new Date();
    const expiryDate = new Date(claimInfo.expiresAt);

    return now < expiryDate;
  },

  /**
   * Get remaining days until claim expires
   * @returns {number} Days remaining (can be negative if expired)
   */
  getRemainingDays() {
    const claimInfo = this.getClaimInfo();

    if (!claimInfo) {
      return 0;
    }

    const now = new Date();
    const expiryDate = new Date(claimInfo.expiresAt);
    const diffMs = expiryDate - now;
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    return Math.max(0, diffDays);
  },

  /**
   * Get the claimed version from LocalStorage
   * @returns {string|null} Claimed version or null
   */
  getClaimedVersion() {
    const claimInfo = this.getClaimInfo();
    return claimInfo ? claimInfo.version : null;
  },

  /**
   * Clear claim information from LocalStorage
   */
  clearClaimInfo() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear claim info from LocalStorage:', error);
    }
  },

  /**
   * Generate a simple device fingerprint for additional validation
   * @returns {string} Device fingerprint
   */
  generateDeviceFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);

      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ].join('|');

      // Simple hash to create a shorter fingerprint
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return Math.abs(hash).toString(16);
    } catch (error) {
      // Fallback if canvas not supported
      return 'fingerprint-fallback';
    }
  },

  /**
   * Validate the structure of claim info object
   * @param {Object} claimInfo - Object to validate
   * @returns {boolean} True if valid structure
   */
  isValidClaimInfo(claimInfo) {
    if (!claimInfo || typeof claimInfo !== 'object') {
      return false;
    }

    const requiredFields = ['version', 'claimedAt', 'expiresAt'];
    for (const field of requiredFields) {
      if (!(field in claimInfo)) {
        return false;
      }
    }

    // Validate date fields
    const claimedAt = new Date(claimInfo.claimedAt);
    const expiresAt = new Date(claimInfo.expiresAt);

    if (isNaN(claimedAt.getTime()) || isNaN(expiresAt.getTime())) {
      return false;
    }

    // Validate version is a non-empty string
    if (typeof claimInfo.version !== 'string' || claimInfo.version.trim() === '') {
      return false;
    }

    return true;
  },

  /**
   * Check if LocalStorage is available
   * @returns {boolean} True if LocalStorage is available
   */
  isLocalStorageAvailable() {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get storage usage information
   * @returns {Object} Storage usage stats
   */
  getStorageInfo() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const size = data ? new Blob([data]).size : 0;

      return {
        available: this.isLocalStorageAvailable(),
        size: size,
        sizeFormatted: size > 1024 ? `${(size / 1024).toFixed(2)} KB` : `${size} bytes`,
        hasData: !!data,
        key: this.STORAGE_KEY
      };
    } catch (error) {
      return {
        available: false,
        size: 0,
        sizeFormatted: '0 bytes',
        hasData: false,
        key: this.STORAGE_KEY,
        error: error.message
      };
    }
  },

  /**
   * Debug method to export all claim data (for testing)
   * @returns {Object|null} All stored claim data
   */
  exportClaimData() {
    return this.getClaimInfo();
  },

  /**
   * Debug method to import claim data (for testing)
   * @param {Object} data - Claim data to import
   * @returns {boolean} Success status
   */
  importClaimData(data) {
    if (!this.isValidClaimInfo(data)) {
      console.warn('Invalid claim data provided');
      return false;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to import claim data:', error);
      return false;
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}