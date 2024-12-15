const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');

// Middleware untuk compress response
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

// Set view engine dan trust proxy untuk logging
app.set('view engine', 'ejs');
app.set('trust proxy', 1);

// Middleware CORS dan logging request
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`);
    next();
});

// Middleware untuk parsing body request
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Rate limiter
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));

// Endpoint untuk login dan memverifikasi token
app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token;
    const growId = req.body.growId;
    const password = req.body.password;
    const email = req.body.email;

    // Cek apakah login adalah login guest
    if (email && !growId && !password) {
        console.log("Logging in as guest with email:", email);

        // Membuat token untuk login guest
        const token = Buffer.from(
            `_token=${encodeURIComponent(_token)}&email=${encodeURIComponent(email)}`,
        ).toString('base64');

        return res.send(
            `{"status":"success","message":"Logged in as Guest.","token":"${token}","url":"","accountType":"guest"}`
        );
    }

    // Jika login dengan growId dan password (akun Growtopia)
    if (growId && password) {
        console.log("Logging in as Growtopia account with GrowID:", growId);

        // Membuat token untuk login dengan akun Growtopia
        const token = Buffer.from(
            `_token=${encodeURIComponent(_token)}&growId=${encodeURIComponent(growId)}&password=${encodeURIComponent(password)}`,
        ).toString('base64');

        return res.send(
            `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`
        );
    }

    // Jika tidak ada informasi yang valid, kirimkan respons kosong
    res.send({
        status: "error",
        message: "Invalid login details."
    });
});

// Endpoint untuk menampilkan dashboard
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
        // Jika username dan password valid, redirect ke halaman validasi
        if (uName[1] && uPass[1]) {
            res.redirect('/player/growid/login/validate');
        }
    } catch (error) {
        console.log(`Warning: ${error}`);
    }

    // Render dashboard jika tidak ada masalah
    res.render(__dirname + '/public/html/dashboard.ejs', { data: tData });
});

// Endpoint untuk cek token yang valid
app.all('/player/growid/checktoken', (req, res) => {
    const refreshToken = req.body.token;
    let data = {
        status: "success",
        message: "Account Validated",
        token: refreshToken,
        url: "",
        accountType: "growtopia"
    };
    res.send(data);
});

// Default route
app.get('/', function (req, res) {
    res.send('Hello World!');
});

// Menjalankan server di port 5000
app.listen(5000, function () {
    console.log('Listening on port 5000');
});
