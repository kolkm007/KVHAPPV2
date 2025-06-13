/**
 * Minimap Module
 * Handles the machine status minimap display and interactions
 */

// Minimap configuration
const MINIMAP_CONFIG = {
    gridColumns: {
        mobile: 2,
        tablet: 4,
        desktop: 6
    },
    statusColors: {
        inspection: {
            good: 'status-green',
            bad: 'status-red'
        },
        problems: {
            none: 'status-gray',
            present: 'status-orange'
        }
    },
    requiredInspections: 5,
    animationDuration: 300
};

// Minimap state
let minimapState = {
    machines: [],
    lastUpdate: null,
    isInitialized: false
};

/**
 * Initialize minimap functionality
 */
function initializeMinimap() {
    console.log("🗺️ Initializing minimap...");
    
    setupResponsiveGrid();
    setupMinimapEventListeners();
    
    minimapState.isInitialized = true;
    console.log("✅ Minimap initialized");
}

/**
 * Setup responsive grid based on screen size
 */
function setupResponsiveGrid() {
    const machineMap = document.getElementById("machine-map");
    if (!machineMap) return;
    
    function updateGridColumns() {
        const width = window.innerWidth;
        let columns;
        
        if (width < 640) {
            columns = MINIMAP_CONFIG.gridColumns.mobile;
        } else if (width < 1024) {
            columns = MINIMAP_CONFIG.gridColumns.tablet;
        } else {
            columns = MINIMAP_CONFIG.gridColumns.desktop;
        }
        
        machineMap.className = machineMap.className.replace(/grid-cols-\d+/g, '');
        machineMap.classList.add(`grid-cols-${columns}`);
        
        console.log(`📱 Grid updated to ${columns} columns for width ${width}px`);
    }
    
    // Initial setup
    updateGridColumns();
    
    // Update on resize with debouncing
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateGridColumns, 250);
    });
}

/**
 * Setup minimap event listeners
 */
function setupMinimapEventListeners() {
    const machineMap = document.getElementById("machine-map");
    if (!machineMap) return;
    
    // Delegation for machine clicks
    machineMap.addEventListener('click', handleMachineClick);
    
    // Keyboard navigation support
    machineMap.addEventListener('keydown', handleKeyNavigation);
    
    console.log("✅ Minimap event listeners setup");
}

/**
 * Handle machine block clicks
 * @param {Event} event - Click event
 */
function handleMachineClick(event) {
    const machineBlock = event.target.closest('.machine-block');
    if (!machineBlock) return;
    
    const machineId = machineBlock.dataset.machineId;
    if (!machineId) return;
    
    // Don't trigger on button clicks
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
        return;
    }
    
    console.log(`🖱️ Machine ${machineId} clicked`);
    
    // Add click animation
    animateMachineClick(machineBlock);
    
    // Show machine details
    if (window.ModalManager) {
        window.ModalManager.showMachineDetail(parseInt(machineId));
    }
}

/**
 * Handle keyboard navigation
 * @param {Event} event - Keyboard event
 */
function handleKeyNavigation(event) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(event.key)) {
        return;
    }
    
    const focusedElement = document.activeElement;
    const machineBlock = focusedElement.closest('.machine-block');
    
    if (!machineBlock) return;
    
    event.preventDefault();
    
    if (event.key === 'Enter' || event.key === ' ') {
        // Simulate click
        handleMachineClick({ target: machineBlock, closest: () => machineBlock });
        return;
    }
    
    // Navigate between machines
    const allMachines = Array.from(document.querySelectorAll('.machine-block:not([style*="display: none"])'));
    const currentIndex = allMachines.indexOf(machineBlock);
    
    if (currentIndex === -1) return;
    
    let newIndex = currentIndex;
    const gridColumns = getCurrentGridColumns();
    
    switch (event.key) {
        case 'ArrowLeft':
            newIndex = Math.max(0, currentIndex - 1);
            break;
        case 'ArrowRight':
            newIndex = Math.min(allMachines.length - 1, currentIndex + 1);
            break;
        case 'ArrowUp':
            newIndex = Math.max(0, currentIndex - gridColumns);
            break;
        case 'ArrowDown':
            newIndex = Math.min(allMachines.length - 1, currentIndex + gridColumns);
            break;
    }
    
    if (newIndex !== currentIndex && allMachines[newIndex]) {
        allMachines[newIndex].focus();
    }
}

/**
 * Get current grid columns from DOM
 * @returns {number} Number of columns
 */
function getCurrentGridColumns() {
    const machineMap = document.getElementById("machine-map");
    if (!machineMap) return 4;
    
    const classList = Array.from(machineMap.classList);
    const gridClass = classList.find(cls => cls.startsWith('grid-cols-'));
    
    if (gridClass) {
        return parseInt(gridClass.replace('grid-cols-', '')) || 4;
    }
    
    return 4;
}

/**
 * Animate machine click
 * @param {HTMLElement} machineBlock - Machine block element
 */
function animateMachineClick(machineBlock) {
    machineBlock.style.transform = 'scale(0.95)';
    machineBlock.style.transition = 'transform 0.1s ease';
    
    setTimeout(() => {
        machineBlock.style.transform = '';
        machineBlock.style.transition = '';
    }, 100);
}

/**
 * Update machine display with new data
 * @param {Array} machines - Machine data
 * @param {Array} inspections - Inspection data
 * @param {Array} problems - Problem data
 */
function updateMachineDisplay(machines, inspections, problems) {
    if (!minimapState.isInitialized) {
        console.warn("⚠️ Minimap not initialized, skipping update");
        return;
    }
    
    console.log("🗺️ Updating minimap display...");
    
    const machineMap = document.getElementById("machine-map");
    if (!machineMap) return;
    
    // Process data
    const machineData = processMachineData(machines, inspections, problems);
    
    // Store processed data
    minimapState.machines = machineData;
    minimapState.lastUpdate = new Date();
    
    // Clear existing content
    machineMap.innerHTML = '';
    
    if (machineData.length === 0) {
        showEmptyState(machineMap);
        return;
    }
    
    // Create machine blocks
    machineData.forEach((machine, index) => {
        const machineElement = createMachineBlock(machine);
        
        // Add staggered animation
        machineElement.style.opacity = '0';
        machineElement.style.transform = 'translateY(20px)';
        
        machineMap.appendChild(machineElement);
        
        // Animate in
        setTimeout(() => {
            machineElement.style.transition = 'all 0.3s ease';
            machineElement.style.opacity = '1';
            machineElement.style.transform = 'translateY(0)';
        }, index * 50);
    });
    
    console.log(`✅ Minimap updated with ${machineData.length} machines`);
    
    // Refresh filters if they exist
    if (window.FilterManager) {
        setTimeout(() => {
            window.FilterManager.refreshFilters();
        }, 500);
    }
}

/**
 * Process machine data for display
 * @param {Array} machines - Raw machine data
 * @param {Array} inspections - Inspection data
 * @param {Array} problems - Problem data
 * @returns {Array} Processed machine data
 */
function processMachineData(machines, inspections, problems) {
    if (!machines || !Array.isArray(machines)) {
        console.warn("⚠️ Invalid machines data");
        return [];
    }
    
    // Count inspections and problems per machine
    const inspectionCounts = {};
    const problemCounts = {};
    
    if (Array.isArray(inspections)) {
        inspections.forEach(inspection => {
            const machineId = parseInt(inspection.machine_id);
            inspectionCounts[machineId] = (inspectionCounts[machineId] || 0) + 1;
        });
    }
    
    if (Array.isArray(problems)) {
        problems.forEach(problem => {
            const machineId = problem.machine_id;
            problemCounts[machineId] = (problemCounts[machineId] || 0) + 1;
        });
    }
    
    // Process machines
    return machines
        .filter(machine => machine.status !== "inactief")
        .map(machine => ({
            id: machine.id,
            name: machine.name,
            status: machine.status,
            inspectionCount: inspectionCounts[machine.id] || 0,
            problemCount: problemCounts[machine.id] || 0,
            inspectionStatus: (inspectionCounts[machine.id] || 0) >= MINIMAP_CONFIG.requiredInspections ? 'good' : 'bad',
            problemStatus: (problemCounts[machine.id] || 0) === 0 ? 'none' : 'present'
        }))
        .sort((a, b) => a.id - b.id);
}

/**
 * Create machine block element
 * @param {Object} machine - Machine data
 * @returns {HTMLElement} Machine block element
 */
function createMachineBlock(machine) {
    const machineDiv = document.createElement("div");
    machineDiv.className = "machine-block";
    machineDiv.dataset.machineId = machine.id;
    machineDiv.tabIndex = 0;
    machineDiv.setAttribute('role', 'button');
    machineDiv.setAttribute('aria-label', `Machine ${machine.id} - ${machine.inspectionCount} inspecties, ${machine.problemCount} problemen`);
    
    // Get status colors
    const inspectionColor = MINIMAP_CONFIG.statusColors.inspection[machine.inspectionStatus];
    const problemColor = MINIMAP_CONFIG.statusColors.problems[machine.problemStatus];
    
    machineDiv.innerHTML = `
        <span class="machine-id">${machine.id}</span>
        <div class="status-dot status-dot-left ${inspectionColor}" title="Inspecties: ${machine.inspectionCount}/${MINIMAP_CONFIG.requiredInspections}">
            ${machine.inspectionCount}
        </div>
        <div class="status-dot status-dot-right ${problemColor}" title="Open problemen: ${machine.problemCount}">
            ${machine.problemCount}
        </div>
        <div class="machine-buttons">
            <button class="machine-button" onclick="openInspectionForm(${machine.id})" title="Nieuwe inspectie toevoegen">
                Inspectie
            </button>
            <button class="machine-button" onclick="openProblemForm(${machine.id})" title="Nieuw probleem melden">
                Probleem
            </button>
        </div>
    `;
    
    return machineDiv;
}

/**
 * Show empty state when no machines are available
 * @param {HTMLElement} container - Container element
 */
function showEmptyState(container) {
    container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
            <svg class="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z">
                </path>
            </svg>
            <h3 class="text-lg font-semibold mb-2">Geen machines beschikbaar</h3>
            <p class="text-sm text-center max-w-md">
                Er zijn momenteel geen actieve machines om weer te geven. 
                Controleer de database verbinding of neem contact op met de systeembeheerder.
            </p>
            <button onclick="window.DashboardManager?.loadData()" 
                    class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                Opnieuw proberen
            </button>
        </div>
    `;
}

/**
 * Highlight machines with specific criteria
 * @param {string} criteria - Criteria ('problems', 'tasks', 'all')
 */
function highlightMachines(criteria) {
    const machineBlocks = document.querySelectorAll('.machine-block');
    
    machineBlocks.forEach(block => {
        block.classList.remove('highlight-problems', 'highlight-tasks', 'highlight-all');
        
        const leftDot = block.querySelector('.status-dot-left');
        const rightDot = block.querySelector('.status-dot-right');
        
        const hasProblems = rightDot && rightDot.classList.contains('status-orange');
        const hasTasks = leftDot && leftDot.classList.contains('status-red');
        
        let shouldHighlight = false;
        
        switch (criteria) {
            case 'problems':
                shouldHighlight = hasProblems;
                break;
            case 'tasks':
                shouldHighlight = hasTasks;
                break;
            case 'all':
                shouldHighlight = hasProblems || hasTasks;
                break;
        }
        
        if (shouldHighlight) {
            block.classList.add(`highlight-${criteria}`);
            
            // Add pulsing animation
            block.style.animation = 'pulse 2s infinite';
            setTimeout(() => {
                block.style.animation = '';
            }, 4000);
        }
    });
    
    console.log(`✨ Highlighted machines with criteria: ${criteria}`);
}

/**
 * Get machine statistics for the minimap
 * @returns {Object} Machine statistics
 */
function getMachineStats() {
    const stats = {
        total: minimapState.machines.length,
        withProblems: 0,
        withTasks: 0,
        healthy: 0,
        lastUpdate: minimapState.lastUpdate
    };
    
    minimapState.machines.forEach(machine => {
        if (machine.problemCount > 0) {
            stats.withProblems++;
        }
        
        if (machine.inspectionCount < MINIMAP_CONFIG.requiredInspections) {
            stats.withTasks++;
        }
        
        if (machine.problemCount === 0 && machine.inspectionCount >= MINIMAP_CONFIG.requiredInspections) {
            stats.healthy++;
        }
    });
    
    return stats;
}

/**
 * Focus on specific machine
 * @param {number} machineId - Machine ID to focus on
 */
function focusOnMachine(machineId) {
    const machineBlock = document.querySelector(`[data-machine-id="${machineId}"]`);
    
    if (machineBlock) {
        // Scroll into view
        machineBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Focus
        machineBlock.focus();
        
        // Highlight temporarily
        machineBlock.style.boxShadow = '0 0 20px rgba(146, 0, 0, 0.5)';
        machineBlock.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            machineBlock.style.boxShadow = '';
            machineBlock.style.transform = '';
        }, 2000);
        
        console.log(`🎯 Focused on machine ${machineId}`);
    } else {
        console.warn(`⚠️ Machine ${machineId} not found for focusing`);
    }
}

/**
 * Export minimap data
 * @returns {Object} Minimap data for export
 */
function exportMinimapData() {
    const stats = getMachineStats();
    
    return {
        timestamp: new Date().toISOString(),
        machines: minimapState.machines,
        statistics: stats,
        config: MINIMAP_CONFIG
    };
}

/**
 * Update single machine status (for real-time updates)
 * @param {number} machineId - Machine ID
 * @param {Object} updates - Status updates
 */
function updateMachineStatus(machineId, updates) {
    const machineBlock = document.querySelector(`[data-machine-id="${machineId}"]`);
    if (!machineBlock) return;
    
    const leftDot = machineBlock.querySelector('.status-dot-left');
    const rightDot = machineBlock.querySelector('.status-dot-right');
    
    if (updates.inspectionCount !== undefined && leftDot) {
        leftDot.textContent = updates.inspectionCount;
        
        // Update color
        leftDot.className = leftDot.className.replace(/status-(green|red)/, '');
        const newColor = updates.inspectionCount >= MINIMAP_CONFIG.requiredInspections ? 'status-green' : 'status-red';
        leftDot.classList.add(newColor);
        
        // Update tooltip
        leftDot.title = `Inspecties: ${updates.inspectionCount}/${MINIMAP_CONFIG.requiredInspections}`;
        
        // Add update animation
        leftDot.style.animation = 'bounce 0.5s ease';
        setTimeout(() => leftDot.style.animation = '', 500);
    }
    
    if (updates.problemCount !== undefined && rightDot) {
        rightDot.textContent = updates.problemCount;
        
        // Update color
        rightDot.className = rightDot.className.replace(/status-(gray|orange)/, '');
        const newColor = updates.problemCount === 0 ? 'status-gray' : 'status-orange';
        rightDot.classList.add(newColor);
        
        // Update tooltip
        rightDot.title = `Open problemen: ${updates.problemCount}`;
        
        // Add update animation
        rightDot.style.animation = 'bounce 0.5s ease';
        setTimeout(() => rightDot.style.animation = '', 500);
    }
    
    // Update machine data in state
    const machineIndex = minimapState.machines.findIndex(m => m.id === machineId);
    if (machineIndex !== -1) {
        minimapState.machines[machineIndex] = {
            ...minimapState.machines[machineIndex],
            ...updates
        };
    }
    
    console.log(`🔄 Updated machine ${machineId} status:`, updates);
}

/**
 * Clean up minimap resources
 */
function cleanup() {
    // Clear any running animations
    const machineBlocks = document.querySelectorAll('.machine-block');
    machineBlocks.forEach(block => {
        block.style.animation = '';
        block.style.transition = '';
        block.style.transform = '';
        block.style.boxShadow = '';
    });
    
    console.log("🧹 Minimap cleanup complete");
}

// Export minimap functions
window.MinimapManager = {
    init: initializeMinimap,
    updateDisplay: updateMachineDisplay,
    highlightMachines,
    focusOnMachine,
    updateMachineStatus,
    getStats: getMachineStats,
    exportData: exportMinimapData,
    cleanup
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("🗺️ Initializing minimap management...");
    initializeMinimap();
});

// Add CSS animations if not already present
if (!document.getElementById('minimap-animations')) {
    const style = document.createElement('style');
    style.id = 'minimap-animations';
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        
        .highlight-problems {
            border-color: #F59E0B !important;
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
        }
        
        .highlight-tasks {
            border-color: #EF4444 !important;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
        
        .highlight-all {
            border-color: #8B5CF6 !important;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }
    `;
    document.head.appendChild(style);
}