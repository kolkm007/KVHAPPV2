// DOM-elementen
const pinInput = document.getElementById('pin-input');
const keys = document.querySelectorAll('.key');
const rememberMe = document.getElementById('remember-me');
const forgotPasswordButton = document.querySelector('.forgot-password');

// Configuratie
const CONFIG = {
    apiUrl: 'https://script.google.com/macros/s/AKfycbxYduynqHPwPzSl1yT_u8vKrKaTL4pCj6Vum-4y0uFmhaFvsoonkDZ5zA2lG1Uz-NJt/exec',
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
            console.log("✅ Pincode correct, gebruiker:", result.userName);
            if (rememberMe.checked) {
                localStorage.setItem('pincode', pincode);
            }
            redirectToDashboard(result.userName);
        } else {
            console.log("❌ Ongeldige pincode.");
            showError("🚫 Ongeldige pincode, probeer opnieuw.");
        }
    } catch (error) {
        console.error("🔥 API aanroep fout:", error);
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

// Redirect naar Dashboard
function redirectToDashboard(userName) {
    console.log("🚀 Gebruiker succesvol ingelogd:", userName);
    alert(`Welkom ${userName}!`);
    window.location.href = "../Dashboard/dashboard.html";
}

// Wachtwoord vergeten functie
forgotPasswordButton.addEventListener('click', () => {
    alert('📩 Neem contact op met de systeembeheerder om je wachtwoord opnieuw in te stellen.');
});
