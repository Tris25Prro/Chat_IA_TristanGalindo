// Importamos Express para crear el servidor REST
import express from "express";

// CORS permite que otros dispositivos o frontend se conecten al servidor
import cors from "cors";

// Cliente oficial para usar Azure OpenAI desde Node.js
import { AzureOpenAI } from "openai";

// WebSocket para mandar mensajes a todos los clientes conectados
import { WebSocketServer } from "ws";


// -------------------------
// CONFIGURACIÓN DEL SERVIDOR
// -------------------------

const app = express();       // Creamos la app Express
app.use(cors());             // Permitimos peticiones desde otros orígenes
app.use(express.json());     // Permite recibir JSON en POST


// Seguridad simple: una llave que el cliente debe enviar en los headers
const SERVER_KEY = "12345";


// Llave de Azure OpenAI (deberás colocar la tuya)
const apiKey = "";

// Versión de la API (del tutorial oficial)
const apiVersion = "2024-04-01-preview";

// Endpoint de tu recurso de Azure OpenAI
const endpoint = "https://22030-mhxrho2k-eastus2.cognitiveservices.azure.com/";

// Nombre del modelo y deployment configurado en Azure
const deployment = "gpt-35-turbo";
const modelName = "gpt-35-turbo";

// Creación del cliente oficial para Azure OpenAI
const client = new AzureOpenAI({
  apiKey,
  endpoint,
  deployment,
  apiVersion
});


// Servidor WebSocket independiente en otro puerto
const wss = new WebSocketServer({ port: 4001 });

// Función sencilla para enviar un mensaje a todos los clientes conectados
function sendToAll(message) {
  // Empaquetamos el mensaje con un nombre de evento
  const data = JSON.stringify({ event: "ai-response", message });

  // Recorremos todos los clientes conectados
  wss.clients.forEach(client => {

    // readyState === 1 significa "conectado"
    if (client.readyState === 1) {
      client.send(data);    // Enviamos el mensaje
    }
  });
}

console.log("WebSocket escuchando en ws://localhost:4001");

// Ruta que recibe peticiones desde el frontend o cliente remoto
app.post("/chat", async (req, res) => {

  try {

    // ----------- Seguridad básica -------------
    // Revisamos si el cliente envió la clave correcta
    if (req.headers["x-server-key"] !== SERVER_KEY) {
      return res.status(401).json({ error: "Acceso no autorizado" });
    }

    // Obtenemos el texto enviado por el cliente
    const { message } = req.body;

    // Validamos que exista el mensaje
    if (!message) {
      return res.status(400).json({ error: "Falta el campo 'message'" });
    }


    // ----------- Llamada a Azure OpenAI -------------

    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: "Eres un experto en diseño de páginas web." },
        { role: "user", content: message }
      ],
      max_tokens: 512
    });

    // Tomamos solo el contenido generado
    const reply = response.choices[0].message.content;


    // ------------- Enviamos callback por WebSocket ---------------

    sendToAll(reply);


    // ------------- Respondemos la petición HTTP ---------------

    return res.json({ reply });

  } catch (err) {
    // Si algo falla, mostramos errores
    console.error("Error del servidor:", err);

    return res.status(500).json({
      error: "Error procesando la solicitud"
    });
  }
});

// Iniciamos el servidor REST en el puerto 4000
app.listen(4000, () => {
  console.log("Servidor REST activo en http://localhost:4000");
});
