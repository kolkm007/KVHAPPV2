const SUPABASE_URL = "https://drpbsfbqtxiprmubawkb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycGJzZmJxdHhpcHJtdWJhd2tiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODY2NDUyMCwiZXhwIjoyMDU0MjQwNTIwfQ.tLCJJ-DUAmiHHfeUqB_v6ulp9S6YTzzXdFxJnvpNgb8"
let supabase;

document.addEventListener('DOMContentLoaded', async () => {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Datum en tijd correct instellen
    const now = new Date();
    const formattedDateTime = now.toLocaleDateString('nl-NL') + ' ' + now.toLocaleTimeString('nl-NL');
    document.getElementById('datetime').value = formattedDateTime;

    // Ophalen en tonen van de ingelogde gebruiker
    const pincode = localStorage.getItem('pincode');
    if (pincode) {
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name')
            .eq('pin', pincode)
            .maybeSingle();

        if (userData && userData.name) {
            gebruikerNaam = userData.name;

            const userInfoElement = document.createElement('p');
            userInfoElement.textContent = `Ingelogd als: ${gebruikerNaam}`;
            userInfoElement.style.color = '#920000';
            userInfoElement.style.fontWeight = 'bold';
            document.querySelector('.form-container').prepend(userInfoElement);
        } else {
            console.error('Gebruiker niet gevonden:', userError);
        }
    } else {
        window.location.href = '../login/index.html';
    }

    // Machines ophalen uit Supabase
    try {
        const { data: machines, error } = await supabase.from('machines').select('id, name');

        if (error) {
            console.error('Fout bij het ophalen van machines:', error);
        } else if (machines && machines.length > 0) {
            const machineSelect = document.getElementById('machineSelect');
            machines.forEach(machine => {
                const option = document.createElement('option');
                option.value = machine.id;
                option.textContent = machine.name;
                machineSelect.appendChild(option);
            });
        } else {
            console.warn('Geen machines gevonden in de database.');
        }
    } catch (err) {
        console.error('Er is een fout opgetreden bij het ophalen van machines:', err);
    }

    // Oplossing gevonden? - Toggle weergave
    document.querySelectorAll('input[name="solutionFound"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const solutionDetails = document.getElementById('solutionDetails');
            if (radio.value === 'Ja') {
                solutionDetails.classList.remove('hidden');
            } else {
                solutionDetails.classList.add('hidden');
                alert('Neem contact op met de technische dienst.');
            }
        });
    });

    // Formulierverzending
    document.getElementById('problemForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Controleer of de gebruikersnaam is opgehaald
        if (!gebruikerNaam) {
            alert('Gebruikersinformatie niet beschikbaar. Probeer opnieuw in te loggen.');
            return;
        }

        // Nu pas het formulier verwerken
        const datumTijd = document.getElementById('datetime').value;
        const productcode = document.getElementById('productcode').value;
        const machineId = document.getElementById('machineSelect').value;
        const argumentatie = document.getElementById('argumentation').value;
        const oplossingGevonden = document.querySelector('input[name="solutionFound"]:checked')?.value === 'Ja';
        const oplossingOmschrijving = oplossingGevonden ? document.getElementById('solutionDescription').value : null;
        const files = document.getElementById('photoUpload').files;

        const uploadedPhotos = [];
        for (const file of files) {
            const { data, error } = await supabase.storage.from('probleem_fotos').upload(`foto_${Date.now()}_${file.name}`, file);

            if (error) console.error('Upload error:', error);
            else uploadedPhotos.push(data.path);
        }

        // Voeg gebruikerNaam toe aan de Supabase insert
        const { error } = await supabase.from('probleem_meldingen').insert([
            {
                datum_tijd: datumTijd,
                productcode: productcode,
                machine_id: machineId,
                argumentatie: argumentatie,
                oplossing_gevonden: oplossingGevonden,
                oplossing_omschrijving: oplossingOmschrijving,
                fotos: uploadedPhotos,
                gebruiker_naam: gebruikerNaam
            }
        ]);

        if (error) {
            console.error('Insert error:', error);
        } else {
            // Toon bevestigingsbericht in KVH-stijl
            const confirmationMessage = document.createElement('div');
            confirmationMessage.textContent = 'Probleem succesvol gemeld!';
            confirmationMessage.style.position = 'fixed';
            confirmationMessage.style.top = '50%';
            confirmationMessage.style.left = '50%';
            confirmationMessage.style.transform = 'translate(-50%, -50%)';
            confirmationMessage.style.backgroundColor = '#920000';
            confirmationMessage.style.color = 'white';
            confirmationMessage.style.padding = '20px 40px';
            confirmationMessage.style.borderRadius = '12px';
            confirmationMessage.style.fontSize = '18px';
            confirmationMessage.style.fontWeight = 'bold';
            confirmationMessage.style.textAlign = 'center';
            confirmationMessage.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
            document.body.appendChild(confirmationMessage);

            // Na 1 seconde terug naar dashboard
            setTimeout(() => {
                confirmationMessage.remove();
                window.location.href = '../index.html';
            }, 1000);
        }
    });

    // Navigatieknoppen
    document.getElementById('backBtn').addEventListener('click', () => window.history.back());
    document.getElementById('dashboardBtn').addEventListener('click', () => window.location.href = '../index.html');
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('pincode');
        window.location.href = '../../../index.html';
    });
});