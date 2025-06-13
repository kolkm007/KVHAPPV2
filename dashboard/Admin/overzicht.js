/**
 * Overview Module
 * Handles dashboard overview functionality, analytics, and reporting
 */

// Overview configuration
const OVERVIEW_CONFIG = {
    refreshInterval: 30000, // 30 seconds for analytics
    chartUpdateDelay: 1000,
    maxDataPoints: 50,
    colors: {
        primary: '#920000',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6'
    }
};

// Overview state
let overviewState = {
    analytics: {
        todayInspections: 0,
        weekProblems: 0,
        monthlyTrend: [],
        lastAnalyticsUpdate: null
    },
    isInitialized: false
};

/**
 * Initialize overview functionality
 */
function initializeOverview() {
    console.log("📊 Initializing overview...");
    
    setupAnalytics();
    setupReporting();
    setupDarkMode();
    
    overviewState.isInitialized = true;
    console.log("✅ Overview initialized");
}

/**
 * Setup analytics functionality
 */
function setupAnalytics() {
    console.log("📈 Setting up analytics...");
    
    // Load initial analytics data
    loadAnalyticsData();
    
    // Setup periodic refresh for analytics
    setInterval(() => {
        if (isDashboardVisible() && getCurrentModule() === 'analytics') {
            loadAnalyticsData();
        }
    }, OVERVIEW_CONFIG.refreshInterval);
}

/**
 * Load analytics data from database
 */
async function loadAnalyticsData() {
    try {
        const client = window.supabaseClient;
        if (!client) {
            console.warn("⚠️ Supabase client not available for analytics");
            return;
        }
        
        console.log("📊 Loading analytics data...");
        
        // Date ranges
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Parallel data loading
        const [
            todayInspectionsResult,
            weekProblemsResult,
            monthlyTrendResult
        ] = await Promise.all([
            // Today's inspections
            client
                .from('quality_control')
                .select('id, created_at, meets_requirements')
                .gte('created_at', `${today}T00:00:00Z`)
                .lte('created_at', `${today}T23:59:59Z`),
            
            // Week's problems
            client
                .from('probleem_meldingen')
                .select('id, datum_tijd, oplossing_gevonden')
                .gte('datum_tijd', `${weekAgo} 00:00:00`),
            
            // Monthly trend data
            client
                .from('quality_control')
                .select('created_at, meets_requirements')
                .gte('created_at', `${monthAgo}T00:00:00Z`)
                .order('created_at', { ascending: true })
        ]);
        
        // Process results
        const todayInspections = todayInspectionsResult.data || [];
        const weekProblems = weekProblemsResult.data || [];
        const monthlyData = monthlyTrendResult.data || [];
        
        // Update state
        overviewState.analytics = {
            todayInspections: todayInspections.length,
            weekProblems: weekProblems.filter(p => !p.oplossing_gevonden).length,
            monthlyTrend: processMonthlyTrend(monthlyData),
            qualityRate: calculateQualityRate(todayInspections),
            lastAnalyticsUpdate: new Date()
        };
        
        // Update UI
        updateAnalyticsDisplay();
        
        console.log("✅ Analytics data loaded successfully");
        
    } catch (err) {
        console.error("❌ Error loading analytics data:", err);
        showAnalyticsError();
    }
}

/**
 * Process monthly trend data
 * @param {Array} data - Raw monthly data
 * @returns {Array} Processed trend data
 */
function processMonthlyTrend(data) {
    if (!data || data.length === 0) return [];
    
    // Group by day
    const dailyData = {};
    
    data.forEach(item => {
        const date = item.created_at.split('T')[0];
        if (!dailyData[date]) {
            dailyData[date] = { total: 0, passed: 0 };
        }
        dailyData[date].total++;
        if (item.meets_requirements) {
            dailyData[date].passed++;
        }
    });
    
    // Convert to chart format
    return Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14) // Last 14 days
        .map(([date, stats]) => ({
            date: new Date(date).toLocaleDateString('nl-NL', { 
                month: 'short', 
                day: 'numeric' 
            }),
            inspections: stats.total,
            qualityRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0
        }));
}

/**
 * Calculate quality rate
 * @param {Array} inspections - Inspection data
 * @returns {number} Quality rate percentage
 */
function calculateQualityRate(inspections) {
    if (!inspections || inspections.length === 0) return 0;
    
    const passed = inspections.filter(i => i.meets_requirements).length;
    return Math.round((passed / inspections.length) * 100);
}

/**
 * Update analytics display
 */
function updateAnalyticsDisplay() {
    const { analytics } = overviewState;
    
    // Update basic stats
    updateElement('today-inspections', analytics.todayInspections);
    updateElement('week-problems', analytics.weekProblems);
    
    // Update quality rate if element exists
    const qualityRateElement = document.getElementById('quality-rate');
    if (qualityRateElement && analytics.qualityRate !== undefined) {
        qualityRateElement.textContent = `${analytics.qualityRate}%`;
        
        // Add color coding
        qualityRateElement.className = qualityRateElement.className.replace(/text-(green|yellow|red)-\d+/g, '');
        if (analytics.qualityRate >= 90) {
            qualityRateElement.classList.add('text-green-600');
        } else if (analytics.qualityRate >= 70) {
            qualityRateElement.classList.add('text-yellow-600');
        } else {
            qualityRateElement.classList.add('text-red-600');
        }
    }
    
    // Update last update time
    const lastUpdateElement = document.getElementById('analytics-last-update');
    if (lastUpdateElement && analytics.lastAnalyticsUpdate) {
        const timeString = analytics.lastAnalyticsUpdate.toLocaleTimeString('nl-NL', {
            hour: '2-digit',
            minute: '2-digit'
        });
        lastUpdateElement.textContent = `Laatst bijgewerkt: ${timeString}`;
    }
    
    console.log("📊 Analytics display updated");
}

/**
 * Update element text content safely
 * @param {string} id - Element ID
 * @param {any} value - Value to set
 */
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Show analytics error state
 */
function showAnalyticsError() {
    const analyticsContainer = document.getElementById('content-analytics');
    if (!analyticsContainer) return;
    
    const errorHTML = `
        <div class="text-center py-8">
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <h3 class="text-lg font-semibold text-red-800 mb-2">Fout bij laden analytics</h3>
                <p class="text-red-600 mb-4">
                    Er is een probleem opgetreden bij het laden van de analytische gegevens.
                </p>
                <button onclick="loadAnalyticsData()" 
                        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Opnieuw proberen
                </button>
            </div>
        </div>
    `;
    
    // Only replace content in analytics module, not the entire container
    const existingContent = analyticsContainer.querySelector('.grid');
    if (existingContent) {
        existingContent.insertAdjacentHTML('afterend', errorHTML);
    }
}

/**
 * Setup reporting functionality
 */
function setupReporting() {
    console.log("📋 Setting up reporting...");
    
    // Export button handlers are setup in dashboard.js
    // This function can be extended for more advanced reporting features
    
    setupReportScheduling();
    setupCustomReports();
}

/**
 * Setup report scheduling (placeholder for future feature)
 */
function setupReportScheduling() {
    // Placeholder for future scheduled reporting feature
    console.log("📅 Report scheduling ready for implementation");
}

/**
 * Setup custom reports (placeholder for future feature)
 */
function setupCustomReports() {
    // Placeholder for future custom report builder
    console.log("🛠️ Custom reports ready for implementation");
}

/**
 * Setup dark mode functionality
 */
function setupDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (!darkModeToggle) return;
    
    // Check for saved preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }
    
    darkModeToggle.addEventListener('click', function() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark);
        this.textContent = isDark ? '☀️' : '🌙';
        
        console.log(`🌙 Dark mode ${isDark ? 'enabled' : 'disabled'}`);
    });
    
    console.log("✅ Dark mode setup complete");
}

/**
 * Check if dashboard is currently visible
 * @returns {boolean} Visibility status
 */
function isDashboardVisible() {
    return !document.hidden && document.visibilityState === 'visible';
}

/**
 * Get current active module
 * @returns {string} Current module name
 */
function getCurrentModule() {
    const activeButton = document.querySelector('[id^="module-"].bg-red-800');
    if (activeButton) {
        return activeButton.id.replace('module-', '');
    }
    return 'minimap'; // default
}

/**
 * Generate summary report
 * @returns {Object} Summary report data
 */
function generateSummaryReport() {
    const { analytics } = overviewState;
    const stats = window.FilterManager?.getStats() || {};
    const machineStats = window.MinimapManager?.getStats() || {};
    
    return {
        timestamp: new Date().toISOString(),
        summary: {
            totalMachines: stats.total || 0,
            todayInspections: analytics.todayInspections,
            openProblems: analytics.weekProblems,
            qualityRate: analytics.qualityRate,
            healthyMachines: machineStats.healthy || 0
        },
        details: {
            machinesWithProblems: machineStats.withProblems || 0,
            machinesWithTasks: machineStats.withTasks || 0,
            filteredMachines: stats.filtered || 0
        },
        trends: analytics.monthlyTrend,
        lastUpdate: analytics.lastAnalyticsUpdate
    };
}

/**
 * Export dashboard overview as JSON
 */
function exportOverviewData() {
    const report = generateSummaryReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { 
        type: 'application/json' 
    });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dashboard_overview_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(link.href);
    console.log("📤 Overview data exported");
}

/**
 * Get dashboard health status
 * @returns {Object} Health status
 */
function getDashboardHealth() {
    const now = Date.now();
    const { analytics } = overviewState;
    
    const health = {
        status: 'healthy',
        issues: [],
        lastUpdate: analytics.lastAnalyticsUpdate,
        uptime: now - (analytics.lastAnalyticsUpdate?.getTime() || now)
    };
    
    // Check for issues
    if (analytics.weekProblems > 5) {
        health.issues.push('High number of open problems');
        health.status = 'warning';
    }
    
    if (analytics.qualityRate < 70) {
        health.issues.push('Low quality rate');
        health.status = 'critical';
    }
    
    if (!analytics.lastAnalyticsUpdate || (now - analytics.lastAnalyticsUpdate.getTime()) > 300000) {
        health.issues.push('Analytics data outdated');
        health.status = 'warning';
    }
    
    return health;
}

/**
 * Clean up overview resources
 */
function cleanup() {
    // Clear any running timers
    // (Main timers are managed by dashboard.js)
    
    console.log("🧹 Overview cleanup complete");
}

// Export overview functions
window.OverviewManager = {
    init: initializeOverview,
    loadAnalytics: loadAnalyticsData,
    generateReport: generateSummaryReport,
    exportData: exportOverviewData,
    getHealth: getDashboardHealth,
    getState: () => ({ ...overviewState }),
    cleanup
};

// Global functions for compatibility
window.loadAnalyticsData = loadAnalyticsData;
window.exportOverviewData = exportOverviewData;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("📊 Initializing overview management...");
    
    // Wait for other modules to initialize first
    setTimeout(() => {
        initializeOverview();
    }, 1500);
});

// Handle visibility changes to pause/resume analytics updates
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log("👁️ Dashboard hidden, pausing analytics updates");
    } else {
        console.log("👁️ Dashboard visible, resuming analytics updates");
        // Immediate update when becoming visible
        if (getCurrentModule() === 'analytics') {
            setTimeout(loadAnalyticsData, 1000);
        }
    }
});