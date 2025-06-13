/**
 * Supabase Configuration and Client Initialization
 * This module handles the Supabase client setup and connection management
 */

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: "https://drpbsfbqtxiprmubawkb.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycGJzZmJxdHhpcHJtdWJhd2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NjQ1MjAsImV4cCI6MjA1NDI0MDUyMH0.9ithiLp4hnRDxpmU8Bm2TgB8zZtTrBMIVWL1vWfICVQ"
};

// Global Supabase Client
let supabaseClient = null;
let connectionStatus = 'disconnected';

/**
 * Initialize Supabase client with error handling
 * @returns {Promise<boolean>} Success status
 */
async function initializeSupabase() {
    try {
        // Check if Supabase is loaded
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase library not loaded');
            updateConnectionStatus('error', 'Supabase library niet geladen');
            return false;
        }

        // Create client
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        
        // Test connection
        const { data, error } = await supabaseClient
            .from('machines')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Supabase connection test failed:', error);
            updateConnectionStatus('error', 'Verbinding mislukt');
            return false;
        }

        console.log('✅ Supabase successfully initialized and tested');
        updateConnectionStatus('connected', 'Verbonden');
        
        // Make client globally available
        window.supabaseClient = supabaseClient;
        
        return true;
    } catch (err) {
        console.error('❌ Error initializing Supabase:', err);
        updateConnectionStatus('error', 'Initialisatie fout');
        return false;
    }
}

/**
 * Update connection status indicator
 * @param {string} status - 'connected', 'disconnected', 'error'
 * @param {string} message - Status message
 */
function updateConnectionStatus(status, message) {
    connectionStatus = status;
    const statusElement = document.getElementById('connection-status');
    
    if (statusElement) {
        statusElement.className = 'connection-status';
        statusElement.textContent = message;
        
        switch (status) {
            case 'connected':
                statusElement.classList.add('connection-online');
                // Hide after 3 seconds if connected
                setTimeout(() => {
                    statusElement.classList.add('hidden');
                }, 3000);
                break;
            case 'disconnected':
            case 'error':
                statusElement.classList.add('connection-offline');
                statusElement.classList.remove('hidden');
                break;
        }
    }
}

/**
 * Get Supabase client instance
 * @returns {Object|null} Supabase client or null if not initialized
 */
function getSupabaseClient() {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase client not initialized');
        return null;
    }
    return supabaseClient;
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
    try {
        if (!supabaseClient) {
            return false;
        }

        const { data, error } = await supabaseClient
            .from('machines')
            .select('count', { count: 'exact', head: true });

        return !error;
    } catch (err) {
        console.error('❌ Connection test failed:', err);
        return false;
    }
}

/**
 * Setup realtime subscriptions for dashboard updates
 * @param {Function} onUpdate - Callback function for updates
 */
function setupRealtimeSubscriptions(onUpdate) {
    if (!supabaseClient) {
        console.warn('⚠️ Cannot setup subscriptions: Supabase not initialized');
        return;
    }

    try {
        // Subscribe to quality control changes
        supabaseClient
            .channel('quality_control_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'quality_control' 
            }, (payload) => {
                console.log('🔄 Quality control update:', payload);
                onUpdate('quality_control', payload);
            })
            .subscribe();

        // Subscribe to problem reports changes
        supabaseClient
            .channel('problem_reports_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'probleem_meldingen' 
            }, (payload) => {
                console.log('🔄 Problem report update:', payload);
                onUpdate('probleem_meldingen', payload);
            })
            .subscribe();

        // Subscribe to machine status changes
        supabaseClient
            .channel('machine_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'machines' 
            }, (payload) => {
                console.log('🔄 Machine update:', payload);
                onUpdate('machines', payload);
            })
            .subscribe();

        console.log('✅ Realtime subscriptions setup complete');
    } catch (err) {
        console.error('❌ Error setting up subscriptions:', err);
    }
}

/**
 * Cleanup Supabase connections and subscriptions
 */
function cleanup() {
    if (supabaseClient) {
        try {
            supabaseClient.removeAllChannels();
            console.log('🧹 Supabase subscriptions cleaned up');
        } catch (err) {
            console.error('❌ Error cleaning up subscriptions:', err);
        }
    }
}

// Connection monitoring
let connectionCheckInterval = null;

/**
 * Start periodic connection monitoring
 * @param {number} interval - Check interval in milliseconds (default: 30000)
 */
function startConnectionMonitoring(interval = 30000) {
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
    }

    connectionCheckInterval = setInterval(async () => {
        const isConnected = await testConnection();
        if (!isConnected && connectionStatus === 'connected') {
            console.warn('⚠️ Connection lost');
            updateConnectionStatus('disconnected', 'Verbinding verbroken');
        } else if (isConnected && connectionStatus !== 'connected') {
            console.log('✅ Connection restored');
            updateConnectionStatus('connected', 'Verbinding hersteld');
        }
    }, interval);
}

/**
 * Stop connection monitoring
 */
function stopConnectionMonitoring() {
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
        connectionCheckInterval = null;
    }
}

// Export functions for use in other modules
window.SupabaseManager = {
    initialize: initializeSupabase,
    getClient: getSupabaseClient,
    testConnection,
    setupRealtimeSubscriptions,
    startConnectionMonitoring,
    stopConnectionMonitoring,
    cleanup,
    getConnectionStatus: () => connectionStatus
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Supabase...');
    updateConnectionStatus('disconnected', 'Verbinding maken...');
    
    const success = await initializeSupabase();
    if (success) {
        startConnectionMonitoring();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);