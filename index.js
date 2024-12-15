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
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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

// Endpoint untuk validasi login GrowID atau login guest
app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token;
    const growId = req.body.growId;
    const password = req.body.password;
    const email = req.body.email;

    // Debug log untuk token yang diterima
    console.log("Received _token:", _token);
    console.log("Received growId:", growId);
    console.log("Received password:", password);
    console.log("Received email:", email);

    // Cek jika login sebagai guest dengan hanya email
    if (email && growId && password) {
        console.log("Logging in as guest with email:", email);

        // Pastikan token ada
        if (_token) {
            return res.status(400).send({
                status: "error",
                message: "Token is missing for guest login!"
            });
        }

        // Decode token Base64
        try {
            const decodedToken = Buffer.from(_token, 'base64').toString('utf8');
            console.log("Decoded Token:", decodedToken);

            // Ambil data dari token yang didekode
            const tokenData = decodedToken.split('&').reduce((acc, item) => {
                const [key, value] = item.split('=');
                acc[key] = value;
                return acc;
            }, {});

            console.log("Decoded Token Data:", tokenData);

            // Jika data guest valid
            if (tokenData.email === email) {
                return res.send({
                    status: "success",
                    message: "Logged in as Guest.",
                    token: _token,
                    url: "",
                    accountType: "guest"
                });
            } else {
                return res.status(400).send({
                    status: "error",
                    message: "Invalid guest login details."
                });
            }

        } catch (error) {
            console.error("Error decoding token:", error);
            return res.status(400).send({
                status: "error",
                message: "Failed to decode the token."
            });
        }
    }

    // Cek jika growId dan password ada, jika tidak tampilkan dashboard
    if (!growId || !password || !_token) {
        console.log("Missing required data, showing dashboard.");
        return res.render(__dirname + '/public/html/dashboard.ejs', { data: {} });
    }

    // Membuat token Base64 untuk sesi login GrowID
    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');

    res.send({
        status: "success",
        message: "Account Validated.",
        token: token,
        url: "",
        accountType: "growtopia"
    });
});

// Endpoint untuk mengecek token
app.all('/player/growid/checktoken', (req, res) => {
    const { refreshToken } = req.body;

    // Debug log untuk refreshToken
    console.log("Received refreshToken:", refreshToken);

    // Pastikan refreshToken ada
    if (!refreshToken) {
        return res.status(400).send({
            status: "error",
            message: "Token is missing!"
        });
    }

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
