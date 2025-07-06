/**
 * Admin Settings Module - FIXED VERSION
 * Handles email report configuration and settings management
 */

// Settings state with EmailJS configuration
let settingsState = {
    reportsEnabled: false,
    sendTime: '22:00',
    weeklyReportsEnabled: false,
    recipients: ['admin@kvh.nl'],
    lastDailyReport: null,
    lastWeeklyReport: null,
    emailServiceId: 'service_0l8qkrk',
    emailTemplateId: 'template_0k6h5el',
    emailWeeklyTemplateId: 'template_0k6h5el',
    emailPublicKey: 'XTBroP4UexB2siL7F'
};

/**
 * Initialize settings page
 */
async function initializeSettings() {
    console.log("⚙️ Initializing settings page...");
    
    try {
        // Setup UI event listeners first
        setupEventListeners();
        
        // Load saved settings
        await loadSettings();
        
        // Update UI with loaded settings
        updateUI();
        
        // Load report history
        loadReportHistory();
        
        console.log("✅ Settings page initialized successfully");
        
    } catch (err) {
        console.error("❌ Error initializing settings:", err);
        showMessage("Fout bij laden van instellingen", "error");
    }
}

/**
 * Setup event listeners - with null checks
 */
function setupEventListeners() {
    console.log("🔧 Setting up event listeners...");
    
    // Reports toggle
    const reportsToggle = document.getElementById('reports-enabled');
    if (reportsToggle) {
        reportsToggle.addEventListener('change', function() {
            settingsState.reportsEnabled = this.checked;
            console.log("Reports enabled:", this.checked);
        });
    }
    
    // Weekly reports toggle
    const weeklyToggle = document.getElementById('weekly-reports-enabled');
    if (weeklyToggle) {
        weeklyToggle.addEventListener('change', function() {
            settingsState.weeklyReportsEnabled = this.checked;
            console.log("Weekly reports enabled:", this.checked);
        });
    }
    
    // Send time
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
        console.log("✅ Add email button listener added");
    } else {
        console.warn("⚠️ Add email button not found");
    }
    
    // New email input - Enter key
    const newEmailInput = document.getElementById('new-email');
    if (newEmailInput) {
        newEmailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addNewEmail();
            }
        });
    }
    
    // Save settings button
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
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
        console.log("✅ Test report button listener added");
    } else {
        console.warn("⚠️ Test report button not found");
    }
    
    // Preview report button
    const previewBtn = document.getElementById('preview-report-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', previewReport);
    }
    
    // EmailJS config fields
    const serviceIdInput = document.getElementById('email-service-id');
    if (serviceIdInput) {
        serviceIdInput.addEventListener('change', function() {
            settingsState.emailServiceId = this.value.trim();
        });
    }
    
    const templateIdInput = document.getElementById('email-template-id');
    if (templateIdInput) {
        templateIdInput.addEventListener('change', function() {
            settingsState.emailTemplateId = this.value.trim();
        });
    }
    
    const weeklyTemplateIdInput = document.getElementById('email-weekly-template-id');
    if (weeklyTemplateIdInput) {
        weeklyTemplateIdInput.addEventListener('change', function() {
            settingsState.emailWeeklyTemplateId = this.value.trim();
        });
    }
    
    const publicKeyInput = document.getElementById('email-public-key');
    if (publicKeyInput) {
        publicKeyInput.addEventListener('change', function() {
            settingsState.emailPublicKey = this.value.trim();
        });
    }
    
    // EmailJS save button
    const saveEmailConfigBtn = document.getElementById('save-email-config-btn');
    if (saveEmailConfigBtn) {
        saveEmailConfigBtn.addEventListener('click', saveSettings);
    }
    
    // Test connection button
    const testConnectionBtn = document.getElementById('test-connection-btn');
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', testEmailConnection);
    }
    
    console.log("✅ Event listeners setup complete");
}

/**
 * Add new email recipient
 */
function addNewEmail() {
    console.log("➕ Adding new email...");
    
    const newEmailInput = document.getElementById('new-email');
    if (!newEmailInput) {
        console.error("❌ Email input not found");
        return;
    }
    
    const email = newEmailInput.value.trim();
    console.log("Email to add:", email);
    
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
    console.log("✅ Email added successfully");
}

/**
 * Remove email recipient
 */
function removeEmail(email) {
    console.log("➖ Removing email:", email);
    
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
    console.log("📋 Updating recipients list...");
    
    const listContainer = document.getElementById('recipients-list');
    if (!listContainer) {
        console.error("❌ Recipients list container not found");
        return;
    }
    
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
    
    console.log(`✅ Updated list with ${settingsState.recipients.length} recipients`);
}

/**
 * Load settings from database/localStorage
 */
async function loadSettings() {
    try {
        console.log("📥 Loading settings...");
        
        // Try localStorage first (simpler for now)
        const savedSettings = localStorage.getItem('emailReportSettings');
        if (savedSettings) {
            const loadedSettings = JSON.parse(savedSettings);
            settingsState = {
                ...settingsState,
                ...loadedSettings
            };
            console.log("✅ Settings loaded from localStorage");
        }
        
        // Try database
        const client = window.supabaseClient;
        if (client) {
            const { data, error } = await client
                .from('settings')
                .select('*')
                .eq('category', 'email_reports')
                .single();
            
            if (data && !error) {
                const dbSettings = JSON.parse(data.settings_json || '{}');
                settingsState = {
                    ...settingsState,
                    ...dbSettings
                };
                console.log("✅ Settings loaded from database");
            }
        }
        
    } catch (err) {
        console.error("❌ Error loading settings:", err);
    }
}

/**
 * Save settings
 */
async function saveSettings() {
    try {
        showLoading(true);
        console.log("💾 Saving settings...", settingsState);
        
        // Save to localStorage
        localStorage.setItem('emailReportSettings', JSON.stringify(settingsState));
        
        // Try to save to database
        const client = window.supabaseClient;
        if (client) {
            const { error } = await client
                .from('settings')
                .upsert({
                    category: 'email_reports',
                    settings_json: JSON.stringify(settingsState),
                    updated_at: new Date().toISOString(),
                    updated_by: 'Admin'
                });
            
            if (error) {
                console.error("Database save error:", error);
            }
        }
        
        // Update EmailReports module if available
        if (window.EmailReports && window.EmailReports.updateEmailSettings) {
            await window.EmailReports.updateEmailSettings(settingsState);
        }
        
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
    console.log("🎨 Updating UI...");
    
    // Reports toggle
    const reportsToggle = document.getElementById('reports-enabled');
    if (reportsToggle) {
        reportsToggle.checked = settingsState.reportsEnabled;
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
    
    // EmailJS fields
    const serviceIdInput = document.getElementById('email-service-id');
    if (serviceIdInput) {
        serviceIdInput.value = settingsState.emailServiceId || '';
    }
    
    const templateIdInput = document.getElementById('email-template-id');
    if (templateIdInput) {
        templateIdInput.value = settingsState.emailTemplateId || '';
    }
    
    const weeklyTemplateIdInput = document.getElementById('email-weekly-template-id');
    if (weeklyTemplateIdInput) {
        weeklyTemplateIdInput.value = settingsState.emailWeeklyTemplateId || '';
    }
    
    const publicKeyInput = document.getElementById('email-public-key');
    if (publicKeyInput) {
        publicKeyInput.value = settingsState.emailPublicKey || '';
    }
    
    // Recipients list
    updateRecipientsList();
    
    // Status info
    updateStatusInfo();
    
    console.log("✅ UI updated");
}

/**
 * Send test report
 */
async function sendTestReport() {
    try {
        console.log("📧 Sending test report...");
        
        if (settingsState.recipients.length === 0) {
            showMessage("Geen ontvangers ingesteld voor test", "warning");
            return;
        }
        
        if (!window.EmailReports) {
            showMessage("Email systeem niet beschikbaar", "error");
            return;
        }
        
        showLoading(true);
        
        // Save settings first
        await saveSettings();
        
        // Send test report
        const success = await window.EmailReports.sendTestReport(settingsState.recipients);
        
        if (success) {
            showMessage("Test rapport succesvol verstuurd!", "success");
        } else {
            showMessage("Fout bij versturen test rapport", "error");
        }
        
    } catch (err) {
        console.error("❌ Error sending test report:", err);
        showMessage(`Fout: ${err.message}`, "error");
    } finally {
        showLoading(false);
    }
}

/**
 * Preview report
 */
async function previewReport() {
    try {
        console.log("👁️ Generating preview...");
        
        if (!window.PDFGenerator) {
            showMessage("PDF generator niet beschikbaar", "error");
            return;
        }
        
        showLoading(true);
        
        const pdfBlob = await window.PDFGenerator.generateDailyReport(new Date());
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
        
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
        
    } catch (err) {
        console.error("❌ Error generating preview:", err);
        showMessage(`Fout: ${err.message}`, "error");
    } finally {
        showLoading(false);
    }
}

/**
 * Test email connection
 */
async function testEmailConnection() {
    try {
        console.log("🧪 Testing email connection...");
        showLoading(true);
        
        if (!window.EmailReports) {
            showMessage("Email systeem niet beschikbaar", "error");
            return;
        }
        
        // Save settings first
        await saveSettings();
        
        // Initialize email system
        await window.EmailReports.initializeEmailSystem();
        
        showMessage("✅ EmailJS verbinding succesvol!", "success");
        
    } catch (err) {
        console.error("❌ Connection test failed:", err);
        showMessage(`Verbindingstest mislukt: ${err.message}`, "error");
    } finally {
        showLoading(false);
    }
}

/**
 * Load report history
 */
async function loadReportHistory() {
    try {
        console.log("📊 Loading report history...");
        
        const tbody = document.getElementById('reports-log');
        if (!tbody) return;
        
        if (!window.EmailReports || !window.EmailReports.getEmailHistory) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-3 py-4 text-center text-gray-500">Email systeem niet beschikbaar</td></tr>';
            return;
        }
        
        const history = await window.EmailReports.getEmailHistory(10);
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-3 py-4 text-center text-gray-500">Geen rapporten gevonden</td></tr>';
            return;
        }
        
        tbody.innerHTML = history.map(log => `
            <tr class="border-t">
                <td class="px-3 py-2">${new Date(log.sent_at).toLocaleDateString('nl-NL')}</td>
                <td class="px-3 py-2">${log.report_type === 'daily' ? 'Dagelijks' : 'Wekelijks'}</td>
                <td class="px-3 py-2 text-sm">${log.recipients}</td>
                <td class="px-3 py-2">
                    <span class="px-2 py-1 text-xs rounded ${
                        log.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }">
                        ${log.status === 'sent' ? 'Verstuurd' : 'Mislukt'}
                    </span>
                </td>
            </tr>
        `).join('');
        
    } catch (err) {
        console.error("❌ Error loading history:", err);
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
            lastDailyElement.textContent = date.toLocaleDateString('nl-NL');
        } else {
            lastDailyElement.textContent = 'Nog niet verstuurd';
        }
    }
    
    // Last weekly report
    const lastWeeklyElement = document.getElementById('last-weekly-report');
    if (lastWeeklyElement) {
        if (settingsState.lastWeeklyReport) {
            const date = new Date(settingsState.lastWeeklyReport);
            lastWeeklyElement.textContent = date.toLocaleDateString('nl-NL');
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
    const [hours, minutes] = settingsState.sendTime.split(':');
    const next = new Date(now);
    
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (now > next) {
        next.setDate(next.getDate() + 1);
    }
    
    // Skip weekends
    while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
    }
    
    return next;
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
    console.log(`💬 ${type}: ${message}`);
    
    const container = document.getElementById('message-container');
    const messageElement = document.getElementById('message');
    
    if (!container || !messageElement) {
        console.warn("Message elements not found");
        return;
    }
    
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

// Make removeEmail globally available
window.removeEmail = removeEmail;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("⚙️ DOM loaded, initializing settings...");
    initializeSettings();
});