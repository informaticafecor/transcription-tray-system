// mock-transcriptor.js - VERSIÓN FINAL FUNCIONANDO
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// MISMO SECRET QUE EN TU .ENV
const CALLBACK_SECRET = 'mi-secret-super-seguro-de-32-caracteres-minimo-2024';

app.post('/transcribe', async (req, res) => {
  const { audio_url, callback_url, audio_id, user_id } = req.body;
  
  console.log('📥 Audio recibido:', {
    audio_id: audio_id,
    user_id: user_id
  });

  // Simular procesamiento (5 segundos)
  setTimeout(async () => {
    try {
      const callbackData = {
        audio_id: audio_id,
        user_id: user_id,
        status: 'completed',
        transcription_text: 'Transcripción simulada: El audio ha sido procesado correctamente.',
        duration: '120.5'
      };

      // Enviar callback - tu código acepta el secret de 2 formas
      const response = await axios.post(callback_url, callbackData, {
        headers: {
          'x-callback-secret': CALLBACK_SECRET,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Audio ${audio_id} transcrito exitosamente`);
    } catch (error) {
      console.error(`❌ Error en callback para ${audio_id}:`, error.message);
    }
  }, 5000);

  res.json({ 
    message: 'Audio recibido',
    audio_id: audio_id 
  });
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`🎤 Mock Transcriptor en http://localhost:${PORT}`);
  console.log(`🔑 Usando secret: ${CALLBACK_SECRET.substring(0, 20)}...`);
});