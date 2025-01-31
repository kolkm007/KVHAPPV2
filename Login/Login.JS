// DOM-elementen
const pinInput = document.getElementById('pin-input');
const keys = document.querySelectorAll('.key');
const rememberMe = document.getElementById('remember-me');
const forgotPasswordButton = document.querySelector('.forgot-password');

// Configuratie
const CONFIG = {
    apiUrl: 'https://script.google.com/macros/s/AKfycbxYduynqHPwPzSl1yT_u8vKrKaTL4pCj6Vum-4y0uFmhaFvsoonkDZ5zA2lG1Uz-NJt/exec',
    maxPinLength: 8,
    minPinLength: 4,
    maxRetries: 3,
    lockoutDuration: 300000 // 5 minuten in milliseconden
};

// State management
let loginAttempts = 0;
let lockoutTimer = null;

// Automatisch inloggen bij opstarten
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check of er een lockout actief is
        const lockoutEnd = localStorage.getItem('lockoutEnd');
        if (lockoutEnd && Date.now() < parseInt(lockoutEnd)) {
            startLockoutTimer(parseInt(lockoutEnd) - Date.now());
            return;
        }

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
        if (!lockoutTimer) {
            handleKeyPress(key);
        }
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
        if (pinInput.value.length === CONFIG.minPinLength) {
            console.log("🔢 4-cijferige pincode ingevoerd, validatie start...");
            validatePincode(pinInput.value);
        }
    }
}

// Pincode validatie via Google Apps Script API
async function validatePincode(pincode) {
    if (!validatePinFormat(pincode)) {
        showError("⚠️ Voer een geldige pincode in (4-8 cijfers)");
        return;
    }

    try {
        // Eerst preflight request om CORS te checken
        await checkCorsAccess();

        console.log("📡 API aanroep naar:", CONFIG.apiUrl);
        const response = await fetch(`${CONFIG.apiUrl}?pincode=${encodeURIComponent(pincode)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`❌ HTTP-fout: ${response.status}`);
        }

        const result = await response.json();
        console.log("🟢 Backend-respons ontvangen:", result);

        if (result.success) {
            handleSuccessfulLogin(pincode, result.userName);
        } else {
            handleFailedLogin();
        }
    } catch (error) {
        console.error("🔥 API aanroep fout:", error);
        handleError(error);
    }
}

// Helper functies
async function checkCorsAccess() {
    try {
        await fetch(`${CONFIG.apiUrl}?type=preflight`, {
            method: 'OPTIONS'
        });
    } catch (error) {
        console.error("CORS preflight fout:", error);
    }
}

function handleSuccessfulLogin(pincode, userName) {
    console.log("✅ Pincode correct, gebruiker:", userName);
    loginAttempts = 0;
    if (rememberMe.checked) {
        localStorage.setItem('pincode', pincode);
    }
    redirectToDashboard(userName);
}

function handleFailedLogin() {
    loginAttempts++;
    console.log("❌ Ongeldige pincode. Poging:", loginAttempts);
    
    if (loginAttempts >= CONFIG.maxRetries) {
        startLockout();
    } else {
        showError(`🚫 Ongeldige pincode. Nog ${CONFIG.maxRetries - loginAttempts} pogingen over.`);
    }
}

function startLockout() {
    const lockoutEnd = Date.now() + CONFIG.lockoutDuration;
    localStorage.setItem('lockoutEnd', lockoutEnd.toString());
    startLockoutTimer(CONFIG.lockoutDuration);
}

function startLockoutTimer(duration) {
    const endTime = Date.now() + duration;
    
    lockoutTimer = setInterval(() => {
        const remaining = Math.ceil((endTime - Date.now()) / 1000);
        if (remaining <= 0) {
            clearInterval(lockoutTimer);
            lockoutTimer = null;
            loginAttempts = 0;
            localStorage.removeItem('lockoutEnd');
            showError("✅ Account ontgrendeld. U kunt het opnieuw proberen.");
        } else {
            showError(`🔒 Account vergrendeld. Probeer opnieuw over ${remaining} seconden.`);
        }
    }, 1000);
}

function handleError(error) {
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        showError("🌐 Netwerkfout - controleer uw internetverbinding");
    } else {
        showError("⚠️ Er is een probleem opgetreden. Probeer het later opnieuw.");
    }
}

function validatePinFormat(pin) {
    return pin &&
        pin.length >= CONFIG.minPinLength &&
        pin.length <= CONFIG.maxPinLength &&
        /^\d+$/.test(pin);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Verwijder bestaande foutmeldingen
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    pinInput.parentElement.appendChild(errorDiv);
    pinInput.style.borderColor = 'red';
    
    setTimeout(() => {
        errorDiv.remove();
        pinInput.style.borderColor = '#e6e6e6';
    }, 3000);
}

function redirectToDashboard(userName) {
    console.log("🚀 Gebruiker succesvol ingelogd:", userName);
    alert(`Welkom ${userName}!`);
    window.location.href = "../Dashboard/dashboard.html";
}

// Wachtwoord vergeten functie
forgotPasswordButton.addEventListener('click', () => {
    alert('📩 Neem contact op met de systeembeheerder om je wachtwoord opnieuw in te stellen.');
});