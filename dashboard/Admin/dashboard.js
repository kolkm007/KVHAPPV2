document.addEventListener("DOMContentLoaded", async function () {
    console.log("📢 DOM geladen, initialiseer Supabase...");

    // Supabase-configuratie
    const SUPABASE_URL = "https://drpbsfbqtxiprmubawkb.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycGJzZmJxdHhpcHJtdWJhd2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NjQ1MjAsImV4cCI6MjA1NDI0MDUyMH0.9ithiLp4hnRDxpmU8Bm2TgB8zZtTrBMIVWL1vWfICVQ";

    // Controleer of Supabase correct is geladen
    if (typeof supabase === "undefined") {
        console.error("❌ Supabase is niet correct ingeladen. Controleer je script-import in index.html.");
        return;
    }

    // Initialiseer Supabase client
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("✅ Supabase succesvol geïnitialiseerd!");

    // DOM-elementen
    const machineMap = document.getElementById("machine-map");
    const adminNameSpan = document.getElementById("admin-name");
    const searchMachine = document.getElementById("search-machine");
    const refreshTimerElement = document.getElementById("refresh-timer");
    const logoutButton = document.getElementById("logout-button");
    const machineDetailModal = document.getElementById("machine-detail-modal");
    const detailMachineId = document.getElementById("detail-machine-id");
    const closeDetailModal = document.getElementById("close-detail-modal");
    const tabInspections = document.getElementById("tab-inspections");
    const tabProblems = document.getElementById("tab-problems");
    const inspectionsContent = document.getElementById("inspections-content");
    const problemsContent = document.getElementById("problems-content");
    const inspectionsList = document.getElementById("inspections-list");
    const problemsList = document.getElementById("problems-list");
    const addInspectionBtn = document.getElementById("add-inspection-btn");
    const addProblemBtn = document.getElementById("add-problem-btn");

    // Module selectors
    const moduleButtons = document.querySelectorAll("[id^='module-']");
    const moduleContents = document.querySelectorAll("[id^='content-']");
    const minimapFilters = document.getElementById("minimap-filters");

    // Initialiseer refresh timer
    let refreshCountdown = 60;
    
    // Setup uitlog functionaliteit
    if (logoutButton) {
        logoutButton.addEventListener("click", function(e) {
            e.preventDefault();
            console.log("🚪 Uitloggen...");
            localStorage.clear();
            window.location.href = "/index.html";
        });
    }

    // Controleer localStorage voor ingelogde gebruiker
    const storedUser = localStorage.getItem("userName");
    const storedTimestamp = localStorage.getItem("loginTimestamp");
    console.log("🔍 Gegevens uit localStorage:", { storedUser, storedTimestamp });

    if (storedUser && storedTimestamp) {
        const currentTime = Date.now();
        const timeSinceLogin = currentTime - parseInt(storedTimestamp);
        const sessionTimeout = 5 * 60 * 1000; // 5 minuten, consistent met login.js

        console.log("⏱ Tijd sinds login:", timeSinceLogin, "ms | Timeout limiet:", sessionTimeout, "ms");

        if (timeSinceLogin < sessionTimeout) {
            adminNameSpan.textContent = storedUser;
            console.log("👤 Ingelogde gebruiker uit localStorage:", storedUser);
        } else {
            console.warn("⏰ Sessie verlopen. Tijd sinds login:", timeSinceLogin, "ms");
            localStorage.clear();
            console.log("🧹 localStorage gewist vanwege verlopen sessie");
            window.location.href = "/index.html";
            console.log("🔄 Redirect naar /index.html vanwege verlopen sessie");
            return;
        }
    } else {
        console.warn("⚠️ Geen geldige gebruiker gevonden in localStorage:", { storedUser, storedTimestamp });
        localStorage.clear();
        console.log("🧹 localStorage gewist vanwege ontbrekende gegevens");
        window.location.href = "/index.html";
        console.log("🔄 Redirect naar /index.html vanwege geen gebruiker");
        return;
    }

    // Functie voor countdown timer
    function updateRefreshTimer() {
        refreshCountdown -= 1;
        if (refreshTimerElement) {
            refreshTimerElement.textContent = `Volgende refresh: ${refreshCountdown}s`;
        }
        if (refreshCountdown <= 0) {
            refreshCountdown = 60;
        }
    }

    // Start timer
    const timerInterval = setInterval(updateRefreshTimer, 1000);

    // Module Selection Handler
    moduleButtons.forEach(button => {
        button.addEventListener("click", function() {
            const moduleId = this.id.replace("module-", "");
            
            // Update button styling
            moduleButtons.forEach(btn => {
                if (btn.id === this.id) {
                    btn.classList.remove("bg-gray-200", "text-gray-600");
                    btn.classList.add("bg-red-800", "text-white");
                } else {
                    btn.classList.remove("bg-red-800", "text-white");
                    btn.classList.add("bg-gray-200", "text-gray-600");
                }
            });
            
            // Show selected content
            moduleContents.forEach(content => {
                if (content.id === `content-${moduleId}`) {
                    content.classList.remove("hidden");
                } else {
                    content.classList.add("hidden");
                }
            });
            
            // Show filters only for mini-map
            if (moduleId === "minimap") {
                minimapFilters.classList.remove("hidden");
            } else {
                minimapFilters.classList.add("hidden");
            }
            
            console.log(`🔄 Gewisseld naar module: ${moduleId}`);
        });
    });

    // Modal Handlers
    closeDetailModal.addEventListener("click", function() {
        machineDetailModal.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
    });
    
    // Tab Handlers in Modal
    tabInspections.addEventListener("click", function() {
        // Update tab styling
        tabInspections.classList.add("border-red-800", "text-red-800");
        tabInspections.classList.remove("border-transparent", "hover:text-red-800", "hover:border-red-300");
        tabProblems.classList.remove("border-red-800", "text-red-800");
        tabProblems.classList.add("border-transparent", "hover:text-red-800", "hover:border-red-300");
        
        // Show content
        inspectionsContent.classList.remove("hidden");
        problemsContent.classList.add("hidden");
    });
    
    tabProblems.addEventListener("click", function() {
        // Update tab styling
        tabProblems.classList.add("border-red-800", "text-red-800");
        tabProblems.classList.remove("border-transparent", "hover:text-red-800", "hover:border-red-300");
        tabInspections.classList.remove("border-red-800", "text-red-800");
        tabInspections.classList.add("border-transparent", "hover:text-red-800", "hover:border-red-300");
        
        // Show content
        problemsContent.classList.remove("hidden");
        inspectionsContent.classList.add("hidden");
    });
    
    // Add button handlers in modal
    addInspectionBtn.addEventListener("click", function() {
        const machineId = detailMachineId.textContent;
        window.location.href = `/product-inspection.html?machineId=${machineId}`;
    });
    
    addProblemBtn.addEventListener("click", function() {
        const machineId = detailMachineId.textContent;
        window.location.href = `/problem-notification.html?machineId=${machineId}`;
    });

    // Machine detail weergave
    async function showMachineDetail(machineId) {
        console.log(`🔍 Toon details voor machine ${machineId}`);
        detailMachineId.textContent = machineId;
        
        // Reset tabs naar inspections
        tabInspections.click();
        
        // Toon modal
        machineDetailModal.classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
        
        // Laad inspecties
        await loadMachineInspections(machineId);
        
        // Laad probleemmeldingen
        await loadMachineProblems(machineId);
    }
    
    // Laad inspecties voor specifieke machine
    async function loadMachineInspections(machineId) {
        console.log(`📋 Laad inspecties voor machine ${machineId}`);
        
        // Toon laad indicator
        inspectionsList.innerHTML = '<div class="text-center text-gray-500">Inspecties laden...</div>';
        
        try {
            const { data: inspections, error } = await window.supabaseClient
                .from("quality_control")
                .select("*")
                .eq("machine_id", machineId)
                .order("created_at", { ascending: false })
                .limit(10);
                
            if (error) {
                console.error("❌ Fout bij het ophalen van inspecties:", error);
                inspectionsList.innerHTML = '<div class="text-center text-red-500">Fout bij het laden van inspecties</div>';
                return;
            }
            
            if (inspections.length === 0) {
                inspectionsList.innerHTML = '<div class="text-center text-gray-500">Geen inspecties gevonden voor deze machine</div>';
                return;
            }
            
            // Toon inspecties
            inspectionsList.innerHTML = '';
            
            inspections.forEach(inspection => {
                // Clone template
                const template = document.getElementById('inspection-item-template');
                const inspectionItem = template.content.cloneNode(true);
                
                // Vul gegevens in
                inspectionItem.querySelector('.inspection-id').textContent = inspection.id || '';
                
                // Formateer datum
                const createdDate = new Date(inspection.created_at);
                const formattedDate = createdDate.toLocaleString('nl-NL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                inspectionItem.querySelector('.inspection-date').textContent = formattedDate;
                
                // Product en medewerker info
                inspectionItem.querySelector('.product-number').textContent = inspection.product_number || 'Onbekend';
                inspectionItem.querySelector('.employee-name').textContent = inspection.employee_name || 'Onbekend';
                
                // Gewichten
                inspectionItem.querySelector('.current-weight').textContent = inspection.current_weight || '0';
                inspectionItem.querySelector('.control-weight').textContent = inspection.control_weight || '0';
                
                // Voldoet aan eisen badge
                const meetsRequirementsBadge = inspectionItem.querySelector('.meets-requirements-badge');
                if (inspection.meets_requirements) {
                    meetsRequirementsBadge.textContent = 'Ja';
                    meetsRequirementsBadge.classList.add('bg-green-500');
                } else {
                    meetsRequirementsBadge.textContent = 'Nee';
                    meetsRequirementsBadge.classList.add('bg-red-500');
                }
                
                // Opmerkingen
                const commentsElem = inspectionItem.querySelector('.inspection-comments');
                if (inspection.comments && inspection.comments.trim() !== '') {
                    commentsElem.textContent = inspection.comments;
                } else {
                    commentsElem.textContent = 'Geen opmerkingen';
                    commentsElem.classList.add('text-gray-500', 'italic');
                }
                
                // Check badges
                if (inspection.pallet_check) {
                    const badge = inspectionItem.querySelector('.pallet-check-badge');
                    badge.textContent = 'Pallet: OK';
                    badge.classList.add('bg-green-500');
                    badge.classList.remove('hidden');
                }
                
                if (inspection.label_check) {
                    const badge = inspectionItem.querySelector('.label-check-badge');
                    badge.textContent = 'Etiket: OK';
                    badge.classList.add('bg-green-500');
                    badge.classList.remove('hidden');
                }
                
                if (inspection.sticker_check) {
                    const badge = inspectionItem.querySelector('.sticker-check-badge');
                    badge.textContent = 'Sticker: OK';
                    badge.classList.add('bg-green-500');
                    badge.classList.remove('hidden');
                }
                
                // Voeg toe aan lijst
                inspectionsList.appendChild(inspectionItem);
            });
            
            console.log(`✅ ${inspections.length} inspecties geladen voor machine ${machineId}`);
            
        } catch (err) {
            console.error("❌ Onverwachte fout bij laden inspecties:", err);
            inspectionsList.innerHTML = '<div class="text-center text-red-500">Er is een fout opgetreden bij het laden van inspecties</div>';
        }
    }
    
    // Laad probleemmeldingen voor specifieke machine
    async function loadMachineProblems(machineId) {
        console.log(`📋 Laad probleemmeldingen voor machine ${machineId}`);
        
        // Toon laad indicator
        problemsList.innerHTML = '<div class="text-center text-gray-500">Probleemmeldingen laden...</div>';
        
        try {
            const { data: problems, error } = await window.supabaseClient
                .from("probleem_meldingen")
                .select("*")
                .eq("machine_id", machineId)
                .order("datum_tijd", { ascending: false })
                .limit(10);
                
            if (error) {
                console.error("❌ Fout bij het ophalen van probleemmeldingen:", error);
                problemsList.innerHTML = '<div class="text-center text-red-500">Fout bij het laden van probleemmeldingen</div>';
                return;
            }
            
            if (problems.length === 0) {
                problemsList.innerHTML = '<div class="text-center text-gray-500">Geen probleemmeldingen gevonden voor deze machine</div>';
                return;
            }
            
            // Toon probleemmeldingen
            problemsList.innerHTML = '';
            
            problems.forEach(problem => {
                // Clone template
                const template = document.getElementById('problem-item-template');
                const problemItem = template.content.cloneNode(true);
                
                // Vul gegevens in
                problemItem.querySelector('.problem-id').textContent = problem.id || '';
                
                // Formateer datum
                const problemDate = new Date(problem.datum_tijd);
                const formattedDate = problemDate.toLocaleString('nl-NL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                problemItem.querySelector('.problem-date').textContent = formattedDate;
                
                // Productcode en melder info
                problemItem.querySelector('.productcode').textContent = problem.productcode || 'Onbekend';
                problemItem.querySelector('.reporter-name').textContent = problem.gebruiker_naam || 'Onbekend';
                
                // Status badge
                const statusBadge = problemItem.querySelector('.status-badge');
                if (problem.oplossing_gevonden) {
                    statusBadge.textContent = 'Opgelost';
                    statusBadge.classList.add('bg-green-500');
                    
                    // Toon oplossingscontainer
                    const solutionContainer = problemItem.querySelector('.solution-container');
                    solutionContainer.classList.remove('hidden');
                    
                    // Vul oplossing
                    const solutionDescription = problemItem.querySelector('.solution-description');
                    if (problem.oplossing_omschrijving && problem.oplossing_omschrijving.trim() !== '') {
                        solutionDescription.textContent = problem.oplossing_omschrijving;
                    } else {
                        solutionDescription.textContent = 'Geen omschrijving';
                        solutionDescription.classList.add('text-gray-500', 'italic');
                    }
                } else {
                    statusBadge.textContent = 'Open';
                    statusBadge.classList.add('bg-orange-500');
                }
                
                // Argumentatie
                const descriptionElem = problemItem.querySelector('.problem-description');
                if (problem.argumentatie && problem.argumentatie.trim() !== '') {
                    descriptionElem.textContent = problem.argumentatie;
                } else {
                    descriptionElem.textContent = 'Geen omschrijving';
                    descriptionElem.classList.add('text-gray-500', 'italic');
                }
                
                // Voeg toe aan lijst
                problemsList.appendChild(problemItem);
            });
            
            console.log(`✅ ${problems.length} probleemmeldingen geladen voor machine ${machineId}`);
            
        } catch (err) {
            console.error("❌ Onverwachte fout bij laden probleemmeldingen:", err);
            problemsList.innerHTML = '<div class="text-center text-red-500">Er is een fout opgetreden bij het laden van probleemmeldingen</div>';
        }
    }

    // Haal machine- en inspectiegegevens op
    async function loadDashboardData() {
        try {
            console.log("📡 Ophalen van machinegegevens...");
            const { data: machines, error: machineError } = await window.supabaseClient
                .from("machines")
                .select("id, name, status");

            if (machineError) {
                console.error("❌ Fout bij ophalen van machines:", machineError);
                throw machineError;
            }
            console.log("✅ Machines opgehaald:", machines);

            // Haal inspecties op voor vandaag
            const today = new Date().toISOString().split("T")[0]; // Bijv. "2025-02-24"
            console.log("📅 Huidige datum voor inspecties en meldingen:", today);

            const { data: inspections, error: inspectionError } = await window.supabaseClient
                .from("quality_control")
                .select("machine_id, created_at")
                .gte("created_at", `${today}T00:00:00Z`)
                .lte("created_at", `${today}T23:59:59Z`);

            if (inspectionError) {
                console.error("❌ Fout bij ophalen van inspecties:", inspectionError);
                throw inspectionError;
            }
            console.log("✅ Inspecties opgehaald:", inspections);

            // Haal probleemmeldingen op voor vandaag
            const { data: problems, error: problemError } = await window.supabaseClient
                .from("probleem_meldingen")
                .select("machine_id")
                .gte("datum_tijd", `${today} 00:00:00`)
                .lte("datum_tijd", `${today} 23:59:59`)
                .eq("oplossing_gevonden", false);

            if (problemError) {
                console.error("❌ Fout bij ophalen van probleemmeldingen:", problemError);
                throw problemError;
            }
            console.log("✅ Probleemmeldingen opgehaald:", problems);

            // Tel inspecties en problemen per machine
            const inspectionCountByMachine = {};
            const problemCountByMachine = {};

            inspections.forEach(inspection => {
                const machineId = parseInt(inspection.machine_id); // Converteer naar integer
                inspectionCountByMachine[machineId] = (inspectionCountByMachine[machineId] || 0) + 1;
            });
            console.log("🔢 Inspectietelling per machine:", inspectionCountByMachine);

            problems.forEach(problem => {
                const machineId = problem.machine_id;
                problemCountByMachine[machineId] = (problemCountByMachine[machineId] || 0) + 1;
            });
            console.log("🔢 Probleemtelling per machine:", problemCountByMachine);

            const requiredInspectionsPerDay = 5; // Hardcoded, later dynamisch

            machineMap.innerHTML = ''; // Clear existing content
            if (machines && machines.length > 0) {
                machines.forEach(machine => {
                    // Skip inactieve machines (machine 7)
                    if (machine.status === "inactief") {
                        console.log(`⏸️ Machine ${machine.id} wordt overgeslagen omdat het inactief is`);
                        return;
                    }

                    const inspectionCount = inspectionCountByMachine[machine.id] || 0;
                    const problemCount = problemCountByMachine[machine.id] || 0;
                    const inspectionColor = inspectionCount === requiredInspectionsPerDay ? "bg-green-500" : "bg-red-500";
                    const problemColor = problemCount === 0 ? "bg-gray-400" : "bg-orange-500";

                    const machineDiv = document.createElement("div");
                    machineDiv.className = "machine-block w-24 h-24 flex flex-col items-center justify-center rounded-lg";
                    machineDiv.dataset.machineId = machine.id;
                    machineDiv.innerHTML = `
                        <span class="text-white text-xl font-bold mb-1">${machine.id}</span>
                        <div class="absolute left-2 top-2">
                            <div class="status-dot status-dot-left ${inspectionColor}">${inspectionCount}</div>
                        </div>
                        <div class="absolute right-2 top-2">
                            <div class="status-dot status-dot-right ${problemColor}">${problemCount || 0}</div>
                        </div>
                        <div class="mt-1 flex justify-center space-x-2">
                            <button class="text-xs custom-red text-white px-2 py-1 rounded custom-red-hover" onclick="openInspectionForm(${machine.id})">Inspectie toevoegen</button>
                            <button class="text-xs custom-red text-white px-2 py-1 rounded custom-red-hover" onclick="openProblemForm(${machine.id})">Probleem melden</button>
                        </div>
                    `;
                    
                    // Event listener for entire machine block (excluding buttons)
                    machineDiv.addEventListener("click", function(e) {
                        // Exclude clicks on buttons
                        if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                            showMachineDetail(machine.id);
                        }
                    });
                    
                    machineMap.appendChild(machineDiv);
                    console.log(`🛠 Machine ${machine.id} toegevoegd met ${inspectionCount}/${requiredInspectionsPerDay} inspecties en ${problemCount || 0} problemen`);
                });
            } else {
                const noDataMessage = document.createElement("p");
                noDataMessage.textContent = "Geen machinegegevens beschikbaar";
                noDataMessage.className = "col-span-full text-center text-gray-500 py-4";
                machineMap.appendChild(noDataMessage);
                console.log("ℹ️ Geen machines gevonden");
            }

            // Reset refresh timer
            refreshCountdown = 60;
            if (refreshTimerElement) {
                refreshTimerElement.textContent = `Volgende refresh: ${refreshCountdown}s`;
            }
            console.log("⏱ Refresh timer gereset naar 60 seconden");

        } catch (err) {
            console.error("❌ Onverwachte fout:", err);
            const errorMessage = document.createElement("p");
            errorMessage.textContent = "Er is een fout opgetreden bij het laden van de machines";
            errorMessage.className = "col-span-full text-center text-red-500 py-4";
            machineMap.appendChild(errorMessage);
        }
    }

    // Laad initial data
    await loadDashboardData();

    // Automatische refresh elke minuut (60 seconden)
    setInterval(async () => {
        console.log("⏳ Automatische refresh na 1 minuut...");
        await loadDashboardData();
        console.log("🔄 Dashboard is ververst");
    }, 60000); // 60000 ms = 1 minuut

    // Zoekfunctie (met null-check)
    if (searchMachine) {
        searchMachine.addEventListener("input", function () {
            const searchTerm = searchMachine.value.toLowerCase();
            console.log("🔎 Zoeken naar:", searchTerm);
            Array.from(machineMap.children).forEach(machineDiv => {
                if (machineDiv.tagName === "DIV") {
                    const machineId = machineDiv.querySelector("span").textContent;
                    const isVisible = machineId.includes(searchTerm);
                    machineDiv.style.display = isVisible ? "flex" : "none";
                    console.log(`🔍 Machine ${machineId}: ${isVisible ? "zichtbaar" : "verborgen"}`);
                }
            });
        });
    } else {
        console.error("❌ Element met id='search-machine' niet gevonden in de DOM.");
    }

    // Filters (met null-checks)
    const filterProblem = document.getElementById("filter-problem");
    const filterTasks = document.getElementById("filter-tasks");

    if (filterProblem && filterTasks) {
        filterProblem.addEventListener("change", filterMachines);
        filterTasks.addEventListener("change", filterMachines);
        console.log("✅ Filter event listeners toegevoegd");
    } else {
        console.error("❌ Een of beide filter-elementen (filter-problem, filter-tasks) niet gevonden in de DOM.");
    }

    function filterMachines() {
        const showProblems = filterProblem ? filterProblem.checked : false;
        const showTasks = filterTasks ? filterTasks.checked : false;
        console.log("🧹 Filterinstellingen:", { showProblems, showTasks });

        Array.from(machineMap.children).forEach(machineDiv => {
            if (machineDiv.tagName === "DIV") {
                const leftDot = machineDiv.querySelector(".status-dot-left");
                const rightDot = machineDiv.querySelector(".status-dot-right");
                
                const hasRedClass = leftDot && leftDot.classList.contains("bg-red-500");
                const hasYellowClass = rightDot && rightDot.classList.contains("bg-orange-500");
                
                let displayStyle = "flex";

                if (!showProblems && !showTasks) {
                    displayStyle = "flex";
                } else if (showProblems && showTasks) {
                    displayStyle = (hasRedClass || hasYellowClass) ? "flex" : "none";
                } else if (showProblems) {
                    displayStyle = hasRedClass ? "flex" : "none";
                } else if (showTasks) {
                    displayStyle = hasYellowClass ? "flex" : "none";
                }

                machineDiv.style.display = displayStyle;
                console.log(`🔍 Machine ${machineDiv.querySelector("span").textContent}: tonen=${displayStyle === "flex"}`);
            }
        });
    }

    // Realtime updates
    window.supabaseClient
        .channel("quality_control")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "quality_control" }, () => {
            console.log("🔄 Nieuwe inspectie gedetecteerd, dashboard bijwerken...");
            loadDashboardData();
        })
        .subscribe();

    window.supabaseClient
        .channel("probleem_meldingen")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "probleem_meldingen" }, () => {
            console.log("🔄 Nieuwe probleemmelding gedetecteerd, dashboard bijwerken...");
            loadDashboardData();
        })
        .subscribe();

    // Functies voor knoppen
    window.openInspectionForm = function(machineId) {
        console.log(`🔍 Open inspectieformulier voor machine ${machineId}`);
        window.location.href = `/product-inspection.html?machineId=${machineId}`;
    };

    window.openProblemForm = function(machineId) {
        console.log(`🔍 Open probleemformulier voor machine ${machineId}`);
        window.location.href = `/problem-notification.html?machineId=${machineId}`;
    };
});