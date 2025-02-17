
import { supabase } from '../js/supabase-config.js';

console.log('✅ Supabase correct geladen via CDN');

// DOM-elementen
const pinInput = document.getElementById('pin-input');
const keys = document.querySelectorAll('.key');
const rememberMe = document.getElementById('remember-me');
const forgotPasswordButton = document.querySelector('.forgot-password');
const loginButton = document.querySelector('.login-button');

// Configuratie
const CONFIG = {
    maxPinLength: 8,
    minPinLength: 4,
    sessionTimeout: 5 * 60 * 1000, // 5 minuten
    appPaths: [
        '/dashboard/admin/',
        '/dashboard/sales/', 
        '/dashboard/teamleader/',
        '/dashboard/forklift/', 
        '/dashboard/technical/'
    ]
};

// Functie om te controleren of gebruiker in app zit
function isInApp() {
    const currentPath = window.location.pathname;
    return CONFIG.appPaths.some(path => currentPath.startsWith(path));
}

// Sessie-timeout mechanisme
function checkSessionTimeout() {
    const savedTimestamp = localStorage.getItem('loginTimestamp');
    
    if (savedTimestamp && isInApp()) {
        const currentTime = Date.now();
        const timeSinceLogin = currentTime - parseInt(savedTimestamp);

        if (timeSinceLogin >= CONFIG.sessionTimeout) {
            // Uitloggen na timeout
            localStorage.removeItem('pincode');
            localStorage.removeItem('userName');
            localStorage.removeItem('userRole');
            localStorage.removeItem('loginTimestamp');
            window.location.href = '/index.html';
        }
    }
}

// Automatisch inloggen bij opstarten
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const savedPin = localStorage.getItem('pincode');
        const savedTimestamp = localStorage.getItem('loginTimestamp');

        // Controleer of sessie nog geldig is
        if (savedPin && savedTimestamp) {
            const currentTime = Date.now();
            const timeSinceLogin = currentTime - parseInt(savedTimestamp);

            if (timeSinceLogin < CONFIG.sessionTimeout) {
                console.log("🔄 Opgeslagen pincode gevonden, proberen in te loggen...");
                await validatePincode(savedPin);
            } else {
                // Sessie verlopen
                localStorage.removeItem('pincode');
                localStorage.removeItem('loginTimestamp');
                console.log("⏰ Sessie verlopen");
            }
        }
    } catch (error) {
        console.error("❌ Fout bij automatisch inloggen:", error);
        localStorage.removeItem('pincode');
        localStorage.removeItem('loginTimestamp');
    }

    // Periodieke controle van sessie
    setInterval(checkSessionTimeout, 60000); // Elke minuut controleren
    checkSessionTimeout(); // Direct eerste controle
});

// Event listeners voor de toetsen
keys.forEach(key => {
    key.addEventListener('click', function() {
        const value = this.getAttribute('data-value');
        if (this.classList.contains('clear')) {
            pinInput.value = '';
        } else if (this.classList.contains('delete')) {
            pinInput.value = pinInput.value.slice(0, -1);
        } else if (pinInput.value.length < CONFIG.maxPinLength) {
            pinInput.value += value;
        }
    });
});

// Keypad functionaliteit via toetsenbord
document.addEventListener('keydown', (event) => {
    if (event.key >= '0' && event.key <= '9') {
        if (pinInput.value.length < CONFIG.maxPinLength) {
            pinInput.value += event.key;
        }
    } else if (event.key === 'Enter') {
        validatePincode(pinInput.value);
    } else if (event.key === 'Backspace') {
        pinInput.value = pinInput.value.slice(0, -1);
    }
});

// Login button event listener
loginButton.addEventListener('click', () => {
    validatePincode(pinInput.value);
});

// Pincode validatie via Supabase
async function validatePincode(pincode) {
    if (!validatePinFormat(pincode)) {
        showError("⚠️ Voer een geldige pincode in (4-8 cijfers)");
        return;
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('name, role')
            .eq('pin', pincode.toString())
            .single();

        if (error || !data) {
            console.log("❌ Ongeldige pincode of fout:", error);
            showError("🚫 Ongeldige pincode, probeer opnieuw.");
            return;
        }

        const userRole = data.role;
        const userName = data.name;

        // Sla logingegevens op met tijdstempel
        localStorage.setItem('pincode', pincode);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userName', userName);
        localStorage.setItem('loginTimestamp', Date.now().toString());

        const roleRoutes = {
            "admin": "/dashboard/admin/index.html",
            "sales": "/dashboard/sales/index.html",
            "teamleader": "/dashboard/teamleader/index.html",
            "forklift": "/dashboard/forklift/index.html",
            "technical": "/dashboard/technical/index.html"
        };

        if (roleRoutes[userRole]) {
            console.log(`🔄 Gebruiker wordt doorgestuurd naar: ${roleRoutes[userRole]}`);
            setTimeout(() => {
                window.location.href = roleRoutes[userRole];
            }, 200);
        } else {
            console.warn("⚠️ Geen geldige rol gevonden! Redirect naar login.");
            alert("Je hebt geen toegang tot een dashboard. Neem contact op met IT.");
            window.location.href = "/index.html";
        }
    } catch (error) {
        console.error("🔥 Database fout:", error);
        showError("⚠️ Er is een probleem opgetreden. Probeer het later opnieuw.");
    }
}

// Sessie-event listener
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && isInApp()) {
        // Timestamp updaten bij terugkeer
        localStorage.setItem('loginTimestamp', Date.now().toString());
    }
});

// Helper functies
function validatePinFormat(pin) {
    return pin &&
        pin.length >= CONFIG.minPinLength &&
        pin.length <= CONFIG.maxPinLength &&
        /^\d+$/.test(pin);
}

function showError(message) {
    alert(message);
    pinInput.style.borderColor = 'red';
    setTimeout(() => pinInput.style.borderColor = '#e6e6e6', 1500);
}

forgotPasswordButton.addEventListener('click', () => {
    alert('📩 Neem contact op met de systeembeheerder om je wachtwoord opnieuw in te stellen.');
});





