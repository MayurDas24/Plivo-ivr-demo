require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const plivo = require('plivo');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const client = new plivo.Client(
    process.env.PLIVO_AUTH_ID,
    process.env.PLIVO_AUTH_TOKEN
);

const PORT = 3000;

// HARD CODED OTP
const CORRECT_OTP = "1503";

// =============================
// MAKE CALL
// =============================
app.get('/make-call', async (req, res) => {

    try {

        const response = await client.calls.create(
            process.env.PLIVO_NUMBER,
            process.env.MY_PHONE,
            `https://${process.env.NGROK_URL}/answer`
        );

        console.log(response);

        res.send("Call Triggered Successfully");

    } catch (err) {
        console.log(err);
        res.send("Error making call");
    }
});

// =============================
// ANSWER CALL -> ASK OTP
// =============================
app.all('/answer', (req, res) => {

    const xmlResponse = `
<Response>
    <GetDigits
    action="https://${process.env.NGROK_URL}/verify-otp"
        method="POST"
        timeout="7"
        numDigits="4"
        retries="1">

        <Speak>
            Welcome to Inspire Works.
            Please enter your 4 digit OTP.
        </Speak>

    </GetDigits>

    <Speak>
        No input received.
    </Speak>
</Response>
`;

    res.set('Content-Type', 'text/xml');
    res.send(xmlResponse);
});

// =============================
// VERIFY OTP
// =============================
app.post('/verify-otp', (req, res) => {

    const digits = req.body.Digits;

    let xmlResponse = '';

    if (digits === CORRECT_OTP) {

        xmlResponse = `
<Response>

    <Speak>
        Authentication successful.
    </Speak>

    <GetDigits
        action="https://${process.env.NGROK_URL}/language-menu"
        method="POST"
        numDigits="1">

        <Speak>
            Press 1 for English.
            Press 2 for Spanish.
        </Speak>

    </GetDigits>

</Response>
`;

    } else {

        xmlResponse = `
<Response>

    <Speak>
        Incorrect OTP.
        Please try again.
    </Speak>

    <Redirect method="POST">
    https://${process.env.NGROK_URL}/answer
</Redirect>
</Response>
`;
    }

    res.set('Content-Type', 'text/xml');
    res.send(xmlResponse);
});

// =============================
// LANGUAGE MENU
// =============================
app.post('/language-menu', (req, res) => {

    const choice = req.body.Digits;

    let language = '';

    if (choice === '1') {
        language = 'English';
    }
    else if (choice === '2') {
        language = 'Spanish';
    }
    else {

        const invalidXML = `
<Response>

    <Speak>
        Invalid input.
    </Speak>

    <Redirect method="POST">
        /answer
    </Redirect>

</Response>
`;

        res.set('Content-Type', 'text/xml');
        return res.send(invalidXML);
    }

    const xmlResponse = `
<Response>

    <GetDigits
        action="https://${process.env.NGROK_URL}/final-action?lang=${language}"
        method="POST"
        numDigits="1">

        <Speak>
            You selected ${language}.

            Press 1 to play audio.

            Press 2 to connect to associate.
        </Speak>

    </GetDigits>

</Response>
`;

    res.set('Content-Type', 'text/xml');
    res.send(xmlResponse);
});

// =============================
// FINAL ACTION
// =============================
app.post('/final-action', (req, res) => {

    const choice = req.body.Digits;

    let xmlResponse = '';

    if (choice === '1') {

        xmlResponse = `
<Response>

    <Speak>
        Playing audio now.
    </Speak>

    <Play>
        https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
    </Play>

</Response>
`;

    }
    else if (choice === '2') {

        xmlResponse = `
<Response>

    <Speak>
        Connecting to associate.
    </Speak>

    <Dial>
        916354096698
    </Dial>

</Response>
`;

    }
    else {

        xmlResponse = `
<Response>

    <Speak>
        Invalid choice.
    </Speak>

</Response>
`;
    }

    res.set('Content-Type', 'text/xml');
    res.send(xmlResponse);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});