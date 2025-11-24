// =======================
// Battlefield 64 - sys.js
// =======================
// Системные вещи сайта:
// - переход на страницу репорта
// - возврат назад в игру
// - текст "Sending..." при отправке формы
// НИКАКОГО fetch / AJAX, чтобы FormSubmit принимал файлы.

document.addEventListener("DOMContentLoaded", () => {
  // ----- Кнопка "Report Bug" на главной странице с шахматами -----
  const reportBtn = document.getElementById("report-bug-btn");
  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      window.location.href = "report.html";
    });
  }

  // ----- Кнопка "Back to game" на странице репорта -----
  const backBtn = document.getElementById("back-to-game-btn");
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault(); // чтобы не было двойного перехода
      window.location.href = "index.html";
    });
  }

  // ----- Обработка формы репорта (БЕЗ AJAX) -----
  const form = document.getElementById("bug-report-form");
  const statusEl = document.getElementById("status");

  if (form && statusEl) {
    form.addEventListener("submit", () => {
      // Не делаем preventDefault!
      // Просто даём FormSubmit выполнить обычный POST
      statusEl.textContent = "Sending...";
    });
  }
});