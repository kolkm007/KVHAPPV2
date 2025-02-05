console.log("🌍 Huidige URL:", window.location.pathname);

document.addEventListener("DOMContentLoaded", () => {
    const userRole = localStorage.getItem("userRole");
    const currentPath = window.location.pathname; 

    console.log("🌍 Huidige URL:", currentPath);
    console.log("🔐 Gedetecteerde rol:", userRole);

    const rolePages = {
        "/dashboard/admin/index.html": "admin",
        "/dashboard/sales/index.html": "sales",
        "/dashboard/teamleader/index.html": "teamleader",
        "/dashboard/forklift/index.html": "forklift",
        "/dashboard/technical/index.html": "technical"
    };

    if (!userRole) {
        console.warn("🚨 Geen gebruiker ingelogd, terug naar login.");
        window.location.href = "/index.html";
        return;
    }

    if (rolePages[currentPath] && rolePages[currentPath] !== userRole) {
        console.warn("⛔ Ongeautoriseerde toegang gedetecteerd!");
        alert("Je hebt geen toegang tot deze pagina.");
        window.location.href = "/index.html";
    }
});