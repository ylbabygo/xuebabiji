/**
 * 51Talk Validation and API Module
 * Handles form validation, API calls, and server communication
 */

const ValidationManager = {
  // Configuration
  SUPABASE_URL: '', // Will be set during initialization
  SUPABASE_ANON_KEY: '', // Will be set during initialization
  API_TIMEOUT: 15000, // 15 seconds timeout

  // Educational versions with their Baidu Netdisk links
  VERSION_DATA: {
    '人教版·一起点': {
      id: 'pep-together',
      link: 'https://pan.baidu.com/s/1tCTnBVJR27pGb5lBnfNJCg?pwd=talk',
      code: 'talk'
    },
    '人教版·三起点': {
      id: 'pep-three',
      link: 'https://pan.baidu.com/s/1VxtrXNOoqeI-jyNl3VYucw?pwd=talk',
      code: 'talk'
    },
    '北师大版': {
      id: 'bnu',
      link: 'https://pan.baidu.com/s/1ehElAltU7dL9OT4K3lU3vw?pwd=talk',
      code: 'talk'
    },
    '冀教版·一起点': {
      id: 'jijiao-together',
      link: 'https://pan.baidu.com/s/1OeLc_dnwdaU0TCEyM6-Ffg?pwd=talk',
      code: 'talk'
    },
    '冀教版·三起点': {
      id: 'jijiao-three',
      link: 'https://pan.baidu.com/s/154u1tF-YzzOXqMmWZHpDRg?pwd=talk',
      code: 'talk'
    },
    '外研社·一起点': {
      id: 'fltrp-together',
      link: 'https://pan.baidu.com/s/1girOir1Mx_pNOeQbc4i-iQ?pwd=talk',
      code: 'talk'
    },
    '外研社·三起点': {
      id: 'fltrp-three',
      link: 'https://pan.baidu.com/s/1ByBQ9O6tnX7bTwOifFq7Jg?pwd=talk',
      code: 'talk'
    },
    '译林版': {
      id: 'yilin',
      link: 'https://pan.baidu.com/s/1Vs2yD0438JUPvmMOK5F89w?pwd=talk',
      code: 'talk'
    },
    '沪教版': {
      id: 'shangjiao',
      link: 'https://pan.baidu.com/s/1H97VszvcHAaSTJlPLlGMbA?pwd=talk',
      code: 'talk'
    }
  },

  /**
   * Initialize validation manager with Supabase configuration
   * @param {string} supabaseUrl - Supabase project URL
   * @param {string} supabaseAnonKey - Supabase anonymous key
   */
  init(supabaseUrl, supabaseAnonKey) {
    this.SUPABASE_URL = supabaseUrl;
    this.SUPABASE_ANON_KEY = supabaseAnonKey;
  },

  /**
   * Validate version selection
   * @param {string} version - Selected version name
   * @returns {Object} Validation result with isValid and message
   */
  validateVersion(version) {
    if (!version || typeof version !== 'string') {
      return {
        isValid: false,
        message: '请选择一个教材版本'
      };
    }

    if (!this.VERSION_DATA[version]) {
      return {
        isValid: false,
        message: '选择的教材版本无效'
      };
    }

    return {
      isValid: true,
      message: '',
      version: version,
      data: this.VERSION_DATA[version]
    };
  },

  /**
   * Get all available versions
   * @returns {Array} Array of version names
   */
  getAvailableVersions() {
    return Object.keys(this.VERSION_DATA);
  },

  /**
   * Get version data by name
   * @param {string} versionName - Version name
   * @returns {Object|null} Version data or null
   */
  getVersionData(versionName) {
    return this.VERSION_DATA[versionName] || null;
  },

  /**
   * Validate the entire claim form
   * @param {Object} formData - Form data object
   * @returns {Object} Validation result
   */
  validateClaimForm(formData) {
    const { version } = formData;

    // Validate version
    const versionValidation = this.validateVersion(version);
    if (!versionValidation.isValid) {
      return versionValidation;
    }

    // Additional client-side validations can be added here

    return {
      isValid: true,
      message: '验证通过',
      version: version,
      data: versionValidation.data
    };
  },

  /**
   * Process claim request with server validation
   * @param {string} version - Selected version
   * @returns {Promise<Object>} Claim result
   */
  async processClaim(version) {
    try {
      // Validate input first
      const validation = this.validateVersion(version);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.message,
          type: 'validation_error'
        };
      }

      // Check local restriction first
      if (StorageManager.hasValidClaim()) {
        return {
          success: false,
          error: '您已在本设备领取过资料，无需重复领取',
          type: 'device_restricted'
        };
      }

      // Call server API for validation
      const serverResult = await this.validateWithServer(version);

      if (serverResult.success) {
        // Store claim info locally on success
        StorageManager.setClaimInfo(version);

        return {
          success: true,
          version: version,
          versionData: validation.data,
          serverData: serverResult.data
        };
      } else {
        return serverResult;
      }
    } catch (error) {
      console.error('Claim processing error:', error);
      return {
        success: false,
        error: '网络错误，请稍后再试',
        type: 'network_error',
        details: error.message
      };
    }
  },

  /**
   * Validate claim with server (IP-based restriction)
   * @param {string} version - Selected version
   * @returns {Promise<Object>} Server validation result
   */
  async validateWithServer(version) {
    try {
      // Demo mode: simulate successful validation
      if (this.demoMode) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Return successful demo response
        return {
          success: true,
          data: {
            ip_address: '127.0.0.1',
            claimed_version: version,
            claimed_at: new Date().toISOString()
          }
        };
      }

      // Call Supabase Edge Function
      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/validate-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          version: version,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 429) {
          return {
            success: false,
            error: '当前网络领取人数过多，请稍后再试或更换网络环境',
            type: 'ip_restricted'
          };
        } else if (response.status === 400) {
          return {
            success: false,
            error: errorData.message || '请求参数无效',
            type: 'validation_error'
          };
        } else {
          return {
            success: false,
            error: '服务器错误，请稍后再试',
            type: 'server_error'
          };
        }
      }

      const result = await response.json();

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('Server validation error:', error);

      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: '网络连接失败，请检查网络后重试',
          type: 'network_error'
        };
      }

      // Handle timeout
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: '请求超时，请稍后再试',
          type: 'timeout_error'
        };
      }

      return {
        success: false,
        error: '未知错误，请稍后再试',
        type: 'unknown_error'
      };
    }
  },

  /**
   * Check if claim is possible without processing
   * @param {string} version - Selected version
   * @returns {Promise<Object>} Check result
   */
  async checkClaimEligibility(version) {
    try {
      // Local check
      if (StorageManager.hasValidClaim()) {
        return {
          canClaim: false,
          reason: 'device_restricted',
          message: '您已在本设备领取过资料',
          remainingDays: StorageManager.getRemainingDays()
        };
      }

      // Version validation
      const versionValidation = this.validateVersion(version);
      if (!versionValidation.isValid) {
        return {
          canClaim: false,
          reason: 'invalid_version',
          message: versionValidation.message
        };
      }

      // Server check (optional - can be skipped for performance)
      const serverCheck = await this.validateWithServer(version);

      return {
        canClaim: serverCheck.success,
        reason: serverCheck.success ? null : serverCheck.type,
        message: serverCheck.success ? null : serverCheck.error
      };

    } catch (error) {
      console.error('Eligibility check error:', error);
      return {
        canClaim: false,
        reason: 'check_error',
        message: '无法验证领取资格，请稍后再试'
      };
    }
  },

  /**
   * Format error message for user display
   * @param {Object} error - Error object
   * @returns {string} Formatted error message
   */
  formatErrorMessage(error) {
    const messages = {
      device_restricted: '您已在本设备领取过资料，无需重复领取',
      ip_restricted: '当前网络领取人数过多，请稍后再试或更换网络环境',
      validation_error: error.error || '输入信息有误，请检查后重试',
      network_error: '网络连接失败，请检查网络后重试',
      timeout_error: '请求超时，请稍后再试',
      server_error: '服务器暂时不可用，请稍后再试',
      unknown_error: '未知错误，请稍后再试'
    };

    return messages[error.type] || messages.unknown_error;
  },

  /**
   * Debounce function to prevent multiple rapid submissions
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * Create a timeout promise
   * @param {number} ms - Timeout in milliseconds
   * @returns {Promise} Promise that rejects after timeout
   */
  createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), ms);
    });
  },

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Sanitize user input
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeInput(input) {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .slice(0, 100); // Limit length
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ValidationManager;
}