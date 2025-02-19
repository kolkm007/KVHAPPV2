// Supabase configuratie
const SUPABASE_URL = "https://drpbsfbqtxiprmubawkb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycGJzZmJxdHhpcHJtdWJhd2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NjQ1MjAsImV4cCI6MjA1NDI0MDUyMH0.9ithiLp4hnRDxpmU8Bm2TgB8zZtTrBMIVWL1vWfICVQ";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Functie om machines op te halen
async function loadMachines() {
    console.log("📡 Laden van machines...");

    const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("hal", { ascending: true })
        .order("locatie", { ascending: true });

    if (error) {
        console.error("❌ Fout bij ophalen machines:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.warn("⚠ Geen machines gevonden in de database.");
        return;
    }

    console.log("✅ Machines geladen:", data);

    const miniMap = document.getElementById("mini-map");
    miniMap.innerHTML = ""; // Eerst leegmaken

    data.forEach(machine => {
        const machineDiv = document.createElement("div");
        
        // Dynamische Tailwind styling
        machineDiv.classList.add(
            "bg-white", "p-4", "rounded-lg", "shadow-md", 
            "text-center", "text-sm", "font-semibold", "hover:bg-gray-200", "transition"
        );

        machineDiv.textContent = machine.naam;

        // Machine toevoegen aan mini-map
        miniMap.appendChild(machineDiv);
    });
}

// Machines laden bij pagina-opstart
document.addEventListener("DOMContentLoaded", loadMachines);
