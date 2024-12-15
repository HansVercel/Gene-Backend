const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');

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

// Rute untuk menyimpan data sesi
app.post("/save-session", (req, res) => {
    const { _token, growId, password, email } = req.body;

    if (_token && growId && password && email) {
        activeSessions[growId] = { _token, growId, password, email };
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

// Validasi login berdasarkan GrowID dan Password
app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token;
    const growId = req.body.growId;
    const password = req.body.password;
    const email = req.body.email;

    // Periksa apakah semua data valid
    if (!_token || !growId || !password || !email) {
        return res.json({ success: false, message: "Missing required fields!" });
    }

    // Simpan sesi jika semua data tersedia
    activeSessions[growId] = { _token, growId, password, email };
    console.log(`Session saved for GrowID: ${growId}`);

    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}&email=${email}`,
    ).toString('base64');

    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`,
    );
});

// Menutup sesi
app.post('/player/validate/close', function (req, res) {
    res.send('<script>window.close();</script>');
});

// Endpoint dasar untuk pengujian
app.get('/', function (req, res) {
    res.send('Hello World!');
});

// Jalankan server pada port 5000
app.listen(5000, function () {
    console.log('Listening on port 5000');
});
