const goBtn = document.getElementById("runPlan");
const loadArea = document.getElementById("loadingBox");
const bestArea = document.getElementById("bestBox");
const bestTxt = document.getElementById("bestText");
const costArea = document.getElementById("costEst");
const gridArea = document.getElementById("compGrid");
const modalBg = document.getElementById("modalBg");
const modalBox = document.getElementById("modalBox");
const closeModal = document.getElementById("closeModal");
const openGraph = document.getElementById("showGraph");

let radarPlot = null;

// Input validation helper
function validateInputs() {
    const modelSize = document.getElementById("mSize").value;
    const latency = document.getElementById("mLatency").value;
    
    if (!modelSize || modelSize <= 0) {
        showNotification("Please enter a valid model size", "error");
        return false;
    }
    
    if (!latency || latency <= 0) {
        showNotification("Please enter a valid latency target", "error");
        return false;
    }
    
    return true;
}

// Simple notification system
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        ${type === "error" ? "background: rgba(255,100,100,0.9);" : 
          type === "success" ? "background: rgba(100,200,100,0.9);" : 
          "background: rgba(255,200,90,0.9);"}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for notifications
const notificationStyles = document.createElement("style");
notificationStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

goBtn.addEventListener("click", async () => {
    // Validate inputs first
    if (!validateInputs()) {
        return;
    }

    const dataSend = {
        modelSize: document.getElementById("mSize").value,
        latency: document.getElementById("mLatency").value,
        gpuFlag: document.getElementById("mGpu").value,
        trafficFlow: document.getElementById("mTraffic").value,
        costPreference: document.getElementById("mBudget").value,
        bootTolerance: document.getElementById("mCold").value
    };

    // Hide previous results with smooth transition
    bestArea.classList.add("hideArea");
    costArea.classList.add("hideArea");
    gridArea.classList.add("hideArea");

    // Show loading with better UX
    loadArea.classList.remove("hideArea");
    goBtn.disabled = true;
    goBtn.textContent = "Analyzing...";
    
    // Dynamic loading messages
    const loadingMessages = [
        "Evaluating inference pathways…",
        "Analyzing AWS service options…",
        "Calculating cost projections…",
        "Optimizing for your requirements…"
    ];
    
    let messageIndex = 0;
    const loadingText = document.getElementById("loadingText");
    const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        loadingText.textContent = loadingMessages[messageIndex];
    }, 1500);

    try {
        const res = await fetch("/analyze-inference", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(dataSend)
        });

        if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
        }

        const out = await res.json();

        // Hide loading
        loadArea.classList.add("hideArea");
        clearInterval(messageInterval);

        // Show results with staggered animation
        bestTxt.innerText = out.recommended + " • " + out.reason;
        bestArea.classList.remove("hideArea");

        setTimeout(() => {
            const estMin = Math.round(dataSend.modelSize * 0.8);
            const estMax = Math.round(estMin * 1.9);
            costArea.innerHTML = `
                <strong>Estimated Monthly Cost:</strong> ₹${estMin.toLocaleString()} – ₹${estMax.toLocaleString()}
                <br><small style="opacity: 0.7;">*Estimates based on model size and usage patterns</small>
            `;
            costArea.classList.remove("hideArea");
        }, 200);

        setTimeout(() => {
            renderComparisonGrid(out.comparisons);
            gridArea.classList.remove("hideArea");
        }, 400);

        // Setup radar chart data for modal
        setupRadarChart(out.comparisons);
        
        showNotification("Analysis complete! Check out your recommendations below.", "success");

    } catch (error) {
        console.error("Analysis failed:", error);
        showNotification("Analysis failed. Please try again.", "error");
        loadArea.classList.add("hideArea");
        clearInterval(messageInterval);
    } finally {
        goBtn.disabled = false;
        goBtn.textContent = "Compare Routes";
    }
});

closeModal.onclick = () => {
    modalBg.classList.add("hideArea");
    modalBox.classList.add("hideArea");
};

modalBg.onclick = closeModal;

// Render comparison grid with enhanced styling
function renderComparisonGrid(comparisons) {
    gridArea.innerHTML = "";
    
    comparisons.forEach((r, i) => {
        const box = document.createElement("div");
        box.className = "cardGold";

        const head = document.createElement("div");
        head.className = "cardHead";
        head.innerHTML = `
            <span style="font-size: 18px; margin-right: 8px;">${getServiceIcon(r.name)}</span>
            ${r.name}
        `;
        head.setAttribute("tabindex", "0");
        head.setAttribute("role", "button");
        head.setAttribute("aria-expanded", "false");

        const body = document.createElement("div");
        body.className = "cardBody";

        let prosList = r.pros.map(p => `<div style="display: flex; align-items: center; margin: 6px 0;"><span style="color: #90EE90; margin-right: 8px;">✓</span>${p}</div>`).join("");
        let consList = r.cons.map(c => `<div style="display: flex; align-items: center; margin: 6px 0;"><span style="color: #FFB6C1; margin-right: 8px;">✗</span>${c}</div>`).join("");

        body.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; padding: 15px; background: rgba(255,200,90,0.05); border-radius: 10px;">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div><strong style="color: #ffde95;">⚡ Latency:</strong> <span style="color: #ffe8b0;">${r.latency}</span></div>
                    <div><strong style="color: #ffde95;">💰 Cost:</strong> <span style="color: #ffe8b0;">${r.cost}</span></div>
                    <div><strong style="color: #ffde95;">📈 Scalability:</strong> <span style="color: #ffe8b0;">${r.scalability}</span></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div><strong style="color: #ffde95;">🔧 Difficulty:</strong> <span style="color: #ffe8b0;">${r.difficulty}</span></div>
                    <div><strong style="color: #ffde95;">🚀 Cold Start:</strong> <span style="color: #ffe8b0;">${r.coldStart}</span></div>
                    <div><strong style="color: #ffde95;">🎯 Best For:</strong> <span style="color: #ffe8b0;">${r.bestFor}</span></div>
                </div>
            </div>
            <div style="margin-bottom: 20px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 3px solid #ffca60;">
                <strong style="color: #ffde95;">📋 Summary:</strong> 
                <span style="color: #ffe8b0; margin-left: 8px;">${r.summary}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div style="padding: 12px; background: rgba(144,238,144,0.1); border-radius: 8px; border-left: 3px solid #90EE90;">
                    <strong style="color: #90EE90; display: flex; align-items: center; margin-bottom: 10px;">
                        <span style="margin-right: 8px;">✅</span> Advantages
                    </strong>
                    ${prosList}
                </div>
                <div style="padding: 12px; background: rgba(255,182,193,0.1); border-radius: 8px; border-left: 3px solid #FFB6C1;">
                    <strong style="color: #FFB6C1; display: flex; align-items: center; margin-bottom: 10px;">
                        <span style="margin-right: 8px;">⚠️</span> Limitations
                    </strong>
                    ${consList}
                </div>
            </div>
        `;

        const toggleCard = () => {
            const isOpen = box.classList.toggle("cardOpen");
            head.setAttribute("aria-expanded", isOpen.toString());
        };

        head.addEventListener("click", toggleCard);
        head.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleCard();
            }
        });

        box.appendChild(head);
        box.appendChild(body);
        gridArea.appendChild(box);
    });
}

// Get appropriate icon for each service
function getServiceIcon(serviceName) {
    const icons = {
        "Lambda + S3": "⚡",
        "SageMaker Serverless": "🔄",
        "SageMaker Real-Time Endpoint": "🚀",
        "ECS/Fargate GPU": "🖥️",
        "AWS Greengrass (Edge Execution)": "📱"
    };
    return icons[serviceName] || "🔧";
}

// Setup radar chart data
function setupRadarChart(comparisons) {
    openGraph.onclick = () => {
        modalBg.classList.remove("hideArea");
        modalBox.classList.remove("hideArea");

        const labels = ["Latency", "Cost", "Scalability", "Difficulty", "Cold Start"];
        
        if (radarPlot) radarPlot.destroy();

        const colors = [
            { bg: "rgba(255,180,60,0.2)", border: "#ffb43c" },
            { bg: "rgba(100,200,255,0.2)", border: "#64c8ff" },
            { bg: "rgba(255,100,150,0.2)", border: "#ff6496" },
            { bg: "rgba(150,255,100,0.2)", border: "#96ff64" },
            { bg: "rgba(200,100,255,0.2)", border: "#c864ff" }
        ];

        radarPlot = new Chart(document.getElementById("radarCanvas"), {
            type: "radar",
            data: {
                labels: labels,
                datasets: comparisons.map((r, idx) => ({
                    label: r.name,
                    data: [
                        r.radar.latency,
                        r.radar.cost,
                        r.radar.scalability,
                        r.radar.difficulty,
                        r.radar.coldStart
                    ],
                    backgroundColor: colors[idx % colors.length].bg,
                    borderColor: colors[idx % colors.length].border,
                    borderWidth: 2,
                    pointBackgroundColor: "#ffffff",
                    pointBorderColor: colors[idx % colors.length].border,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: "#ffe8b0",
                            font: { size: 10 },
                            padding: 8,
                            usePointStyle: true,
                            boxWidth: 12,
                            boxHeight: 12
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 10,
                        grid: { 
                            color: "rgba(255,200,90,0.2)"
                        },
                        angleLines: { 
                            color: "rgba(255,200,90,0.3)"
                        },
                        ticks: { 
                            display: true,
                            color: "rgba(255,232,176,0.7)",
                            font: { size: 8 },
                            stepSize: 2,
                            backdropColor: 'transparent'
                        },
                        pointLabels: {
                            color: "#ffe8b0",
                            font: { 
                                size: 11,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });

        // Simple legend without complex interactions
        const legendContainer = document.getElementById("legendContainer");
        legendContainer.innerHTML = `
            <div style="text-align: center; color: #ffe8b0; font-size: 13px; margin-top: 10px;">
                📊 Hover over the chart lines to see detailed scores
            </div>
        `;
    };
}

// Enhanced modal controls
closeModal.onclick = () => {
    modalBg.classList.add("hideArea");
    modalBox.classList.add("hideArea");
};

modalBg.onclick = () => {
    modalBg.classList.add("hideArea");
    modalBox.classList.add("hideArea");
};

// Keyboard navigation for modal
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalBg.classList.contains("hideArea")) {
        modalBg.classList.add("hideArea");
        modalBox.classList.add("hideArea");
    }
});

// Add some input enhancements
document.addEventListener("DOMContentLoaded", () => {
    // Add placeholder improvements
    const inputs = document.querySelectorAll("input[type='number']");
    inputs.forEach(input => {
        input.addEventListener("focus", () => {
            input.style.transform = "translateY(-1px)";
        });
        
        input.addEventListener("blur", () => {
            input.style.transform = "translateY(0)";
        });
    });
    
    // Add enter key support for form submission
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
            goBtn.click();
        }
    });
});