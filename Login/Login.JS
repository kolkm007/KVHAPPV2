// DOM-elementen
const pinInput = document.getElementById('pin-input');
const keys = document.querySelectorAll('.key');
const rememberMe = document.getElementById('remember-me');
const forgotPasswordButton = document.querySelector('.forgot-password');

// Configuratie
const CONFIG = {
    apiUrl: 'https://script.google.com/macros/s/AKfycbxV7fERriXwHNC_FVALdzXnUAa3tpCT4BFFPMDKv_h2Wo3_paXSEi7LAXM6SchFb5Vr/exec',
    maxPinLength: 8,
    minPinLength: 4,
    rateLimitAttempts: 5,
    rateLimitWindow: 5 * 60 * 1000, // 5 minuten
    errorDisplayTime: 3000
};

// Rate limiting object
const rateLimiter = {
    attempts: 0,
    lastAttempt: 0,
    
    checkLimit() {
        const now = Date.now();
        if (now - this.lastAttempt > CONFIG.rateLimitWindow) {
            this.attempts = 0;
        }
        this.lastAttempt = now;
        this.attempts++;
        return this.attempts <= CONFIG.rateLimitAttempts;
    },
    
    getRemainingTime() {
        return Math.ceil((CONFIG.rateLimitWindow - (Date.now() - this.lastAttempt)) / 1000);
    },
    
    reset() {
        this.attempts = 0;
        this.lastAttempt = 0;
    }
};

// Automatisch inloggen bij opstarten
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const savedPin = localStorage.getItem('pincode');
        if (savedPin) {
            console.log("Opgeslagen pincode gevonden, proberen in te loggen...");
            await validatePincode(savedPin);
        }
    } catch (error) {
        console.error("Fout bij automatisch inloggen:", error);
        localStorage.removeItem('pincode');
    }
});

// Keypad event handlers
keys.forEach(key => {
    key.addEventListener('click', () => {
        handleKeyPress(key);
    });
});

function handleKeyPress(key) {
    if (!rateLimiter.checkLimit()) {
        showError(`Te veel pogingen. Probeer opnieuw over ${rateLimiter.getRemainingTime()} seconden.`);
        return;
    }

    if (key.classList.contains('clear')) {
        pinInput.value = '';
    } else if (key.classList.contains('delete')) {
        pinInput.value = pinInput.value.slice(0, -1);
    } else if (pinInput.value.length < CONFIG.maxPinLength) {
        pinInput.value += key.dataset.value;
        if (pinInput.value.length === CONFIG.minPinLength) {
            console.log("4-cijferige pincode ingevoerd, validatie start...");
            validatePincode(pinInput.value);
        }
    }
}

// Pincode validatie
async function validatePincode(pincode) {
    if (!validatePinFormat(pincode)) {
        showError(`Voer een geldige pincode in (${CONFIG.minPinLength}-${CONFIG.maxPinLength} cijfers)`);
        return;
    }

    try {
        const response = await fetch(`${CONFIG.apiUrl}?pincode=${encodeURIComponent(pincode)}`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-cache'
        });

        if (!response.ok) throw new Error('Netwerkfout');
        
        const result = await response.json();
        
        if (result.success) {
            handleSuccessfulLogin(pincode, result.userName);
        } else {
            // Fallback naar offline validatie als API niet beschikbaar
            if (!navigator.onLine && validateOffline(pincode)) {
                handleSuccessfulLogin(pincode, 'Offline Gebruiker');
            } else {
                showError(result.error || "Ongeldige pincode");
            }
        }
    } catch (error) {
        console.error("API aanroep fout:", error);
        
        if (!navigator.onLine && validateOffline(pincode)) {
            handleSuccessfulLogin(pincode, 'Offline Gebruiker');
        } else {
            showError("Verbindingsfout - probeer het later opnieuw");
        }
    }
}

// Login success handler
function handleSuccessfulLogin(pincode, userName) {
    rateLimiter.reset();
    if (rememberMe.checked) {
        localStorage.setItem('pincode', pincode);
    }
    redirectToDashboard(userName);
}

// Offline pincode validatie
const validPincodes = new Set(['1234', '5678', '0000']);

function validateOffline(pincode) {
    return validPincodes.has(pincode);
}

// Helper functies
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
    
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    pinInput.parentElement.appendChild(errorDiv);
    pinInput.classList.add('error');
    
    setTimeout(() => {
        errorDiv.remove();
        pinInput.classList.remove('error');
    }, CONFIG.errorDisplayTime);
}

function redirectToDashboard(userName) {
    console.log(`Redirecting to dashboard for ${userName}`);
    window.location.href = "../Dashboard/dashboard.html";
}

// Wachtwoord vergeten handler
forgotPasswordButton.addEventListener('click', () => {
    alert('Neem contact op met de systeembeheerder om je wachtwoord opnieuw in te stellen.');
});