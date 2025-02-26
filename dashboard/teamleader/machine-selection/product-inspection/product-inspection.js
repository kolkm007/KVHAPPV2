// Supabase configuratie
const SUPABASE_URL = 'https://drpbsfbqtxiprmubawkb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycGJzZmJxdHhpcHJtdWJhd2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NjQ1MjAsImV4cCI6MjA1NDI0MDUyMH0.9ithiLp4hnRDxpmU8Bm2TgB8zZtTrBMIVWL1vWfICVQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Set de PIN in de Supabase context
(async function setPinContext() {
    const pincode = sessionStorage.getItem('userPin');
    if (pincode) {
        await supabase.rpc('set_claim', {
            name: 'user_pin',
            value: pincode
        });
    }
})();

// Check authenticatie en log de ingelogde gebruiker
(async function checkAuth() {
    const userName = localStorage.getItem('userName');
    if (userName) {
        console.log('🟢 Ingelogd als:', userName);
        // Vul meteen de naam in het formulier in
        const employeeField = document.getElementById('employee');
       
    } else {
        console.error('❌ Geen gebruiker ingelogd');
        alert('Je bent niet ingelogd. Log in om gegevens te versturen.');
        window.location.href = 'index.html';
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const form = document.getElementById('qualityControlForm');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const uploadButton = document.getElementById('uploadButton');
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photo-preview');


    // Initialize machine info
    const urlParams = new URLSearchParams(window.location.search);
    const machineId = urlParams.get('machineId') || 'Machine 2';
    const machineCode = urlParams.get('machineCode') || 'MC-OGEWAESA';
    
    
    document.getElementById('selectedMachine').textContent = machineId;
    document.getElementById('uniqueCode').textContent = machineCode;

    // Update datetime
    function updateDateTime() {
        const now = new Date();
        const formatted = now.toLocaleString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        document.getElementById('datetime').value = formatted;
    }

    updateDateTime();
    setInterval(updateDateTime, 60000); // Update elke minuut

    // Foto upload functionaliteit
    async function uploadPhoto(file) {
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage
                .from('quality_photos')
                .upload(fileName, file);

            if (error) throw error;

            const { publicUrl } = supabase.storage
                .from('quality_photos')
                .getPublicUrl(fileName).data;

            return publicUrl;
        } catch (error) {
            console.error('Fout bij uploaden van foto:', error);
            throw error;
        }
    }
// Button handlers
document.getElementById('backButton').addEventListener('click', () => {
    setTimeout(() => {
        // Probeer deze opties één voor één totdat er een werkt:
        
        // Optie 1: Volledig pad
        window.location.href = '../../index.HTML';
        
        // Optie 2: Relatief pad
        // window.location.href = '../machine-selection/machine-selection.html';
        
        // Optie 3: Absoluut pad zonder voorste slash
        // window.location.href = 'Dashboard/Teamleader/machine-selection/machine-selection.html';
        
        // Voor debug: log huidige pad
        console.log('Current path:', window.location.pathname);
    }, 1000);
});

document.getElementById('previousButton').addEventListener('click', () => {
    window.history.back();
});


    // Foto preview functionaliteit
    uploadButton.addEventListener('click', () => photoInput.click());

    photoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            uploadButton.textContent = 'Foto geselecteerd';
            
            // Preview tonen
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                photoPreview.innerHTML = '';
                photoPreview.appendChild(img);
            };
            reader.readAsDataURL(file);
        } else {
            uploadButton.textContent = 'Upload';
            photoPreview.innerHTML = '';
        }
    });

    // Error handling functies
    function showError(elementId, message) {
        const element = document.getElementById(elementId);
        const errorElement = document.getElementById(`${elementId}-error`);
        if (element && errorElement) {
            element.classList.add('error');
            errorElement.textContent = message;
        }
    }

    function clearErrors() {
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    }

    // Validatie functies
    function validateEmployee(value) {
        return /^[a-zA-Z\s]{2,}$/.test(value);
    }

    function validateProductNumber(value) {
        return /^[0-9]{1,10}$/.test(value);
    }

    function validateWeight(value) {
        const weight = parseFloat(value);
        return !isNaN(weight) && weight >= 0.1 && weight <= 999.9;
    }

    function validateWeightDifference(current, control) {
        return Math.abs(current - control) / current <= 0.05;
    }

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();
    
        try {
            // ... validatie code blijft hetzelfde ...
    
            // Toon loading overlay
            loadingOverlay.style.display = 'flex';
    
            // Upload foto indien aanwezig
            let photoUrl = null;
            if (photoInput.files.length > 0) {
                photoUrl = await uploadPhoto(photoInput.files[0]);
            }
    
            const palletCheck = document.getElementById('palletGood').checked;
            const labelCheck = document.getElementById('labelGood').checked;
            const stickerCheck = document.getElementById('stickerOctobin').checked;
    
            // Verzamel alle form data
            const formData = {
                machine_id: machineId,
                machine_code: machineCode,
                employee_name: document.getElementById('employee').value,
                product_number: document.getElementById('productNumber').value,
                current_weight: parseFloat(document.getElementById('currentWeight').value),
                control_weight: parseFloat(document.getElementById('controlWeight').value),
                comments: document.getElementById('comments').value,
                photo_url: photoUrl,
                meets_requirements: document.getElementById('meetsRequirements').value === 'ja',
                pallet_check: document.getElementById('palletGood').checked,
                label_check: document.getElementById('labelGood').checked,
                sticker_check: document.getElementById('stickerOctobin').checked,
                teamleader_id: localStorage.getItem('userName') // Voeg de ingelogde gebruiker toe
            };
    
            console.log('Sending form data:', formData);
    
            // Stuur data naar Supabase
            const { data, error } = await supabase
                .from('quality_control')
                .insert([formData])
                .select();
    
            if (error) {
                console.error('Fout bij het opslaan van de gegevens:', error);
                throw error;
            }
    
            const generatedId = data[0].id;
            document.getElementById('uniqueCode').textContent = generatedId;
            

             
    // Gebruiker info ophalen uit sessionStorage
    const gebruikerNaam = sessionStorage.getItem('userName') || 'Onbekend';
            //eigen geknustel//
            const successMessage = document.getElementById('successMessage');
        successMessage.style.display = 'flex';

            form.reset();
            uploadButton.textContent = 'Upload';
            photoPreview.innerHTML = '';
            updateDateTime();
    
             // Redirect na 1 seconde
        setTimeout(() => {
            window.location.href = '/Dashboard/Teamleader/machine-selection/machine-selection.html';
        }, 1000);

        } catch (error) {
            console.error('Fout bij het verwerken van het formulier:', error);
            alert('Er is een fout opgetreden bij het opslaan van de kwaliteitscontrole. Probeer het opnieuw.');
        } finally {
            loadingOverlay.style.display = 'none';

    
        }
    });
    

    
    // Remove error class on input
    form.querySelectorAll('input, textarea, select').forEach(element => {
        element.addEventListener('input', function() {
            this.classList.remove('error');
            const errorElement = document.getElementById(`${this.id}-error`);
            if (errorElement) errorElement.textContent = '';
        });
    });

    // Back button functionality
    document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = '../../index.HTML';
    });
});