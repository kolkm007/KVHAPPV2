/**
 * Report Scheduler Module
 * Handles automatic scheduling of daily and weekly reports
 */

// Scheduler Configuration
const SCHEDULER_CONFIG = {
    defaultSendTime: '22:00',
    checkInterval: 60000, // Check every minute
    weeklyDay: 5, // Friday (0=Sunday, 1=Monday, etc.)
    gracePeriod: 300000, // 5 minutes grace period
    maxRetries: 3,
    retryDelay: 600000, // 10 minutes between retries
    timeZone: 'Europe/Amsterdam'
};

// Scheduler state
let schedulerState = {
    isActive: false,
    checkTimer: null,
    nextDailyReport: null,
    nextWeeklyReport: null,
    lastDailyAttempt: null,
    lastWeeklyAttempt: null,
    dailyRetryCount: 0,
    weeklyRetryCount: 0,
    settings: null
};

/**
 * Initialize Report Scheduler
 */
async function initializeScheduler() {
    console.log("⏰ Initializing Report Scheduler...");
    
    try {
        // Load scheduler settings
        await loadSchedulerSettings();
        
        if (schedulerState.settings?.reportsEnabled) {
            startScheduler();
        } else {
            console.log("📊 Report scheduler disabled in settings");
        }
        
        // Update next report times
        updateNextReportTimes();
        
        console.log("✅ Report scheduler initialized");
        
    } catch (err) {
        console.error("❌ Error initializing scheduler:", err);
    }
}

/**
 * Start the automatic scheduler
 */
function startScheduler() {
    if (schedulerState.isActive) {
        console.log("⏰ Scheduler already active");
        return;
    }
    
    console.log("🚀 Starting report scheduler...");
    
    // Start checking every minute
    schedulerState.checkTimer = setInterval(checkScheduledReports, SCHEDULER_CONFIG.checkInterval);
    schedulerState.isActive = true;
    
    console.log("✅ Report scheduler started - checking every minute");
    
    // Immediate check
    setTimeout(checkScheduledReports, 5000);
}

/**
 * Stop the automatic scheduler
 */
function stopScheduler() {
    if (!schedulerState.isActive) {
        console.log("⏰ Scheduler already stopped");
        return;
    }
    
    console.log("🛑 Stopping report scheduler...");
    
    if (schedulerState.checkTimer) {
        clearInterval(schedulerState.checkTimer);
        schedulerState.checkTimer = null;
    }
    
    schedulerState.isActive = false;
    console.log("✅ Report scheduler stopped");
}

/**
 * Main scheduler check function - runs every minute
 */
async function checkScheduledReports() {
    try {
        const now = new Date();
        const currentTime = formatTime(now);
        const dayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday
        
        console.log(`⏰ Scheduler check at ${currentTime} (Day: ${dayOfWeek})`);
        
        // Reload settings periodically
        if (!schedulerState.settings || Math.random() < 0.01) { // 1% chance to reload
            await loadSchedulerSettings();
        }
        
        if (!schedulerState.settings?.reportsEnabled) {
            console.log("📊 Reports disabled, skipping checks");
            return;
        }
        
        const sendTime = schedulerState.settings.sendTime || SCHEDULER_CONFIG.defaultSendTime;
        
        // Check if it's time to send reports
        if (isTimeToSend(currentTime, sendTime)) {
            console.log(`🎯 It's time to send reports! (${sendTime})`);
            
            // Check for daily reports (Monday-Friday)
            if (isWorkDay(dayOfWeek)) {
                await handleDailyReport(now);
            }
            
            // Check for weekly reports (Friday only)
            if (dayOfWeek === SCHEDULER_CONFIG.weeklyDay && schedulerState.settings.weeklyReportsEnabled) {
                await handleWeeklyReport(now);
            }
        }
        
        // Handle retries for failed reports
        await handleRetries(now);
        
        // Update next report times for UI
        updateNextReportTimes();
        
    } catch (err) {
        console.error("❌ Error in scheduler check:", err);
    }
}

/**
 * Handle daily report sending
 */
async function handleDailyReport(currentTime) {
    try {
        // Check if already sent today
        const alreadySent = await window.EmailReports.isDailyReportSentToday();
        if (alreadySent) {
            console.log("📧 Daily report already sent today");
            return;
        }
        
        // Check if we already attempted today (avoid spam)
        const today = currentTime.toISOString().split('T')[0];
        if (schedulerState.lastDailyAttempt === today) {
            console.log("📧 Daily report already attempted today");
            return;
        }
        
        console.log("📧 Sending scheduled daily report...");
        
        const recipients = schedulerState.settings.recipients || [];
        if (recipients.length === 0) {
            console.error("❌ No recipients configured for daily report");
            return;
        }
        
        // Attempt to send
        const success = await window.EmailReports.sendDailyReport(recipients, currentTime);
        
        if (success) {
            console.log("✅ Daily report sent successfully");
            schedulerState.lastDailyAttempt = today;
            schedulerState.dailyRetryCount = 0;
            
            // Update settings with last sent time
            await updateLastReportTime('daily', currentTime);
            
        } else {
            throw new Error("Daily report sending failed");
        }
        
    } catch (err) {
        console.error("❌ Error sending daily report:", err);
        
        // Schedule retry
        schedulerState.dailyRetryCount++;
        schedulerState.lastDailyAttempt = currentTime.toISOString().split('T')[0];
        
        if (schedulerState.dailyRetryCount <= SCHEDULER_CONFIG.maxRetries) {
            console.log(`🔄 Scheduling daily report retry ${schedulerState.dailyRetryCount}/${SCHEDULER_CONFIG.maxRetries}`);
        } else {
            console.error("❌ Daily report max retries exceeded");
        }
    }
}

/**
 * Handle weekly report sending
 */
async function handleWeeklyReport(currentTime) {
    try {
        // Check if already sent this week
        const alreadySent = await window.EmailReports.isWeeklyReportSentThisWeek();
        if (alreadySent) {
            console.log("📧 Weekly report already sent this week");
            return;
        }
        
        // Check if we already attempted this week
        const weekKey = getWeekKey(currentTime);
        if (schedulerState.lastWeeklyAttempt === weekKey) {
            console.log("📧 Weekly report already attempted this week");
            return;
        }
        
        console.log("📧 Sending scheduled weekly report...");
        
        const recipients = schedulerState.settings.recipients || [];
        if (recipients.length === 0) {
            console.error("❌ No recipients configured for weekly report");
            return;
        }
        
        // Attempt to send
        const success = await window.EmailReports.sendWeeklyReport(recipients, currentTime);
        
        if (success) {
            console.log("✅ Weekly report sent successfully");
            schedulerState.lastWeeklyAttempt = weekKey;
            schedulerState.weeklyRetryCount = 0;
            
            // Update settings with last sent time
            await updateLastReportTime('weekly', currentTime);
            
        } else {
            throw new Error("Weekly report sending failed");
        }
        
    } catch (err) {
        console.error("❌ Error sending weekly report:", err);
        
        // Schedule retry
        schedulerState.weeklyRetryCount++;
        schedulerState.lastWeeklyAttempt = getWeekKey(currentTime);
        
        if (schedulerState.weeklyRetryCount <= SCHEDULER_CONFIG.maxRetries) {
            console.log(`🔄 Scheduling weekly report retry ${schedulerState.weeklyRetryCount}/${SCHEDULER_CONFIG.maxRetries}`);
        } else {
            console.error("❌ Weekly report max retries exceeded");
        }
    }
}

/**
 * Handle retry attempts for failed reports
 */
async function handleRetries(currentTime) {
    const now = currentTime.getTime();
    
    // Daily report retries
    if (schedulerState.dailyRetryCount > 0 && 
        schedulerState.dailyRetryCount <= SCHEDULER_CONFIG.maxRetries) {
        
        const lastAttemptTime = new Date(schedulerState.lastDailyAttempt + 'T' + schedulerState.settings.sendTime).getTime();
        const timeSinceLastAttempt = now - lastAttemptTime;
        
        if (timeSinceLastAttempt >= SCHEDULER_CONFIG.retryDelay) {
            console.log(`🔄 Retrying daily report (attempt ${schedulerState.dailyRetryCount + 1})`);
            await handleDailyReport(currentTime);
        }
    }
    
    // Weekly report retries
    if (schedulerState.weeklyRetryCount > 0 && 
        schedulerState.weeklyRetryCount <= SCHEDULER_CONFIG.maxRetries) {
        
        // Calculate last Friday's datetime
        const lastFriday = getLastFriday(currentTime);
        const lastAttemptTime = new Date(lastFriday.getTime() + parseTime(schedulerState.settings.sendTime)).getTime();
        const timeSinceLastAttempt = now - lastAttemptTime;
        
        if (timeSinceLastAttempt >= SCHEDULER_CONFIG.retryDelay) {
            console.log(`🔄 Retrying weekly report (attempt ${schedulerState.weeklyRetryCount + 1})`);
            await handleWeeklyReport(currentTime);
        }
    }
}

/**
 * Load scheduler settings from database/localStorage
 */
async function loadSchedulerSettings() {
    try {
        const settings = await window.EmailReports.getEmailSettings();
        schedulerState.settings = settings;
        
        console.log("📋 Scheduler settings loaded:", {
            enabled: settings.reportsEnabled,
            sendTime: settings.sendTime,
            weeklyEnabled: settings.weeklyReportsEnabled,
            recipients: settings.recipients?.length || 0
        });
        
        return settings;
        
    } catch (err) {
        console.error("❌ Error loading scheduler settings:", err);
        return {};
    }
}

/**
 * Update last report time in settings
 */
async function updateLastReportTime(reportType, timestamp) {
    try {
        const settings = schedulerState.settings || {};
        
        if (reportType === 'daily') {
            settings.lastDailyReport = timestamp.toISOString();
        } else if (reportType === 'weekly') {
            settings.lastWeeklyReport = timestamp.toISOString();
        }
        
        // Save to database if possible
        const client = window.supabaseClient;
        if (client) {
            await client
                .from('settings')
                .upsert({
                    category: 'email_reports',
                    settings_json: JSON.stringify(settings),
                    updated_at: new Date().toISOString()
                });
        }
        
        // Save to localStorage as backup
        localStorage.setItem('emailReportSettings', JSON.stringify(settings));
        schedulerState.settings = settings;
        
    } catch (err) {
        console.error("❌ Error updating last report time:", err);
    }
}

/**
 * Check if it's time to send reports
 */
function isTimeToSend(currentTime, sendTime) {
    const [targetHour, targetMinute] = sendTime.split(':').map(Number);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if we're within the target minute
    if (currentHour === targetHour && currentMinute === targetMinute) {
        return true;
    }
    
    // Grace period check - allow sending a few minutes late
    const currentSeconds = (currentHour * 3600) + (currentMinute * 60) + now.getSeconds();
    const targetSeconds = (targetHour * 3600) + (targetMinute * 60);
    const timeDiff = currentSeconds - targetSeconds;
    
    // Allow sending within grace period (5 minutes)
    return timeDiff > 0 && timeDiff <= (SCHEDULER_CONFIG.gracePeriod / 1000);
}

/**
 * Check if current day is a work day (Monday-Friday)
 */
function isWorkDay(dayOfWeek) {
    return dayOfWeek >= 0 && dayOfWeek <= 6; // Monday=1, Friday=5
}

/**
 * Format time as HH:MM
 */
function formatTime(date) {
    return date.toTimeString().substring(0, 5);
}

/**
 * Parse time string to milliseconds since midnight
 */
function parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours * 3600 + minutes * 60) * 1000;
}

/**
 * Get week key for tracking weekly attempts
 */
function getWeekKey(date) {
    const year = date.getFullYear();
    const weekNumber = getWeekNumber(date);
    return `${year}-W${weekNumber}`;
}

/**
 * Get ISO week number
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Get last Friday's date
 */
function getLastFriday(date) {
    const friday = new Date(date);
    const dayOfWeek = friday.getDay();
    
    if (dayOfWeek >= 5) { // Today or after Friday
        friday.setDate(friday.getDate() - (dayOfWeek - 5));
    } else { // Before Friday
        friday.setDate(friday.getDate() - (dayOfWeek + 2));
    }
    
    return friday;
}

/**
 * Update next report times for UI display
 */
function updateNextReportTimes() {
    const now = new Date();
    const sendTime = schedulerState.settings?.sendTime || SCHEDULER_CONFIG.defaultSendTime;
    
    // Calculate next daily report time
    schedulerState.nextDailyReport = calculateNextReportTime(now, sendTime, 'daily');
    
    // Calculate next weekly report time (next Friday)
    if (schedulerState.settings?.weeklyReportsEnabled) {
        schedulerState.nextWeeklyReport = calculateNextReportTime(now, sendTime, 'weekly');
    } else {
        schedulerState.nextWeeklyReport = null;
    }
}

/**
 * Calculate next report time
 */
function calculateNextReportTime(from, sendTime, type) {
    const [hour, minute] = sendTime.split(':').map(Number);
    const next = new Date(from);
    
    next.setHours(hour, minute, 0, 0);
    
    if (type === 'daily') {
        // Next workday
        do {
            if (next <= from) {
                next.setDate(next.getDate() + 1);
            }
        } while (!isWorkDay(next.getDay()));
        
    } else if (type === 'weekly') {
        // Next Friday
        const daysUntilFriday = (5 - next.getDay() + 7) % 7;
        if (daysUntilFriday === 0 && next <= from) {
            next.setDate(next.getDate() + 7); // Next Friday
        } else {
            next.setDate(next.getDate() + daysUntilFriday);
        }
    }
    
    return next;
}

/**
 * Get scheduler status for UI
 */
function getSchedulerStatus() {
    return {
        isActive: schedulerState.isActive,
        settings: schedulerState.settings,
        nextDailyReport: schedulerState.nextDailyReport,
        nextWeeklyReport: schedulerState.nextWeeklyReport,
        lastDailyAttempt: schedulerState.lastDailyAttempt,
        lastWeeklyAttempt: schedulerState.lastWeeklyAttempt,
        dailyRetryCount: schedulerState.dailyRetryCount,
        weeklyRetryCount: schedulerState.weeklyRetryCount
    };
}

/**
 * Manually trigger daily report (for testing)
 */
async function triggerDailyReport() {
    console.log("🔧 Manually triggering daily report...");
    
    if (!schedulerState.settings?.recipients?.length) {
        throw new Error("Geen ontvangers ingesteld");
    }
    
    return await window.EmailReports.sendDailyReport(
        schedulerState.settings.recipients,
        new Date()
    );
}

/**
 * Manually trigger weekly report (for testing)
 */
async function triggerWeeklyReport() {
    console.log("🔧 Manually triggering weekly report...");
    
    if (!schedulerState.settings?.recipients?.length) {
        throw new Error("Geen ontvangers ingesteld");
    }
    
    return await window.EmailReports.sendWeeklyReport(
        schedulerState.settings.recipients,
        new Date()
    );
}

// Export scheduler functions
window.ReportScheduler = {
    initializeScheduler,
    startScheduler,
    stopScheduler,
    getSchedulerStatus,
    triggerDailyReport,
    triggerWeeklyReport,
    loadSchedulerSettings
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("⏰ Report Scheduler module loaded");
    
    // Initialize scheduler after other modules
    setTimeout(() => {
        initializeScheduler().catch(err => {
            console.warn("⚠️ Scheduler initialization postponed:", err.message);
        });
    }, 3000);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log("👁️ Page hidden - scheduler continues in background");
    } else {
        console.log("👁️ Page visible - checking scheduler status");
        
        // Reload settings and update times when page becomes visible
        setTimeout(() => {
            if (schedulerState.isActive) {
                loadSchedulerSettings().then(() => {
                    updateNextReportTimes();
                });
            }
        }, 1000);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (schedulerState.checkTimer) {
        clearInterval(schedulerState.checkTimer);
    }
});