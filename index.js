import express from "express";
import twilio from "twilio";
import https from "https";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT;

const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: "fixie-ai/ultravox",
    voice: "Keren-Brazilian-Portuguese",
    temperature: 0.3,
    firstSpeaker: "FIRST_SPEAKER_AGENT",
    medium: { twilio: {} },
};

const ULTRAVOX_API_URL = "https://api.ultravox.ai/api/calls";

async function createUltravoxCall() {
    const request = https.request(ULTRAVOX_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": ULTRAVOX_API_KEY,
        },
    });

    return new Promise((resolve, reject) => {
        let data = "";

        request.on("response", (response) => {
            response.on("data", (chunk) => (data += chunk));
            response.on("end", () => resolve(JSON.parse(data)));
        });

        request.on("error", reject);
        request.write(JSON.stringify(ULTRAVOX_CALL_CONFIG));
        request.end();
    });
}

// 🔹 Criando um endpoint HTTP para receber a requisição do n8n
app.post("/start-call", async (req, res) => {
    try {
        const { to } = req.body;  // Recebe o número de telefone do n8n
        if (!to) {
            return res.status(400).json({ error: "Número de destino ausente" });
        }

        console.log("Creating Ultravox call...");
        const { joinUrl } = await createUltravoxCall();
        console.log("Got joinUrl:", joinUrl);

        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        console.log("client:", client);
        const call = await client.calls.create({
            twiml: `<Response>
                <Connect>
                    <Stream url="${joinUrl}"/>
                </Connect>
              </Response>`,
            to: to,
            from: TWILIO_PHONE_NUMBER,
        });

        res.json({ success: true, callSid: call.sid });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Iniciando o servidor na porta 3030
app.listen(3030, () => {
    console.log("Server is running on port 3030");
});
