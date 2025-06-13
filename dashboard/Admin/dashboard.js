/**
 * Dashboard Main Controller
 * Handles dashboard initialization, data loading, and module management
 */

// Dashboard configuration
const DASHBOARD_CONFIG = {
    refreshInterval: 60000, // 60 seconds
    requiredInspectionsPerDay: 5,
    maxRetries: 3,
    retryDelay: 2000
};

// Dashboard state
let dashboardState = {
    currentModule: 'minimap',
    refreshCountdown: 60,
    isLoading: false,
    lastDataUpdate: null,
    retryCount: 0
};

// Timer references
let refreshTimer = null;
let countdownTimer = null;

/**
 * Initialize Dashboard
 */
async function initializeDashboard() {
    console.log("📢 Initializing Dashboard...");
    
    try {
        // Wait for dependencies
        await waitForDependencies();
        
        // Initialize UI components
        initializeUI();
        
        // Load initial data
        await loadDashboardData();
        
        // Setup timers
        startRefreshTimer();
        startCountdownTimer();
        
        // Setup realtime subscriptions
        setupRealtimeUpdates();
        
        console.log("✅ Dashboard initialization complete!");
        
    } catch (err) {
        console.error("❌ Dashboard initialization failed:", err);
        showErrorMessage("Dashboard kon niet worden geladen. Probeer de pagina te vernieuwen.");
    }
}

/**
 * Wait for required dependencies to load
 */
async function waitForDependencies() {
    const maxWait = 10000; // 10 seconds
    const checkInterval = 100;
    let waited = 0;
    
    while (waited < maxWait) {
        if (window.supabaseClient && window.AuthManager) {
            return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
    }
    
    throw new Error("Required dependencies not loaded");
}

/**
 * Initialize UI components and event handlers
 */
function initializeUI() {
    console.log("🎨 Initializing UI components...");
    
    // Module navigation
    setupModuleNavigation();
    
    // Manual refresh button
    setupRefreshButton();
    
    // Export buttons
    setupExportButtons();
    
    // Modal handlers
    setupModalHandlers();
    
    console.log("✅ UI components initialized");
}

/**
 * Setup module navigation
 */
function setupModuleNavigation() {
    const moduleButtons = document.querySelectorAll("[id^='module-']");
    const moduleContents = document.querySelectorAll("[id^='content-']");
    const minimapFilters = document.getElementById("minimap-filters");
    
    moduleButtons.forEach(button => {
        button.addEventListener("click", function() {
            const moduleId = this.id.replace("module-", "");
            switchModule(moduleId, moduleButtons, moduleContents, minimapFilters);
        });
    });
}

/**
 * Switch between dashboard modules
 */
function switchModule(moduleId, moduleButtons, moduleContents, minimapFilters) {
    console.log(`🔄 Switching to module: ${moduleId}`);
    
    dashboardState.currentModule = moduleId;
    
    // Update button styling
    moduleButtons.forEach(btn => {
        if (btn.id === `module-${moduleId}`) {
            btn.classList.remove("bg-gray-200", "text-gray-600");
            btn.classList.add("bg-red-800", "text-white");
        } else {
            btn.classList.remove("bg-red-800", "text-white");
            btn.classList.add("bg-gray-200", "text-gray-600");
        }
    });
    
    // Show selected content
    moduleContents.forEach(content => {
        if (content.id === `content-${moduleId}`) {
            content.classList.remove("hidden");
        } else {
            content.classList.add("hidden");
        }
    });
    
    // Show/hide filters for minimap
    if (minimapFilters) {
        if (moduleId === "minimap") {
            minimapFilters.classList.remove("hidden");
        } else {
            minimapFilters.classList.add("hidden");
        }
    }
    
    // Load module-specific data
    loadModuleData(moduleId);
}

/**
 * Load data specific to a module
 */
async function loadModuleData(moduleId) {
    switch (moduleId) {
        case 'analytics':
            await loadAnalyticsData();
            break;
        case 'reports':
            // Reports are static for now
            break;
        case 'minimap':
        default:
            // Minimap data is loaded by main dashboard
            break;
    }
}

/**
 * Setup manual refresh button
 */
function setupRefreshButton() {
    const refreshButton = document.getElementById("refresh-data");
    
    if (refreshButton) {
        refreshButton.addEventListener("click", async function() {
            this.disabled = true;
            this.innerHTML = '<span class="loading-spinner"></span> Laden...';
            
            await loadDashboardData();
            
            this.disabled = false;
            this.innerHTML = 'Ververs';
        });
    }
}

/**
 * Load main dashboard data
 */
async function loadDashboardData() {
    if (dashboardState.isLoading) {
        console.log("⏳ Data loading already in progress...");
        return;
    }
    
    dashboardState.isLoading = true;
    
    try {
        console.log("📡 Loading dashboard data...");
        
        const client = window.supabaseClient;
        if (!client) {
            throw new Error("Supabase client not available");
        }
        
        // Load machines
        const machinesPromise = client
            .from("machines")
            .select("id, name, status");
        
        // Load today's inspections
        const today = new Date().toISOString().split("T")[0];
        const inspectionsPromise = client
            .from("quality_control")
            .select("machine_id, created_at")
            .gte("created_at", `${today}T00:00:00Z`)
            .lte("created_at", `${today}T23:59:59Z`);
        
        // Load today's open problems
        const problemsPromise = client
            .from("probleem_meldingen")
            .select("machine_id")
            .gte("datum_tijd", `${today} 00:00:00`)
            .lte("datum_tijd", `${today} 23:59:59`)
            .eq("oplossing_gevonden", false);
        
        // Execute all queries
        const [machinesResult, inspectionsResult, problemsResult] = await Promise.all([
            machinesPromise,
            inspectionsPromise,
            problemsPromise
        ]);
        
        // Handle errors
        if (machinesResult.error) throw machinesResult.error;
        if (inspectionsResult.error) throw inspectionsResult.error;
        if (problemsResult.error) throw problemsResult.error;
        
        // Process data
        const machines = machinesResult.data || [];
        const inspections = inspectionsResult.data || [];
        const problems = problemsResult.data || [];
        
        console.log("✅ Data loaded:", { 
            machines: machines.length, 
            inspections: inspections.length, 
            problems: problems.length 
        });
        
        // Update machine map
        updateMachineMap(machines, inspections, problems);
        
        // Update analytics if on analytics module
        if (dashboardState.currentModule === 'analytics') {
            updateAnalytics(inspections, problems);
        }
        
        // Reset retry count on success
        dashboardState.retryCount = 0;
        dashboardState.lastDataUpdate = new Date();
        
    } catch (err) {
        console.error("❌ Error loading dashboard data:", err);
        handleDataLoadError(err);
    } finally {
        dashboardState.isLoading = false;
    }
}

/**
 * Update machine map display
 */
function updateMachineMap(machines, inspections, problems) {
    const machineMap = document.getElementById("machine-map");
    if (!machineMap) return;
    
    // Count inspections and problems per machine
    const inspectionCounts = {};
    const problemCounts = {};
    
    inspections.forEach(inspection => {
        const machineId = parseInt(inspection.machine_id);
        inspectionCounts[machineId] = (inspectionCounts[machineId] || 0) + 1;
    });
    
    problems.forEach(problem => {
        const machineId = problem.machine_id;
        problemCounts[machineId] = (problemCounts[machineId] || 0) + 1;
    });
    
    // Clear existing content
    machineMap.innerHTML = '';
    
    if (machines && machines.length > 0) {
        machines.forEach(machine => {
            // Skip inactive machines
            if (machine.status === "inactief") {
                console.log(`⏸️ Skipping inactive machine ${machine.id}`);
                return;
            }
            
            const inspectionCount = inspectionCounts[machine.id] || 0;
            const problemCount = problemCounts[machine.id] || 0;
            
            const machineElement = createMachineElement(machine, inspectionCount, problemCount);
            machineMap.appendChild(machineElement);
        });
        
        console.log(`🛠 ${machines.filter(m => m.status !== 'inactief').length} active machines displayed`);
    } else {
        showNoDataMessage(machineMap);
    }
    
    // Reset refresh countdown
    dashboardState.refreshCountdown = 60;
    updateRefreshTimer();
}

/**
 * Create machine element
 */
function createMachineElement(machine, inspectionCount, problemCount) {
    const inspectionColor = inspectionCount >= DASHBOARD_CONFIG.requiredInspectionsPerDay ? "status-green" : "status-red";
    const problemColor = problemCount === 0 ? "status-gray" : "status-orange";
    
    const machineDiv = document.createElement("div");
    machineDiv.className = "machine-block fade-in";
    machineDiv.dataset.machineId = machine.id;
    
    machineDiv.innerHTML = `
        <span class="machine-id">${machine.id}</span>
        <div class="status-dot status-dot-left ${inspectionColor}">${inspectionCount}</div>
        <div class="status-dot status-dot-right ${problemColor}">${problemCount}</div>
        <div class="machine-buttons">
            <button class="machine-button" onclick="openInspectionForm(${machine.id})">
                Inspectie
            </button>
            <button class="machine-button" onclick="openProblemForm(${machine.id})">
                Probleem
            </button>
        </div>
    `;
    
    // Add click handler for machine details (excluding buttons)
    machineDiv.addEventListener("click", function(e) {
        if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
            showMachineDetail(machine.id);
        }
    });
    
    return machineDiv;
}

/**
 * Show no data message
 */
function showNoDataMessage(container) {
    const noDataMessage = document.createElement("div");
    noDataMessage.className = "col-span-full text-center text-gray-500 py-8";
    noDataMessage.innerHTML = `
        <p class="text-lg mb-2">Geen machinegegevens beschikbaar</p>
        <button onclick="loadDashboardData()" class="text-red-600 hover:text-red-800">
            Probeer opnieuw
        </button>
    `;
    container.appendChild(noDataMessage);
}

/**
 * Handle data loading errors with retry mechanism
 */
async function handleDataLoadError(error) {
    dashboardState.retryCount++;
    
    if (dashboardState.retryCount < DASHBOARD_CONFIG.maxRetries) {
        console.log(`🔄 Retrying data load (${dashboardState.retryCount}/${DASHBOARD_CONFIG.maxRetries})...`);
        
        setTimeout(() => {
            loadDashboardData();
        }, DASHBOARD_CONFIG.retryDelay * dashboardState.retryCount);
    } else {
        console.error("❌ Max retries reached, showing error message");
        showErrorMessage(`
            Er is een fout opgetreden bij het laden van de gegevens.
            <br><small>${error.message}</small>
            <br><button onclick="location.reload()" class="mt-2 px-4 py-2 bg-red-600 text-white rounded">
                Pagina vernieuwen
            </button>
        `);
    }
}

/**
 * Show error message to user
 */
function showErrorMessage(message) {
    const machineMap = document.getElementById("machine-map");
    if (machineMap) {
        machineMap.innerHTML = `
            <div class="col-span-full text-center text-red-600 py-8">
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    ${message}
                </div>
            </div>
        `;
    }
}

/**
 * Setup refresh timer
 */
function startRefreshTimer() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(async () => {
        console.log("⏳ Automatic refresh triggered...");
        await loadDashboardData();
    }, DASHBOARD_CONFIG.refreshInterval);
    
    console.log("✅ Refresh timer started");
}

/**
 * Setup countdown timer
 */
function startCountdownTimer() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    
    countdownTimer = setInterval(() => {
        dashboardState.refreshCountdown--;
        updateRefreshTimer();
        
        if (dashboardState.refreshCountdown <= 0) {
            dashboardState.refreshCountdown = 60;
        }
    }, 1000);
}

/**
 * Update refresh timer display
 */
function updateRefreshTimer() {
    const refreshTimerElement = document.getElementById("refresh-timer");
    if (refreshTimerElement) {
        refreshTimerElement.textContent = `Volgende refresh: ${dashboardState.refreshCountdown}s`;
    }
}

/**
 * Setup realtime updates
 */
function setupRealtimeUpdates() {
    if (window.SupabaseManager) {
        window.SupabaseManager.setupRealtimeSubscriptions((table, payload) => {
            console.log(`🔄 Realtime update from ${table}:`, payload);
            
            // Debounce rapid updates
            clearTimeout(window.realtimeUpdateTimer);
            window.realtimeUpdateTimer = setTimeout(() => {
                loadDashboardData();
            }, 1000);
        });
        
        console.log("✅ Realtime subscriptions setup");
    }
}

/**
 * Load analytics data
 */
async function loadAnalyticsData() {
    try {
        const client = window.supabaseClient;
        if (!client) return;
        
        const today = new Date().toISOString().split("T")[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        
        // Today's inspections
        const { data: todayInspections } = await client
            .from("quality_control")
            .select("id")
            .gte("created_at", `${today}T00:00:00Z`)
            .lte("created_at", `${today}T23:59:59Z`);
        
        // Week's problems
        const { data: weekProblems } = await client
            .from("probleem_meldingen")
            .select("id")
            .gte("datum_tijd", `${weekAgo} 00:00:00`);
        
        updateAnalytics(todayInspections || [], weekProblems || []);
        
    } catch (err) {
        console.error("❌ Error loading analytics:", err);
    }
}

/**
 * Update analytics display
 */
function updateAnalytics(inspections, problems) {
    const todayInspectionsElement = document.getElementById("today-inspections");
    const weekProblemsElement = document.getElementById("week-problems");
    
    if (todayInspectionsElement) {
        todayInspectionsElement.textContent = inspections.length || 0;
    }
    
    if (weekProblemsElement) {
        weekProblemsElement.textContent = problems.length || 0;
    }
}

/**
 * Setup export buttons
 */
function setupExportButtons() {
    // Machine export
    const exportMachinesBtn = document.getElementById("export-machines");
    if (exportMachinesBtn) {
        exportMachinesBtn.addEventListener("click", exportMachineData);
    }
    
    // Report exports
    const exportButtons = [
        { id: "export-today", handler: () => exportInspections("today") },
        { id: "export-week", handler: () => exportInspections("week") },
        { id: "export-month", handler: () => exportInspections("month") },
        { id: "export-problems-open", handler: () => exportProblems("open") },
        { id: "export-problems-all", handler: () => exportProblems("all") }
    ];
    
    exportButtons.forEach(({ id, handler }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener("click", handler);
        }
    });
}

/**
 * Export machine data to CSV
 */
async function exportMachineData() {
    try {
        const client = window.supabaseClient;
        if (!client) return;
        
        const { data: machines } = await client.from("machines").select("*");
        
        if (machines && machines.length > 0) {
            const csv = convertToCSV(machines);
            downloadCSV(csv, `machines_${new Date().toISOString().split('T')[0]}.csv`);
        }
    } catch (err) {
        console.error("❌ Error exporting machines:", err);
        alert("Fout bij exporteren van machinegegevens");
    }
}

/**
 * Export inspections data
 */
async function exportInspections(period) {
    try {
        const client = window.supabaseClient;
        if (!client) return;
        
        const dateRange = getDateRange(period);
        
        const { data: inspections } = await client
            .from("quality_control")
            .select("*")
            .gte("created_at", dateRange.start)
            .lte("created_at", dateRange.end);
        
        if (inspections && inspections.length > 0) {
            const csv = convertToCSV(inspections);
            downloadCSV(csv, `inspections_${period}_${new Date().toISOString().split('T')[0]}.csv`);
        } else {
            alert("Geen inspectiegegevens gevonden voor de geselecteerde periode");
        }
    } catch (err) {
        console.error("❌ Error exporting inspections:", err);
        alert("Fout bij exporteren van inspectiegegevens");
    }
}

/**
 * Export problems data
 */
async function exportProblems(type) {
    try {
        const client = window.supabaseClient;
        if (!client) return;
        
        let query = client.from("probleem_meldingen").select("*");
        
        if (type === "open") {
            query = query.eq("oplossing_gevonden", false);
        }
        
        const { data: problems } = await query;
        
        if (problems && problems.length > 0) {
            const csv = convertToCSV(problems);
            downloadCSV(csv, `problems_${type}_${new Date().toISOString().split('T')[0]}.csv`);
        } else {
            alert("Geen probleemgegevens gevonden");
        }
    } catch (err) {
        console.error("❌ Error exporting problems:", err);
        alert("Fout bij exporteren van probleemgegevens");
    }
}

/**
 * Get date range for export periods
 */
function getDateRange(period) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    switch (period) {
        case 'today':
            return {
                start: `${today}T00:00:00Z`,
                end: `${today}T23:59:59Z`
            };
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return {
                start: `${weekAgo.toISOString().split('T')[0]}T00:00:00Z`,
                end: `${today}T23:59:59Z`
            };
        case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return {
                start: `${monthAgo.toISOString().split('T')[0]}T00:00:00Z`,
                end: `${today}T23:59:59Z`
            };
        default:
            return {
                start: `${today}T00:00:00Z`,
                end: `${today}T23:59:59Z`
            };
    }
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(',')
        )
    ].join('\n');
    
    return csvContent;
}

/**
 * Download CSV file
 */
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Setup modal handlers
 */
function setupModalHandlers() {
    const modal = document.getElementById("machine-detail-modal");
    const closeButton = document.getElementById("close-detail-modal");
    
    if (closeButton) {
        closeButton.addEventListener("click", function() {
            modal.classList.add("hidden");
            document.body.classList.remove("overflow-hidden");
        });
    }
    
    // Close modal on background click
    if (modal) {
        modal.addEventListener("click", function(e) {
            if (e.target === modal) {
                modal.classList.add("hidden");
                document.body.classList.remove("overflow-hidden");
            }
        });
    }
}

/**
 * Cleanup timers and subscriptions
 */
function cleanup() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    
    if (window.realtimeUpdateTimer) {
        clearTimeout(window.realtimeUpdateTimer);
    }
    
    console.log("🧹 Dashboard cleanup complete");
}

// Global functions for button handlers
window.openInspectionForm = function(machineId) {
    console.log(`🔍 Opening inspection form for machine ${machineId}`);
    window.location.href = `/product-inspection.html?machineId=${machineId}`;
};

window.openProblemForm = function(machineId) {
    console.log(`🔍 Opening problem form for machine ${machineId}`);
    window.location.href = `/problem-notification.html?machineId=${machineId}`;
};

window.showMachineDetail = function(machineId) {
    console.log(`🔍 Showing details for machine ${machineId}`);
    if (window.ModalManager) {
        window.ModalManager.showMachineDetail(machineId);
    }
};

// Export dashboard functions
window.DashboardManager = {
    init: initializeDashboard,
    loadData: loadDashboardData,
    cleanup,
    getState: () => dashboardState
};

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function() {
    console.log("📢 DOM loaded, starting dashboard...");
    
    // Wait a bit for other modules to load
    setTimeout(() => {
        initializeDashboard();
    }, 500);
});

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);