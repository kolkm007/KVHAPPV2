document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Dashboard script is geladen!");

    // Supabase configuratie
    const SUPABASE_URL = "https://drpbsfbqtxiprmubawkb.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycGJzZmJxdHhpcHJtdWJhd2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NjQ1MjAsImV4cCI6MjA1NDI0MDUyMH0.9ithiLp4hnRDxpmU8Bm2TgB8zZtTrBMIVWL1vWfICVQ";
    
    // Controleer Supabase beschikbaarheid
    if (typeof window.supabase === "undefined") {
        console.error("❌ Supabase is niet geladen.");
        return;
    }

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // ✅ Uitlogknop functie toevoegen
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        console.log("✅ Uitlogknop gevonden!");
        logoutBtn.addEventListener("click", () => {
            console.log("⏻ Uitloggen... Sessiedata wordt gewist.");
            localStorage.clear(); // Verwijdert alle sessiegegevens
            window.location.href = "/index.html"; // Stuur gebruiker naar de loginpagina
        });
    } else {
        console.error("❌ Uitlogknop niet gevonden in de HTML!");
    }

    // ✅ Toevoeging: Knoppen voor probleem melden en productinspectie
    const reportProblemBtn = document.getElementById("report-problem");
    const inspectProductBtn = document.getElementById("inspect-product");

    if (reportProblemBtn) {
        console.log("✅ Probleem Melden knop gevonden!");
        reportProblemBtn.addEventListener("click", () => {
            console.log("🚨 Probleem Melden knop geklikt!");
            window.location.href = "../teamleader/problem-notification/problem-notification.html";
        });
    } else {
        console.error("❌ Probleem Melden knop NIET gevonden in de HTML!");
    }

    if (inspectProductBtn) {
        console.log("✅ Productinspectie knop gevonden!");
        inspectProductBtn.addEventListener("click", () => {
            console.log("🔍 Productinspectie knop geklikt!");
            window.location.href = "/dashboard/teamleader/machine-selection/machine-selection.html";
        });
    } else {
        console.error("❌ Productinspectie knop NIET gevonden in de HTML!");
    }

    // Gebruikersinformatie weergeven
    function loadUserInfo() {
        const userName = localStorage.getItem('userName');
        const welcomeMessageEl = document.getElementById('welcomeMessage');
        const userInfoEl = document.getElementById('userInfo');

        if (userName) {
            welcomeMessageEl.textContent = `Welkom, ${userName}! 👋`;
        } else {
            welcomeMessageEl.textContent = 'Welkom! Log alstublieft in.';
            userInfoEl.textContent = '';
        }
    }

    // Taak-gerelateerde elementen ophalen
    const taskElements = {
        list: document.getElementById("task-list"),
        addBtn: document.getElementById("add-task-btn"),
        inputContainer: document.getElementById("task-input-container"),
        input: document.getElementById("task-input"),
        confirmBtn: document.getElementById("confirm-task-btn"),
        cancelBtn: document.getElementById("cancel-task-btn")
    };

    // Controleer of alle benodigde elementen aanwezig zijn
    const missingElements = Object.entries(taskElements)
        .filter(([, el]) => !el)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error(`❌ Ontbrekende elementen: ${missingElements.join(', ')}`);
        return;
    }

    // Taken ophalen uit Supabase
    async function fetchTasks() {
        try {
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .order('scheduled_at', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;

            renderTasks(tasks);
        } catch (error) {
            console.error('❌ Fout bij ophalen taken:', error);
        }
    }

    // Taken renderen
    function renderTasks(tasks) {
        taskElements.list.innerHTML = "";
        
        // Alleen niet-voltooide taken tonen
        const incompleteTasks = tasks.filter(task => !task.completed);
        
        incompleteTasks.forEach(task => {
            const taskItem = createTaskElement(task);
            taskElements.list.appendChild(taskItem);
        });
    }

    // Initiële taken ophalen en gebruikersinfo laden
    loadUserInfo();
    fetchTasks();
});
