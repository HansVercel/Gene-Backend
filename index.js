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

// Route untuk login guest
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

    // Tidak perlu error jika data tidak valid, hanya tidak mengirim apa-apa
});

// Route untuk cek token
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

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.listen(5000, function () {
    console.log('Listening on port 5000');
});
