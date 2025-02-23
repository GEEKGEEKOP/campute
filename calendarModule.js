(function(){
  if (!window.jalaali) {
    console.error("برای استفاده از این ماژول نیاز به jalaali-js دارید. لطفاً قبل از این فایل، آن را از CDN بارگذاری کنید.");
    return;
  }

  var MyCalendar = {};
  var container, monthYearElem, calendarTable, calendarBody;
  var currentYear, currentMonth;
  var eventData = [];

  function createStructure(containerId) {
    container = document.getElementById(containerId);
    if (!container) {
      console.error("عنصری با id = '" + containerId + "' پیدا نشد.");
      return;
    }

    // دکمه‌های ناوبری
    var navContainer = document.createElement("div");
    navContainer.className = "nav-buttons";
    var btnPrev = document.createElement("button");
    btnPrev.innerText = "ماه قبل";
    btnPrev.onclick = previousMonth;
    var btnNext = document.createElement("button");
    btnNext.innerText = "ماه بعد";
    btnNext.onclick = nextMonth;
    navContainer.appendChild(btnPrev);
    navContainer.appendChild(btnNext);

    // عنوان ماه و سال
    monthYearElem = document.createElement("h2");
    monthYearElem.id = "monthYear";

    // ساخت جدول تقویم
    calendarTable = document.createElement("table");
    calendarTable.id = "calendar";
    var thead = document.createElement("thead");
    var tr = document.createElement("tr");
    var days = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
    days.forEach(day => {
      var th = document.createElement("th");
      th.innerText = day;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    calendarTable.appendChild(thead);
    calendarBody = document.createElement("tbody");
    calendarTable.appendChild(calendarBody);

    // افزودن المان‌ها به container
    container.appendChild(navContainer);
    container.appendChild(monthYearElem);
    container.appendChild(calendarTable);
  }

  function injectStyles() {
    var style = document.createElement("style");
    style.innerHTML = `
      .nav-buttons { margin: 10px 0; text-align: center; }
      .nav-buttons button { margin: 0 5px; padding: 5px 10px; cursor: pointer; }
      #monthYear { margin-bottom: 10px; font-size: 1.2em; text-align: center; }
      #calendar th, #calendar td { border: 1px solid #ccc; padding: 10px; text-align: center; cursor: pointer; }
      .marked { background: #ffeb3b; }
      .popup { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 1px solid #ccc; padding: 20px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2); width: 300px; }
      .popup .popup-content { margin-bottom: 10px; }
      .popup button { padding: 5px 10px; background: #ff7043; color: white; border: none; cursor: pointer; }
      .popup button:hover { background: #ff5722; }
    `;
    document.head.appendChild(style);
  }

  function generateCalendar(year, month) {
    var daysInMonth = month <= 6 ? 31 : (month <= 11 ? 30 : (jalaali.isLeapJalaaliYear(year) ? 30 : 29));

    var gDate = jalaali.toGregorian(year, month, 1);
    var firstDayDate = new Date(gDate.gy, gDate.gm - 1, gDate.gd);
    var startIndex = (firstDayDate.getDay() + 1) % 7;

    calendarBody.innerHTML = "";
    monthYearElem.innerText = `${year}/${month < 10 ? "0" + month : month}`;

    var row = document.createElement("tr");
    for (var i = 0; i < startIndex; i++) {
      row.appendChild(document.createElement("td"));
    }

    for (var day = 1; day <= daysInMonth; day++) {
      if (row.children.length === 7) {
        calendarBody.appendChild(row);
        row = document.createElement("tr");
      }
      var cell = document.createElement("td");
      cell.innerText = day;
      var formattedDate = `${year}/${month < 10 ? "0" + month : month}/${day < 10 ? "0" + day : day}`;

      var eventsForDay = eventData.filter(e => e.jalaaliDate === formattedDate);
      if (eventsForDay.length > 0) {
        cell.classList.add("marked");
        cell.onclick = () => {
          var eventsText = eventsForDay.map(event => `- ${event.description}`).join("\n");
          showPopup(formattedDate, eventsText);
        };
      }

      row.appendChild(cell);
    }

    while (row.children.length < 7) {
      row.appendChild(document.createElement("td"));
    }
    calendarBody.appendChild(row);
  }

  function showPopup(date, eventsText) {
    var popup = document.createElement("div");
    popup.classList.add("popup");

    var content = document.createElement("div");
    content.classList.add("popup-content");
    content.innerHTML = `<h3>رویدادها برای تاریخ ${date}</h3><pre>${eventsText}</pre>`;
    
    var closeButton = document.createElement("button");
    closeButton.innerText = "بستن";
    closeButton.onclick = function() {
      popup.style.display = "none";
    };

    popup.appendChild(content);
    popup.appendChild(closeButton);

    document.body.appendChild(popup);
    popup.style.display = "block";
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

  MyCalendar.init = function(options) {
    options = options || {};
    if (options.events && Array.isArray(options.events)) {
      eventData = options.events.map(e => {
        var dateObj = new Date(e.date);
        var jDate = jalaali.toJalaali(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
        return { description: e.description, jalaaliDate: `${jDate.jy}/${jDate.jm < 10 ? "0" + jDate.jm : jDate.jm}/${jDate.jd < 10 ? "0" + jDate.jd : jDate.jd}` };
      });
    }

    var today = new Date();
    var todayJ = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    currentYear = options.initialYear || todayJ.jy;
    currentMonth = options.initialMonth || todayJ.jm;

    createStructure(options.containerId);
    injectStyles();
    generateCalendar(currentYear, currentMonth);
  };

  window.MyCalendar = MyCalendar;
})();

