const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');  // Pastikan import 'compression' dengan benar

app.use(compression());  // Gunakan kompresi dengan cara yang benar

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

// Endpoint untuk menampilkan dashboard login
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

    res.render(__dirname + '/public/html/dashboard.ejs', { data: tData });
});

// Endpoint untuk validasi login sebagai Guest
app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token;
    const growId = req.body.growId;
    const password = req.body.password;
    const email = req.body.email;

    // Jika login sebagai guest
    if (email && !growId && !password) {
        console.log("Logging in as guest with email:", email);

        if (_token) {
            return res.status(400).send({
                status: "error",
                message: "Token is missing for guest login!"
            });
        }

        // Langsung kirim token tanpa decoding
        return res.send({
            status: "success",
            message: "Logged in as Guest.",
            token: _token,
            url: "",
            accountType: "guest"
        });
    }

    // Jika login dengan growId dan password
    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');

    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`,
    );
});

// Endpoint untuk mengecek token
app.all('/player/growid/checktoken', (req, res) => {
    const refreshToken = req.body;
    let data = {
        status: "success",
        message: "Account Validated",
        token: refreshToken,
        url: "",
        accountType: "growtopia"
    };
    res.send(data);
});

// Endpoint dasar
app.get('/', function (req, res) {
    res.send('Hello World!');
});

// Menjalankan server pada port 5000
app.listen(5000, function () {
    console.log('Listening on port 5000');
});
