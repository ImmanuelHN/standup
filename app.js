// ==========================================
// CONFIG
// ==========================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbwQhnmzUN2TCUmC1AjUeZ_V0gFeDdxPIiipkcDI21x6OhudYffFgNtnETq4klBkhLP2/exec";

// ==========================================
// ELEMENTS
// ==========================================

const form = document.getElementById("standupForm");

const developerDropdown =
    document.getElementById("developer");

const currentDate =
    document.getElementById("currentDate");

const themeToggle =
    document.getElementById("themeToggle");

const summaryOutput =
    document.getElementById("summaryOutput");

const directorSummaryOutput =
    document.getElementById("directorSummaryOutput");

const copySummaryBtn =
    document.getElementById("copySummary");

const loader =
    document.getElementById("loader");

const toast =
    document.getElementById("toast");

// Modal

const developerModal =
    document.getElementById("developerModal");

const openDeveloperModal =
    document.getElementById("openDeveloperModal");

const closeDeveloperModal =
    document.getElementById("closeDeveloperModal");

const saveDeveloperBtn =
    document.getElementById("saveDeveloper");

const newDeveloperName =
    document.getElementById("newDeveloperName");

// Dashboard

const updatedCount =
    document.getElementById("updatedCount");

const pendingCount =
    document.getElementById("pendingCount");

const entryCount =
    document.getElementById("entryCount");

// Buttons

const generateSummaryBtn =
    document.getElementById("generateSummary");

const generateDirectorSummaryBtn =
    document.getElementById("generateDirectorSummary");

// ==========================================
// INIT
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    setCurrentDate();
    loadTheme();
    loadDevelopers();
});

// ==========================================
// DATE
// ==========================================

function setCurrentDate() {
    const today = new Date();

    currentDate.innerText =
        today.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
}

// ==========================================
// THEME
// ==========================================

function loadTheme() {
    const savedTheme =
        localStorage.getItem("theme") || "dark";

    document.body.setAttribute(
        "data-theme",
        savedTheme
    );

    updateThemeButton(savedTheme);
}

themeToggle.addEventListener("click", () => {

    const current =
        document.body.getAttribute("data-theme");

    const newTheme =
        current === "dark"
            ? "light"
            : "dark";

    document.body.setAttribute(
        "data-theme",
        newTheme
    );

    localStorage.setItem(
        "theme",
        newTheme
    );

    updateThemeButton(newTheme);
});

function updateThemeButton(theme) {

    themeToggle.textContent =
        theme === "dark"
            ? "☀️ Light Mode"
            : "🌙 Dark Mode";
}

// ==========================================
// LOADER
// ==========================================

function showLoader() {
    loader.classList.remove("hidden");
}

function hideLoader() {
    loader.classList.add("hidden");
}

// ==========================================
// TOAST
// ==========================================

function showToast(message) {

    toast.innerText = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ==========================================
// MODAL
// ==========================================

openDeveloperModal.addEventListener(
    "click",
    () => {
        developerModal.classList.add("active");
    }
);

closeDeveloperModal.addEventListener(
    "click",
    () => {
        developerModal.classList.remove("active");
    }
);

window.addEventListener("click", (e) => {

    if (e.target === developerModal) {
        developerModal.classList.remove("active");
    }
});

// ==========================================
// LOAD DEVELOPERS
// ==========================================

async function loadDevelopers() {

    try {

        showLoader();

        const response =
            await fetch(
                `${API_URL}?action=getDevelopers`
            );

        const developers =
            await response.json();

        developerDropdown.innerHTML =
            '<option value="">Select Developer</option>';

        developers.forEach((dev) => {

            const option =
                document.createElement("option");

            option.value = dev;

            option.textContent = dev;

            developerDropdown.appendChild(option);
        });

    } catch (error) {

        console.error(error);

        showToast(
            "Unable to load developers"
        );

    } finally {

        hideLoader();
    }
}

// ==========================================
// ADD DEVELOPER
// ==========================================

saveDeveloperBtn.addEventListener(
    "click",
    async () => {

        const developerName =
            newDeveloperName.value.trim();

        if (!developerName) {

            showToast(
                "Enter developer name"
            );

            return;
        }

        try {

            showLoader();

            await fetch(API_URL, {

                method: "POST",

                body: JSON.stringify({

                    action: "addDeveloper",

                    developerName
                })
            });

            newDeveloperName.value = "";

            developerModal.classList.remove(
                "active"
            );

            await loadDevelopers();

            showToast(
                "Developer Added"
            );

        } catch (error) {

            console.error(error);

            showToast(
                "Failed to add developer"
            );

        } finally {

            hideLoader();
        }
    }
);

// ==========================================
// GENERATE SUMMARY
// ==========================================

generateSummaryBtn.addEventListener(
    "click",
    generateTeamsSummary
);

function generateTeamsSummary() {

    const developer =
        developerDropdown.value;

    const completed =
        document.getElementById(
            "completedTasks"
        ).value;

    const progress =
        document.getElementById(
            "inProgressTasks"
        ).value;

    const deliverables =
        document.getElementById(
            "deliverables"
        ).value;

    const blockers =
        document.getElementById(
            "blockers"
        ).value;

    const clarifications =
        document.getElementById(
            "clarifications"
        ).value;

    const summary =

        `Developer: ${developer}

✅ Completed Tasks
${completed}

🔄 Current Progress
${progress}

🎯 Today's Deliverables
${deliverables}

🚫 Blockers / Dependencies
${blockers}

❓ Clarifications Required
${clarifications}
`;

    summaryOutput.textContent =
        summary;
}

// ==========================================
// COPY SUMMARY
// ==========================================

copySummaryBtn.addEventListener(
    "click",
    async () => {

        try {

            await navigator.clipboard.writeText(
                summaryOutput.innerText
            );

            showToast(
                "Summary Copied"
            );

        } catch {

            showToast(
                "Copy Failed"
            );
        }
    }
);

// ==========================================
// SAVE STANDUP
// ==========================================

form.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        const payload = {

            action: "saveStandup",

            date:
                currentDate.innerText,

            developer:
                developerDropdown.value,

            completedTasks:
                document.getElementById(
                    "completedTasks"
                ).value,

            inProgressTasks:
                document.getElementById(
                    "inProgressTasks"
                ).value,

            deliverables:
                document.getElementById(
                    "deliverables"
                ).value,

            blockers:
                document.getElementById(
                    "blockers"
                ).value,

            clarifications:
                document.getElementById(
                    "clarifications"
                ).value
        };

        try {

            showLoader();

            const response =
                await fetch(API_URL, {

                    method: "POST",

                    body: JSON.stringify(payload)
                });

            const result =
                await response.json();

            if (result.success) {

                showToast(
                    "Standup Saved Successfully"
                );

                generateTeamsSummary();

                updateDashboard();

            } else {

                showToast(
                    "Save Failed"
                );
            }

        } catch (error) {

            console.error(error);

            showToast(
                "Network Error"
            );

        } finally {

            hideLoader();
        }
    }
);

// ==========================================
// DASHBOARD
// ==========================================

function updateDashboard() {

    let total =
        parseInt(
            entryCount.innerText
        ) || 0;

    total++;

    entryCount.innerText =
        total;

    updatedCount.innerText =
        total;
}

// ==========================================
// DIRECTOR SUMMARY
// ==========================================

generateDirectorSummaryBtn.addEventListener(
    "click",
    generateDirectorSummary
);

async function generateDirectorSummary() {

    try {

        showLoader();

        const response =
            await fetch(
                `${API_URL}?action=getTodaySummary`
            );

        const data =
            await response.json();

        let report =

            `📊 Daily Standup Summary

Developers Updated:
${data.totalDevelopers}

--------------------------------

Completed Tasks

${data.completed}

--------------------------------

Current Progress

${data.inProgress}

--------------------------------

Today's Deliverables

${data.deliverables}

--------------------------------

Blockers

${data.blockers}

--------------------------------

Clarifications

${data.clarifications}
`;

        directorSummaryOutput.textContent =
            report;

    } catch (error) {

        console.error(error);

        showToast(
            "Failed To Generate Summary"
        );

    } finally {

        hideLoader();
    }
}