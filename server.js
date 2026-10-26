const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// ДЕМО-ПАРОЛЬ МАЙСТРА
let currentMasterPassword = '1111';

// ДЕМО-ПАМ'ЯТЬ ДЛЯ ЗАПИСІВ ТА ВИХІДНИХ
let demoBookings = [
    { id: 1, name: "Олена Коваль", phone: "+380671112233", service: "Авторська стрижка", price: 1200, durationHours: 1.5, date: "2026-10-27", time: "11:30", isRegular: true },
    { id: 2, name: "Марія Мельник", phone: "+380509998877", service: "Трендове фарбування", price: 3200, durationHours: 3, date: "2026-10-27", time: "14:00", isRegular: false }
];
let demoBlockedDays = [];
let demoClients = [
    { id: 1, name: "Олена Коваль", phone: "+380671112233", social: "@olena_k" },
    { id: 2, name: "Діана Власова", phone: "+380635554433", social: "@diana_v" }
];
let demoWorks = [
    { id: 1, title: "Пастельний блонд", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80" },
    { id: 2, title: "Текстурний боб", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80" }
];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/master', (req, res) => res.sendFile(path.join(__dirname, 'master.html')));

// ПЕРЕВІРКА ПАРОЛЯ МАЙСТРА
app.post('/api/verify-master', (req, res) => {
    if (req.body.password === currentMasterPassword) {
        return res.json({ success: true });
    }
    res.status(403).json({ success: false, error: 'Невірний пароль! (Демо-пароль: 1111)' });
});

// ЗМІНА ПАРОЛЯ
app.post('/api/change-password', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (oldPassword !== currentMasterPassword) {
        return res.status(403).json({ success: false, error: 'Невірний поточний пароль!' });
    }
    if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ success: false, error: 'Мінімум 4 символи!' });
    }
    currentMasterPassword = newPassword.trim();
    res.json({ success: true });
});

// ЗАПИСИ
app.get('/api/bookings', (req, res) => res.json(demoBookings));
app.post('/api/bookings', (req, res) => {
    const newBooking = {
        id: Date.now(),
        ...req.body
    };
    demoBookings.unshift(newBooking);
    res.json({ success: true });
});
app.post('/api/cancel-booking', (req, res) => {
    demoBookings = demoBookings.filter(b => b.id !== Number(req.body.id));
    res.json({ success: true });
});

// ВИХІДНІ ДНІ
app.get('/api/blocked-days', (req, res) => res.json(demoBlockedDays));
app.post('/api/block-day', (req, res) => {
    if (req.body.date && !demoBlockedDays.includes(req.body.date)) {
        demoBlockedDays.push(req.body.date);
    }
    res.json({ success: true, blockedDays: demoBlockedDays });
});
app.post('/api/unblock-day', (req, res) => {
    demoBlockedDays = demoBlockedDays.filter(d => d !== req.body.date);
    res.json({ success: true, blockedDays: demoBlockedDays });
});

// ПОРТФОЛІО
app.get('/api/works', (req, res) => res.json(demoWorks));
app.post('/api/works', (req, res) => {
    demoWorks.unshift({ id: Date.now(), title: req.body.title || 'Робота', image: req.body.image });
    res.json({ success: true });
});
app.post('/api/delete-work', (req, res) => {
    demoWorks = demoWorks.filter(w => String(w.id) !== String(req.body.id));
    res.json({ success: true });
});

// КЛІЄНТИ
app.get('/api/clients', (req, res) => res.json(demoClients));
app.post('/api/clients', (req, res) => {
    demoClients.unshift({ id: Date.now(), ...req.body });
    res.json({ success: true });
});
app.post('/api/delete-client', (req, res) => {
    demoClients = demoClients.filter(c => String(c.id) !== String(req.body.id));
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000, () => console.log('Aura Demo запущено на порту 3000!'));
