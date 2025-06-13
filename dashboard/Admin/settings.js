/**
 * Admin Settings Module
 * Handles email report configuration and settings management
 */

// Settings state with your EmailJS configuration
let settingsState = {
    reportsEnabled: false,
    sendTime: '22:00',
    weeklyReportsEnabled: false,
    recipients: ['admin@kvh.nl'],
    lastDailyReport: null,
    lastWeeklyReport: null,
    // Your EmailJS configuration
    emailServiceId: 'service_0l8qkrk',
    emailTemplateId: 'template_0k6h5ei',
    emailWeeklyTemplateId: 'template_0k6h5ei', // Same template for now
    emailPublicKey: 'XTBroP4UexB2siL7F'
};

/**
 * Initialize settings page
 */
async function initializeSettings() {
    console.log("⚙️ Initializing settings page...");
    
    try {
        // Check authentication first
        if (!window.AuthManager || !window.AuthManager.getCurrentUser()) {
            window.location.href = '../../index.html';
            return;
        }
        
        // Wait for PDF Generator to be available
        await waitForPDFGenerator();
        
        // Initialize UI
        setupEventListeners();
        await loadSettings();
        updateUI();
        
        console.log("✅ Settings page initialized successfully");
        
    } catch (err) {
        console.error("❌ Error initializing settings:", err);
        showMessage("Fout bij laden van instellingen", "error");
    }
}

/**
 * Wait for PDF Generator to be available
 */
function waitForPDFGenerator() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        const checkPDFGenerator = setInterval(() => {
            attempts++;
            
            if (window.PDFGenerator) {
                console.log("✅ PDF Generator is ready!");
                clearInterval(checkPDFGenerator);
                resolve();
            } else if (attempts >= maxAttempts) {
                console.warn("⚠️ PDF Generator not found after 5 seconds, continuing anyway");
                clearInterval(checkPDFGenerator);
                resolve();
            }
        }, 100);
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // EmailJS Configuration inputs
    setupEmailJSInputs();
    
    // Reports toggle
    const reportsToggle = document.getElementById('reports-enabled');
    if (reportsToggle) {
        reportsToggle.addEventListener('change', function() {
            settingsState.reportsEnabled = this.checked;
            toggleReportsSettings(this.checked);
        });
    }
    
    // Weekly reports toggle
    const weeklyToggle = document.getElementById('weekly-reports-enabled');
    if (weeklyToggle) {
        weeklyToggle.addEventListener('change', function() {
            settingsState.weeklyReportsEnabled = this.checked;
        });
    }
    
    // Send time change
    const sendTimeInput = document.getElementById('send-time');
    if (sendTimeInput) {
        sendTimeInput.addEventListener('change', function() {
            settingsState.sendTime = this.value;
        });
    }
    
    // Add email button
    const addEmailBtn = document.getElementById('add-email-btn');
    if (addEmailBtn) {
        addEmailBtn.addEventListener('click', addNewEmail);
    }
    
    // New email input (Enter key)
    const newEmailInput = document.getElementById('new-email');
    if (newEmailInput) {
        newEmailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addNewEmail();
            }
        });
    }
    
    // Save settings button
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }
    
    // Save EmailJS config button
    const saveEmailConfigBtn = document.getElementById('save-email-config-btn');
    if (saveEmailConfigBtn) {
        saveEmailConfigBtn.addEventListener('click', saveEmailJSConfig);
    }
    
    // Test connection button
    const testConnectionBtn = document.getElementById('test-connection-btn');
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', testEmailConnection);
    }
    
    // Reset settings button
    const resetBtn = document.getElementById('reset-settings-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
    
    // Test report button
    const testBtn = document.getElementById('test-report-btn');
    if (testBtn) {
        testBtn.addEventListener('click', sendTestReport);
    }
    
    // Preview report button
    const previewBtn = document.getElementById('preview-report-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', previewReport);
    }
    
    console.log("✅ Event listeners setup complete");
}

/**
 * Setup EmailJS configuration inputs
 */
function setupEmailJSInputs() {
    const serviceIdInput = document.getElementById('email-service-id');
    const templateIdInput = document.getElementById('email-template-id');
    const weeklyTemplateIdInput = document.getElementById('email-weekly-template-id');
    const publicKeyInput = document.getElementById('email-public-key');
    
    if (serviceIdInput) {
        serviceIdInput.addEventListener('change', function() {
            settingsState.emailServiceId = this.value.trim();
        });
    }
    
    if (templateIdInput) {
        templateIdInput.addEventListener('change', function() {
            settingsState.emailTemplateId = this.value.trim();
        });
    }
    
    if (weeklyTemplateIdInput) {
        weeklyTemplateIdInput.addEventListener('change', function() {
            settingsState.emailWeeklyTemplateId = this.value.trim();
        });
    }
    
    if (publicKeyInput) {
        publicKeyInput.addEventListener('change', function() {
            settingsState.emailPublicKey = this.value.trim();
        });
    }
}

/**
 * Save EmailJS configuration
 */
async function saveEmailJSConfig() {
    try {
        showLoading(true);
        
        // Validate required fields
        if (!settingsState.emailServiceId || !settingsState.emailTemplateId || !settingsState.emailPublicKey) {
            showMessage("Vul alle verplichte EmailJS velden in", "error");
            return;
        }
        
        await saveSettings();
        showMessage("EmailJS configuratie opgeslagen!", "success");
        
    } catch (err) {
        console.error("❌ Error saving EmailJS config:", err);
        showMessage("Fout bij opslaan EmailJS configuratie", "error");
    } finally {
        showLoading(false);
    }
}

/**
 * Test email connection
 */
async function testEmailConnection() {
    try {
        showLoading(true);
        
        if (!window.EmailReports) {
            showMessage("Email systeem niet beschikbaar", "error");
            return;
        }
        
        // Update settings first
        await saveSettings();
        
        const isConnected = await window.EmailReports.testEmailConnection();
        
        if (isConnected) {
            showMessage("✅ EmailJS verbinding succesvol!", "success");
        } else {
            showMessage("❌ EmailJS verbinding mislukt. Controleer je configuratie.", "error");
        }
        
    } catch (err) {
        console.error("❌ Error testing connection:", err);
        showMessage(`Verbindingstest mislukt: ${err.message}`, "error");
    } finally {
        showLoading(false);
    }
}

/**
 * Load settings from database/localStorage
 */
async function loadSettings() {
    try {
        // Try to load from Supabase first
        const client = window.supabaseClient;
        if (client) {
            const { data, error } = await client
                .from('settings')
                .select('*')
                .eq('category', 'email_reports')
                .single();
            
            if (data && !error) {
                const loadedSettings = JSON.parse(data.settings_json || '{}');
                settingsState = {
                    ...settingsState,
                    ...loadedSettings
                };
                console.log("✅ Settings loaded from database");
                return;
            }
        }
        
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('emailReportSettings');
        if (savedSettings) {
            const loadedSettings = JSON.parse(savedSettings);
            settingsState = {
                ...settingsState,
                ...loadedSettings
            };
            console.log("✅ Settings loaded from localStorage");
        }
        
    } catch (err) {
        console.error("❌ Error loading settings:", err);
        console.log("⚠️ Using default settings");
    }
}

/**
 * Save settings to database and localStorage
 */
async function saveSettings() {
    try {
        showLoading(true);
        
        const client = window.supabaseClient;
        if (client) {
            // Save to Supabase
            const { error } = await client
                .from('settings')
                .upsert({
                    category: 'email_reports',
                    settings_json: JSON.stringify(settingsState),
                    updated_at: new Date().toISOString(),
                    updated_by: window.AuthManager.getCurrentUser()?.name || 'Admin'
                });
            
            if (error) throw error;
        }
        
        // Also save to localStorage as backup
        localStorage.setItem('emailReportSettings', JSON.stringify(settingsState));
        
        showMessage("Instellingen succesvol opgeslagen!", "success");
        console.log("✅ Settings saved successfully");
        
    } catch (err) {
        console.error("❌ Error saving settings:", err);
        showMessage("Fout bij opslaan van instellingen", "error");
    } finally {
        showLoading(false);
    }
}

/**
 * Reset settings to defaults
 */
function resetSettings() {
    if (confirm("Weet je zeker dat je alle instellingen wilt resetten?")) {
        settingsState = {
            reportsEnabled: false,
            sendTime: '22:00',
            weeklyReportsEnabled: false,
            recipients: ['admin@kvh.nl'],
            lastDailyReport: null,
            lastWeeklyReport: null,
            emailServiceId: 'service_0l8qkrk',
            emailTemplateId: 'template_0k6h5ei',
            emailWeeklyTemplateId: 'template_0k6h5ei',
            emailPublicKey: 'XTBroP4UexB2siL7F'
        };
        
        updateUI();
        showMessage("Instellingen gereset naar standaardwaarden", "info");
    }
}

/**
 * Update UI with current settings
 */
function updateUI() {
    // EmailJS Configuration
    updateEmailJSInputs();
    
    // Reports toggle
    const reportsToggle = document.getElementById('reports-enabled');
    if (reportsToggle) {
        reportsToggle.checked = settingsState.reportsEnabled;
        toggleReportsSettings(settingsState.reportsEnabled);
    }
    
    // Weekly toggle
    const weeklyToggle = document.getElementById('weekly-reports-enabled');
    if (weeklyToggle) {
        weeklyToggle.checked = settingsState.weeklyReportsEnabled;
    }
    
    // Send time
    const sendTimeInput = document.getElementById('send-time');
    if (sendTimeInput) {
        sendTimeInput.value = settingsState.sendTime;
    }
    
    // Recipients list
    updateRecipientsList();
    
    // Status info
    updateStatusInfo();
}

/**
 * Update EmailJS configuration inputs
 */
function updateEmailJSInputs() {
    const serviceIdInput = document.getElementById('email-service-id');
    const templateIdInput = document.getElementById('email-template-id');
    const weeklyTemplateIdInput = document.getElementById('email-weekly-template-id');
    const publicKeyInput = document.getElementById('email-public-key');
    
    if (serviceIdInput) {
        serviceIdInput.value = settingsState.emailServiceId || '';
    }
    
    if (templateIdInput) {
        templateIdInput.value = settingsState.emailTemplateId || '';
    }
    
    if (weeklyTemplateIdInput) {
        weeklyTemplateIdInput.value = settingsState.emailWeeklyTemplateId || '';
    }
    
    if (publicKeyInput) {
        publicKeyInput.value = settingsState.emailPublicKey || '';
    }
}

/**
 * Toggle reports settings visibility
 */
function toggleReportsSettings(enabled) {
    const settingsDiv = document.getElementById('reports-settings');
    if (settingsDiv) {
        if (enabled) {
            settingsDiv.classList.remove('hidden');
        } else {
            settingsDiv.classList.add('hidden');
        }
    }
}

/**
 * Add new email recipient
 */
function addNewEmail() {
    const newEmailInput = document.getElementById('new-email');
    if (!newEmailInput) return;
    
    const email = newEmailInput.value.trim();
    
    // Validate email
    if (!email) {
        showMessage("Voer een emailadres in", "error");
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage("Voer een geldig emailadres in", "error");
        return;
    }
    
    // Check if already exists
    if (settingsState.recipients.includes(email)) {
        showMessage("Dit emailadres staat al in de lijst", "warning");
        return;
    }
    
    // Add to list
    settingsState.recipients.push(email);
    newEmailInput.value = '';
    updateRecipientsList();
    
    showMessage(`${email} toegevoegd aan ontvangers`, "success");
}

/**
 * Remove email recipient
 */
function removeEmail(email) {
    const index = settingsState.recipients.indexOf(email);
    if (index > -1) {
        settingsState.recipients.splice(index, 1);
        updateRecipientsList();
        showMessage(`${email} verwijderd van ontvangers`, "info");
    }
}

/**
 * Update recipients list display
 */
function updateRecipientsList() {
    const listContainer = document.getElementById('recipients-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    if (settingsState.recipients.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 italic">Geen ontvangers ingesteld</p>';
        return;
    }
    
    settingsState.recipients.forEach(email => {
        const emailDiv = document.createElement('div');
        emailDiv.className = 'flex items-center justify-between bg-gray-50 p-2 rounded';
        emailDiv.innerHTML = `
            <span class="text-gray-800">${email}</span>
            <button onclick="removeEmail('${email}')" 
                    class="text-red-600 hover:text-red-800 font-bold">
                ✕
            </button>
        `;
        listContainer.appendChild(emailDiv);
    });
}

/**
 * Send test report
 */
async function sendTestReport() {
    try {
        if (settingsState.recipients.length === 0) {
            showMessage("Geen ontvangers ingesteld voor test", "warning");
            return;
        }
        
        showLoading(true);
        
        // Check if EmailReports is available
        if (!window.EmailReports) {
            showMessage("Email systeem niet beschikbaar", "error");
            return;
        }
        
        // Check if PDFGenerator is available
        if (!window.PDFGenerator) {
            showMessage("PDF generator niet beschikbaar", "error");
            return;
        }
        
        // Save current settings first
        await saveSettings();
        
        const success = await window.EmailReports.sendTestReport(settingsState.recipients);
        
        if (success) {
            showMessage("Test rapport succesvol verstuurd!", "success");
        } else {
            showMessage("Fout bij versturen test rapport", "error");
        }
        
    } catch (err) {
        console.error("❌ Error sending test report:", err);
        showMessage(`Fout bij versturen test rapport: ${err.message}`, "error");
    } finally {
        showLoading(false);
    }
}

/**
 * Preview report
 */
async function previewReport() {
    try {
        showLoading(true);
        
        // Check if PDFGenerator is available
        if (!window.PDFGenerator) {
            showMessage("PDF generator niet beschikbaar", "error");
            return;
        }
        
        const pdfBlob = await window.PDFGenerator.generateDailyReport(new Date());
        
        // Open PDF in new tab
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
        
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
        
    } catch (err) {
        console.error("❌ Error generating preview:", err);
        showMessage(`Fout bij maken voorbeeld: ${err.message}`, "error");
    } finally {
        showLoading(false);
    }
}

/**
 * Update status information
 */
function updateStatusInfo() {
    // Last daily report
    const lastDailyElement = document.getElementById('last-daily-report');
    if (lastDailyElement) {
        if (settingsState.lastDailyReport) {
            const date = new Date(settingsState.lastDailyReport);
            lastDailyElement.textContent = date.toLocaleDateString('nl-NL') + ' ' + date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        } else {
            lastDailyElement.textContent = 'Nog niet verstuurd';
        }
    }
    
    // Last weekly report
    const lastWeeklyElement = document.getElementById('last-weekly-report');
    if (lastWeeklyElement) {
        if (settingsState.lastWeeklyReport) {
            const date = new Date(settingsState.lastWeeklyReport);
            lastWeeklyElement.textContent = date.toLocaleDateString('nl-NL') + ' ' + date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        } else {
            lastWeeklyElement.textContent = 'Nog niet verstuurd';
        }
    }
    
    // Next report
    const nextReportElement = document.getElementById('next-report');
    if (nextReportElement && settingsState.reportsEnabled) {
        const nextReport = calculateNextReportTime();
        nextReportElement.textContent = nextReport.toLocaleDateString('nl-NL') + ' om ' + settingsState.sendTime;
    }
}

/**
 * Calculate next report time
 */
function calculateNextReportTime() {
    const now = new Date();
    const today = new Date(now);
    const [hours, minutes] = settingsState.sendTime.split(':');
    
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // If time has passed today, next report is tomorrow
    if (now > today) {
        today.setDate(today.getDate() + 1);
    }
    
    // Skip weekends
    while (today.getDay() === 0 || today.getDay() === 6) {
        today.setDate(today.getDate() + 1);
    }
    
    return today;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show message to user
 */
function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container');
    const messageElement = document.getElementById('message');
    
    if (!container || !messageElement) return;
    
    const colors = {
        success: 'bg-green-50 text-green-800 border-green-200',
        error: 'bg-red-50 text-red-800 border-red-200',
        warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        info: 'bg-blue-50 text-blue-800 border-blue-200'
    };
    
    messageElement.className = `p-4 rounded-lg font-semibold border ${colors[type] || colors.info}`;
    messageElement.textContent = message;
    
    container.classList.remove('hidden');
    
    // Hide after 5 seconds
    setTimeout(() => {
        container.classList.add('hidden');
    }, 5000);
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

// Export settings functions
window.SettingsManager = {
    getSettings: () => ({ ...settingsState }),
    saveSettings,
    resetSettings
};

// Global functions for onclick handlers
window.removeEmail = removeEmail;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("⚙️ Starting settings initialization...");
    initializeSettings();
});