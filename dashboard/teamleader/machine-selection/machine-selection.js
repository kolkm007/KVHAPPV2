const SUPABASE_URL = "https://drpbsfbqtxiprmubawkb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycGJzZmJxdHhpcHJtdWJhd2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NjQ1MjAsImV4cCI6MjA1NDI0MDUyMH0.9ithiLp4hnRDxpmU8Bm2TgB8zZtTrBMIVWL1vWfICVQ";

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) {
        console.error('Supabase bibliotheek niet geladen');
        return;
    }

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const machineGrid = document.getElementById('machineGrid');
    const backButton = document.getElementById('backBtn');
    const logoutButton = document.getElementById('logoutBtn');
    const userInfoElement = document.getElementById('userInfo');

    // Terug-knop functionaliteit
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = window.location.origin + '/dashboard/teamleader/index.html';

        });
    }

    // Uitloggen-knop functionaliteit
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('pincode');
            window.location.href = '../../../index.html';
        });
    }

    try {
        // Pincode uit localStorage ophalen
        const pincode = localStorage.getItem('pincode');
        if (!pincode) {
            throw new Error('Geen pincode gevonden');
        }

        // Gebruikersnaam ophalen
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name')
            .eq('pin', pincode)
            .maybeSingle();

        if (userError || !userData) {
            throw new Error('Gebruiker niet gevonden');
        }

        // Gebruikersnaam tonen met rode, dikgedrukte opmaak
        if (userInfoElement) {
            userInfoElement.innerHTML = `<strong style="color: #920000;">Ingelogd als: ${userData.name}</strong>`;
        }

        // Machines ophalen
        const { data: machines, error } = await supabase
            .from('machines')
            .select('id, name, status, hal')
            .eq('status', 'active'); // Alleen machines met status 'active' ophalen

        if (error) {
            throw error;
        }

        if (machines && machines.length > 0) {
            machines.forEach(machine => {
                const button = document.createElement('button');
                button.className = 'machine-btn';
                button.textContent = `${machine.name} (${machine.hal})`;
                button.addEventListener('click', () => {
                    const machineId = machine.id;
                    const machineCode = machine.name; // Pas dit aan als de code uit een andere kolom komt
                    window.location.href = `window.location.href = '../../product-inspection/product-inspection.html?machineId=3&machineCode=Machine%203';?machineId=${machineId}&machineCode=${encodeURIComponent(machineCode)}`;
                });
                
                machineGrid.appendChild(button);
            });
        } else {
            const noMachinesMessage = document.createElement('p');
            noMachinesMessage.textContent = 'Geen machines gevonden';
            machineGrid.appendChild(noMachinesMessage);
        }

    } catch (err) {
        console.error('Fout:', err);
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = err.message;
            errorMessage.style.display = 'block';
        }
    }
});