const STORAGE_KEY = "calendarEvents";

let state = {
  currentDate: new Date(),
  currentView: "month",
  events: JSON.parse(localStorage.getItem(STORAGE_KEY)) || {},
  hebrewData: {},
  selectedDate: null,
};

const currentDisplay = document.getElementById("currentDisplay");
const calendarGrid = document.getElementById("calendar-grid");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const monthViewBtn = document.getElementById("monthViewBtn");
const weekViewBtn = document.getElementById("weekViewBtn");
const exportBtn = document.getElementById("exportBtn");
const eventModal = document.getElementById("eventModal");
const modalDate = document.getElementById("modalDate");
const eventForm = document.getElementById("eventForm");
const eventTitleInput = document.getElementById("eventTitle");
const eventTimeInput = document.getElementById("eventTime");
const eventList = document.getElementById("eventList");
const closeBtn = document.querySelector(".close");

function toHebrewGematria(num) {
  const letters = {
    1: "א", 2: "ב", 3: "ג", 4: "ד", 5: "ה", 6: "ו", 7: "ז", 8: "ח", 9: "ט",
    10: "י", 20: "כ", 30: "ל"
  };
  let result = "";
  if (num <= 10) return letters[num];
  if (num < 20) {
    if (num === 15) result = "טו";
    else if (num === 16) result = "טז";
    else result = "י" + letters[num - 10];
  } else if (num === 20) {
    result = "כ";
  } else if (num < 30) {
    result = "כ" + letters[num - 20];
  } else if (num === 30) {
    result = "ל";
  }

  if (result.length === 2) {
    return result[0] + '"' + result[1];
  }
  return result || num;
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

init();

async function init() {
  setupEventListeners();
  await prepareData();
  render();
}

function setupEventListeners() {
  prevBtn.onclick = () => navigate(-1);
  nextBtn.onclick = () => navigate(1);

  monthViewBtn.onclick = () => {
    state.currentView = "month";
    monthViewBtn.classList.add("active");
    weekViewBtn.classList.remove("active");
    render();
  };

  weekViewBtn.onclick = () => {
    state.currentView = "week";
    weekViewBtn.classList.add("active");
    monthViewBtn.classList.remove("active");
    render();
  };

  exportBtn.onclick = exportToICal;

  closeBtn.onclick = () => (eventModal.style.display = "none");
  window.onclick = (event) => {
    if (event.target == eventModal) eventModal.style.display = "none";
  };
  
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && eventModal.style.display === "block") {
      eventModal.style.display = "none";
    }
  });

  eventForm.onsubmit = (e) => {
    e.preventDefault();
    saveEvent();
  };
}

function navigate(direction) {
  if (state.currentView === "month") {
    state.currentDate.setMonth(state.currentDate.getMonth() + direction);
  } else {
    state.currentDate.setDate(state.currentDate.getDate() + direction * 7);
  }
  prepareData().then(render);
}

async function updateHebrewData(date = state.currentDate) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const cacheKey = `${year}-${month}`;

  if (state.hebrewData[cacheKey]) return;

  try {
    const response = await fetch(
      `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&nx=on&year=${year}&month=${month}&lg=he`
    );
    const data = await response.json();

    const mapped = {};
    if (data.items) {
      data.items.forEach((item) => {
        if (!mapped[item.date]) mapped[item.date] = { holidays: [] };
        if (item.category === "holiday") {
          mapped[item.date].holidays.push(item.title);
        }
      });
    }

    state.hebrewData[cacheKey] = mapped;
  } catch (error) {
    console.error("Failed to fetch Hebrew data", error);
  }
}

async function prepareData() {
  if (state.currentView === "month") {
    await updateHebrewData(state.currentDate);
    const prev = new Date(state.currentDate);
    prev.setMonth(prev.getMonth() - 1);
    const next = new Date(state.currentDate);
    next.setMonth(next.getMonth() + 1);
    await Promise.all([updateHebrewData(prev), updateHebrewData(next)]);
  } else {
    const startOfWeek = new Date(state.currentDate);
    startOfWeek.setDate(state.currentDate.getDate() - state.currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    await Promise.all([updateHebrewData(startOfWeek), updateHebrewData(endOfWeek)]);
  }
}

function render() {
  calendarGrid.innerHTML = "";
  calendarGrid.classList.remove("fade-in");
  void calendarGrid.offsetWidth;
  calendarGrid.classList.add("fade-in");

  if (state.currentView === "month") {
    renderMonthView();
  } else {
    renderWeekView();
  }
}

function renderMonthView() {
  const d = state.currentDate;
  const gregorianMonth = d.toLocaleString("default", { month: "long", year: "numeric" });

  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const startDay = new Date(firstDay);
  startDay.setDate(firstDay.getDate() - firstDay.getDay());

  const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const totalDaysNeeded = lastDayOfMonth.getDate() + firstDay.getDay();
  const weeksNeeded = Math.ceil(totalDaysNeeded / 7);
  const totalCells = weeksNeeded * 7;

  const endDay = new Date(startDay);
  endDay.setDate(startDay.getDate() + totalCells - 1);
  const hebFormatter = new Intl.DateTimeFormat("he-u-ca-hebrew", { month: "long" });
  const startHeb = hebFormatter.format(startDay);
  const endHeb = hebFormatter.format(endDay);
  const hebHeader = startHeb === endHeb ? startHeb : `${startHeb} - ${endHeb}`;

  currentDisplay.innerText = `${gregorianMonth} | ${hebHeader}`;

  for (let i = 0; i < totalCells; i++) {
    const current = new Date(startDay);
    current.setDate(startDay.getDate() + i);
    createDayCell(current, current.getMonth() !== d.getMonth());
  }
}

function renderWeekView() {
  const d = state.currentDate;
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - d.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const gregorianRange = `${startOfWeek.toLocaleDateString("default", { month: "short", day: "numeric" })} - ${endOfWeek.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}`;

  const hebFormatter = new Intl.DateTimeFormat("he-u-ca-hebrew", { month: "long" });
  const startHeb = hebFormatter.format(startOfWeek);
  const endHeb = hebFormatter.format(endOfWeek);
  const hebHeader = startHeb === endHeb ? startHeb : `${startHeb} - ${endHeb}`;

  currentDisplay.innerText = `${gregorianRange} | ${hebHeader}`;

  for (let i = 0; i < 7; i++) {
    const current = new Date(startOfWeek);
    current.setDate(startOfWeek.getDate() + i);
    createDayCell(current, false);
  }
}

function createDayCell(date, isOtherMonth) {
  const cell = document.createElement("div");
  cell.className = "day-cell" + (isOtherMonth ? " other-month" : "");

  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    cell.classList.add("today");
  }

  const dateKey = getDateKey(date);
  const hebKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
  const hebInfo = state.hebrewData[hebKey] ? state.hebrewData[hebKey][dateKey] : null;

  const hebDayNumber = parseInt(new Intl.DateTimeFormat("he-u-ca-hebrew", { day: "numeric" }).format(date));
  const hebDayNumeral = toHebrewGematria(hebDayNumber);

  let content = `
    <div class="day-header">
        <span class="day-number">${date.getDate()}</span>
        <span class="hebrew-day">${hebDayNumeral}</span>
    </div>
  `;

  if (hebInfo) {
    hebInfo.holidays.forEach((h) => {
      content += `<div class="holiday">${h}</div>`;
    });
  }

  cell.innerHTML = content;

  const dayEvents = state.events[dateKey] || [];
  if (dayEvents.length > 0) {
    const eventsContainer = document.createElement("div");
    eventsContainer.className = "events-preview";

    dayEvents.slice(0, 3).forEach((ev) => {
      const label = document.createElement("div");
      label.className = "event-label";
      label.innerText = ev.title;
      eventsContainer.appendChild(label);
    });

    if (dayEvents.length > 3) {
      const more = document.createElement("div");
      more.className = "event-more";
      more.innerText = `+${dayEvents.length - 3} more`;
      eventsContainer.appendChild(more);
    }
    cell.appendChild(eventsContainer);
  }

  cell.onclick = () => openModal(date);
  calendarGrid.appendChild(cell);
}

function openModal(date) {
  state.selectedDate = date;
  const dateKey = getDateKey(date);
  modalDate.innerText = date.toDateString();
  eventModal.style.display = "block";
  renderEvents(dateKey);
}

function renderEvents(dateKey) {
  eventList.innerHTML = "";
  const dayEvents = state.events[dateKey] || [];
  dayEvents.forEach((ev, index) => {
    const div = document.createElement("div");
    div.className = "event-item";

    const textSpan = document.createElement("span");
    textSpan.innerText = `${ev.time || "--:--"} - ${ev.title}`;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerText = "Delete";
    deleteBtn.onclick = () => deleteEvent(dateKey, index);

    div.appendChild(textSpan);
    div.appendChild(deleteBtn);
    eventList.appendChild(div);
  });
}

function deleteEvent(dateKey, index) {
  state.events[dateKey].splice(index, 1);
  if (state.events[dateKey].length === 0) {
    delete state.events[dateKey];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  renderEvents(dateKey);
  render();
}

function saveEvent() {
  const title = eventTitleInput.value;
  const time = eventTimeInput.value;
  const dateKey = getDateKey(state.selectedDate);

  if (!state.events[dateKey]) state.events[dateKey] = [];
  state.events[dateKey].push({ title, time });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  eventForm.reset();
  renderEvents(dateKey);
  render();
}

function formatICalDate(dateKey, time) {
  const cleanKey = dateKey.replace(/-/g, "");
  if (!time) return `;VALUE=DATE:${cleanKey}`;
  
  const [hours, minutes] = time.split(":");
  return `:${cleanKey}T${hours}${minutes}00`;
}

function exportToICal() {
  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PROID:-//HebrewCalendar//EN",
    "CALSCALE:GREGORIAN"
  ];

  Object.keys(state.events).forEach(dateKey => {
    state.events[dateKey].forEach(ev => {
      ics.push("BEGIN:VEVENT");
      ics.push(`SUMMARY:${ev.title}`);
      
      const startStr = formatICalDate(dateKey, ev.time);
      ics.push(`DTSTART${startStr}`);
      
      if (ev.time) {
        const [h, m] = ev.time.split(":").map(Number);
        const startDate = new Date(dateKey + "T00:00:00");
        startDate.setHours(h + 1, m);
        
        const endDay = getDateKey(startDate).replace(/-/g, "");
        const endH = String(startDate.getHours()).padStart(2, "0");
        const endM = String(startDate.getMinutes()).padStart(2, "0");
        ics.push(`DTEND:${endDay}T${endH}${endM}00`);
      } else {
        const d = new Date(dateKey + "T00:00:00");
        d.setDate(d.getDate() + 1);
        const nextDay = getDateKey(d).replace(/-/g, "");
        ics.push(`DTEND;VALUE=DATE:${nextDay}`);
      }
      ics.push("END:VEVENT");
    });
  });

  ics.push("END:VCALENDAR");
  
  const blob = new Blob([ics.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "calendar_events.ics";
  a.click();
  URL.revokeObjectURL(url);
}
