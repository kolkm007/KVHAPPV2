/**
 * Authentication Module
 * Handles user authentication, session management, and access control
 */

// Authentication configuration
const AUTH_CONFIG = {
    sessionTimeout: 5 * 60 * 1000, // 5 minutes in milliseconds
    refreshInterval: 60 * 1000, // Check session every minute
    storageKeys: {
        userName: 'userName',
        loginTimestamp: 'loginTimestamp',
        userRole: 'userRole'
    }
};

// Session management
let sessionCheckInterval = null;

/**
 * Initialize authentication system
 */
function initAuth() {
    console.log('🔐 Initializing authentication system...');
    
    // Check existing session
    const isValidSession = checkSession();
    
    if (isValidSession) {
        console.log('✅ Valid session found');
        displayUserInfo();
        startSessionMonitoring();
    } else {
        console.log('❌ No valid session found');
        redirectToLogin();
    }
    
    // Setup logout handler
    setupLogoutHandler();
}

/**
 * Check if current session is valid
 * @returns {boolean} Session validity
 */
function checkSession() {
    try {
        const userName = localStorage.getItem(AUTH_CONFIG.storageKeys.userName);
        const loginTimestamp = localStorage.getItem(AUTH_CONFIG.storageKeys.loginTimestamp);
        
        console.log('🔍 Checking session:', { userName, loginTimestamp });
        
        if (!userName || !loginTimestamp) {
            console.log('⚠️ Missing session data');
            return false;
        }
        
        const currentTime = Date.now();
        const timeSinceLogin = currentTime - parseInt(loginTimestamp);
        
        console.log(`⏱ Time since login: ${timeSinceLogin}ms | Timeout: ${AUTH_CONFIG.sessionTimeout}ms`);
        
        if (timeSinceLogin > AUTH_CONFIG.sessionTimeout) {
            console.log('⏰ Session expired');
            clearSession();
            return false;
        }
        
        return true;
    } catch (err) {
        console.error('❌ Error checking session:', err);
        clearSession();
        return false;
    }
}

/**
 * Display user information in the interface
 */
function displayUserInfo() {
    try {
        const userName = localStorage.getItem(AUTH_CONFIG.storageKeys.userName);
        const userRole = localStorage.getItem(AUTH_CONFIG.storageKeys.userRole) || 'Admin';
        
        const adminNameElement = document.getElementById('admin-name');
        const userRoleElement = document.getElementById('user-role');
        
        if (adminNameElement) {
            adminNameElement.textContent = userName || 'Onbekend';
        }
        
        if (userRoleElement) {
            userRoleElement.textContent = `(${userRole})`;
        }
        
        console.log(`👤 User displayed: ${userName} (${userRole})`);
    } catch (err) {
        console.error('❌ Error displaying user info:', err);
    }
}

/**
 * Clear session data and redirect to login
 */
function clearSession() {
    try {
        Object.values(AUTH_CONFIG.storageKeys).forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('🧹 Session data cleared');
    } catch (err) {
        console.error('❌ Error clearing session:', err);
    }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    console.log('🔄 Redirecting to login page...');
    window.location.href = '/index.html';
}

/**
 * Setup logout button handler
 */
function setupLogoutHandler() {
    const logoutButton = document.getElementById('logout-button');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
        console.log('✅ Logout handler setup complete');
    } else {
        console.warn('⚠️ Logout button not found');
    }
}

/**
 * Perform logout
 */
function logout() {
    console.log('🚪 Logging out user...');
    
    // Stop session monitoring
    stopSessionMonitoring();
    
    // Clear session data
    clearSession();
    
    // Show logout message (optional)
    showNotification('Succesvol uitgelogd', 'success');
    
    // Redirect to login
    setTimeout(() => {
        redirectToLogin();
    }, 1000);
}

/**
 * Start session monitoring
 */
function startSessionMonitoring() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
    
    sessionCheckInterval = setInterval(() => {
        if (!checkSession()) {
            console.log('⏰ Session expired during monitoring');
            showNotification('Sessie verlopen. Je wordt uitgelogd...', 'warning');
            setTimeout(() => {
                redirectToLogin();
            }, 2000);
        }
    }, AUTH_CONFIG.refreshInterval);
    
    console.log('✅ Session monitoring started');
}

/**
 * Stop session monitoring
 */
function stopSessionMonitoring() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
        console.log('🛑 Session monitoring stopped');
    }
}

/**
 * Extend session (refresh timestamp)
 */
function extendSession() {
    try {
        const userName = localStorage.getItem(AUTH_CONFIG.storageKeys.userName);
        
        if (userName) {
            localStorage.setItem(AUTH_CONFIG.storageKeys.loginTimestamp, Date.now().toString());
            console.log('🔄 Session extended');
            return true;
        }
        
        return false;
    } catch (err) {
        console.error('❌ Error extending session:', err);
        return false;
    }
}

/**
 * Get current user information
 * @returns {Object|null} User info or null if not logged in
 */
function getCurrentUser() {
    try {
        const userName = localStorage.getItem(AUTH_CONFIG.storageKeys.userName);
        const userRole = localStorage.getItem(AUTH_CONFIG.storageKeys.userRole);
        const loginTimestamp = localStorage.getItem(AUTH_CONFIG.storageKeys.loginTimestamp);
        
        if (!userName || !loginTimestamp) {
            return null;
        }
        
        return {
            name: userName,
            role: userRole || 'Admin',
            loginTime: new Date(parseInt(loginTimestamp))
        };
    } catch (err) {
        console.error('❌ Error getting current user:', err);
        return null;
    }
}

/**
 * Check if user has specific role
 * @param {string} requiredRole - Required role
 * @returns {boolean} Has role
 */
function hasRole(requiredRole) {
    const user = getCurrentUser();
    return user && user.role === requiredRole;
}

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, warning, error)
 */
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('auth-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'auth-notification';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 1rem;
            z-index: 1001;
            padding: 1rem;
            border-radius: 0.5rem;
            font-weight: 600;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(notification);
    }
    
    // Set notification style based on type
    const styles = {
        success: 'background-color: #10B981; color: white;',
        warning: 'background-color: #F59E0B; color: white;',
        error: 'background-color: #EF4444; color: white;',
        info: 'background-color: #3B82F6; color: white;'
    };
    
    notification.style.cssText += styles[type] || styles.info;
    notification.textContent = message;
    
    // Show notification
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
    
    // Hide after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
    }, 5000);
}

/**
 * Activity tracking to extend session on user interaction
 */
function setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    let lastActivity = Date.now();
    
    const activityHandler = () => {
        const now = Date.now();
        if (now - lastActivity > 60000) { // Only extend if 1 minute passed
            extendSession();
            lastActivity = now;
        }
    };
    
    events.forEach(event => {
        document.addEventListener(event, activityHandler, { passive: true });
    });
    
    console.log('✅ Activity tracking setup complete');
}

// Export auth functions
window.AuthManager = {
    init: initAuth,
    checkSession,
    logout,
    extendSession,
    getCurrentUser,
    hasRole,
    clearSession,
    startSessionMonitoring,
    stopSessionMonitoring
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Starting authentication...');
    initAuth();
    setupActivityTracking();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopSessionMonitoring();
});