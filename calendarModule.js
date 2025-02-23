(function(){
  // بررسی وجود کتابخانه jalaali-js؛ در صورتی که وجود نداشته باشد، خطا می‌دهد
  if (!window.jalaali) {
    console.error("برای استفاده از این ماژول نیاز به jalaali-js دارید. لطفاً قبل از این فایل، آن را از CDN (مثلاً https://unpkg.com/jalaali-js/dist/jalaali.min.js) بارگذاری کنید.");
    return;
  }
  
  // شیء ماژول تقویم که به فضای global اضافه می‌شود
  var MyCalendar = {};

  // متغیرهای داخلی
  var container, navContainer, monthYearElem, calendarTable, calendarBody;
  var modalOverlay, modalContainer, modalContent;
  var currentYear, currentMonth;
  var highlightedDates = [];

  // ایجاد ساختار HTML مورد نیاز به‌صورت داینامیک
  function createStructure(containerId) {
    if (containerId) {
      container = document.getElementById(containerId);
      if (!container) {
        console.error("عنصری با id = '" + containerId + "' پیدا نشد. یک container جدید ایجاد می‌شود.");
        container = document.createElement("div");
        container.id = containerId;
        document.body.appendChild(container);
      }
    } else {
      container = document.createElement("div");
      container.id = "myCalendarContainer";
      document.body.appendChild(container);
    }

    // ساخت دکمه‌های ناوبری
    navContainer = document.createElement("div");
    navContainer.className = "nav-buttons";
    var btnPrevYear = document.createElement("button");
    btnPrevYear.innerText = "سال قبل";
    btnPrevYear.onclick = previousYear;
    var btnPrevMonth = document.createElement("button");
    btnPrevMonth.innerText = "ماه قبل";
    btnPrevMonth.onclick = previousMonth;
    var btnNextMonth = document.createElement("button");
    btnNextMonth.innerText = "ماه بعد";
    btnNextMonth.onclick = nextMonth;
    var btnNextYear = document.createElement("button");
    btnNextYear.innerText = "سال بعد";
    btnNextYear.onclick = nextYear;
    navContainer.appendChild(btnPrevYear);
    navContainer.appendChild(btnPrevMonth);
    navContainer.appendChild(btnNextMonth);
    navContainer.appendChild(btnNextYear);

    // ایجاد المان عنوان ماه و سال
    monthYearElem = document.createElement("h2");
    monthYearElem.id = "monthYear";

    // ساخت جدول تقویم
    calendarTable = document.createElement("table");
    calendarTable.id = "calendar";
    calendarTable.style.width = "100%";
    calendarTable.style.borderCollapse = "collapse";
    var thead = document.createElement("thead");
    var tr = document.createElement("tr");
    // عنوان روزهای هفته (شروع از شنبه)
    var days = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
    days.forEach(function(day){
      var th = document.createElement("th");
      th.innerText = day;
      th.style.border = "1px solid #ccc";
      th.style.padding = "8px";
      th.style.background = "#f2f2f2";
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    calendarTable.appendChild(thead);
    // ایجاد tbody تقویم
    calendarBody = document.createElement("tbody");
    calendarBody.id = "calendarBody";
    calendarTable.appendChild(calendarBody);

    // اضافه کردن المان‌ها به container
    container.appendChild(navContainer);
    container.appendChild(monthYearElem);
    container.appendChild(calendarTable);

    // ایجاد modal برای نمایش اطلاعات (دایرکت در body قرار می‌گیرد)
    modalOverlay = document.createElement("div");
    modalOverlay.id = "modalOverlay";
    modalOverlay.style.display = "none";
    modalOverlay.style.position = "fixed";
    modalOverlay.style.top = "0";
    modalOverlay.style.left = "0";
    modalOverlay.style.width = "100%";
    modalOverlay.style.height = "100%";
    modalOverlay.style.background = "rgba(0,0,0,0.5)";
    modalOverlay.style.zIndex = "100";

    modalContainer = document.createElement("div");
    modalContainer.id = "modal";
    modalContainer.style.display = "none";
    modalContainer.style.position = "fixed";
    modalContainer.style.top = "50%";
    modalContainer.style.left = "50%";
    modalContainer.style.transform = "translate(-50%, -50%)";
    modalContainer.style.background = "white";
    modalContainer.style.padding = "20px";
    modalContainer.style.zIndex = "101";
    modalContainer.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";

    modalContent = document.createElement("p");
    modalContent.id = "modalContent";
    modalContainer.appendChild(modalContent);

    var btnClose = document.createElement("button");
    btnClose.innerText = "بستن";
    btnClose.onclick = closeModal;
    modalContainer.appendChild(btnClose);

    document.body.appendChild(modalOverlay);
    document.body.appendChild(modalContainer);
  }

  // درج استایل‌های CSS به صورت داینامیک
  function injectStyles() {
    var style = document.createElement("style");
    style.innerHTML = "\
      .nav-buttons { margin: 10px 0; text-align: center; }\
      .nav-buttons button { margin: 0 5px; padding: 5px 10px; }\
      #monthYear { margin-bottom: 10px; font-size: 1.2em; font-weight: bold; text-align: center; }\
      #calendar th, #calendar td { border: 1px solid #ccc; padding: 8px; height: 40px; text-align: center; vertical-align: middle; }\
      .marked { background: #ffeb3b; cursor: pointer; }\
      .today { border: 2px solid red; }";
    document.head.appendChild(style);
  }

  // دریافت تاریخ امروز و تبدیل آن به شمسی
  var todayGregorian = new Date();
  var todayJ = jalaali.toJalaali(
    todayGregorian.getFullYear(),
    todayGregorian.getMonth() + 1,
    todayGregorian.getDate()
  );
  currentYear = todayJ.jy;
  currentMonth = todayJ.jm;

  // تابع رسم تقویم برای سال و ماه داده شده
  function generateCalendar(year, month) {
    var daysInMonth;
    if (month <= 6) {
      daysInMonth = 31;
    } else if (month <= 11) {
      daysInMonth = 30;
    } else {
      daysInMonth = jalaali.isLeapJalaaliYear(year) ? 30 : 29;
    }

    // محاسبه روز هفته اولین روز ماه (تبدیل شمسی به میلادی)
    var gDate = jalaali.toGregorian(year, month, 1);
    var firstDayDate = new Date(gDate.gy, gDate.gm - 1, gDate.gd);
    var jsDay = firstDayDate.getDay(); // 0 (یکشنبه) تا 6 (شنبه)
    // تنظیم شروع هفته؛ در تقویم فارسی، شنبه اولین روز است:
    var startIndex = (jsDay + 1) % 7;

    // پاکسازی تقویم قدیمی
    calendarBody.innerHTML = "";

    // به‌روزرسانی عنوان ماه و سال
    monthYearElem.innerText = year + "/" + (month < 10 ? "0" + month : month);

    var row = document.createElement("tr");
    // ایجاد سلول‌های خالی برای روزهای قبل از اولین روز ماه
    for (var i = 0; i < startIndex; i++) {
      var cell = document.createElement("td");
      cell.innerText = "";
      row.appendChild(cell);
    }
    // پر کردن روزهای ماه
    for (var day = 1; day <= daysInMonth; day++) {
      if (row.children.length === 7) {
        calendarBody.appendChild(row);
        row = document.createElement("tr");
      }
      var cell = document.createElement("td");
      cell.innerText = day;
      var dayStr = day < 10 ? "0" + day : day;
      var monthStr = month < 10 ? "0" + month : month;
      var dateStr = year + "/" + monthStr + "/" + dayStr;

      // اگر تاریخ در آرایه highlightedDates وجود داشته باشد، هایلایت شده و رویداد کلیک اضافه می‌شود
      if (highlightedDates.indexOf(dateStr) !== -1) {
        cell.classList.add("marked");
        cell.onclick = (function(dateStr) {
          return function() {
            openModal("رویداد ویژه برای تاریخ " + dateStr);
          }
        })(dateStr);
      }

      // مشخص کردن روز امروز
      if (year === todayJ.jy && month === todayJ.jm && day === todayJ.jd) {
        cell.classList.add("today");
      }
      row.appendChild(cell);
    }
    // تکمیل سلول‌های خالی ردیف نهایی
    while (row.children.length < 7) {
      var cell = document.createElement("td");
      cell.innerText = "";
      row.appendChild(cell);
    }
    calendarBody.appendChild(row);
  }


  function previousMonth() {
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    generateCalendar(currentYear, currentMonth);
  }

  function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    generateCalendar(currentYear, currentMonth);
  }
  function previousYear() {
    currentYear--;
    generateCalendar(currentYear, currentMonth);
  }
  function nextYear() {
    currentYear++;
    generateCalendar(currentYear, currentMonth);
  }

  // توابع مربوط به نمایش modal
  function openModal(content) {
    modalContent.innerText = content;
    modalOverlay.style.display = "block";
    modalContainer.style.display = "block";
  }
  function closeModal() {
    modalOverlay.style.display = "none";
    modalContainer.style.display = "none";
  }

  // تابع init برای راه‌اندازی تقویم؛ options شامل:
  //   containerId: id عنصری که تقویم داخل آن قرار می‌گیرد (در صورت عدم وجود، به body اضافه می‌شود)
  //   highlightedDates: آرایه‌ای از تاریخ‌های "YYYY/MM/DD" که باید هایلایت شوند
  //   initialYear و initialMonth (اختیاری) برای تعیین تاریخ اولیه
  MyCalendar.init = function(options) {
    options = options || {};
    if (options.highlightedDates && Array.isArray(options.highlightedDates)) {
      highlightedDates = options.highlightedDates;
    }
    if (options.initialYear) currentYear = options.initialYear;
    if (options.initialMonth) currentMonth = options.initialMonth;


    createStructure(options.containerId);
    injectStyles();
    generateCalendar(currentYear, currentMonth);
  };

  // در صورت نیاز می‌توانید توابع ناوبری و بستن modal را نیز از طریق ماژول فراخوانی کنید:
  MyCalendar.previousMonth = previousMonth;
  MyCalendar.nextMonth = nextMonth;
  MyCalendar.previousYear  = previousYear;
  MyCalendar.nextYear      = nextYear;
  MyCalendar.closeModal    = closeModal;

  // قرار دادن ماژول در فضای global
  window.MyCalendar = MyCalendar;
})();

