document.addEventListener("DOMContentLoaded", () => {

  // ---------- Report Bug (главная страница) ----------
  const reportBtn = document.getElementById("report-bug-btn");
  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      // Переход на страницу репорта
      window.location.href = "report.html";
    });
  }

  // ---------- Back to Game (страница репорта) ----------
  const backBtn = document.getElementById("back-to-game-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  // Никакой отправки через fetch/AJAX здесь нет!
  // HTML-форма отправляется напрямую на FormSubmit
  // и поддерживает скриншоты.
});