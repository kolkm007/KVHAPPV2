/**
 * Email Reports Module
 * Handles automated email sending with PDF attachments using EmailJS
 */

// EmailJS Configuration - These will be loaded from settings
const EMAIL_CONFIG = {
    serviceId: null, // Will be loaded from settings
    templateId: null, // Will be loaded from settings
    weeklyTemplateId: null, // Will be loaded from settings
    publicKey: null, // Will be loaded from settings
    maxAttachmentSize: 5 * 1024 * 1024, // 5MB limit
    retryAttempts: 3,
    retryDelay: 2000
};

// Email state
let emailState = {
    isInitialized: false,
    lastEmailSent: null,
    emailQueue: [],
    isProcessing: false,
    settings: null
};

/**
 * Initialize Email System
 */
async function initializeEmailSystem() {
    console.log("📧 Initializing Email System...");
    
    try {
        // Load settings first
        const settings = await getEmailSettings();
        emailState.settings = settings;
        
        // Check if email is enabled
        if (!settings.reportsEnabled) {
            console.log("📧 Email reports are disabled in settings");
            return;
        }
        
        // Validate required EmailJS configuration
        if (!settings.emailServiceId || !settings.emailTemplateId || !settings.emailPublicKey) {
            throw new Error("EmailJS configuratie incomplete. Ga naar instellingen om EmailJS gegevens in te voeren.");
        }
        
        // Update config with settings
        EMAIL_CONFIG.serviceId = settings.emailServiceId;
        EMAIL_CONFIG.templateId = settings.emailTemplateId;
        EMAIL_CONFIG.weeklyTemplateId = settings.emailWeeklyTemplateId || settings.emailTemplateId;
        EMAIL_CONFIG.publicKey = settings.emailPublicKey;
        
        // Load EmailJS library
        await loadEmailJS();
        
        // Initialize EmailJS with settings
        emailjs.init(EMAIL_CONFIG.publicKey);
        emailState.isInitialized = true;
        
        console.log("✅ Email system initialized successfully");
        console.log("📧 EmailJS Config:", {
            serviceId: EMAIL_CONFIG.serviceId,
            templateId: EMAIL_CONFIG.templateId,
            publicKey: EMAIL_CONFIG.publicKey ? "***configured***" : "missing"
        });
        
    } catch (err) {
        console.error("❌ Error initializing email system:", err);
        throw err;
    }
}

/**
 * Load EmailJS library dynamically
 */
function loadEmailJS() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (typeof emailjs !== 'undefined') {
            console.log("📧 EmailJS already loaded");
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        script.onload = () => {
            console.log("✅ EmailJS library loaded successfully");
            resolve();
        };
        script.onerror = () => {
            console.error("❌ Failed to load EmailJS library");
            reject(new Error('Failed to load EmailJS library'));
        };
        document.head.appendChild(script);
    });
}

/**
 * Send daily report email
 * @param {Array} recipients - Email recipients
 * @param {Date} date - Report date
 * @returns {Promise<boolean>} Success status
 */
async function sendDailyReport(recipients = [], date = new Date()) {
    try {
        console.log(`📧 Sending daily report for ${date.toDateString()} to ${recipients.length} recipients`);
        
        // Initialize email system if needed
        if (!emailState.isInitialized) {
            await initializeEmailSystem();
        }
        
        // Validate inputs
        if (recipients.length === 0) {
            throw new Error("Geen email ontvangers opgegeven");
        }
        
        if (!window.PDFGenerator) {
            throw new Error("PDF Generator niet beschikbaar");
        }
        
        // Generate PDF report
        console.log("📄 Generating daily PDF report...");
        const pdfBlob = await window.PDFGenerator.generateDailyReport(date);
        
        // Convert PDF to base64 for email attachment
        const pdfBase64 = await blobToBase64(pdfBlob);
        
        // Check file size
        if (pdfBase64.length > EMAIL_CONFIG.maxAttachmentSize) {
            throw new Error("PDF rapport te groot voor email (max 5MB)");
        }
        
        // Prepare email template variables
        const emailTemplateParams = {
            to_email: recipients[0], // Primary recipient
            to_emails: recipients.join(', '), // All recipients
            report_date: date.toLocaleDateString('nl-NL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            report_type: 'Dagelijks Productie Rapport',
            generated_time: new Date().toLocaleString('nl-NL'),
            attachment_name: `KVH_Dagrapport_${date.toISOString().split('T')[0]}.pdf`,
            attachment_content: pdfBase64,
            company_name: 'KVH Productie Dashboard',
            footer_contact: 'info@kvh.nl | tel +31 (0) 73 5992255',
            from_name: 'KVH Productie Dashboard',
            reply_to: 'noreply@kvh.nl'
        };
        
        // Send to each recipient
        const sendResults = [];
        for (const recipient of recipients) {
            const personalizedParams = {
                ...emailTemplateParams,
                to_email: recipient,
                to_name: recipient.split('@')[0] // Use email username as name
            };
            
            const result = await sendEmailWithRetry(EMAIL_CONFIG.templateId, personalizedParams);
            sendResults.push({ recipient, success: result.success, error: result.error });
        }
        
        // Check results
        const successful = sendResults.filter(r => r.success);
        const failed = sendResults.filter(r => !r.success);
        
        if (successful.length > 0) {
            emailState.lastEmailSent = new Date();
            console.log(`✅ Daily report sent to ${successful.length}/${recipients.length} recipients`);
            
            // Log successful sends
            await logEmailSent('daily', successful.map(r => r.recipient), date);
        }
        
        if (failed.length > 0) {
            console.warn(`⚠️ Failed to send to ${failed.length} recipients:`, failed);
        }
        
        return successful.length > 0;
        
    } catch (err) {
        console.error("❌ Error sending daily report:", err);
        throw new Error(`Fout bij versturen dagrapport: ${err.message}`);
    }
}

/**
 * Send weekly report email
 * @param {Array} recipients - Email recipients
 * @param {Date} endDate - Report end date (Friday)
 * @returns {Promise<boolean>} Success status
 */
async function sendWeeklyReport(recipients = [], endDate = new Date()) {
    try {
        console.log(`📧 Sending weekly report ending ${endDate.toDateString()} to ${recipients.length} recipients`);
        
        // Initialize email system if needed
        if (!emailState.isInitialized) {
            await initializeEmailSystem();
        }
        
        // Validate inputs
        if (recipients.length === 0) {
            throw new Error("Geen email ontvangers opgegeven");
        }
        
        if (!window.PDFGenerator) {
            throw new Error("PDF Generator niet beschikbaar");
        }
        
        // Generate PDF report
        console.log("📄 Generating weekly PDF report...");
        const pdfBlob = await window.PDFGenerator.generateWeeklyReport(endDate);
        
        // Convert PDF to base64
        const pdfBase64 = await blobToBase64(pdfBlob);
        
        // Check file size
        if (pdfBase64.length > EMAIL_CONFIG.maxAttachmentSize) {
            throw new Error("PDF weekrapport te groot voor email (max 5MB)");
        }
        
        // Calculate week range
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);
        
        // Prepare email template variables
        const emailTemplateParams = {
            to_email: recipients[0],
            to_emails: recipients.join(', '),
            report_date: `${startDate.toLocaleDateString('nl-NL')} - ${endDate.toLocaleDateString('nl-NL')}`,
            report_type: 'Wekelijks Productie Rapport',
            generated_time: new Date().toLocaleString('nl-NL'),
            attachment_name: `KVH_Weekrapport_${endDate.toISOString().split('T')[0]}.pdf`,
            attachment_content: pdfBase64,
            company_name: 'KVH Productie Dashboard',
            footer_contact: 'info@kvh.nl | tel +31 (0) 73 5992255',
            from_name: 'KVH Productie Dashboard',
            reply_to: 'noreply@kvh.nl'
        };
        
        // Send to each recipient
        const sendResults = [];
        for (const recipient of recipients) {
            const personalizedParams = {
                ...emailTemplateParams,
                to_email: recipient,
                to_name: recipient.split('@')[0]
            };
            
            const result = await sendEmailWithRetry(EMAIL_CONFIG.weeklyTemplateId, personalizedParams);
            sendResults.push({ recipient, success: result.success, error: result.error });
        }
        
        // Check results
        const successful = sendResults.filter(r => r.success);
        const failed = sendResults.filter(r => !r.success);
        
        if (successful.length > 0) {
            emailState.lastEmailSent = new Date();
            console.log(`✅ Weekly report sent to ${successful.length}/${recipients.length} recipients`);
            
            // Log successful sends
            await logEmailSent('weekly', successful.map(r => r.recipient), endDate);
        }
        
        if (failed.length > 0) {
            console.warn(`⚠️ Failed to send weekly report to ${failed.length} recipients:`, failed);
        }
        
        return successful.length > 0;
        
    } catch (err) {
        console.error("❌ Error sending weekly report:", err);
        throw new Error(`Fout bij versturen weekrapport: ${err.message}`);
    }
}

/**
 * Send test report email
 * @param {Array} recipients - Email recipients
 * @returns {Promise<boolean>} Success status
 */
async function sendTestReport(recipients = []) {
    try {
        console.log(`📧 Sending test report to ${recipients.length} recipients`);
        
        // Initialize email system if needed
        if (!emailState.isInitialized) {
            await initializeEmailSystem();
        }

        if (!EMAIL_CONFIG.templateId) {
            throw new Error("Email template ID niet geconfigureerd. Controleer de instellingen.");
        }
        
        // Validate inputs
        if (recipients.length === 0) {
            throw new Error("Geen email ontvangers opgegeven voor test");
        }
        
        if (!window.PDFGenerator) {
            throw new Error("PDF Generator niet beschikbaar");
        }

        if (!emailState.settings?.reportsEnabled) {
            throw new Error("Email rapporten zijn uitgeschakeld in de instellingen");
        }
        
        // Generate test PDF
        console.log("📄 Generating test PDF report...");
        const testPdfBlob = await window.PDFGenerator.generateDailyReport(new Date());
        const pdfBase64 = await blobToBase64(testPdfBlob);

        console.log('Email template id check', EMAIL_CONFIG.templateId);

        // Validate PDF size
        if (pdfBase64.length > EMAIL_CONFIG.maxAttachmentSize) {
            throw new Error("PDF bestand is te groot voor email verzending");
        }
        
        // Prepare test email template variables
        const emailTemplateParams = {
            to_email: recipients[0],
            to_emails: recipients.join(', '),
            report_date: new Date().toLocaleDateString('nl-NL'),
            report_type: '🧪 TEST Rapport - KVH Dashboard',
            generated_time: new Date().toLocaleString('nl-NL'),
            attachment_name: `KVH_TEST_Rapport_${new Date().toISOString().split('T')[0]}.pdf`,
            attachment_content: pdfBase64,
            company_name: 'KVH Productie Dashboard (TEST)',
            footer_contact: 'info@kvh.nl | tel +31 (0) 73 5992255',
            from_name: 'KVH Productie Dashboard (TEST)',
            reply_to: 'noreply@kvh.nl'
        };

        console.log(`📧 Using template ID: ${EMAIL_CONFIG.templateId}`);
        console.log(`📧 Using service ID: ${EMAIL_CONFIG.serviceId}`);
        
        // Send test email to first recipient only
        const result = await sendEmailWithRetry(EMAIL_CONFIG.templateId, emailTemplateParams);
        
        if (result.success) {
            console.log("✅ Test report sent successfully");
            return true;
        } else {
            throw new Error(result.error);
        }
        
    } catch (err) {
        console.error("❌ Error sending test report:", err);
        throw new Error(`Fout bij versturen test rapport: ${err.message}`);
    }
}

/**
 * Send email with retry mechanism
 * @param {string} templateId - EmailJS template ID
 * @param {Object} templateParams - Email template parameters
 * @returns {Promise<Object>} Result object
 */
async function sendEmailWithRetry(templateId, templateParams) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= EMAIL_CONFIG.retryAttempts; attempt++) {
        try {
            console.log(`📧 Email attempt ${attempt}/${EMAIL_CONFIG.retryAttempts} to ${templateParams.to_email}`);
            
            // Validate EmailJS is loaded and configured
            if (typeof emailjs === 'undefined') {
                throw new Error("EmailJS library not loaded");
            }
            
            if (!EMAIL_CONFIG.serviceId || !templateId) {
                throw new Error("EmailJS service or template not configured");
            }
            
            // Send email via EmailJS
            const response = await emailjs.send(
                EMAIL_CONFIG.serviceId,
                templateId,
                templateParams
            );
            
            if (response.status === 200) {
                console.log(`✅ Email sent successfully to ${templateParams.to_email} on attempt ${attempt}`);
                return { success: true, response };
            } else {
                throw new Error(`EmailJS returned status: ${response.status} - ${response.text}`);
            }
            
        } catch (err) {
            lastError = err;
            console.warn(`⚠️ Email attempt ${attempt} failed to ${templateParams.to_email}:`, err.message);
            
            // Wait before retry (except on last attempt)
            if (attempt < EMAIL_CONFIG.retryAttempts) {
                console.log(`⏳ Waiting ${EMAIL_CONFIG.retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, EMAIL_CONFIG.retryDelay));
            }
        }
    }
    
    // All attempts failed
    console.error(`❌ All email attempts failed to ${templateParams.to_email}`);
    return { 
        success: false, 
        error: `Email versturen mislukt na ${EMAIL_CONFIG.retryAttempts} pogingen: ${lastError?.message}` 
    };
}

/**
 * Convert blob to base64 string
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Base64 string
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data:application/pdf;base64, prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Get email settings from database or localStorage
 * @returns {Promise<Object>} Email settings
 */
async function getEmailSettings() {
    try {
        // Try database first
        const client = window.supabaseClient;
        if (client) {
            const { data, error } = await client
                .from('settings')
                .select('settings_json')
                .eq('category', 'email_reports')
                .single();
            
            if (data && !error) {
                const settings = JSON.parse(data.settings_json || '{}');
                console.log("📧 Settings loaded from database");
                return settings;
            } else if (error && error.code !== 'PGRST116') { // Not "not found" error
                console.error('❌ Database error getting settings:', error);
            }
        }
        
        // Fallback to localStorage
        const localSettings = localStorage.getItem('emailReportSettings');
        if (localSettings) {
            const settings = JSON.parse(localSettings);
            console.log("📧 Settings loaded from localStorage");
            return settings;
        }
        
        // Return default settings
        console.log("📧 Using default settings");
        return {
            reportsEnabled: false,
            sendTime: '22:00',
            weeklyReportsEnabled: false,
            recipients: ['Jan@kvh.nl'],
            emailServiceId: '',
            emailTemplateId: '',
            emailWeeklyTemplateId: '',
            emailPublicKey: ''
        };
        
    } catch (err) {
        console.error("❌ Error getting email settings:", err);
        return {
            reportsEnabled: false,
            sendTime: '22:00',
            weeklyReportsEnabled: false,
            recipients: ['admin@kvh.nl'],
            emailServiceId: '',
            emailTemplateId: '',
            emailWeeklyTemplateId: '',
            emailPublicKey: ''
        };
    }
}

/**
 * Update email settings
 * @param {Object} newSettings - New settings to save
 * @returns {Promise<boolean>} Success status
 */
async function updateEmailSettings(newSettings) {
    try {
        const client = window.supabaseClient;
        if (client) {
            const { error } = await client
                .from('settings')
                .upsert({
                    category: 'email_reports',
                    settings_json: JSON.stringify(newSettings),
                    updated_at: new Date().toISOString(),
                    updated_by: window.AuthManager?.getCurrentUser()?.name || 'System'
                });
            
            if (error) throw error;
        }
        
        // Also save to localStorage as backup
        localStorage.setItem('emailReportSettings', JSON.stringify(newSettings));
        
        // Update cached settings
        emailState.settings = newSettings;
        
        console.log("✅ Email settings updated successfully");
        return true;
        
    } catch (err) {
        console.error("❌ Error updating email settings:", err);
        return false;
    }
}

/**
 * Log email sent to database
 * @param {string} type - Report type ('daily' or 'weekly')
 * @param {Array} recipients - Email recipients
 * @param {Date} reportDate - Report date
 */
async function logEmailSent(type, recipients, reportDate) {
    try {
        const client = window.supabaseClient;
        if (!client) return;
        
        const logEntry = {
            report_type: type,
            recipients: recipients.join(', '),
            report_date: reportDate.toISOString().split('T')[0],
            sent_at: new Date().toISOString(),
            sent_by: window.AuthManager?.getCurrentUser()?.name || 'System',
            status: 'sent'
        };
        
        const { error } = await client
            .from('email_logs')
            .insert([logEntry]);
        
        if (error) {
            console.warn("⚠️ Failed to log email send:", error);
        } else {
            console.log("📝 Email send logged successfully");
        }
        
    } catch (err) {
        console.warn("⚠️ Error logging email send:", err);
    }
}

/**
 * Get email send history
 * @param {number} limit - Number of records to retrieve
 * @returns {Promise<Array>} Email history
 */
async function getEmailHistory(limit = 50) {
    try {
        const client = window.supabaseClient;
        if (!client) return [];
        
        const { data, error } = await client
            .from('email_logs')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        return data || [];
        
    } catch (err) {
        console.error("❌ Error getting email history:", err);
        return [];
    }
}

/**
 * Check if daily report was already sent today
 * @returns {Promise<boolean>} Whether report was sent today
 */
async function isDailyReportSentToday() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const history = await getEmailHistory(10);
        
        return history.some(log => 
            log.report_type === 'daily' && 
            log.report_date === today &&
            log.status === 'sent'
        );
        
    } catch (err) {
        console.error("❌ Error checking daily report status:", err);
        return false;
    }
}

/**
 * Check if weekly report was sent this week
 * @returns {Promise<boolean>} Whether weekly report was sent
 */
async function isWeeklyReportSentThisWeek() {
    try {
        // Get last Friday's date
        const now = new Date();
        const dayOfWeek = now.getDay();
        const lastFriday = new Date(now);
        
        if (dayOfWeek >= 5) { // Today or after Friday
            lastFriday.setDate(now.getDate() - (dayOfWeek - 5));
        } else { // Before Friday
            lastFriday.setDate(now.getDate() - (dayOfWeek + 2));
        }
        
        const fridayStr = lastFriday.toISOString().split('T')[0];
        const history = await getEmailHistory(10);
        
        return history.some(log => 
            log.report_type === 'weekly' && 
            log.report_date === fridayStr &&
            log.status === 'sent'
        );
        
    } catch (err) {
        console.error("❌ Error checking weekly report status:", err);
        return false;
    }
}

/**
 * Validate email configuration
 * @returns {Promise<Object>} Validation result
 */
async function validateEmailConfig() {
    try {
        const settings = await getEmailSettings();
        const issues = [];
        
        if (!settings.reportsEnabled) {
            issues.push("Email rapporten zijn uitgeschakeld");
        }
        
        if (!settings.recipients || settings.recipients.length === 0) {
            issues.push("Geen email ontvangers ingesteld");
        }
        
        if (!settings.emailServiceId) {
            issues.push("EmailJS Service ID niet ingesteld");
        }
        
        if (!settings.emailTemplateId) {
            issues.push("EmailJS Template ID niet ingesteld");
        }
        
        if (!settings.emailPublicKey) {
            issues.push("EmailJS Public Key niet ingesteld");
        }
        
        if (!emailState.isInitialized && settings.reportsEnabled) {
            issues.push("Email systeem niet geïnitialiseerd");
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            settings
        };
        
    } catch (err) {
        return {
            isValid: false,
            issues: [`Fout bij validatie: ${err.message}`],
            settings: null
        };
    }
}

/**
 * Test EmailJS connection
 * @returns {Promise<boolean>} Connection test result
 */
async function testEmailConnection() {
    try {
        if (!emailState.isInitialized) {
            await initializeEmailSystem();
        }
        
        // Send a simple test message (without attachment)
        const testParams = {
            to_email: 'test@test.com',
            to_name: 'Test User',
            from_name: 'KVH Test',
            subject: 'EmailJS Connection Test',
            message: 'This is a connection test message.',
            reply_to: 'noreply@kvh.nl'
        };
        
        const response = await emailjs.send(
            EMAIL_CONFIG.serviceId,
            EMAIL_CONFIG.templateId,
            testParams
        );
        
        return response.status === 200;
        
    } catch (err) {
        console.error("❌ Email connection test failed:", err);
        return false;
    }
}

// Export email functions
window.EmailReports = {
    initializeEmailSystem,
    sendDailyReport,
    sendWeeklyReport,
    sendTestReport,
    getEmailHistory,
    isDailyReportSentToday,
    isWeeklyReportSentThisWeek,
    validateEmailConfig,
    getEmailSettings,
    updateEmailSettings,
    testEmailConnection
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("📧 Email Reports module loaded - Real EmailJS implementation");
    
    // Initialize email system when needed (with delay to allow settings to load)
    setTimeout(() => {
        initializeEmailSystem().catch(err => {
            console.warn("⚠️ Email system initialization postponed:", err.message);
        });
    }, 2000);
});