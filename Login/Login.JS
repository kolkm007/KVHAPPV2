import { supabase } from '../supabase-config.js';

// DOM-elementen
const pinInput = document.getElementById('pin-input');
const keys = document.querySelectorAll('.key');
const rememberMe = document.getElementById('remember-me');
const forgotPasswordButton = document.querySelector('.forgot-password');

// Configuratie
const CONFIG = {
    maxPinLength: 8,
    minPinLength: 4
};

// Automatisch inloggen bij opstarten
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const savedPin = localStorage.getItem('pincode');
        if (savedPin) {
            console.log("🔄 Opgeslagen pincode gevonden, proberen in te loggen...");
            await validatePincode(savedPin);
        }
    } catch (error) {
        console.error("❌ Fout bij automatisch inloggen:", error);
        localStorage.removeItem('pincode');
    }
});

// Event listeners voor de toetsen
keys.forEach(key => {
    key.addEventListener('click', () => {
        handleKeyPress(key);
    });
});

// Keypad functionaliteit
function handleKeyPress(key) {
    if (key.classList.contains('clear')) {
        pinInput.value = '';
    } else if (key.classList.contains('delete')) {
        pinInput.value = pinInput.value.slice(0, -1);
    } else if (pinInput.value.length < CONFIG.maxPinLength) {
        pinInput.value += key.dataset.value;
        if (pinInput.value.length >= CONFIG.minPinLength) {
            validatePincode(pinInput.value);
        }
        // Voeg keyboard support toe
document.addEventListener('keydown', (event) => {
    if (event.key >= '0' && event.key <= '9') {
        if (pinInput.value.length < CONFIG.maxPinLength) {
            pinInput.value += event.key;
        }
    } else if (event.key === 'Enter') {
        if (pinInput.value) {
            validatePincode(pinInput.value);
        }
    } else if (event.key === 'Backspace') {
        pinInput.value = pinInput.value.slice(0, -1);
    }
});
    }
}

// Pincode validatie via Supabase
async function validatePincode(pincode) {
    if (!validatePinFormat(pincode)) {
        showError("⚠️ Voer een geldige pincode in (4-8 cijfers)");
        return;
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('pin', pincode)
            .single();

        if (error) {
            throw error;
        }

        if (data) {
            console.log("✅ Pincode correct, gebruiker:", data.name);
            if (rememberMe.checked) {
                localStorage.setItem('pincode', pincode);
                localStorage.setItem('userData', JSON.stringify(data));
            }
            handleSuccessfulLogin(data);
        } else {
            console.log("❌ Ongeldige pincode.");
            showError("🚫 Ongeldige pincode, probeer opnieuw.");
        }
    } catch (error) {
        console.error("🔥 Database fout:", error);
        showError("⚠️ Er is een probleem opgetreden. Probeer het later opnieuw.");
    }
}

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

function handleSuccessfulLogin(userData) {
    console.log("🚀 Gebruiker succesvol ingelogd:", userData.name);
    alert(`Welkom ${userData.name}!`);

    const routes = {
        'admin': '../Admin/admin.html',
        'teamleader': '../Teamleader/teamleader.html',
        'sales': '../Sales/sales.html',
        'technical': '../Technical/technical.html',
        'forklift': '../Forklift/forklift.html'
    };

    window.location.href = routes[userData.role] || '../Dashboard/dashboard.html';
}

// Wachtwoord vergeten functie
forgotPasswordButton.addEventListener('click', () => {
    alert('📩 Neem contact op met de systeembeheerder om je wachtwoord opnieuw in te stellen.');
});

// Voeg deze event listener toe onderaan het bestand
loginButton.addEventListener('click', () => {
    if (pinInput.value) {
        validatePincode(pinInput.value);
    }
});
