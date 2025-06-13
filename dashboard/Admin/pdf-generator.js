/**
 * PDF Generator Module - ALLE KLEUREN GEFIXED
 * Generates professional PDF reports with company branding - ONLY REAL DATA
 */

// PDF Configuration - RGB Arrays voor jsPDF
const PDF_CONFIG = {
    pageSize: 'A4',
    margin: { top: 60, left: 40, right: 40, bottom: 80 },
    colors: {
        primary: [146, 0, 0],      // #920000
        secondary: [111, 0, 0],    // #6F0000
        success: [16, 185, 129],   // #10B981
        warning: [245, 158, 11],   // #F59E0B
        danger: [239, 68, 68],     // #EF4444
        gray: [107, 114, 128],     // #6B7280
        lightGray: [243, 244, 246], // #F3F4F6
        text: [17, 24, 39]         // #111827
    },
    fonts: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold'
    }
};

/**
 * Initialize PDF Generator
 */
async function initializePDFGenerator() {
    console.log("📄 Initializing PDF Generator...");
    
    if (typeof window.jsPDF === 'undefined') {
        await loadjsPDF();
    }
    
    console.log("✅ PDF Generator initialized");
}

/**
 * Load jsPDF library dynamically
 */
function loadjsPDF() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            console.log("✅ jsPDF loaded successfully");
            resolve();
        };
        script.onerror = () => {
            console.error("❌ Failed to load jsPDF");
            reject(new Error('Failed to load jsPDF library'));
        };
        document.head.appendChild(script);
    });
}

/**
 * Generate daily report PDF
 */
async function generateDailyReport(date = new Date()) {
    try {
        console.log(`📄 Generating daily report for ${date.toDateString()}`);
        
        await initializePDFGenerator();
        const reportData = await getDailyReportData(date);
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });
        
        await addHeader(doc, 'Dagelijks Productie Rapport', date);
        let yPosition = 140;
        
        yPosition = addExecutiveSummary(doc, reportData, yPosition);
        yPosition += 20;
        
        yPosition = addMachineOverview(doc, reportData.machines, yPosition);
        yPosition += 20;
        
        yPosition = addInspectionsSection(doc, reportData.inspections, yPosition);
        yPosition += 20;
        
        yPosition = addProblemsSection(doc, reportData.problems, yPosition);
        
        addFooter(doc);
        
        const pdfBlob = doc.output('blob');
        console.log("✅ Daily report generated successfully");
        return pdfBlob;
        
    } catch (err) {
        console.error("❌ Error generating daily report:", err);
        throw new Error(`Fout bij genereren dagrapport: ${err.message}`);
    }
}

/**
 * Generate weekly report PDF
 */
async function generateWeeklyReport(endDate = new Date()) {
    try {
        console.log(`📄 Generating weekly report ending ${endDate.toDateString()}`);
        
        await initializePDFGenerator();
        const reportData = await getWeeklyReportData(endDate);
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });
        
        await addHeader(doc, 'Wekelijks Productie Rapport', endDate);
        let yPosition = 140;
        
        yPosition = addWeeklySummary(doc, reportData, yPosition);
        yPosition += 20;
        
        yPosition = await addWeekComparison(doc, reportData, yPosition);
        yPosition += 20;
        
        yPosition = addDailyBreakdown(doc, reportData.dailyData, yPosition);
        
        addFooter(doc);
        
        console.log("✅ Weekly report generated successfully");
        return doc.output('blob');
        
    } catch (err) {
        console.error("❌ Error generating weekly report:", err);
        throw new Error(`Fout bij genereren weekrapport: ${err.message}`);
    }
}

/**
 * Get daily report data from database
 */
async function getDailyReportData(date) {
    const client = window.supabaseClient;
    if (!client) {
        throw new Error("Database verbinding niet beschikbaar");
    }
    
    const dateStr = date.toISOString().split('T')[0];
    
    const [machinesResult, inspectionsResult, problemsResult] = await Promise.all([
        client.from('machines').select('*').eq('status', 'actief'),
        client.from('quality_control')
            .select('*')
            .gte('created_at', `${dateStr}T00:00:00Z`)
            .lte('created_at', `${dateStr}T23:59:59Z`)
            .order('created_at', { ascending: false }),
        client.from('probleem_meldingen')
            .select('*')
            .gte('datum_tijd', `${dateStr} 00:00:00`)
            .lte('datum_tijd', `${dateStr} 23:59:59`)
            .order('datum_tijd', { ascending: false })
    ]);
    
    if (machinesResult.error) throw new Error(`Machines: ${machinesResult.error.message}`);
    if (inspectionsResult.error) throw new Error(`Inspecties: ${inspectionsResult.error.message}`);
    if (problemsResult.error) throw new Error(`Problemen: ${problemsResult.error.message}`);
    
    const machines = machinesResult.data || [];
    const inspections = inspectionsResult.data || [];
    const problems = problemsResult.data || [];
    const machineStats = calculateMachineStats(machines, inspections, problems);
    
    return {
        date,
        machines: machineStats,
        inspections,
        problems,
        summary: {
            totalInspections: inspections.length,
            passedInspections: inspections.filter(i => i.meets_requirements).length,
            totalProblems: problems.length,
            openProblems: problems.filter(p => !p.oplossing_gevonden).length,
            solvedProblems: problems.filter(p => p.oplossing_gevonden).length
        }
    };
}

/**
 * Get weekly report data
 */
async function getWeeklyReportData(endDate) {
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    
    const client = window.supabaseClient;
    if (!client) {
        throw new Error("Database verbinding niet beschikbaar");
    }
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const [inspectionsResult, problemsResult] = await Promise.all([
        client.from('quality_control')
            .select('*')
            .gte('created_at', `${startStr}T00:00:00Z`)
            .lte('created_at', `${endStr}T23:59:59Z`),
        client.from('probleem_meldingen')
            .select('*')
            .gte('datum_tijd', `${startStr} 00:00:00`)
            .lte('datum_tijd', `${endStr} 23:59:59`)
    ]);
    
    if (inspectionsResult.error) throw new Error(`Week inspecties: ${inspectionsResult.error.message}`);
    if (problemsResult.error) throw new Error(`Week problemen: ${problemsResult.error.message}`);
    
    const inspections = inspectionsResult.data || [];
    const problems = problemsResult.data || [];
    const dailyData = groupDataByDay(inspections, problems, startDate, endDate);
    
    return {
        startDate,
        endDate,
        inspections,
        problems,
        dailyData,
        summary: {
            totalInspections: inspections.length,
            totalProblems: problems.length,
            avgQualityRate: calculateAverageQualityRate(inspections)
        }
    };
}

/**
 * Add header with logo and company info
 */
async function addHeader(doc, title, date) {
    // Header background
    doc.setFillColor(...PDF_CONFIG.colors.primary);
    doc.rect(0, 0, 595, 50, 'F');
    
    // Logo placeholder
    doc.setFillColor(255, 255, 255);
    doc.circle(50, 25, 15, 'F');
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.setFontSize(12);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.text('KVH', 43, 30);
    
    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.text('KVH Productie Dashboard', 80, 30);
    
    // Report title
    doc.setTextColor(...PDF_CONFIG.colors.text);
    doc.setFontSize(20);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.text(title, 40, 80);
    
    // Date
    doc.setFontSize(12);
    doc.setFont(PDF_CONFIG.fonts.normal);
    const dateString = date.toLocaleDateString('nl-NL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.text(dateString, 40, 100);
    
    // Generated timestamp
    doc.setFontSize(10);
    doc.setTextColor(...PDF_CONFIG.colors.gray);
    const timestamp = new Date().toLocaleString('nl-NL');
    doc.text(`Gegenereerd op: ${timestamp}`, 40, 115);
}

/**
 * Add executive summary section
 */
function addExecutiveSummary(doc, data, yPos) {
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.text('📊 Samenvatting', 40, yPos);
    yPos += 25;
    
    const summaryItems = [
        {
            title: 'Inspecties',
            value: data.summary.totalInspections,
            subtitle: `${data.summary.passedInspections} goedgekeurd`,
            color: PDF_CONFIG.colors.success
        },
        {
            title: 'Problemen',
            value: data.summary.totalProblems,
            subtitle: `${data.summary.openProblems} nog open`,
            color: data.summary.openProblems > 0 ? PDF_CONFIG.colors.danger : PDF_CONFIG.colors.gray
        },
        {
            title: 'Kwaliteit',
            value: data.summary.totalInspections > 0 
                ? Math.round((data.summary.passedInspections / data.summary.totalInspections) * 100) + '%'
                : '0%',
            subtitle: 'Slagingspercentage',
            color: PDF_CONFIG.colors.primary
        }
    ];
    
    const boxWidth = 120;
    const boxHeight = 60;
    const spacing = 20;
    
    summaryItems.forEach((item, index) => {
        const x = 40 + (index * (boxWidth + spacing));
        
        doc.setFillColor(...PDF_CONFIG.colors.lightGray);
        doc.roundedRect(x, yPos, boxWidth, boxHeight, 3, 3, 'F');
        
        doc.setFillColor(...item.color);
        doc.roundedRect(x, yPos, boxWidth, 4, 3, 3, 'F');
        
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.gray);
        doc.text(item.title, x + 10, yPos + 20);
        
        doc.setFontSize(18);
        doc.setFont(PDF_CONFIG.fonts.bold);
        doc.setTextColor(...PDF_CONFIG.colors.text);
        doc.text(item.value.toString(), x + 10, yPos + 40);
        
        doc.setFontSize(8);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.gray);
        doc.text(item.subtitle, x + 10, yPos + 52);
    });
    
    return yPos + boxHeight + 10;
}

/**
 * Add machine overview section
 */
function addMachineOverview(doc, machines, yPos) {
    if (yPos > 650) {
        doc.addPage();
        yPos = 40;
    }
    
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.text('🔧 Machine Overzicht', 40, yPos);
    yPos += 25;
    
    if (machines.length === 0) {
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.gray);
        doc.text('Geen actieve machines gevonden.', 40, yPos);
        return yPos + 20;
    }
    
    const colPositions = [40, 100, 200, 300, 400];
    
    // Header background
    doc.setFillColor(...PDF_CONFIG.colors.lightGray);
    doc.rect(40, yPos - 15, 515, 20, 'F');
    
    // Headers
    doc.setFontSize(10);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.setTextColor(...PDF_CONFIG.colors.text);
    const headers = ['Machine', 'Inspecties', 'Kwaliteit', 'Problemen', 'Status'];
    headers.forEach((header, index) => {
        doc.text(header, colPositions[index] + 5, yPos - 3);
    });
    
    yPos += 10;
    
    // Machine rows
    machines.forEach((machine, index) => {
        if (yPos > 750) {
            doc.addPage();
            yPos = 40;
        }
        
        if (index % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(40, yPos - 12, 515, 18, 'F');
        }
        
        doc.setFontSize(9);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.text);
        
        doc.text(`Machine ${machine.id}`, colPositions[0] + 5, yPos);
        doc.text(`${machine.inspectionCount}/5`, colPositions[1] + 5, yPos);
        
        const qualityRate = machine.inspectionCount > 0 
            ? Math.round((machine.passedInspections / machine.inspectionCount) * 100)
            : 0;
        doc.text(`${qualityRate}%`, colPositions[2] + 5, yPos);
        doc.text(machine.problemCount.toString(), colPositions[3] + 5, yPos);
        
        const status = machine.inspectionCount >= 5 && machine.problemCount === 0 ? 'OK' : 'Aandacht';
        const statusColor = status === 'OK' ? PDF_CONFIG.colors.success : PDF_CONFIG.colors.warning;
        doc.setTextColor(...statusColor);
        doc.text(status, colPositions[4] + 5, yPos);
        doc.setTextColor(...PDF_CONFIG.colors.text);
        
        yPos += 18;
    });
    
    return yPos + 10;
}

/**
 * Add inspections section
 */
function addInspectionsSection(doc, inspections, yPos) {
    if (yPos > 600) {
        doc.addPage();
        yPos = 40;
    }
    
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.text('📋 Inspecties Detail', 40, yPos);
    yPos += 20;
    
    if (inspections.length === 0) {
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.gray);
        doc.text('Geen inspecties gevonden voor deze dag.', 40, yPos);
        return yPos + 20;
    }
    
    const failedInspections = inspections.filter(i => !i.meets_requirements);
    const passedInspections = inspections.filter(i => i.meets_requirements);
    const samplePassed = passedInspections.slice(0, Math.min(5, passedInspections.length));
    
    const displayInspections = [...failedInspections, ...samplePassed]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
    
    if (inspections.length > displayInspections.length) {
        doc.setFontSize(9);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.gray);
        doc.text(`Toon ${displayInspections.length} van ${inspections.length} inspecties (alle afgekeurde + selectie goedgekeurde)`, 40, yPos);
        yPos += 15;
    }
    
    displayInspections.forEach((inspection, index) => {
        if (yPos > 720) {
            doc.addPage();
            yPos = 40;
        }
        
        const boxHeight = 45;
        const bgColor = inspection.meets_requirements ? [240, 253, 244] : [254, 242, 242];
        
        doc.setFillColor(...bgColor);
        doc.roundedRect(40, yPos - 5, 515, boxHeight, 3, 3, 'F');
        
        const statusColor = inspection.meets_requirements ? PDF_CONFIG.colors.success : PDF_CONFIG.colors.danger;
        doc.setFillColor(...statusColor);
        doc.circle(50, yPos + 15, 4, 'F');
        
        doc.setFontSize(9);
        doc.setFont(PDF_CONFIG.fonts.bold);
        doc.setTextColor(...PDF_CONFIG.colors.text);
        
        const time = new Date(inspection.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        doc.text(`#${inspection.id} - ${inspection.product_number || 'Onbekend'} - ${inspection.employee_name || 'Onbekend'} (${time})`, 65, yPos + 8);
        
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.text(`Gewicht: ${inspection.current_weight || 0}g / ${inspection.control_weight || 0}g`, 65, yPos + 20);
        
        if (inspection.comments && inspection.comments.trim()) {
            doc.setTextColor(...PDF_CONFIG.colors.gray);
            const comments = inspection.comments.length > 80 
                ? inspection.comments.substring(0, 80) + '...'
                : inspection.comments;
            doc.text(`Opmerkingen: ${comments}`, 65, yPos + 32);
        }
        
        yPos += boxHeight + 5;
    });
    
    return yPos + 10;
}

/**
 * Add problems section
 */
function addProblemsSection(doc, problems, yPos) {
    if (yPos > 600) {
        doc.addPage();
        yPos = 40;
    }
    
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.text('🚨 Probleemmeldingen', 40, yPos);
    yPos += 20;
    
    if (problems.length === 0) {
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.gray);
        doc.text('Geen probleemmeldingen voor deze dag.', 40, yPos);
        return yPos + 20;
    }
    
    problems.forEach((problem, index) => {
        if (yPos > 720) {
            doc.addPage();
            yPos = 40;
        }
        
        const boxHeight = problem.oplossing_gevonden ? 60 : 45;
        const bgColor = problem.oplossing_gevonden ? [240, 253, 244] : [255, 247, 237];
        
        doc.setFillColor(...bgColor);
        doc.roundedRect(40, yPos - 5, 515, boxHeight, 3, 3, 'F');
        
        const statusColor = problem.oplossing_gevonden ? PDF_CONFIG.colors.success : PDF_CONFIG.colors.warning;
        doc.setFillColor(...statusColor);
        doc.circle(50, yPos + 15, 4, 'F');
        
        doc.setFontSize(9);
        doc.setFont(PDF_CONFIG.fonts.bold);
        doc.setTextColor(...PDF_CONFIG.colors.text);
        
        const time = new Date(problem.datum_tijd).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        doc.text(`#${problem.id} - Machine ${problem.machine_id} - ${problem.productcode || 'Onbekend'} - ${problem.gebruiker_naam || 'Onbekend'} (${time})`, 65, yPos + 8);
        
        doc.setFont(PDF_CONFIG.fonts.normal);
        const description = problem.argumentatie && problem.argumentatie.length > 80 
            ? problem.argumentatie.substring(0, 80) + '...'
            : problem.argumentatie || 'Geen omschrijving';
        doc.text(`Probleem: ${description}`, 65, yPos + 20);
        
        if (problem.oplossing_gevonden) {
            doc.setTextColor(...PDF_CONFIG.colors.success);
            const solution = problem.oplossing_omschrijving && problem.oplossing_omschrijving.length > 80
                ? problem.oplossing_omschrijving.substring(0, 80) + '...'
                : problem.oplossing_omschrijving || 'Opgelost';
            doc.text(`Oplossing: ${solution}`, 65, yPos + 32);
        } else {
            doc.setTextColor(...PDF_CONFIG.colors.warning);
            doc.text('Status: Nog niet opgelost', 65, yPos + 32);
        }
        
        yPos += boxHeight + 5;
    });
    
    return yPos + 10;
}

/**
 * Add weekly summary section
 */
function addWeeklySummary(doc, data, yPos) {
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.text('📈 Week Samenvatting', 40, yPos);
    yPos += 25;
    
    const weekInfo = `Week van ${data.startDate.toLocaleDateString('nl-NL')} tot ${data.endDate.toLocaleDateString('nl-NL')}`;
    doc.setFontSize(10);
    doc.setFont(PDF_CONFIG.fonts.normal);
    doc.setTextColor(...PDF_CONFIG.colors.gray);
    doc.text(weekInfo, 40, yPos);
    yPos += 20;
    
    const totalProblemsOpen = data.problems.filter(p => !p.oplossing_gevonden).length;
    const avgInspectionsPerDay = Math.round(data.summary.totalInspections / 5);
    
    const summaryItems = [
        {
            title: 'Totaal Inspecties',
            value: data.summary.totalInspections,
            subtitle: `${avgInspectionsPerDay}/dag gemiddeld`,
            color: PDF_CONFIG.colors.primary
        },
        {
            title: 'Gemiddelde Kwaliteit',
            value: data.summary.avgQualityRate + '%',
            subtitle: 'Slagingspercentage',
            color: data.summary.avgQualityRate >= 85 ? PDF_CONFIG.colors.success : PDF_CONFIG.colors.warning
        },
        {
            title: 'Probleemmeldingen',
            value: data.summary.totalProblems,
            subtitle: `${totalProblemsOpen} nog open`,
            color: totalProblemsOpen > 0 ? PDF_CONFIG.colors.danger : PDF_CONFIG.colors.success
        }
    ];
    
    const boxWidth = 150;
    const boxHeight = 60;
    const spacing = 15;
    
    summaryItems.forEach((item, index) => {
        const x = 40 + (index * (boxWidth + spacing));
        
        doc.setFillColor(...PDF_CONFIG.colors.lightGray);
        doc.roundedRect(x, yPos, boxWidth, boxHeight, 3, 3, 'F');
        doc.setFillColor(...item.color);
        doc.roundedRect(x, yPos, boxWidth, 4, 3, 3, 'F');
        
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.gray);
        doc.text(item.title, x + 10, yPos + 20);
        
        doc.setFontSize(18);
        doc.setFont(PDF_CONFIG.fonts.bold);
        doc.setTextColor(...PDF_CONFIG.colors.text);
        doc.text(item.value.toString(), x + 10, yPos + 40);
        
        doc.setFontSize(8);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.gray);
        doc.text(item.subtitle, x + 10, yPos + 52);
    });
    
    return yPos + boxHeight + 20;
}

/**
 * Add week comparison section
 */
async function addWeekComparison(doc, data, yPos) {
    if (yPos > 650) {
        doc.addPage();
        yPos = 40;
    }
    
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.text('📊 Vergelijking met Vorige Week', 40, yPos);
    yPos += 25;
    
    try {
        const prevWeekEndDate = new Date(data.startDate);
        prevWeekEndDate.setDate(prevWeekEndDate.getDate() - 1);
        const prevWeekData = await getWeeklyReportData(prevWeekEndDate);
        
        const tableData = [
            {
                metric: 'Inspecties',
                thisWeek: data.summary.totalInspections,
                lastWeek: prevWeekData.summary.totalInspections,
                change: data.summary.totalInspections - prevWeekData.summary.totalInspections
            },
            {
                metric: 'Probleemmeldingen',
                thisWeek: data.summary.totalProblems,
                lastWeek: prevWeekData.summary.totalProblems,
                change: data.summary.totalProblems - prevWeekData.summary.totalProblems
            },
            {
                metric: 'Kwaliteitspercentage',
                thisWeek: data.summary.avgQualityRate + '%',
                lastWeek: prevWeekData.summary.avgQualityRate + '%',
                change: data.summary.avgQualityRate - prevWeekData.summary.avgQualityRate,
                isPercentage: true
            }
        ];
        
        doc.setFillColor(...PDF_CONFIG.colors.lightGray);
        doc.rect(40, yPos - 15, 450, 20, 'F');
        
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.fonts.bold);
        doc.setTextColor(...PDF_CONFIG.colors.text);
        
        const headers = ['Metric', 'Deze Week', 'Vorige Week', 'Verandering'];
        const positions = [45, 150, 250, 350];
        
        headers.forEach((header, index) => {
            doc.text(header, positions[index], yPos - 3);
        });
        
        yPos += 10;
        
        tableData.forEach((row, index) => {
            if (yPos > 750) {
                doc.addPage();
                yPos = 40;
            }
            
            if (index % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(40, yPos - 12, 450, 18, 'F');
            }
            
            doc.setFontSize(9);
            doc.setFont(PDF_CONFIG.fonts.normal);
            doc.setTextColor(...PDF_CONFIG.colors.text);
            
            doc.text(row.metric, positions[0], yPos);
            doc.text(row.thisWeek.toString(), positions[1], yPos);
            doc.text(row.lastWeek.toString(), positions[2], yPos);
            
            const changeText = row.isPercentage 
                ? (row.change > 0 ? `+${row.change}%` : `${row.change}%`)
                : (row.change > 0 ? `+${row.change}` : `${row.change}`);
            
            let changeColor = PDF_CONFIG.colors.gray;
            if (row.metric === 'Inspecties' && row.change > 0) changeColor = PDF_CONFIG.colors.success;
            if (row.metric === 'Inspecties' && row.change < 0) changeColor = PDF_CONFIG.colors.warning;
            if (row.metric === 'Probleemmeldingen' && row.change > 0) changeColor = PDF_CONFIG.colors.danger;
            if (row.metric === 'Probleemmeldingen' && row.change < 0) changeColor = PDF_CONFIG.colors.success;
            if (row.metric === 'Kwaliteitspercentage' && row.change > 0) changeColor = PDF_CONFIG.colors.success;
            if (row.metric === 'Kwaliteitspercentage' && row.change < 0) changeColor = PDF_CONFIG.colors.danger;
            
            doc.setTextColor(...changeColor);
            doc.text(changeText, positions[3], yPos);
            doc.setTextColor(...PDF_CONFIG.colors.text);
            
            yPos += 18;
        });
        
    } catch (err) {
        console.error("❌ Error getting previous week data:", err);
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.gray);
        doc.text('Vergelijkingsgegevens met vorige week niet beschikbaar.', 40, yPos);
        yPos += 20;
    }
    
    return yPos + 20;
}

/**
 * Add daily breakdown section
 */
function addDailyBreakdown(doc, dailyData, yPos) {
    if (yPos > 600) {
        doc.addPage();
        yPos = 40;
    }
    
    doc.setFontSize(14);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.text('📅 Dagelijkse Uitsplitsing', 40, yPos);
    yPos += 25;
    
    if (!dailyData || dailyData.length === 0) {
        doc.setFontSize(10);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.gray);
        doc.text('Geen dagelijkse gegevens beschikbaar.', 40, yPos);
        return yPos + 20;
    }
    
    doc.setFillColor(...PDF_CONFIG.colors.lightGray);
    doc.rect(40, yPos - 15, 400, 20, 'F');
    
    doc.setFontSize(10);
    doc.setFont(PDF_CONFIG.fonts.bold);
    doc.setTextColor(...PDF_CONFIG.colors.text);
    
    const headers = ['Dag', 'Inspecties', 'Kwaliteit', 'Problemen'];
    const positions = [45, 150, 250, 350];
    
    headers.forEach((header, index) => {
        doc.text(header, positions[index], yPos - 3);
    });
    
    yPos += 10;
    
    dailyData.forEach((day, index) => {
        if (yPos > 750) {
            doc.addPage();
            yPos = 40;
        }
        
        if (index % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(40, yPos - 12, 400, 18, 'F');
        }
        
        doc.setFontSize(9);
        doc.setFont(PDF_CONFIG.fonts.normal);
        doc.setTextColor(...PDF_CONFIG.colors.text);
        
        const dayName = day.date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'numeric' });
        doc.text(dayName, positions[0], yPos);
        doc.text(day.inspections.toString(), positions[1], yPos);
        doc.text(`${day.qualityRate}%`, positions[2], yPos);
        doc.text(day.problems.toString(), positions[3], yPos);
        
        yPos += 18;
    });
    
    return yPos + 10;
}

/**
 * Add footer with company information
 */
function addFooter(doc) {
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setFillColor(...PDF_CONFIG.colors.lightGray);
    doc.rect(0, pageHeight - 60, 595, 1, 'F');
    
    doc.setFontSize(10);
    doc.setFont(PDF_CONFIG.fonts.normal);
    doc.setTextColor(...PDF_CONFIG.colors.gray);
    
    const footerText = 'info@kvh.nl | tel +31 (0) 73 5992255';
    const textWidth = doc.getTextWidth(footerText);
    const centerX = (595 - textWidth) / 2;
    
    doc.text(footerText, centerX, pageHeight - 40);
    
    const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
    doc.text(`Pagina ${pageNum}`, 500, pageHeight - 20);
}

/**
 * Helper functions
 */
function groupDataByDay(inspections, problems, startDate, endDate) {
    const dailyData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const dayInspections = inspections.filter(i => 
            i.created_at.startsWith(dateStr)
        );
        
        const dayProblems = problems.filter(p => 
            p.datum_tijd.startsWith(dateStr)
        );
        
        dailyData.push({
            date: new Date(currentDate),
            inspections: dayInspections.length,
            problems: dayProblems.length,
            qualityRate: dayInspections.length > 0 
                ? Math.round((dayInspections.filter(i => i.meets_requirements).length / dayInspections.length) * 100)
                : 0
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dailyData;
}

function calculateAverageQualityRate(inspections) {
    if (inspections.length === 0) return 0;
    
    const passed = inspections.filter(i => i.meets_requirements).length;
    return Math.round((passed / inspections.length) * 100);
}

function calculateMachineStats(machines, inspections, problems) {
    return machines.map(machine => {
        const machineInspections = inspections.filter(i => parseInt(i.machine_id) === machine.id);
        const machineProblems = problems.filter(p => p.machine_id === machine.id);
        const passedInspections = machineInspections.filter(i => i.meets_requirements);
        
        return {
            ...machine,
            inspectionCount: machineInspections.length,
            passedInspections: passedInspections.length,
            problemCount: machineProblems.length
        };
    });
}

// Export PDF Generator functions
window.PDFGenerator = {
    generateDailyReport,
    generateWeeklyReport,
    initializePDFGenerator
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 PDF Generator module loaded - ALLE KLEUREN GEFIXED!");
});