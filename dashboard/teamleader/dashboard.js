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
    

    function createTaskElement(task) {
        const taskItem = document.createElement('li');
        taskItem.classList.add("flex", "justify-between", "items-center", "bg-white", "p-3", "rounded-lg", "shadow-md");
    
        const taskText = document.createElement('span');
        taskText.textContent = task.task;
        taskText.classList.add("flex-grow", "truncate", "cursor-pointer"); 
        taskText.onclick = () => toggleTask(task.id);
    
        // Tijd apart toevoegen
        let taskTime = null;
        if (task.scheduled_at) {
            const formattedTime = new Date(task.scheduled_at).toLocaleTimeString("nl-NL", { 
                hour: '2-digit', 
                minute: '2-digit', 
                timeZone: "Europe/Amsterdam"
            });
            taskTime = document.createElement('span');
            taskTime.textContent = `  ${formattedTime}`;
            taskTime.classList.add("text-gray-500", "text-sm", "ml-2");
        }
    
        // Bewerkknop toevoegen (altijd rechts)
        const editButton = document.createElement("button");
        editButton.textContent = "❗";
        editButton.classList.add("edit-btn", "ml-4", "text-red-600", "text-lg");
        editButton.onclick = (event) => {
            event.stopPropagation();
            editTask(task);
        };
    
        // Elementen toevoegen aan de taak
        taskItem.appendChild(taskText);
        if (taskTime) taskItem.appendChild(taskTime); // Tijd wordt alleen toegevoegd als die bestaat
        taskItem.appendChild(editButton);
    
        return taskItem;
    }
    

    // Taak bewerken
    function editTask(task) {
        const popup = document.getElementById("edit-task-popup");
        const taskInput = document.getElementById("edit-task-input");
        const taskTime = document.getElementById("edit-task-time");
        const saveBtn = document.getElementById("save-task-btn");
        const cancelBtn = document.getElementById("cancel-edit-task-btn");

        if (!popup || !taskInput || !taskTime || !saveBtn || !cancelBtn) {
            console.error("❌ Popup-elementen niet gevonden.");
            return;
        }

        taskInput.value = task.task;
        taskTime.value = task.scheduled_at 
            ? new Date(task.scheduled_at).toISOString().substring(11, 16) 
            : "";

        popup.style.display = "flex";

        saveBtn.onclick = async () => {
            const updatedTask = taskInput.value.trim();
            const updatedTime = taskTime.value 
                ? `${new Date().toISOString().split("T")[0]}T${taskTime.value}:00` 
                : null;

            if (!updatedTask) {
                alert("Taak mag niet leeg zijn!");
                return;
            }

            try {
                const { error } = await supabase
                    .from('tasks')
                    .update({ task: updatedTask, scheduled_at: updatedTime })
                    .match({ id: task.id });

                if (error) throw error;

                popup.style.display = "none";
                fetchTasks();
            } catch (error) {
                console.error("❌ Fout bij bijwerken taak:", error);
            }
        };

        cancelBtn.onclick = () => popup.style.display = "none";
    }

    // Taak toevoegen
    async function addTask() {
        const taskText = taskElements.input.value.trim();
        const scheduledTime = document.getElementById("scheduled-time").value;

        if (!taskText) {
            console.error("❌ Geen taak ingevoerd!");
            return;
        }

        const scheduledAt = scheduledTime 
            ? `${new Date().toISOString().split("T")[0]}T${scheduledTime}:00.000Z` 
            : null;

        try {
            const { error } = await supabase
                .from('tasks')
                .insert([{ 
                    task: taskText, 
                    completed: false, 
                    scheduled_at: scheduledAt 
                }]);

            if (error) throw error;

            taskElements.input.value = "";
            document.getElementById("scheduled-time").value = "";
            fetchTasks();
        } catch (error) {
            console.error('❌ Fout bij toevoegen taak:', error);
        }
    }

    // Taak togglen (voltooid)
    async function toggleTask(taskId) {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ completed: true })
                .match({ id: taskId });

            if (error) throw error;

            fetchTasks();
        } catch (error) {
            console.error('❌ Fout bij bijwerken taak:', error);
        }
    }

    // Event listeners
    taskElements.addBtn.addEventListener("click", () => {
        taskElements.inputContainer.style.display = "block";
    });

    taskElements.cancelBtn.addEventListener("click", () => {
        taskElements.inputContainer.style.display = "none";
        taskElements.input.value = "";
    });

    taskElements.confirmBtn.addEventListener("click", addTask);

    // Initiële taken ophalen en gebruikersinfo laden
    loadUserInfo();
    fetchTasks();
});