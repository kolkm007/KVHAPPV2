/**
 * Modal Management Module
 * Handles machine detail modal, tabs, and data loading
 */

// Modal state
let modalState = {
    currentMachineId: null,
    activeTab: 'inspections',
    isLoading: false
};

/**
 * Initialize modal functionality
 */
function initializeModal() {
    console.log("🪟 Initializing modal functionality...");
    
    setupModalEventHandlers();
    setupTabHandlers();
    setupModalActionButtons();
    
    console.log("✅ Modal functionality initialized");
}

/**
 * Setup modal event handlers
 */
function setupModalEventHandlers() {
    const modal = document.getElementById("machine-detail-modal");
    const closeButton = document.getElementById("close-detail-modal");
    
    // Close button handler
    if (closeButton) {
        closeButton.addEventListener("click", closeModal);
    }
    
    // Background click handler
    if (modal) {
        modal.addEventListener("click", function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Escape key handler
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && !modal.classList.contains("hidden")) {
            closeModal();
        }
    });
}

/**
 * Setup tab handlers
 */
function setupTabHandlers() {
    const tabInspections = document.getElementById("tab-inspections");
    const tabProblems = document.getElementById("tab-problems");
    
    if (tabInspections) {
        tabInspections.addEventListener("click", () => switchTab('inspections'));
    }
    
    if (tabProblems) {
        tabProblems.addEventListener("click", () => switchTab('problems'));
    }
}

/**
 * Setup modal action buttons
 */
function setupModalActionButtons() {
    const addInspectionBtn = document.getElementById("add-inspection-btn");
    const addProblemBtn = document.getElementById("add-problem-btn");
    const exportInspectionsBtn = document.getElementById("export-machine-inspections");
    const exportProblemsBtn = document.getElementById("export-machine-problems");
    
    if (addInspectionBtn) {
        addInspectionBtn.addEventListener("click", function() {
            if (modalState.currentMachineId) {
                window.location.href = `/product-inspection.html?machineId=${modalState.currentMachineId}`;
            }
        });
    }
    
    if (addProblemBtn) {
        addProblemBtn.addEventListener("click", function() {
            if (modalState.currentMachineId) {
                window.location.href = `/problem-notification.html?machineId=${modalState.currentMachineId}`;
            }
        });
    }
    
    if (exportInspectionsBtn) {
        exportInspectionsBtn.addEventListener("click", () => exportMachineData('inspections'));
    }
    
    if (exportProblemsBtn) {
        exportProblemsBtn.addEventListener("click", () => exportMachineData('problems'));
    }
}

/**
 * Show machine detail modal
 * @param {number} machineId - Machine ID to show details for
 */
async function showMachineDetail(machineId) {
    console.log(`🔍 Showing details for machine ${machineId}`);
    
    modalState.currentMachineId = machineId;
    
    // Update modal title
    const detailMachineId = document.getElementById("detail-machine-id");
    if (detailMachineId) {
        detailMachineId.textContent = machineId;
    }
    
    // Show modal
    const modal = document.getElementById("machine-detail-modal");
    if (modal) {
        modal.classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
    }
    
    // Reset to inspections tab
    switchTab('inspections');
    
    // Load data for both tabs
    await Promise.all([
        loadMachineInspections(machineId),
        loadMachineProblems(machineId)
    ]);
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById("machine-detail-modal");
    if (modal) {
        modal.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
    }
    
    // Reset state
    modalState.currentMachineId = null;
    modalState.activeTab = 'inspections';
    
    console.log("🚪 Modal closed");
}

/**
 * Switch between tabs
 * @param {string} tabName - Tab name ('inspections' or 'problems')
 */
function switchTab(tabName) {
    console.log(`📋 Switching to ${tabName} tab`);
    
    modalState.activeTab = tabName;
    
    const tabInspections = document.getElementById("tab-inspections");
    const tabProblems = document.getElementById("tab-problems");
    const inspectionsContent = document.getElementById("inspections-content");
    const problemsContent = document.getElementById("problems-content");
    
    // Update tab styling
    if (tabInspections && tabProblems) {
        if (tabName === 'inspections') {
            // Activate inspections tab
            tabInspections.classList.add("border-red-800", "text-red-800");
            tabInspections.classList.remove("border-transparent", "hover:text-red-800", "hover:border-red-300");
            
            // Deactivate problems tab
            tabProblems.classList.remove("border-red-800", "text-red-800");
            tabProblems.classList.add("border-transparent", "hover:text-red-800", "hover:border-red-300");
        } else {
            // Activate problems tab
            tabProblems.classList.add("border-red-800", "text-red-800");
            tabProblems.classList.remove("border-transparent", "hover:text-red-800", "hover:border-red-300");
            
            // Deactivate inspections tab
            tabInspections.classList.remove("border-red-800", "text-red-800");
            tabInspections.classList.add("border-transparent", "hover:text-red-800", "hover:border-red-300");
        }
    }
    
    // Show/hide content
    if (inspectionsContent && problemsContent) {
        if (tabName === 'inspections') {
            inspectionsContent.classList.remove("hidden");
            problemsContent.classList.add("hidden");
        } else {
            problemsContent.classList.remove("hidden");
            inspectionsContent.classList.add("hidden");
        }
    }
}

/**
 * Load machine inspections
 * @param {number} machineId - Machine ID
 */
async function loadMachineInspections(machineId) {
    console.log(`📋 Loading inspections for machine ${machineId}`);
    
    const inspectionsList = document.getElementById("inspections-list");
    if (!inspectionsList) return;
    
    // Show loading state
    inspectionsList.innerHTML = `
        <div class="text-center text-gray-500 py-4">
            <span class="loading-spinner"></span>
            Inspecties laden...
        </div>
    `;
    
    try {
        const client = window.supabaseClient;
        if (!client) {
            throw new Error("Supabase client not available");
        }
        
        const { data: inspections, error } = await client
            .from("quality_control")
            .select("*")
            .eq("machine_id", machineId)
            .order("created_at", { ascending: false })
            .limit(20);
        
        if (error) {
            throw error;
        }
        
        displayInspections(inspections || []);
        
    } catch (err) {
        console.error("❌ Error loading inspections:", err);
        inspectionsList.innerHTML = `
            <div class="text-center text-red-500 py-4">
                <p>Fout bij het laden van inspecties</p>
                <button onclick="loadMachineInspections(${machineId})" class="mt-2 text-sm text-red-600 hover:text-red-800">
                    Probeer opnieuw
                </button>
            </div>
        `;
    }
}

/**
 * Display inspections in the list
 * @param {Array} inspections - Array of inspection data
 */
function displayInspections(inspections) {
    const inspectionsList = document.getElementById("inspections-list");
    if (!inspectionsList) return;
    
    if (inspections.length === 0) {
        inspectionsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <p>Geen inspecties gevonden voor deze machine</p>
            </div>
        `;
        return;
    }
    
    inspectionsList.innerHTML = '';
    
    inspections.forEach(inspection => {
        const inspectionElement = createInspectionElement(inspection);
        inspectionsList.appendChild(inspectionElement);
    });
    
    console.log(`✅ ${inspections.length} inspections displayed`);
}

/**
 * Create inspection element from template
 * @param {Object} inspection - Inspection data
 * @returns {HTMLElement} Inspection element
 */
function createInspectionElement(inspection) {
    const template = document.getElementById('inspection-item-template');
    if (!template) {
        console.error("❌ Inspection template not found");
        return document.createElement('div');
    }
    
    const inspectionItem = template.content.cloneNode(true);
    
    // Fill in data
    inspectionItem.querySelector('.inspection-id').textContent = inspection.id || '-';
    
    // Format date
    if (inspection.created_at) {
        const createdDate = new Date(inspection.created_at);
        const formattedDate = createdDate.toLocaleString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        inspectionItem.querySelector('.inspection-date').textContent = formattedDate;
    }
    
    // Product and employee info
    inspectionItem.querySelector('.product-number').textContent = inspection.product_number || 'Onbekend';
    inspectionItem.querySelector('.employee-name').textContent = inspection.employee_name || 'Onbekend';
    
    // Weights
    inspectionItem.querySelector('.current-weight').textContent = `${inspection.current_weight || 0} g`;
    inspectionItem.querySelector('.control-weight').textContent = `${inspection.control_weight || 0} g`;
    
    // Requirements badge
    const meetsRequirementsBadge = inspectionItem.querySelector('.meets-requirements-badge');
    if (inspection.meets_requirements) {
        meetsRequirementsBadge.textContent = 'Voldoet';
        meetsRequirementsBadge.classList.add('badge-success');
    } else {
        meetsRequirementsBadge.textContent = 'Voldoet niet';
        meetsRequirementsBadge.classList.add('badge-danger');
    }
    
    // Comments
    const commentsElem = inspectionItem.querySelector('.inspection-comments');
    if (inspection.comments && inspection.comments.trim() !== '') {
        commentsElem.textContent = inspection.comments;
    } else {
        commentsElem.textContent = 'Geen opmerkingen';
        commentsElem.classList.add('text-gray-500', 'italic');
    }
    
    // Check badges
    if (inspection.pallet_check) {
        const badge = inspectionItem.querySelector('.pallet-check-badge');
        badge.classList.remove('hidden');
        badge.classList.add('badge-success');
    }
    
    if (inspection.label_check) {
        const badge = inspectionItem.querySelector('.label-check-badge');
        badge.classList.remove('hidden');
        badge.classList.add('badge-success');
    }
    
    if (inspection.sticker_check) {
        const badge = inspectionItem.querySelector('.sticker-check-badge');
        badge.classList.remove('hidden');
        badge.classList.add('badge-success');
    }
    
    return inspectionItem;
}

/**
 * Load machine problems
 * @param {number} machineId - Machine ID
 */
async function loadMachineProblems(machineId) {
    console.log(`📋 Loading problems for machine ${machineId}`);
    
    const problemsList = document.getElementById("problems-list");
    if (!problemsList) return;
    
    // Show loading state
    problemsList.innerHTML = `
        <div class="text-center text-gray-500 py-4">
            <span class="loading-spinner"></span>
            Probleemmeldingen laden...
        </div>
    `;
    
    try {
        const client = window.supabaseClient;
        if (!client) {
            throw new Error("Supabase client not available");
        }
        
        const { data: problems, error } = await client
            .from("probleem_meldingen")
            .select("*")
            .eq("machine_id", machineId)
            .order("datum_tijd", { ascending: false })
            .limit(20);
        
        if (error) {
            throw error;
        }
        
        displayProblems(problems || []);
        
    } catch (err) {
        console.error("❌ Error loading problems:", err);
        problemsList.innerHTML = `
            <div class="text-center text-red-500 py-4">
                <p>Fout bij het laden van probleemmeldingen</p>
                <button onclick="loadMachineProblems(${machineId})" class="mt-2 text-sm text-red-600 hover:text-red-800">
                    Probeer opnieuw
                </button>
            </div>
        `;
    }
}

/**
 * Display problems in the list
 * @param {Array} problems - Array of problem data
 */
function displayProblems(problems) {
    const problemsList = document.getElementById("problems-list");
    if (!problemsList) return;
    
    if (problems.length === 0) {
        problemsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <p>Geen probleemmeldingen gevonden voor deze machine</p>
            </div>
        `;
        return;
    }
    
    problemsList.innerHTML = '';
    
    problems.forEach(problem => {
        const problemElement = createProblemElement(problem);
        problemsList.appendChild(problemElement);
    });
    
    console.log(`✅ ${problems.length} problems displayed`);
}

/**
 * Create problem element from template
 * @param {Object} problem - Problem data
 * @returns {HTMLElement} Problem element
 */
function createProblemElement(problem) {
    const template = document.getElementById('problem-item-template');
    if (!template) {
        console.error("❌ Problem template not found");
        return document.createElement('div');
    }
    
    const problemItem = template.content.cloneNode(true);
    
    // Fill in data
    problemItem.querySelector('.problem-id').textContent = problem.id || '-';
    
    // Format date
    if (problem.datum_tijd) {
        const problemDate = new Date(problem.datum_tijd);
        const formattedDate = problemDate.toLocaleString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        problemItem.querySelector('.problem-date').textContent = formattedDate;
    }
    
    // Product and reporter info
    problemItem.querySelector('.productcode').textContent = problem.productcode || 'Onbekend';
    problemItem.querySelector('.reporter-name').textContent = problem.gebruiker_naam || 'Onbekend';
    
    // Status badge
    const statusBadge = problemItem.querySelector('.status-badge');
    if (problem.oplossing_gevonden) {
        statusBadge.textContent = 'Opgelost';
        statusBadge.classList.add('badge-success');
        
        // Show solution container
        const solutionContainer = problemItem.querySelector('.solution-container');
        solutionContainer.classList.remove('hidden');
        
        // Fill solution
        const solutionDescription = problemItem.querySelector('.solution-description');
        if (problem.oplossing_omschrijving && problem.oplossing_omschrijving.trim() !== '') {
            solutionDescription.textContent = problem.oplossing_omschrijving;
        } else {
            solutionDescription.textContent = 'Geen omschrijving van oplossing';
            solutionDescription.classList.add('text-gray-500', 'italic');
        }
    } else {
        statusBadge.textContent = 'Open';
        statusBadge.classList.add('badge-warning');
    }
    
    // Problem description
    const descriptionElem = problemItem.querySelector('.problem-description');
    if (problem.argumentatie && problem.argumentatie.trim() !== '') {
        descriptionElem.textContent = problem.argumentatie;
    } else {
        descriptionElem.textContent = 'Geen omschrijving';
        descriptionElem.classList.add('text-gray-500', 'italic');
    }
    
    return problemItem;
}

/**
 * Export machine-specific data
 * @param {string} type - Type to export ('inspections' or 'problems')
 */
async function exportMachineData(type) {
    if (!modalState.currentMachineId) {
        alert("Geen machine geselecteerd voor export");
        return;
    }
    
    try {
        const client = window.supabaseClient;
        if (!client) {
            throw new Error("Supabase client not available");
        }
        
        let data, filename;
        
        if (type === 'inspections') {
            const { data: inspections, error } = await client
                .from("quality_control")
                .select("*")
                .eq("machine_id", modalState.currentMachineId)
                .order("created_at", { ascending: false });
            
            if (error) throw error;
            
            data = inspections;
            filename = `machine_${modalState.currentMachineId}_inspections_${new Date().toISOString().split('T')[0]}.csv`;
        } else if (type === 'problems') {
            const { data: problems, error } = await client
                .from("probleem_meldingen")
                .select("*")
                .eq("machine_id", modalState.currentMachineId)
                .order("datum_tijd", { ascending: false });
            
            if (error) throw error;
            
            data = problems;
            filename = `machine_${modalState.currentMachineId}_problems_${new Date().toISOString().split('T')[0]}.csv`;
        }
        
        if (data && data.length > 0) {
            const csv = convertToCSV(data);
            downloadCSV(csv, filename);
        } else {
            alert(`Geen ${type === 'inspections' ? 'inspectie' : 'probleem'}gegevens gevonden voor machine ${modalState.currentMachineId}`);
        }
        
    } catch (err) {
        console.error(`❌ Error exporting ${type}:`, err);
        alert(`Fout bij exporteren van ${type === 'inspections' ? 'inspectie' : 'probleem'}gegevens`);
    }
}

/**
 * Convert data to CSV format
 * @param {Array} data - Data to convert
 * @returns {string} CSV string
 */
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                if (value === null || value === undefined) return '';
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(',')
        )
    ].join('\n');
    
    return csvContent;
}

/**
 * Download CSV file
 * @param {string} csv - CSV content
 * @param {string} filename - Filename
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
        URL.revokeObjectURL(url);
    }
}

/**
 * Refresh current modal data
 */
async function refreshModalData() {
    if (modalState.currentMachineId) {
        console.log(`🔄 Refreshing modal data for machine ${modalState.currentMachineId}`);
        
        if (modalState.activeTab === 'inspections') {
            await loadMachineInspections(modalState.currentMachineId);
        } else {
            await loadMachineProblems(modalState.currentMachineId);
        }
    }
}

/**
 * Get modal state
 * @returns {Object} Current modal state
 */
function getModalState() {
    return { ...modalState };
}

// Make modal functions globally available
window.ModalManager = {
    init: initializeModal,
    showMachineDetail,
    closeModal,
    switchTab,
    refreshModalData,
    getState: getModalState
};

// Global functions for backward compatibility
window.showMachineDetail = showMachineDetail;
window.loadMachineInspections = loadMachineInspections;
window.loadMachineProblems = loadMachineProblems;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("🪟 Initializing modal management...");
    initializeModal();
});