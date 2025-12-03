
document.addEventListener("DOMContentLoaded", () => {
  //  кнопка "Report Bug" на главной странице с шахматами
  const reportBtn = document.getElementById("report-bug-btn");
  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      window.location.href = "report.html";
    });
  }

  //  кнопка "Back to game" на странице репорта
  const backBtn = document.getElementById("back-to-game-btn");
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault(); // чтобы не было двойного перехода
      window.location.href = "index.html";
    });
  }

  //  обработка формы репорта
  const form = document.getElementById("bug-report-form");
  const statusEl = document.getElementById("status");

  if (form && statusEl) {
    form.addEventListener("submit", () => {
      statusEl.textContent = "Sending...";
    });
  }
});