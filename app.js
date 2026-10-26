let currentLang = 'ua';
let selectedCategory = null;
let selectedServiceData = null;
let selectedCondition = null;
let selectedDate = null;
let selectedTimeSlot = null;
let selectedClientType = 'new';
let bookedSlotsCache = {};
let blockedDaysCache = [];
let currentDemoBookingPayload = null;

window.addEventListener('DOMContentLoaded', () => {
    let savedTheme = localStorage.getItem('aura_demo_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    fetchBookingsData();
});

window.addEventListener('scroll', () => {
    let cta = document.getElementById('stickyCta');
    let bookBtn = document.getElementById('mainBookBtn');
    let paneBook = document.getElementById('paneBook');
    
    if(!cta || !paneBook.classList.contains('active')) {
        if(cta) cta.classList.remove('visible');
        return;
    }
    
    let btnRect = bookBtn ? bookBtn.getBoundingClientRect() : null;
    if (window.scrollY > 350 && (!btnRect || btnRect.top > window.innerHeight)) {
        cta.classList.add('visible');
    } else {
        cta.classList.remove('visible');
    }
});

function scrollToBooking() {
    document.getElementById('step1Card').scrollIntoView({ behavior: 'smooth' });
}

function toggleTheme() {
    let current = document.documentElement.getAttribute('data-theme');
    let next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('aura_demo_theme', next);
}

function toggleLang() {
    currentLang = currentLang === 'ua' ? 'en' : 'ua';
    document.body.setAttribute('data-lang', currentLang);
    
    document.querySelectorAll('input[data-ph-ua]').forEach(el => {
        el.placeholder = currentLang === 'ua' ? el.getAttribute('data-ph-ua') : el.getAttribute('data-ph-en');
    });

    updateSummaryCard();
    initCustomCalendar();
    selectClientType(selectedClientType);
}

function selectClientType(type) {
    selectedClientType = type;
    let cardNew = document.getElementById('clientTypeNew');
    let cardReg = document.getElementById('clientTypeRegular');
    let notice = document.getElementById('clientTypeNotice');
    let btn = document.getElementById('mainBookBtn');

    if (type === 'new') {
        cardNew.classList.add('selected');
        cardReg.classList.remove('selected');
        notice.innerHTML = currentLang === 'ua' 
            ? `⚡ <b>Демо-режим:</b> Завдаток 500 грн буде симульовано без списання реальних коштів.`
            : `⚡ <b>Demo mode:</b> Monobank 500 UAH deposit will be simulated for free.`;
        btn.innerHTML = currentLang === 'ua'
            ? `<span class="ua">Сплатити завдаток 500 ₴ (Тест)</span>`
            : `<span class="en">Pay deposit (Test simulation)</span>`;
    } else {
        cardReg.classList.add('selected');
        cardNew.classList.remove('selected');
        notice.innerHTML = currentLang === 'ua' 
            ? `💎 <b>Для постійних клієнтів:</b> Запис оформлюється <b>без передплати (0 ₴)</b>.`
            : `💎 <b>For regular clients:</b> Booking confirmed <b>without deposit</b>.`;
        btn.innerHTML = currentLang === 'ua'
            ? `<span class="ua">Забронювати час без передплати ⚡</span>`
            : `<span class="en">Book appointment without deposit ⚡</span>`;
    }
}

function getBookingDuration(b) {
    if (b.durationHours && Number(b.durationHours) > 0) return Number(b.durationHours);
    let s = (b.service || '').toLowerCase();
    if (s.includes('фарбування') || s.includes('color')) return 3;
    if (s.includes('тонування')) return 2.5;
    return 1.5;
}

async function fetchBookingsData() {
    try {
        let res = await fetch('/api/bookings?t=' + Date.now());
        let data = await res.json();
        bookedSlotsCache = {};
        if (Array.isArray(data)) {
            data.forEach(b => {
                if (!bookedSlotsCache[b.date]) bookedSlotsCache[b.date] = [];
                bookedSlotsCache[b.date].push({ 
                    time: b.time, 
                    duration: getBookingDuration(b),
                    service: b.service
                });
            });
        }

        try {
            let resBlock = await fetch('/api/blocked-days?t=' + Date.now());
            blockedDaysCache = await resBlock.json() || [];
        } catch(e) {
            blockedDaysCache = [];
        }

        initCustomCalendar();
        renderTimeSlots();
    } catch(e) {}
}

function toggleAccordion(header) { header.parentElement.classList.toggle('open'); }

function switchTab(tabName, element) {
    document.querySelectorAll('.section-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-chip').forEach(c => c.classList.remove('active'));
    
    let targetPane = document.getElementById(tabName === 'book' ? 'paneBook' : tabName === 'works' ? 'paneWorks' : 'paneLoc');
    if (targetPane) targetPane.classList.add('active');
    if (element) element.classList.add('active');
    
    if (tabName !== 'book') {
        let cta = document.getElementById('stickyCta');
        if (cta) cta.classList.remove('visible');
    }
}

function selectMainCategory(category) {
    selectedCategory = category;
    document.querySelectorAll('.service-card-row').forEach(c => c.classList.remove('selected'));
    
    let elId = category === 'cut' ? 'mainCardCut' : category === 'color' ? 'mainCardColor' : 'mainCardComplex';
    document.getElementById(elId)?.classList.add('selected');

    let step2 = document.getElementById('step2Card');
    step2.style.opacity = '1';
    step2.style.pointerEvents = 'auto';

    let subMenu = document.getElementById('categorySubmenu');
    let coloringOptions = document.getElementById('coloringSubOptions');

    if (category === 'color') {
        subMenu.style.display = 'block'; coloringOptions.style.display = 'block';
        selectedServiceData = null;
        renderSubmenuItems();
    } else if (category === 'complex') {
        subMenu.style.display = 'none'; coloringOptions.style.display = 'none';
        selectedServiceData = { title: {ua: "Стрижка + Тонування", en: "Haircut + Gloss Toning"}, price: 3200, durationHours: 3 };
        unlockStep3();
    } else {
        subMenu.style.display = 'none'; coloringOptions.style.display = 'none';
        selectedServiceData = { title: {ua: "Авторська стрижка", en: "Signature haircut"}, price: 1200, durationHours: 1.5 };
        unlockStep3();
    }
    updateSummaryCard(); renderTimeSlots();
}

function renderSubmenuItems() {
    document.getElementById('submenuItems').innerHTML = `
        <div class="sub-service-card" onclick="selectHairCondition('natural', this)">
            <div>
                <div class="s-title"><span class="ua">Натуральне волосся</span><span class="en">Natural hair</span></div>
                <div class="s-sub"><span class="ua">Всі техніки фарбування</span><span class="en">All techniques available</span></div>
            </div>
        </div>
        <div class="sub-service-card" onclick="selectHairCondition('colored', this)">
            <div>
                <div class="s-title"><span class="ua">Фарбоване волосся</span><span class="en">Colored hair</span></div>
                <div class="s-sub"><span class="ua">Оновлення тону, блонд</span><span class="en">Toning, roots, blonde</span></div>
            </div>
        </div>
    `;
}

function selectHairCondition(conditionKey, element) {
    document.querySelectorAll('#categorySubmenu .sub-service-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    let specList = document.getElementById('specificServicesList');
    specList.innerHTML = `
        <div class="sub-service-card" onclick="selectSpecificServiceType('tone', {ua: 'Сяюче тонування', en: 'Gloss Toning'}, 2400, 2, this)">
            <div><div class="s-title"><span class="ua">Сяюче тонування</span><span class="en">Gloss Toning</span></div><div class="s-sub">2400 ₴ • 2 год</div></div>
        </div>
        <div class="sub-service-card" onclick="selectSpecificServiceType('blonde', {ua: 'AirTouch / Складний блонд', en: 'Custom Blonde'}, 4500, 4.5, this)">
            <div><div class="s-title"><span class="ua">AirTouch / Складний блонд</span><span class="en">Custom Blonde</span></div><div class="s-sub">4500 ₴ • 4.5 год</div></div>
        </div>
    `;
}

let chosenServiceType = null;
function selectSpecificServiceType(typeKey, titleObj, fixedPrice, fixedHours, element) {
    document.querySelectorAll('#specificServicesList .sub-service-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    chosenServiceType = typeKey;
    document.getElementById('lengthContainer').style.display = 'block';

    selectedServiceData = { title: titleObj, price: fixedPrice, durationHours: fixedHours };
    unlockStep3();
    updateSummaryCard(); renderTimeSlots();
}

function updateServiceDetails() {
    unlockStep3();
}

function unlockStep3() {
    let step3 = document.getElementById('step3Card');
    step3.style.opacity = '1';
    step3.style.pointerEvents = 'auto';
}

function checkPhotoLoaded(input) {
    let btn = document.getElementById('fileUploadBtn');
    if (input.files && input.files[0]) { 
        btn.innerHTML = `✅ ${input.files[0].name}`;
        btn.classList.add('loaded');
        unlockStep3(); 
    }
}

function updateSummaryCard() {
    let titleEl = document.getElementById('summaryServiceTitle');
    let priceBadge = document.getElementById('summaryPriceBadge');
    let metaEl = document.getElementById('summaryMeta');

    if (selectedServiceData) {
        titleEl.innerText = selectedServiceData.title[currentLang];
        priceBadge.innerText = selectedServiceData.price + " ₴";
        let hText = currentLang === 'ua' ? 'год' : 'h';
        document.getElementById('summaryDuration').innerText = selectedServiceData.durationHours + " " + hText;
        metaEl.style.display = 'flex';
    } else {
        titleEl.innerHTML = `<span class="ua">Оберіть послугу вище</span><span class="en">Choose service above</span>`;
        priceBadge.innerText = "0 ₴";
        metaEl.style.display = 'none';
    }
    if (selectedDate) {
        let atText = currentLang === 'ua' ? ' о ' : ' at ';
        document.getElementById('summaryDateTime').innerText = selectedDate + (selectedTimeSlot ? `${atText}${selectedTimeSlot}` : '');
    }
}

function initCustomCalendar() {
    let grid = document.getElementById('customCalendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const daysUA = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const daysEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    let today = new Date();
    let firstSelectableDate = null;

    for (let i = 0; i < 30; i++) {
        let d = new Date(); d.setDate(today.getDate() + i);
        let iso = d.toISOString().split('T')[0];
        let isBlocked = blockedDaysCache.includes(iso);

        if (!isBlocked && !firstSelectableDate) {
            firstSelectableDate = iso;
        }

        let cell = document.createElement('div');
        let isSelected = (selectedDate === iso) || (!selectedDate && iso === firstSelectableDate);
        cell.className = 'calendar-day-cell' + (isSelected ? ' selected' : '') + (isBlocked ? ' blocked' : '');
        
        let dName = currentLang === 'ua' ? daysUA[d.getDay()] : daysEN[d.getDay()];
        cell.innerHTML = `<span class="day-name">${dName}</span><span class="day-num">${d.getDate()}</span>` + (isBlocked ? `<span style="font-size:6px; color:#e63946;">вихідний</span>` : '');
        
        if (isBlocked) {
            cell.onclick = () => alert("Цей день заблоковано майстром!");
        } else {
            cell.onclick = () => {
                document.querySelectorAll('.calendar-day-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                selectedDate = iso;
                renderTimeSlots(); 
                updateSummaryCard();
            };
        }
        grid.appendChild(cell);
    }

    if (!selectedDate && firstSelectableDate) {
        selectedDate = firstSelectableDate;
    }
}

function renderTimeSlots() {
    let grid = document.getElementById('timeSlotsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (!selectedDate) return;

    if (blockedDaysCache.includes(selectedDate)) {
        grid.innerHTML = `<div style="font-size:10px; color:var(--accent); padding:10px; text-align:center; width:100%;">🔒 Майстер вихідний у цей день.</div>`;
        return;
    }

    let booked = bookedSlotsCache[selectedDate] || [];
    let dur = selectedServiceData ? Number(selectedServiceData.durationHours) : 1.5;
    let isCut = (selectedCategory === 'cut');

    let slots = [
        "10:00", "10:30", "11:00", "11:30", 
        "12:00", "12:30", "13:00", "13:30", 
        "14:00", "14:30", "15:00", "15:30", 
        "16:00", "16:30", "17:00", "17:30", 
        "18:00", "18:30", "19:00"
    ];

    let now = new Date();
    let isToday = (selectedDate === now.toISOString().split('T')[0]);

    slots.forEach(timeStr => {
        let [h, m] = timeStr.split(':').map(Number);
        let slotStart = h + (m / 60);
        let slotEnd = slotStart + dur;
        let cell = document.createElement('div');
        cell.className = 'time-cell';
        cell.innerText = timeStr;

        let isDisabled = false;

        if (isCut) {
            if (slotStart > 19.001) isDisabled = true;
        } else {
            if (slotEnd > 20.001) isDisabled = true;
        }

        if (isToday) {
            let slotTime = new Date(); 
            slotTime.setHours(h, m, 0, 0);
            let diffHours = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (diffHours < 3) isDisabled = true;
        }

        booked.forEach(b => {
            let [bh, bm] = b.time.split(':').map(Number);
            let bStart = bh + (bm / 60);
            let bEnd = bStart + b.duration;
            if (slotStart < bEnd && slotEnd > bStart) isDisabled = true;
        });

        if (isDisabled) {
            cell.classList.add('booked');
        } else {
            cell.onclick = () => {
                document.querySelectorAll('.time-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                selectedTimeSlot = timeStr;
                updateSummaryCard();
            };
            if (selectedTimeSlot === timeStr) cell.classList.add('selected');
        }
        grid.appendChild(cell);
    });
}

// ІНТЕРАКТИВНЕ ДЕМО: МОДАЛКА ТЕСТОВОЇ ОПЛАТИ
function openDemoPayment(payload) {
    currentDemoBookingPayload = payload;
    document.getElementById('demoPaymentModal').style.display = 'flex';
}

function closeDemoPayment() {
    document.getElementById('demoPaymentModal').style.display = 'none';
}

async function confirmDemoPayment() {
    closeDemoPayment();
    if (!currentDemoBookingPayload) return;

    let btn = document.getElementById('mainBookBtn');
    btn.innerText = "⏳ Фіналізація...";

    try {
        let res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                ...currentDemoBookingPayload,
                isRegular: false,
                depositPaid: true
            })
        });
        
        let data = await res.json();
        if (data.success) {
            alert("🎉 Тестова оплата 500 ₴ симульована успішно! Запис внесено до календаря та аналітики майстра.");
            location.reload();
        }
    } catch(e) {
        alert("Помилка тестового запису");
    } finally {
        btn.innerText = "Сплатити завдаток 500 ₴ (Тест)";
    }
}

// ВІДПРАВКА ЗАПИСУ
async function submitBooking() {
    let name = document.getElementById('clientName').value.trim();
    let phone = document.getElementById('clientPhone').value.trim();
    let email = document.getElementById('clientEmail').value.trim();

    if (!selectedServiceData) return alert("Оберіть послугу!");
    if (!selectedDate || !selectedTimeSlot) return alert("Оберіть дату та час!");
    if (!name || !phone) return alert("Заповніть ім'я та телефон!");

    let isRegular = (selectedClientType === 'regular');

    let bookingPayload = {
        name, phone, email, 
        social: document.getElementById('clientSocial')?.value.trim() || '—',
        service: selectedServiceData.title.ua,
        price: selectedServiceData.price,
        durationHours: selectedServiceData.durationHours, 
        date: selectedDate, 
        time: selectedTimeSlot, 
        isRegular
    };

    if (isRegular) {
        // Постійний клієнт — запис одразу без оплати
        let res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(bookingPayload)
        });
        let data = await res.json();
        if (data.success) {
            alert("✨ Демо-запис як постійного клієнта створено без передплати! Перевірте його в кабінеті майстра /master.");
            location.reload();
        }
    } else {
        // Новий клієнт — відкриваємо тестову оплату Monobank
        openDemoPayment(bookingPayload);
    }
}
