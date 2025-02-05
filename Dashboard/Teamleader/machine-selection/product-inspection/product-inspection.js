document.addEventListener('DOMContentLoaded', () => {
    // Haal machine-ID en code uit de URL
    const urlParams = new URLSearchParams(window.location.search);
    const machineId = urlParams.get('machineId') || 'Machine 2';
    const machineCode = urlParams.get('machineCode') || 'MC-OGEWAESA';

    // Vul machinegegevens in
    document.getElementById('selectedMachine').textContent = machineId;
    document.getElementById('uniqueCode').textContent = machineCode;

    // Vul datum en tijd automatisch in
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
    setInterval(updateDateTime, 1000);

    // Validatie bij het verzenden van het formulier
    document.getElementById('qualityControlForm').addEventListener('submit', function(e) {
        e.preventDefault();
        let isValid = true;

        const employee = document.getElementById('employee');
        const productNumber = document.getElementById('productNumber');
        const currentWeight = parseFloat(document.getElementById('currentWeight').value);
        const controlWeight = parseFloat(document.getElementById('controlWeight').value);
        const meetsRequirements = document.getElementById('meetsRequirements').value;
        const comments = document.getElementById('comments');
        const photo = document.getElementById('photo');

        // Medewerker validatie
        if (!/^[a-zA-Z\s]{2,}$/.test(employee.value)) {
            employee.classList.add('error');
            isValid = false;
        }

        // Productnummer validatie
        if (!/^[0-9]{1,10}$/.test(productNumber.value)) {
            productNumber.classList.add('error');
            isValid = false;
        }

        // Gewicht validatie
        if (isNaN(currentWeight) || currentWeight < 0.1 || currentWeight > 999.9) {
            document.getElementById('currentWeight').classList.add('error');
            isValid = false;
        }

        if (isNaN(controlWeight) || controlWeight < 0.1 || controlWeight > 999.9) {
            document.getElementById('controlWeight').classList.add('error');
            isValid = false;
        }

        // Controlegewicht mag max 5% afwijken
        if (Math.abs(currentWeight - controlWeight) / currentWeight > 0.05) {
            document.getElementById('controlWeight').classList.add('error');
            isValid = false;
        }

        // Opmerkingen en foto verplicht indien product niet voldoet
        if (meetsRequirements === 'nee' && !comments.value.trim()) {
            comments.classList.add('error');
            isValid = false;
        }
        
        if (meetsRequirements === 'nee' && !photo.files.length) {
            alert('Foto is verplicht als het product niet voldoet.');
            isValid = false;
        }

        if (isValid) {
            alert('Formulier succesvol verzonden!');
            this.submit();
        }
    });

    // Verwijder error-class bij input
    document.querySelectorAll('input, textarea').forEach(element => {
        element.addEventListener('input', function() {
            this.classList.remove('error');
        });
    });

    // Terugknop functionaliteit
    document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = '../dashboard.html';
    });
});
