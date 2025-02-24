// Supabase configuratie
const supabaseUrl = 'https://drpbsfbqtxiprmubawkb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycGJzZmJxdHhpcHJtdWJhd2tiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODY2NDUyMCwiZXhwIjoyMDU0MjQwNTIwfQ.tLCJJ-DUAmiHHfeUqB_v6ulp9S6YTzzXdFxJnvpNgb8';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content geladen");
    
    // Huidige datum en tijd instellen bij laden
    const now = new Date();
    // ISO 8601 formaat gebruiken (YYYY-MM-DD HH:MM:SS)
    document.getElementById('datetime').value = formatDateForDatabase(now);
    
    // Machine selectie vullen
    loadMachines();
    
    // Event listeners
    document.querySelectorAll('input[name="solutionFound"]').forEach(radio => {
        radio.addEventListener('change', toggleSolutionDetails);
    });
    
    document.getElementById('problemForm').addEventListener('submit', handleSubmit);
    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('dashboardBtn').addEventListener('click', goDashboard);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Popup elementen controleren en initialiseren
    const popupCloseBtn = document.getElementById('popupCloseBtn');
    const popupOverlay = document.getElementById('popupOverlay');
    const successPopup = document.getElementById('successPopup');
    
    console.log("Popup elementen:", {
        popupCloseBtn: !!popupCloseBtn,
        popupOverlay: !!popupOverlay,
        successPopup: !!successPopup
    });
    
    // Popup sluiten event listener - alleen toevoegen als ze bestaan
    if (popupCloseBtn) {
        popupCloseBtn.addEventListener('click', closePopupAndRedirect);
    }
    
    if (popupOverlay) {
        popupOverlay.addEventListener('click', closePopupAndRedirect);
    }
});

// Datum formatteren voor database
function formatDateForDatabase(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // Formaat: YYYY-MM-DD HH:MM:SS (ISO 8601, PostgreSQL standaard)
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Machines laden
async function loadMachines() {
    try {
        const { data, error } = await supabase
            .from('machines')
            .select('id, name');
        
        if (error) throw error;
        
        const selectElement = document.getElementById('machineSelect');
        data.forEach(machine => {
            const option = document.createElement('option');
            option.value = machine.id;
            option.textContent = machine.name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading machines:', error);
        alert('Fout bij het laden van machines.');
    }
}

// Toon/verberg oplossing veld
function toggleSolutionDetails() {
    const solutionDetails = document.getElementById('solutionDetails');
    if (document.getElementById('solutionYes').checked) {
        solutionDetails.classList.remove('hidden');
    } else {
        solutionDetails.classList.add('hidden');
    }
}

// Formulier verwerken
async function handleSubmit(event) {
    event.preventDefault();
    console.log("Formulier verzenden");
    
    // Gegevens verzamelen
    const datumTijd = document.getElementById('datetime').value;
    const productcode = document.getElementById('productcode').value;
    const machineId = document.getElementById('machineSelect').value;
    const argumentatie = document.getElementById('argumentation').value;
    
    // Radio button waarde ophalen
    let oplossingGevonden = null;
    document.querySelectorAll('input[name="solutionFound"]').forEach(radio => {
        if (radio.checked) {
            // Converteer "Ja"/"Nee" naar boolean true/false voor de database
            oplossingGevonden = radio.value === 'Ja';
        }
    });
    
    // Oplossing omschrijving ophalen indien van toepassing
    const oplossingOmschrijving = oplossingGevonden === true
        ? document.getElementById('solutionDescription').value
        : null;
    
    // Foto's verwerken
    const fotoInput = document.getElementById('photoUpload');
    const fotoUrls = await uploadPhotos(fotoInput.files);
    
    // Gebruiker info ophalen uit sessionStorage
    const gebruikerNaam = sessionStorage.getItem('userName') || 'Onbekend';
    
    try {
        // Data naar Supabase sturen
        const { data, error } = await supabase
            .from('probleem_meldingen')
            .insert([
                {
                    datum_tijd: datumTijd,
                    productcode: productcode,
                    machine_id: machineId,
                    argumentatie: argumentatie,
                    oplossing_gevonden: oplossingGevonden,
                    oplossing_omschrijving: oplossingOmschrijving,
                    fotos: fotoUrls,
                    gebruiker_naam: gebruikerNaam
                }
            ])
            .select();
        
        if (error) throw error;
        
        console.log("Formulier succesvol verstuurd, popup wordt getoond");
        
        // Toon de custom popup in plaats van alert
        showSuccessPopup();
        
    } catch (error) {
        console.error('Insert error:', error);
        alert(`Fout bij het verzenden: ${error.message}`);
    }
}

// Foto's uploaden
async function uploadPhotos(files) {
    if (!files || files.length === 0) return null;
    
    const uploadedUrls = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${Date.now()}_${file.name}`;
        
        try {
            const { data, error } = await supabase.storage
                .from('problem_photos')
                .upload(fileName, file);
            
            if (error) throw error;
            
            // Publieke URL ophalen
            const { data: urlData } = supabase.storage
                .from('problem_photos')
                .getPublicUrl(fileName);
            
            uploadedUrls.push(urlData.publicUrl);
            
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    }
    
    return uploadedUrls;
}

// Popup functies
function showSuccessPopup() {
    const successPopup = document.getElementById('successPopup');
    const popupOverlay = document.getElementById('popupOverlay');
    
    if (successPopup && popupOverlay) {
        console.log("Popup elementen gevonden, popup wordt weergegeven");
        
        // Zorg ervoor dat ze zichtbaar zijn door display eigenschap aan te passen
        successPopup.style.display = 'block';
        popupOverlay.style.display = 'block';
        
        // Voeg fade-in class toe voor animatie effect
        successPopup.classList.add('fade-in');
        popupOverlay.classList.add('fade-in');
        
        // Voorkom dat de pagina scrollt als de popup zichtbaar is
        document.body.style.overflow = 'hidden';
    } else {
        console.log("Popup elementen niet gevonden, terugvallen op alert");
        // Fallback naar alert als de popup elementen niet bestaan
        alert('Probleem succesvol gemeld!');
        // Reset het formulier
        document.getElementById('problemForm').reset();
        document.getElementById('datetime').value = formatDateForDatabase(new Date());
        // Redirect naar dashboard
        window.location.href = 'dashboard/teamleader/index.html';
    }
}

function closePopupAndRedirect() {
    console.log("Popup sluiten en redirecten naar dashboard");
    
    const successPopup = document.getElementById('successPopup');
    const popupOverlay = document.getElementById('popupOverlay');
    
    if (successPopup && popupOverlay) {
        // Verwijder fade-in class
        successPopup.classList.remove('fade-in');
        popupOverlay.classList.remove('fade-in');
        
        successPopup.style.display = 'none';
        popupOverlay.style.display = 'none';
        
        // Zet overflow terug
        document.body.style.overflow = '';
    }
    
    // Reset het formulier
    document.getElementById('problemForm').reset();
    document.getElementById('datetime').value = formatDateForDatabase(new Date());
    
    // Redirect naar dashboard
    window.location.href = 'dashboard/teamleader/index.html';
}

// Navigatie functies
function goBack() {
    window.history.back();
}

function goDashboard() {
    window.location.href = '../index.html';
}

function logout() {
    // Logout logica hier
    sessionStorage.clear();
    window.location.href = '../../../index.html';
}