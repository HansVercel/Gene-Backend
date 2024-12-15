const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const path = require('path'); // Untuk membantu akses file statis

app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/public/html')); // Set path untuk file EJS
app.set('trust proxy', 1);
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`);
    next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));

// Inisialisasi penyimpanan sesi
let activeSessions = {};

// Rute untuk menyimpan data sesi (tanpa email)
app.post("/save-session", (req, res) => {
    const { _token, growId, password } = req.body;

    if (_token && growId && password) {
        activeSessions[growId] = { _token, growId, password };
        console.log(`Session saved for GrowID: ${growId}`);
        return res.json({ success: true, message: "Session saved!" });
    }
    return res.json({ success: false, message: "Invalid data!" });
});

// Rute untuk menghubungkan ke sesi terakhir
app.post("/connect-session", (req, res) => {
    const { growId, password } = req.body;

    if (activeSessions[growId] && activeSessions[growId].password === password) {
        return res.json({
            success: true,
            message: "Connected to the session!",
            sessionData: activeSessions[growId]
        });
    }
    return res.json({ success: false, message: "Invalid session credentials!" });
});

// Menampilkan halaman login ulang (dashboard) jika growId atau password hilang
app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token;
    const growId = req.body.growId;
    const password = req.body.password;
    const email = req.body.email;

    // Cek jika login sebagai Guest (menggunakan email saja)
    if (email && !growId && !password) {
        console.log("Logging in as guest with email:", email);
        const token = Buffer.from(`_token=${_token}&email=${email}`).toString('base64');
        return res.send(
            `{"status":"success","message":"Logged in as Guest.","token":"${token}","url":"","accountType":"guest"}`
        );
    }

    // Cek apakah growId dan password ada, jika tidak, tampilkan kembali halaman dashboard
    if (!growId || !password) {
        console.log("Missing growID or password, redirecting to dashboard for login.");
        return res.render('dashboard', { data: {} });
    }

    // Simpan sesi jika growId, password, dan token tersedia
    activeSessions[growId] = { _token, growId, password };
    console.log(`Session saved for GrowID: ${growId}`);

    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');

    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`,
    );
});

// Menutup sesi
app.post('/player/validate/close', function (req, res) {
    res.send('<script>window.close();</script>');
});

// Menampilkan halaman dashboard (login)
app.all('/player/login/dashboard', function (req, res) {
    const tData = {};
    try {
        const uData = JSON.stringify(req.body).split('"')[1].split('\\n'); 
        const uName = uData[0].split('|'); 
        const uPass = uData[1].split('|');
        for (let i = 0; i < uData.length - 1; i++) { 
            const d = uData[i].split('|'); 
            tData[d[0]] = d[1]; 
        }
        if (uName[1] && uPass[1]) { 
            res.redirect('/player/growid/login/validate'); 
        }
    } catch (why) { 
        console.log(`Warning: ${why}`); 
    }

    // Render halaman dashboard
    res.render('dashboard', { data: tData });
});

// Endpoint dasar untuk pengujian
app.get('/', function (req, res) {
    res.send('Hello World!');
});

// Jalankan server pada port 5000
app.listen(5000, function () {
    console.log('Listening on port 5000');
});
