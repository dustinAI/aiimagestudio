// 1. Cargar las dependencias necesarias
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Carga las variables de entorno desde .env

// 2. Configuración inicial
const app = express();
const port = 3000;

// Validar que la API Key está cargada
if (!process.env.GEMINI_API_KEY) {
  throw new Error('No se encontró la GEMINI_API_KEY en el archivo .env');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 3. Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.static('../frontend'));

function compressBase64Image(base64String, maxWidth = 1024, quality = 0.8) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calcular nuevas dimensiones manteniendo aspect ratio
            let { width, height } = img;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir a base64 con compresión
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        img.src = base64String;
    });
}

// Función para validar y limpiar base64
function validateAndCleanBase64(base64String) {
    if (!base64String || typeof base64String !== 'string') {
        throw new Error('Base64 string inválido');
    }
    
    // Remover data URL prefix si existe
    const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
    
    // Validar que sea base64 válido
    try {
        Buffer.from(base64Data, 'base64');
    } catch (error) {
        throw new Error('Formato base64 inválido');
    }
    
    return base64Data;
}

// 4. Endpoint para la generación de imágenes
app.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'El prompt es requerido.' });
    }

    const finalPrompt = `${prompt}. No incluyas ningún texto en tu respuesta. Responde únicamente con la imagen.`;
    console.log(`[Backend Log] /generate-image: "${finalPrompt}"`);

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-image-preview",
        generationConfig: {
            maxOutputTokens: 8192,
        }
    });

    const result = await model.generateContent([finalPrompt]);
    const response = await result.response;
    
    const image_part = response.candidates[0].content.parts.find(part => part.inlineData);

    if (!image_part) {
        const text_response = response.text();
        console.warn('La API no devolvió una imagen. Respuesta de texto:', text_response);
        throw new Error(`La API no devolvió una imagen. Respuesta del modelo: ${text_response}`);
    }

    const image_b64 = image_part.inlineData.data;
    console.log(`[Backend Log] Imagen generada exitosamente. Tamaño: ${image_b64.length} caracteres`);
    
    res.json({ image_b64: image_b64 });

  } catch (error) {
    console.error('Error al generar la imagen:', error);
    if (error.message.includes('API key not valid')) {
        return res.status(401).json({ error: 'La clave de la API de Gemini no es válida. Revisa tu archivo .env' });
    }
    res.status(500).json({ error: `Ocurrió un error en el servidor: ${error.message}` });
  }
});

// Endpoint mejorado para edición de imágenes
app.post('/edit-image', async (req, res) => {
    try {
        const { prompt, imagesBase64 } = req.body;

        if (!prompt || !imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
            return res.status(400).json({ error: 'Se requiere un prompt y al menos una imagen.' });
        }

        console.log(`[Backend Log] /edit-image iniciado`);
        console.log(`[Backend Log] Prompt: "${prompt}"`);
        console.log(`[Backend Log] Recibidas ${imagesBase64.length} imágenes`);

        // Validar y procesar cada imagen
        const imageParts = [];
        for (let i = 0; i < imagesBase64.length; i++) {
            try {
                const imageBase64 = imagesBase64[i];
                console.log(`[Backend Log] Procesando imagen ${i + 1}...`);
                
                // Validar formato
                if (!imageBase64.startsWith('data:image/')) {
                    throw new Error(`Imagen ${i + 1}: Formato inválido, debe ser data URL`);
                }
                
                // Extraer mime type y datos
                const mimeMatch = imageBase64.match(/data:([^;]+);base64,(.+)/);
                if (!mimeMatch) {
                    throw new Error(`Imagen ${i + 1}: No se pudo extraer mime type`);
                }
                
                const mimeType = mimeMatch[1];
                const base64Data = mimeMatch[2];
                
                // Validar tamaño (límite aprox 20MB en base64)
                if (base64Data.length > 20 * 1024 * 1024) {
                    console.warn(`[Backend Log] Imagen ${i + 1} muy grande (${base64Data.length} chars), podría causar problemas`);
                }
                
                console.log(`[Backend Log] Imagen ${i + 1}: ${mimeType}, ${base64Data.length} caracteres`);
                
                imageParts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                });
                
            } catch (error) {
                console.error(`[Backend Error] Error procesando imagen ${i + 1}:`, error.message);
                return res.status(400).json({ error: `Error en imagen ${i + 1}: ${error.message}` });
            }
        }

        // Crear prompt final mejorado
        const finalPrompt = `${prompt}. IMPORTANTE: Mantén el estilo artístico exactamente igual. No incluyas ningún texto en tu respuesta. Responde únicamente con la imagen resultante.`;
        
        console.log(`[Backend Log] Prompt final: "${finalPrompt}"`);
        console.log(`[Backend Log] Enviando ${imageParts.length} imágenes procesadas a Gemini`);

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash-image-preview",
            generationConfig: {
                maxOutputTokens: 8192,
            }
        });

        // Crear array de contenido: primero el prompt, luego las imágenes
        const contentArray = [finalPrompt, ...imageParts];
        
        console.log(`[Backend Log] Llamando a generateContent con ${contentArray.length} elementos`);
        
        // Hacer la llamada con timeout personalizado
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: La operación tardó más de 60 segundos')), 60000);
        });
        
        const apiCallPromise = model.generateContent(contentArray);
        
        const result = await Promise.race([apiCallPromise, timeoutPromise]);
        const response = await result.response;
        
        console.log(`[Backend Log] Respuesta recibida de Gemini`);
        
        // Verificar que hay candidatos
        if (!response.candidates || response.candidates.length === 0) {
            throw new Error('La API no devolvió candidatos de respuesta');
        }
        
        const candidate = response.candidates[0];
        if (!candidate.content || !candidate.content.parts) {
            throw new Error('La estructura de respuesta de la API es inválida');
        }
        
        const response_image_part = candidate.content.parts.find(part => part.inlineData);

        if (!response_image_part) {
            // Log detallado del error
            console.error('[Backend Error] No se encontró imagen en la respuesta');
            console.error('[Backend Error] Candidatos:', response.candidates.length);
            console.error('[Backend Error] Parts:', candidate.content.parts.map(p => Object.keys(p)));
            
            const text_response = response.text ? response.text() : 'Sin respuesta de texto';
            throw new Error(`La API no devolvió una imagen editada. Respuesta: ${text_response}`);
        }
        
        const editedImageB64 = response_image_part.inlineData.data;
        console.log(`[Backend Log] Imagen editada exitosamente. Tamaño: ${editedImageB64.length} caracteres`);
        
        res.json({ image_b64: editedImageB64 });
        
    } catch (error) {
        console.error('[Backend Error] Error en /edit-image:', error);
        
        // Mejorar el mensaje de error según el tipo
        let errorMessage = error.message;
        if (error.message.includes('500 Internal Server Error')) {
            errorMessage = 'Error interno de la API de Gemini. Esto puede deberse a: imagen demasiado grande, formato incompatible, o problema temporal del servicio. Intenta con una imagen más pequeña.';
        } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
            errorMessage = 'La operación tardó demasiado tiempo. Intenta con una imagen más pequeña o un prompt más simple.';
        }
        
        res.status(500).json({ error: `Error en el servidor: ${errorMessage}` });
    }
});

// 5. Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
  console.log('Asegúrate de que tu archivo .env tiene una GEMINI_API_KEY válida.');
});