/**
 * Filters Module
 * Handles search and filtering functionality for the machine dashboard
 */

// Filter state
let filterState = {
    searchTerm: '',
    showProblems: false,
    showTasks: false,
    lastFilterTime: null
};

// Debounce timer for search
let searchDebounceTimer = null;

/**
 * Initialize filters functionality
 */
function initializeFilters() {
    console.log("🔍 Initializing filters...");
    
    setupSearchHandler();
    setupFilterCheckboxes();
    
    console.log("✅ Filters initialized");
}

/**
 * Setup search input handler with debouncing
 */
function setupSearchHandler() {
    const searchInput = document.getElementById("search-machine");
    const searchFeedback = document.getElementById("search-feedback");
    
    if (!searchInput) {
        console.warn("⚠️ Search input not found");
        return;
    }
    
    searchInput.addEventListener("input", function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        // Clear previous timer
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        
        // Show searching feedback for non-empty searches
        if (searchTerm && searchFeedback) {
            searchFeedback.textContent = "Zoeken...";
            searchFeedback.className = "text-sm text-blue-500";
        }
        
        // Debounce search to avoid too many filter operations
        searchDebounceTimer = setTimeout(() => {
            filterState.searchTerm = searchTerm;
            performFiltering();
            updateSearchFeedback(searchTerm, searchFeedback);
        }, 300); // 300ms debounce
    });
    
    // Clear search on Escape key
    searchInput.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            this.value = "";
            filterState.searchTerm = "";
            performFiltering();
            updateSearchFeedback("", searchFeedback);
        }
    });
    
    console.log("✅ Search handler setup complete");
}

/**
 * Update search feedback message
 * @param {string} searchTerm - Current search term
 * @param {HTMLElement} feedbackElement - Feedback element
 */
function updateSearchFeedback(searchTerm, feedbackElement) {
    if (!feedbackElement) return;
    
    if (!searchTerm) {
        feedbackElement.textContent = "";
        return;
    }
    
    const machineMap = document.getElementById("machine-map");
    if (!machineMap) return;
    
    const visibleMachines = Array.from(machineMap.children).filter(child => 
        child.classList.contains('machine-block') && 
        child.style.display !== 'none'
    );
    
    const totalMachines = Array.from(machineMap.children).filter(child => 
        child.classList.contains('machine-block')
    );
    
    if (visibleMachines.length === 0) {
        feedbackElement.textContent = `Geen machines gevonden voor "${searchTerm}"`;
        feedbackElement.className = "text-sm text-orange-500";
    } else if (visibleMachines.length === totalMachines.length) {
        feedbackElement.textContent = `Alle machines getoond`;
        feedbackElement.className = "text-sm text-gray-500";
    } else {
        feedbackElement.textContent = `${visibleMachines.length} van ${totalMachines.length} machines getoond`;
        feedbackElement.className = "text-sm text-green-600";
    }
}

/**
 * Setup filter checkboxes
 */
function setupFilterCheckboxes() {
    const filterProblem = document.getElementById("filter-problem");
    const filterTasks = document.getElementById("filter-tasks");
    
    if (filterProblem) {
        filterProblem.addEventListener("change", function() {
            filterState.showProblems = this.checked;
            performFiltering();
            console.log(`🔍 Problem filter: ${this.checked ? 'enabled' : 'disabled'}`);
        });
    } else {
        console.warn("⚠️ Problem filter checkbox not found");
    }
    
    if (filterTasks) {
        filterTasks.addEventListener("change", function() {
            filterState.showTasks = this.checked;
            performFiltering();
            console.log(`🔍 Tasks filter: ${this.checked ? 'enabled' : 'disabled'}`);
        });
    } else {
        console.warn("⚠️ Tasks filter checkbox not found");
    }
    
    console.log("✅ Filter checkboxes setup complete");
}

/**
 * Perform filtering on machine blocks
 */
function performFiltering() {
    const machineMap = document.getElementById("machine-map");
    if (!machineMap) {
        console.warn("⚠️ Machine map not found for filtering");
        return;
    }
    
    const machineBlocks = Array.from(machineMap.children).filter(child => 
        child.classList.contains('machine-block')
    );
    
    if (machineBlocks.length === 0) {
        console.log("ℹ️ No machines to filter");
        return;
    }
    
    let visibleCount = 0;
    filterState.lastFilterTime = Date.now();
    
    machineBlocks.forEach(machineBlock => {
        const shouldShow = shouldShowMachine(machineBlock);
        
        if (shouldShow) {
            machineBlock.style.display = "flex";
            machineBlock.classList.add("fade-in");
            visibleCount++;
        } else {
            machineBlock.style.display = "none";
            machineBlock.classList.remove("fade-in");
        }
    });
    
    console.log(`🔍 Filtering complete: ${visibleCount}/${machineBlocks.length} machines visible`);
    
    // Update search feedback after filtering
    const searchFeedback = document.getElementById("search-feedback");
    updateSearchFeedback(filterState.searchTerm, searchFeedback);
}

/**
 * Determine if a machine should be shown based on current filters
 * @param {HTMLElement} machineBlock - Machine block element
 * @returns {boolean} Whether the machine should be shown
 */
function shouldShowMachine(machineBlock) {
    // Search filter
    if (filterState.searchTerm) {
        const machineIdElement = machineBlock.querySelector('.machine-id');
        if (!machineIdElement) return false;
        
        const machineId = machineIdElement.textContent.toLowerCase();
        if (!machineId.includes(filterState.searchTerm)) {
            return false;
        }
    }
    
    // Status filters
    const { showProblems, showTasks } = filterState;
    
    // If no status filters are active, show all (that pass search)
    if (!showProblems && !showTasks) {
        return true;
    }
    
    // Check machine status indicators
    const leftDot = machineBlock.querySelector(".status-dot-left");
    const rightDot = machineBlock.querySelector(".status-dot-right");
    
    const hasRedInspectionStatus = leftDot && leftDot.classList.contains("status-red");
    const hasProblems = rightDot && rightDot.classList.contains("status-orange");
    
    // Apply status filters
    if (showProblems && showTasks) {
        // Show machines with either problems or incomplete inspections
        return hasRedInspectionStatus || hasProblems;
    } else if (showProblems) {
        // Show only machines with problems
        return hasProblems;
    } else if (showTasks) {
        // Show only machines with incomplete inspections
        return hasRedInspectionStatus;
    }
    
    return true;
}

/**
 * Clear all filters
 */
function clearFilters() {
    console.log("🧹 Clearing all filters...");
    
    // Clear search
    const searchInput = document.getElementById("search-machine");
    if (searchInput) {
        searchInput.value = "";
    }
    
    // Clear checkboxes
    const filterProblem = document.getElementById("filter-problem");
    const filterTasks = document.getElementById("filter-tasks");
    
    if (filterProblem) {
        filterProblem.checked = false;
    }
    
    if (filterTasks) {
        filterTasks.checked = false;
    }
    
    // Reset state
    filterState = {
        searchTerm: '',
        showProblems: false,
        showTasks: false,
        lastFilterTime: Date.now()
    };
    
    // Apply clearing
    performFiltering();
    
    // Clear feedback
    const searchFeedback = document.getElementById("search-feedback");
    if (searchFeedback) {
        searchFeedback.textContent = "";
    }
    
    console.log("✅ All filters cleared");
}

/**
 * Apply preset filter combinations
 * @param {string} preset - Preset name ('problems', 'tasks', 'all', 'none')
 */
function applyFilterPreset(preset) {
    console.log(`🎯 Applying filter preset: ${preset}`);
    
    const filterProblem = document.getElementById("filter-problem");
    const filterTasks = document.getElementById("filter-tasks");
    
    switch (preset) {
        case 'problems':
            if (filterProblem) filterProblem.checked = true;
            if (filterTasks) filterTasks.checked = false;
            filterState.showProblems = true;
            filterState.showTasks = false;
            break;
            
        case 'tasks':
            if (filterProblem) filterProblem.checked = false;
            if (filterTasks) filterTasks.checked = true;
            filterState.showProblems = false;
            filterState.showTasks = true;
            break;
            
        case 'all':
            if (filterProblem) filterProblem.checked = true;
            if (filterTasks) filterTasks.checked = true;
            filterState.showProblems = true;
            filterState.showTasks = true;
            break;
            
        case 'none':
        default:
            clearFilters();
            return;
    }
    
    performFiltering();
}

/**
 * Get current filter state
 * @returns {Object} Current filter state
 */
function getFilterState() {
    return { ...filterState };
}

/**
 * Get filter statistics
 * @returns {Object} Filter statistics
 */
function getFilterStats() {
    const machineMap = document.getElementById("machine-map");
    if (!machineMap) return null;
    
    const allMachines = Array.from(machineMap.children).filter(child => 
        child.classList.contains('machine-block')
    );
    
    const visibleMachines = allMachines.filter(machine => 
        machine.style.display !== 'none'
    );
    
    const machinesWithProblems = allMachines.filter(machine => {
        const rightDot = machine.querySelector(".status-dot-right");
        return rightDot && rightDot.classList.contains("status-orange");
    });
    
    const machinesWithTasks = allMachines.filter(machine => {
        const leftDot = machine.querySelector(".status-dot-left");
        return leftDot && leftDot.classList.contains("status-red");
    });
    
    return {
        total: allMachines.length,
        visible: visibleMachines.length,
        withProblems: machinesWithProblems.length,
        withTasks: machinesWithTasks.length,
        filtered: allMachines.length - visibleMachines.length
    };
}

/**
 * Refresh filters (re-apply current filter state)
 */
function refreshFilters() {
    console.log("🔄 Refreshing filters...");
    performFiltering();
}

// Export filter functions
window.FilterManager = {
    init: initializeFilters,
    clearFilters,
    applyFilterPreset,
    refreshFilters,
    getState: getFilterState,
    getStats: getFilterStats
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("🔍 Initializing filter management...");
    
    // Wait a bit for the dashboard to load machines first
    setTimeout(() => {
        initializeFilters();
    }, 1000);
});