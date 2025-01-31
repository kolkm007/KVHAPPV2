// DOM-elementen
const pinInput = document.getElementById('pin-input');
const keys = document.querySelectorAll('.key');
const rememberMe = document.getElementById('remember-me');
const forgotPasswordButton = document.querySelector('.forgot-password');

// Configuratie
const CONFIG = {
    apiUrl: 'https://script.google.com/macros/s/AKfycbxV7fERriXwHNC_FVALdzXnUAa3tpCT4BFFPMDKv_h2Wo3_paXSEi7LAXM6SchFb5Vr/exec',
    maxPinLength: 8,
    minPinLength: 4
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
        showError("Voer een geldige pincode in (4-8 cijfers)");
        return;
    }

    try {
        console.log("API aanroep naar:", CONFIG.apiUrl);
        const response = await fetch(`${CONFIG.apiUrl}?pincode=${encodeURIComponent(pincode)}`, {
            method: 'GET',
            mode: 'no-cors',
            credentials: 'omit',
            headers: {
                'Accept': 'application/json'
            }
        });

        // Omdat we in no-cors mode zijn, gebruiken we timeout voor response handling
        setTimeout(() => {
            if (validateOffline(pincode)) {
                if (rememberMe.checked) {
                    localStorage.setItem('pincode', pincode);
                }
                redirectToDashboard('Gebruiker');
            } else {
                showError("Ongeldige pincode");
            }
        }, 1000);

    } catch (error) {
        console.error("API aanroep fout:", error);
        // Fallback validatie
        if (validateOffline(pincode)) {
            if (rememberMe.checked) {
                localStorage.setItem('pincode', pincode);
            }
            redirectToDashboard('Gebruiker');
        } else {
            showError("Ongeldige pincode");
        }
    }
}

// Offline pincode validatie
function validateOffline(pincode) {
    // Voeg hier je geldige pincodes toe
    const validPincodes = ['1234', '5678', '0000'];
    return validPincodes.includes(pincode);
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

function redirectToDashboard(userName) {
    alert(`Welkom ${userName}!`);
    window.location.href = "../Dashboard/dashboard.html";
}

// Wachtwoord vergeten handler
forgotPasswordButton.addEventListener('click', () => {
    alert('Neem contact op met de systeembeheerder om je wachtwoord opnieuw in te stellen.');
});