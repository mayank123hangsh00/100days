// main application controller
// orchestrates file upload -> parsing -> analytics -> rendering

(() => {
  "use strict";

  // dom variables
  const dropZone        = document.getElementById("drop-zone");
  const fileInput       = document.getElementById("file-input");
  const uploadSection   = document.getElementById("upload-section");
  const resultsSection  = document.getElementById("results-section");
  const loadingOverlay  = document.getElementById("loading-overlay");
  const errorBanner     = document.getElementById("error-banner");
  const errorMsg        = document.getElementById("error-message");
  const dismissError    = document.getElementById("dismiss-error");
  const fileNameDisplay = document.getElementById("file-name-display");
  const resetBtn        = document.getElementById("reset-btn");

  // Stat cards
  const statTotalMessages = document.getElementById("stat-total-messages");
  const statTotalUsers    = document.getElementById("stat-total-users");
  const statPeakDay       = document.getElementById("stat-peak-day");
  const statPeakCount     = document.getElementById("stat-peak-count");
  const statActiveCount      = document.getElementById("stat-active-count");
  const statActiveCountBadge = document.getElementById("stat-active-count-badge");

  // Active users list
  const activeUsersGrid   = document.getElementById("active-users-grid");
  const noActiveMsg       = document.getElementById("no-active-msg");

  // basic ui error display
  function showError(message) {
    errorMsg.textContent = message;
    errorBanner.classList.remove("hidden");
    setTimeout(() => errorBanner.classList.add("hidden"), 6000);
  }

  dismissError.addEventListener("click", () => errorBanner.classList.add("hidden"));

  // loader toggle
  function setLoading(on) {
    loadingOverlay.classList.toggle("hidden", !on);
  }

  // file parsing and drop events
  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) processFile(fileInput.files[0]);
  });

  resetBtn.addEventListener("click", () => {
    // Reset UI to upload state
    resultsSection.classList.add("hidden");
    uploadSection.classList.remove("hidden");
    fileInput.value = "";
    ChartRenderer.destroy();
    activeUsersGrid.innerHTML = "";
    noActiveMsg.classList.add("hidden");
  });

  // handles file reading and passes data to parser
  function processFile(file) {
    // Validate file type
    if (!file.name.toLowerCase().endsWith(".txt")) {
      showError("Please upload a WhatsApp chat export (.txt) file.");
      return;
    }

    setLoading(true);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const rawText = e.target.result;

        if (!rawText || rawText.trim().length === 0) {
          throw new Error("The file appears to be empty.");
        }

        // 1. Parse
        const events = Parser.parse(rawText);

        if (events.length === 0) {
          throw new Error("No recognizable WhatsApp chat data found in this file.");
        }

        // 2. Analyse
        const metrics = Analytics.getMetrics(events);

        if (metrics.last7Days.length === 0) {
          throw new Error("Could not extract any dated messages from this file.");
        }

        // 3. Render
        renderResults(file.name, metrics);

      } catch (err) {
        showError(err.message || "An unexpected error occurred while processing the file.");
        console.error("[WhatsApp Analyzer] Processing error:", err);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setLoading(false);
      showError("Failed to read the file. Please try again.");
    };

    reader.readAsText(file, "utf-8");
  }

  // populates all ui elements with parsed values
  function renderResults(fileName, metrics) {
    // Show file name
    fileNameDisplay.textContent = fileName;

    // Stat cards
    animateCount(statTotalMessages, metrics.totalMessages);
    animateCount(statTotalUsers,    metrics.totalUsers);
    statPeakDay.textContent   = metrics.peakDay;
    animateCount(statPeakCount, metrics.peakCount);
    animateCount(statActiveCount, metrics.highlyActiveUsers.length);
    statActiveCountBadge.textContent = `${metrics.highlyActiveUsers.length} member${metrics.highlyActiveUsers.length !== 1 ? "s" : ""}`;

    // Chart
    ChartRenderer.render(
      "activity-chart",
      metrics.labels,
      metrics.dailyActiveUsers,
      metrics.dailyNewUsers
    );

    // Active users list
    renderActiveUsers(metrics.highlyActiveUsers);

    // Transition: hide upload, show results
    uploadSection.classList.add("hidden");
    resultsSection.classList.remove("hidden");

    // Scroll to results smoothly
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }

  // draws the highly active users sub grid
  function renderActiveUsers(users) {
    activeUsersGrid.innerHTML = "";

    if (users.length === 0) {
      noActiveMsg.classList.remove("hidden");
      return;
    }

    noActiveMsg.classList.add("hidden");

    users.forEach((user, idx) => {
      const card = document.createElement("div");
      card.className = "user-card";
      card.style.animationDelay = `${idx * 50}ms`;

      // Build pip row
      const pips = Array.from({ length: 7 }, (_, i) => {
        const filled = i < user.activeDays;
        return `<span class="day-pip ${filled ? "pip-filled" : "pip-empty"}"></span>`;
      }).join("");

      // Format phone number for display
      const displayName = formatDisplayName(user.name);

      card.innerHTML = `
        <div class="user-card-header">
          <div class="user-avatar">${getInitials(displayName)}</div>
          <div class="user-info">
            <span class="user-name">${escapeHtml(displayName)}</span>
            <span class="user-badge">${user.activeDays} / 7 days active</span>
          </div>
        </div>
        <div class="day-pips" aria-label="${user.activeDays} of 7 days active">${pips}</div>
      `;

      activeUsersGrid.appendChild(card);
    });
  }

  // helper function to animate numbers in stat cards
  function animateCount(el, target) {
    const duration = 800;
    const start    = performance.now();
    const from     = 0;

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(from + eased * (target - from));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  // get 1-2 letters from a display name for avatar
  function getInitials(name) {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // normalize sender name spacing
  function formatDisplayName(raw) {
    return raw.replace(/\s+/g, " ").trim();
  }

  // prevent injections
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
