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

let activeSessions = {};

// Rute untuk menyimpan data sesi
app.post("/save-session", (req, res) => {
    const { growId, password } = req.body;

    if (growId && password) {
        activeSessions[growId] = { growId, password };
        return res.json({ success: true, message: "Session saved!" });
    }
    return res.json({ success: false, message: "Invalid data!" });
});

// Rute untuk menghubungkan ke sesi terakhir
app.post("/connect-session", (req, res) => {
    const { growId, password } = req.body;

    if (activeSessions[growId] && activeSessions[growId].password === password) {
        return res.json({ success: true, message: "Connected to the session!" });
    }
    return res.json({ success: false, message: "Invalid session credentials!" });
});

app.all('/player/login/dashboard', function (req, res) {
    const tData = {};
    try {
        const uData = JSON.stringify(req.body).split('"')[1].split('\\n'); const uName = uData[0].split('|'); const uPass = uData[1].split('|');
        for (let i = 0; i < uData.length - 1; i++) { const d = uData[i].split('|'); tData[d[0]] = d[1]; }
        if (uName[1] && uPass[1]) { res.redirect('/player/growid/login/validate'); }
    } catch (why) { console.log(`Warning: ${why}`); }

    res.render(__dirname + '/public/html/dashboard.ejs', { data: tData });
});

app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token;
    const growId = req.body.growId;
    const password = req.body.password;
    const email = req.body.email;

    // Simpan sesi di sini
    if (growId && password) {
        activeSessions[growId] = { growId, password, email, _token };
        console.log(`Session saved for GrowID: ${growId}`);
    }

    const token = Buffer.from(
            `_token=${_token}&growId=${growId}&password=${password}&email=${email}`,
        ).toString('base64');

    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`,
    );
});

app.post('/player/validate/close', function (req, res) {
    res.send('<script>window.close();</script>');
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.listen(5000, function () {
    console.log('Listening on port 5000');
});
