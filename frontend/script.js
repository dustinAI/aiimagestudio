document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENCIAS A ELEMENTOS GLOBALES DEL DOM ---
    const menuButtons = document.querySelectorAll('.menu-button');
    const agentPanel = document.getElementById('agent-panel');
    const welcomeMessage = document.getElementById('welcome-message');
    const loader = document.getElementById('loader');
    const saveBtn = document.getElementById('save-btn');
    const resultImage = document.getElementById('result-image');
    let currentActiveButton = null;
    let uploadedImageBase64 = null; // Variable global para guardar la imagen subida

    // --- LÓGICA DE LOS AGENTES ---
    const agentUIs = {
        'fotorrealista': () => {
            agentPanel.innerHTML = `<h3><i class='bx bxs-camera'></i> Escena Fotorrealista</h3><p>Completa los campos para construir un prompt de alta calidad.</p><div class="form-group"><label for="subject">Sujeto Principal</label><textarea id="subject" placeholder="Ej: un detective anciano con gabardina"></textarea></div><div class="form-group"><label for="action">Acción o Expresión</label><input type="text" id="action" placeholder="Ej: mirando por una ventana lluviosa"></div><div class="form-group"><label for="environment">Entorno</label><input type="text" id="environment" placeholder="Ej: en una oficina oscura de los años 40"></div><div class="form-group"><label for="lighting">Iluminación</label><input type="text" id="lighting" placeholder="Ej: la luz de una lámpara de escritorio y neón de la calle"></div><div class="form-group"><label for="mood">Atmósfera / Ánimo</label><input type="text" id="mood" placeholder="Ej: melancólica y pensativa"></div><div class="form-group"><label for="camera">Detalles de Cámara (opcional)</label><input type="text" id="camera" placeholder="Ej: Lente de 85mm, f/1.8, estilo cinematográfico"></div><button id="generate-btn" class="action-button">Generar</button>`;
            document.getElementById('generate-btn').addEventListener('click', () => {
                const promptParts = [ `Una foto fotorrealista de "${document.getElementById('subject').value}"`, document.getElementById('action').value ? `${document.getElementById('action').value}` : '', document.getElementById('environment').value ? `ubicado en ${document.getElementById('environment').value}` : '', document.getElementById('lighting').value ? `iluminado por ${document.getElementById('lighting').value}` : '', document.getElementById('mood').value ? `creando una atmósfera ${document.getElementById('mood').value}` : '', document.getElementById('camera').value ? `capturado con detalles de ${document.getElementById('camera').value}` : '' ];
                const prompt = promptParts.filter(part => part && document.getElementById('subject').value).join(', ') + '.';
                handleApiCall(prompt);
            });
        },
        'ilustracion': () => {
             agentPanel.innerHTML = `<h3><i class='bx bxs-sticker'></i> Ilustración / Calcomanía</h3><p>Crea arte estilizado como íconos, stickers o elementos gráficos.</p><div class="form-group"><label for="desc-ilustracion">Describe el sujeto principal</label><textarea id="desc-ilustracion" placeholder="Ej: un zorro adorable leyendo un libro"></textarea></div><div class="form-group"><label for="estilo-ilustracion">Estilo Visual</label><input type="text" id="estilo-ilustracion" placeholder="Ej: arte vectorial plano, sticker troquelado"></div><div class="form-group"><input type="checkbox" id="fondo-transparente" name="fondo-transparente"><label for="fondo-transparente" style="display: inline; font-weight: normal;">Solicitar fondo transparente</label></div><button id="generate-btn" class="action-button">Generar</button>`;
            document.getElementById('generate-btn').addEventListener('click', () => {
                const description = document.getElementById('desc-ilustracion').value;
                const style = document.getElementById('estilo-ilustracion').value;
                const transparentBg = document.getElementById('fondo-transparente').checked;
                let prompt = `Genera una ilustración de "${description}" con el estilo de "${style}".`;
                if (transparentBg) prompt += ` El fondo debe ser transparente.`;
                handleApiCall(prompt);
            });
        },
        'texto_en_imagen': () => {
            agentPanel.innerHTML = `<h3><i class='bx bxs-text'></i> Imagen con Texto</h3><p>Crea una imagen desde cero con texto integrado de forma precisa.</p><div class="form-group"><label for="desc-texto">Describe la imagen de fondo</label><textarea id="desc-texto" placeholder="Ej: un letrero de neón en una pared de ladrillos de noche"></textarea></div><div class="form-group"><label for="texto-exacto">Texto exacto a incluir</label><input type="text" id="texto-exacto" placeholder="Ej: 'Cyber Dreams'"></div><div class="form-group"><label for="estilo-fuente">Describe el estilo de la fuente</label><input type="text" id="estilo-fuente" placeholder="Ej: letras de neón rosa brillantes, caligrafía elegante"></div><button id="generate-btn" class="action-button">Generar</button>`;
            document.getElementById('generate-btn').addEventListener('click', () => {
                const imageDesc = document.getElementById('desc-texto').value;
                const exactText = document.getElementById('texto-exacto').value;
                const fontStyle = document.getElementById('estilo-fuente').value;
                const prompt = `Genera una imagen de "${imageDesc}", que incluya de forma prominente y clara el texto "${exactText}". El texto debe tener un estilo de "${fontStyle}".`;
                handleApiCall(prompt);
            });
        },
        'simulacion_producto': () => {
            agentPanel.innerHTML = `<h3><i class='bx bxs-store'></i> Simulación de Producto</h3><p>Crea tomas profesionales de productos para e-commerce o publicidad.</p><div class="form-group"><label for="product-desc">Descripción del Producto</label><textarea id="product-desc" placeholder="Ej: una botella de perfume de vidrio esmerilado con tapa de madera"></textarea></div><div class="form-group"><label for="product-bg">Fondo / Superficie</label><input type="text" id="product-bg" placeholder="Ej: sobre una superficie de mármol blanco"></div><div class="form-group"><label for="product-lighting">Configuración de Iluminación</label><input type="text" id="product-lighting" placeholder="Ej: de estudio suave para resaltar las texturas"></div><div class="form-group"><label for="product-angle">Ángulo de Cámara</label><input type="text" id="product-angle" placeholder="Ej: ángulo bajo para mostrar su elegancia"></div><div class="form-group"><label for="product-focus">Detalle de Enfoque Principal</label><input type="text" id="product-focus" placeholder="Ej: el logotipo grabado en la tapa"></div><button id="generate-btn" class="action-button">Generar</button>`;
            document.getElementById('generate-btn').addEventListener('click', () => {
                const productDesc = document.getElementById('product-desc').value;
                if (!productDesc) return alert('La descripción del producto es obligatoria.');
                const promptParts = [ `Una fotografía de producto de alta resolución, con iluminación de estudio, de "${productDesc}"`, document.getElementById('product-bg').value ? `sobre ${document.getElementById('product-bg').value}` : '', document.getElementById('product-lighting').value ? `la iluminación es ${document.getElementById('product-lighting').value}` : '', document.getElementById('product-angle').value ? `el ángulo de la cámara es un ${document.getElementById('product-angle').value}` : '', document.getElementById('product-focus').value ? `con un enfoque nítido en ${document.getElementById('product-focus').value}` : '', 'ultra-realista' ];
                const prompt = promptParts.filter(part => part).join(', ') + '.';
                handleApiCall(prompt);
            });
        },
        'diseño_minimalista': () => {
            agentPanel.innerHTML = `<h3><i class='bx bxs-component'></i> Diseño Minimalista</h3><p>Ideal para fondos de pantalla, webs y presentaciones.</p><div class="form-group"><label for="minimal-subject">Sujeto Único</label><textarea id="minimal-subject" placeholder="Ej: una sola hoja de monstera, una taza de café"></textarea></div><div class="form-group"><label for="minimal-position">Posición del Sujeto</label><select id="minimal-position"><option value="en la esquina inferior derecha">Esquina inferior derecha</option><option value="en la esquina superior izquierda">Esquina superior izquierda</option><option value="centrado">Centrado</option><option value="en el tercio izquierdo">Tercio izquierdo</option><option value="en el tercio derecho">Tercio derecho</option></select></div><div class="form-group"><label for="minimal-bg">Color de Fondo</label><input type="text" id="minimal-bg" placeholder="Ej: azul pastel, gris claro, blanco"></div><p class="prompt-tip">El resultado será una composición limpia con mucho espacio negativo.</p><button id="generate-btn" class="action-button">Generar</button>`;
            document.getElementById('generate-btn').addEventListener('click', () => {
                const subject = document.getElementById('minimal-subject').value;
                const position = document.getElementById('minimal-position').value;
                const background = document.getElementById('minimal-bg').value;
                if (!subject || !background) return alert('El sujeto y el color de fondo son obligatorios.');
                const prompt = `Una composición minimalista de un solo objeto: "${subject}", posicionado ${position} del encuadre. El fondo es un lienzo vasto y vacío de color ${background}, creando un espacio negativo significativo. Iluminación suave y sutil.`;
                handleApiCall(prompt);
            });
        },

        'arte_secuencial': () => {
    let lockedStyle = '', lockedCharacter = '', lockedSetting = '';
    let panelGallery = [];
    let previousPanelBase64 = null;

    const renderComicUI = () => {
        // --- VISTA 1: CONFIGURACIÓN INICIAL ---
        if (panelGallery.length === 0) {
            agentPanel.innerHTML = `
                <h3><i class='bx bxs-comic'></i> Director de Escena</h3>
                <p><strong>Paso 1:</strong> Crea la "Hoja de Referencia" para tu primera viñeta.</p>
                <div class="form-group">
                    <label for="comic-style">Estilo General del Cómic</label>
                    <input type="text" id="comic-style" placeholder="Ej: Estilo de cómic noir, anime de los 90">
                </div>
                <div class="form-group">
                    <label for="comic-character-desc">Personaje Principal</label>
                    <textarea id="comic-character-desc" placeholder="Ej: Un vigilante llamado Nocturne, con armadura negra metálica..."></textarea>
                </div>
                <div class="form-group">
                    <label for="comic-setting-desc">Escenario Principal</label>
                    <textarea id="comic-setting-desc" placeholder="Ej: Un callejón empedrado en una ciudad gótica de noche."></textarea>
                </div>
                <div class="form-group">
                    <label for="comic-action">Acción de la Primera Viñeta</label>
                    <textarea id="comic-action" placeholder="Ej: Aterrizando en el suelo, agachado."></textarea>
                </div>
                <button id="generate-btn" class="action-button">Generar Primera Viñeta</button>
            `;
            document.getElementById('generate-btn').addEventListener('click', async () => {
                const style = document.getElementById('comic-style').value.trim();
                const character = document.getElementById('comic-character-desc').value.trim();
                const setting = document.getElementById('comic-setting-desc').value.trim();
                const action = document.getElementById('comic-action').value.trim();
                if (!style || !character || !setting || !action) {
                    alert('Debes completar todos los campos.');
                    return;
                }
                lockedStyle = style;
                lockedCharacter = character;
                lockedSetting = setting;
                const prompt = `Crea un panel de cómic en formato viñeta rectangular. Estilo: '${style}'. Personaje: '${character}'. Escenario: '${setting}'. Acción: El personaje está ${action}. Formato: viñeta de cómic con bordes definidos.`;
                console.log('[Arte Secuencial] Generando primera viñeta con prompt:', prompt);
                await handleApiCall(prompt);
                // Verificar que la imagen se generó correctamente
                if (resultImage.src && resultImage.src.startsWith('data:image/')) {
                    // Comprimir la imagen antes de guardarla
                    try {
                        previousPanelBase64 = await compressBase64Image(resultImage.src, 512, 0.8);
                        panelGallery.push(previousPanelBase64);
                        console.log('[Arte Secuencial] Primera viñeta generada y comprimida exitosamente');
                        renderComicUI();
                    } catch (error) {
                        console.error('[Arte Secuencial] Error al comprimir imagen:', error);
                        previousPanelBase64 = resultImage.src;
                        panelGallery.push(resultImage.src);
                        renderComicUI();
                    }
                } else {
                    console.error('[Arte Secuencial] Error: No se generó la primera viñeta correctamente');
                    alert('Error: No se pudo generar la primera viñeta. Inténtalo de nuevo.');
                }
            });
        } else {
            // --- VISTA 2: EDICIÓN CONVERSACIONAL Y FLEXIBLE ---
            agentPanel.innerHTML = `
                <h3><i class='bx bxs-comic'></i> Director de Escena</h3>
                <div class="comic-locked-info">
                    <p><strong>Estilo Fijo:</strong> ${lockedStyle}</p>
                    <p><strong>Viñetas creadas:</strong> ${panelGallery.length}</p>
                    <p><strong>Usando la última viñeta como referencia visual.</strong></p>
                </div>
                <p><strong>Paso 2:</strong> Describe qué elemento cambia y cómo.</p>
                <div class="form-group">
                    <label for="comic-mask">Elemento a Modificar</label>
                    <input type="text" id="comic-mask" placeholder="Ej: el superhéroe, el sol, el fondo...">
                </div>
                <div class="form-group">
                    <label for="comic-change">Descripción del Cambio</label>
                    <textarea id="comic-change" placeholder="Ej: ahora está saltando a la izquierda, ahora es de día, ahora está lloviendo..."></textarea>
                </div>
                <div class="form-group">
                    <label for="comic-dialogue">Nuevo Diálogo (Opcional)</label>
                    <input type="text" id="comic-dialogue" placeholder="Ej: '¡No escaparás!'">
                </div>
                <button id="generate-btn" class="action-button">Generar Siguiente Viñeta</button>
                <button id="reiniciar-btn" class="action-button secondary-button">Reiniciar Historia</button>
                <div id="panel-gallery-container">
                    <h4>Viñetas Creadas (${panelGallery.length}):</h4>
                    <div id="panel-gallery">
                        ${panelGallery.map((src, index) => 
                            `<img src="${src}" alt="Panel ${index + 1}" style="max-width: 80px; margin: 3px; border: 1px solid #ccc;" />`
                        ).join('')}
                    </div>
                </div>
            `;
            document.getElementById('generate-btn').addEventListener('click', async () => {
                const mask = document.getElementById('comic-mask').value.trim();
                const change = document.getElementById('comic-change').value.trim();
                const dialogue = document.getElementById('comic-dialogue').value.trim();
                if (!mask || !change) {
                    alert('Debes describir el elemento a modificar y el cambio.');
                    return;
                }
                if (!previousPanelBase64) {
                    alert('Error: No se encontró la viñeta de referencia.');
                    console.error('[Arte Secuencial] Error: previousPanelBase64 es null');
                    return;
                }
                // Validar que previousPanelBase64 sea un data URL válido
                if (!previousPanelBase64.startsWith('data:image/')) {
                    alert('Error: Formato de imagen de referencia inválido.');
                    console.error('[Arte Secuencial] Error: previousPanelBase64 no es un data URL válido:', 
                        previousPanelBase64.substring(0, 100));
                    return;
                }
                // Prompt mejorado para edición
                const prompt = `Basándote EXACTAMENTE en la imagen de referencia proporcionada, modifica ÚNICAMENTE el elemento '${mask}' para que ahora '${change}'. 
                REGLAS CRÍTICAS:
                - Mantén TODO lo demás EXACTAMENTE igual (colores, estilo, composición, iluminación)
                - Conserva el estilo de arte '${lockedStyle}' IDÉNTICO
                - Mantén el mismo formato de viñeta de cómic
                - NO cambies nada excepto el elemento específico mencionado
                ${dialogue ? `- Añade un globo de diálogo con el texto: "${dialogue}"` : ''}
                Es una viñeta secuencial, por lo que la continuidad visual es FUNDAMENTAL.`;
                console.log('[Arte Secuencial] Generando siguiente viñeta...');
                console.log('[Arte Secuencial] Prompt:', prompt);
                console.log('[Arte Secuencial] Tamaño de imagen de referencia:', previousPanelBase64.length);
                // Comprimir imagen de referencia antes de enviar
                let compressedReference;
                try {
                    compressedReference = await compressBase64Image(previousPanelBase64, 512, 0.9);
                    console.log('[Arte Secuencial] Imagen de referencia comprimida para envío');
                } catch (error) {
                    console.warn('[Arte Secuencial] Error al comprimir, usando imagen original:', error);
                    compressedReference = previousPanelBase64;
                }
                try {
                    await handleImageEditApiCall(prompt, [compressedReference]);
                    // Verificar que la imagen se editó correctamente
                    if (resultImage.src && resultImage.src.startsWith('data:image/')) {
                        // Comprimir la nueva imagen
                        try {
                            previousPanelBase64 = await compressBase64Image(resultImage.src, 512, 0.8);
                            panelGallery.push(previousPanelBase64);
                            console.log('[Arte Secuencial] Siguiente viñeta generada y comprimida exitosamente');
                        } catch (error) {
                            console.warn('[Arte Secuencial] Error al comprimir nueva imagen:', error);
                            previousPanelBase64 = resultImage.src;
                            panelGallery.push(resultImage.src);
                            console.log('[Arte Secuencial] Siguiente viñeta generada exitosamente (sin comprimir)');
                        }
                        renderComicUI();
                    } else {
                        console.error('[Arte Secuencial] Error: No se generó la siguiente viñeta correctamente');
                        alert('Error: No se pudo generar la siguiente viñeta. Revisa los logs del navegador y del servidor.');
                    }
                } catch (error) {
                    console.error('[Arte Secuencial] Error en la generación de siguiente viñeta:', error);
                    alert(`Error al generar la siguiente viñeta: ${error.message}`);
                }
            });
            document.getElementById('reiniciar-btn').addEventListener('click', () => {
                if (confirm('¿Estás seguro de que quieres reiniciar la historia? Se perderán todas las viñetas.')) {
                    lockedStyle = '';
                    lockedCharacter = '';
                    lockedSetting = '';
                    panelGallery = [];
                    previousPanelBase64 = null;
                    console.log('[Arte Secuencial] Historia reiniciada');
                    renderComicUI();
                }
            });
        }
    };

    // Inicializar la interfaz
    renderComicUI();
},
        'añadir_quitar': () => {
            agentPanel.innerHTML = `<h3><i class='bx bx-layer-plus'></i> Añadir o Quitar Elementos</h3><p>1. Sube una imagen para empezar.</p><div class="form-group"><input type="file" id="image-upload" accept="image/*" style="display: none;"><label for="image-upload" class="action-button upload-button">Seleccionar Imagen</label></div><p>2. Describe el cambio que quieres hacer.</p><div class="form-group"><label for="edit-prompt">Instrucción de Edición</label><textarea id="edit-prompt" placeholder="Ej: añade un gato negro en el sofá, quita el coche rojo de la calle"></textarea></div><button id="generate-btn" class="action-button">Aplicar Cambio</button>`;
            document.getElementById('image-upload').addEventListener('change', handleFileUpload);
            document.getElementById('generate-btn').addEventListener('click', () => {
                const prompt = document.getElementById('edit-prompt').value;
                if (uploadedImagesBase64.length === 0) return alert('Por favor, sube una imagen primero.');
                if (!prompt) return alert('Por favor, escribe la instrucción de edición.');
                // **LA CORRECCIÓN**: Enviamos el array, que en este caso tiene 1 imagen
                handleImageEditApiCall(prompt, uploadedImagesBase64);
            });
        },
        'retocar_area': () => {
            agentPanel.innerHTML = `<h3><i class='bx bxs-magic-wand-alt'></i> Retocar Área (Inpainting)</h3><p>1. Sube la imagen.</p><div class="form-group"><input type="file" id="image-upload" accept="image/*" style="display: none;"><label for="image-upload" class="action-button upload-button">Seleccionar Imagen</label></div><p>2. Indica qué parte quieres cambiar.</p><div class="form-group"><label for="mask-input">Elemento a modificar</label><input type="text" id="mask-input" placeholder="Ej: el cielo, la camisa del hombre"></div><p>3. Describe el cambio.</p><div class="form-group"><label for="change-input">Nuevo elemento o descripción</label><input type="text" id="change-input" placeholder="Ej: un atardecer tormentoso, de color rojo"></div><button id="generate-btn" class="action-button">Aplicar Retoque</button>`;
            document.getElementById('image-upload').addEventListener('change', handleFileUpload);
            document.getElementById('generate-btn').addEventListener('click', () => {
                const mask = document.getElementById('mask-input').value;
                const change = document.getElementById('change-input').value;
                if (uploadedImagesBase64.length === 0) return alert('Por favor, sube una imagen primero.');
                if (!mask || !change) return alert('Por favor, completa todos los campos.');
                const prompt = `change only the "${mask}" to "${change}". Keep everything else in the image exactly the same.`;
                // **LA CORRECCIÓN**: Enviamos el array
                handleImageEditApiCall(prompt, uploadedImagesBase64);
            });
        },
        'transferencia_estilo': () => {
            agentPanel.innerHTML = `<h3><i class='bx bxs-palette'></i> Transferencia de Estilo</h3><p>1. Sube la imagen original.</p><div class="form-group"><input type="file" id="image-upload" accept="image/*" style="display: none;"><label for="image-upload" class="action-button upload-button">Seleccionar Imagen</label></div><p>2. Describe el nuevo estilo artístico.</p><div class="form-group"><label for="style-input">Estilo deseado</label><input type="text" id="style-input" placeholder="Ej: al estilo de Van Gogh, arte ciberpunk"></div><button id="generate-btn" class="action-button">Aplicar Estilo</button>`;
            document.getElementById('image-upload').addEventListener('change', handleFileUpload);
            document.getElementById('generate-btn').addEventListener('click', () => {
                const style = document.getElementById('style-input').value;
                if (uploadedImagesBase64.length === 0) return alert('Por favor, sube una imagen primero.');
                if (!style) return alert('Por favor, describe el estilo artístico.');
                const prompt = `Transform the provided photograph into the artistic style of "${style}". Preserve the original composition.`;
                // **LA CORRECCIÓN**: Enviamos el array
                handleImageEditApiCall(prompt, uploadedImagesBase64);
            });
        },
        'composicion_avanzada': () => {
            agentPanel.innerHTML = `
                <h3><i class='bx bxs-copy-alt'></i> Composición Avanzada</h3>
                <p>1. Sube 2 o más imágenes de origen.</p>
                <div class="form-group">
                    <input type="file" id="image-upload" accept="image/*" multiple style="display: none;">
                    <label for="image-upload" class="action-button upload-button">Añadir Imagen(es)</label>
                    <div id="thumbnails-container" class="thumbnails-container"></div>
                </div>
                <p>2. Describe los elementos a combinar.</p>
                <div class="form-group">
                    <label for="comp-elem1">Elemento de Imagen 1</label>
                    <textarea id="comp-elem1" placeholder="Ej: el coche rojo deportivo"></textarea>
                </div>
                <div class="form-group">
                    <label for="comp-elem2">Elemento de Imagen 2</label>
                    <textarea id="comp-elem2" placeholder="Ej: el paisaje de montaña nevada"></textarea>
                </div>
                <div class="form-group">
                    <label for="comp-final">Descripción de la Escena Final</label>
                    <textarea id="comp-final" placeholder="Ej: una foto realista del coche conduciendo por la carretera de montaña"></textarea>
                </div>
                <button id="generate-btn" class="action-button">Crear Composición</button>
            `;
            document.getElementById('image-upload').addEventListener('change', handleFileUpload);
            document.getElementById('generate-btn').addEventListener('click', () => {
                const elem1 = document.getElementById('comp-elem1').value;
                const elem2 = document.getElementById('comp-elem2').value;
                const finalScene = document.getElementById('comp-final').value;

                if (uploadedImagesBase64.length < 2) return alert('Por favor, sube al menos dos imágenes.');
                if (!elem1 || !elem2 || !finalScene) return alert('Por favor, completa todos los campos de descripción.');

                // CONSTRUIMOS EL PROMPT USANDO LA PLANTILLA CORRECTA
                const prompt = `Create a new image by combining the elements from the provided images. Take the ${elem1} and place it with/on the ${elem2}. The final image should be a ${finalScene}.`;
                handleImageEditApiCall(prompt, uploadedImagesBase64);
            });
        },
        'alta_fidelidad': () => {
            agentPanel.innerHTML = `
                <h3><i class='bx bxs-shield-alt-2'></i> Conservación de Alta Fidelidad</h3>
                <p>1. Sube las imágenes de origen.</p>
                <div class="form-group">
                    <input type="file" id="image-upload" accept="image/*" multiple style="display: none;">
                    <label for="image-upload" class="action-button upload-button">Añadir Imagen(es)</label>
                    <div id="thumbnails-container" class="thumbnails-container"></div>
                </div>
                <p>2. Describe la composición con detalle.</p>
                <div class="form-group"><label for="hf-elem2">Elemento a colocar (de Imagen 2)</label><textarea id="hf-elem2" placeholder="Ej: el logotipo de la marca"></textarea></div>
                <div class="form-group"><label for="hf-elem1">Lugar donde se colocará (en Imagen 1)</label><textarea id="hf-elem1" placeholder="Ej: la camiseta lisa de la persona"></textarea></div>
                <div class="form-group"><label for="hf-preserve">Elemento a preservar sin cambios</label><textarea id="hf-preserve" placeholder="Ej: el rostro y la expresión de la persona"></textarea></div>
                <p class="prompt-tip">Describe con mucho detalle las características que NO deben cambiar.</p>
                <button id="generate-btn" class="action-button">Generar con Alta Fidelidad</button>
            `;
            document.getElementById('image-upload').addEventListener('change', handleFileUpload);
            document.getElementById('generate-btn').addEventListener('click', () => {
                const elem2 = document.getElementById('hf-elem2').value;
                const elem1 = document.getElementById('hf-elem1').value;
                const preserve = document.getElementById('hf-preserve').value;
                if (uploadedImagesBase64.length < 2) return alert('Por favor, sube al menos dos imágenes.');
                if (!elem1 || !elem2 || !preserve) return alert('Por favor, completa todos los campos.');
                const prompt = `Using the provided images, place the ${elem2} onto the ${elem1}. It is critical that the features of the ${preserve} remain completely unchanged and preserved with high fidelity. The added element should integrate naturally.`;
                handleImageEditApiCall(prompt, uploadedImagesBase64);
            });
        }
    };

    function compressBase64Image(base64String, maxWidth = 512, quality = 0.8) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // Calcular nuevas dimensiones manteniendo aspect ratio
            let { width, height } = img;
            // Solo comprimir si es más grande que maxWidth
            if (width > maxWidth) {
                const ratio = maxWidth / width;
                width = maxWidth;
                height = height * ratio;
            }
            canvas.width = width;
            canvas.height = height;
            // Usar mejor calidad de reescalado
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            // Convertir a JPEG para mejor compresión
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            console.log(`[Frontend Log] Imagen comprimida: ${base64String.length} -> ${compressedBase64.length} caracteres`);
            resolve(compressedBase64);
        };
        img.onerror = () => {
            console.error('[Frontend Error] Error al cargar imagen para comprimir');
            resolve(base64String); // Devolver original si falla
        };
        img.src = base64String;
    });
}

    const handleFileUpload = (event) => {
    const files = event.target.files;
    if (!files.length) return;
    
    uploadedImagesBase64 = []; // Limpiar siempre
    const thumbnailsContainer = document.getElementById('thumbnails-container');
    if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';
    
    welcomeMessage.style.display = 'none';
    resultImage.style.display = 'none';
    
    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImagesBase64.push(e.target.result);
            // Si solo subimos UNA imagen, la mostramos grande en el canvas principal
            if (files.length === 1) {
                resultImage.src = e.target.result;
                resultImage.style.display = 'block';
            }
            // Si el agente tiene un contenedor de miniaturas, las mostramos ahí
            if (thumbnailsContainer) {
                const thumb = document.createElement('img');
                thumb.src = e.target.result;
                thumb.title = `Imagen ${index + 1}`;
                thumbnailsContainer.appendChild(thumb);
            }
        };
        reader.readAsDataURL(file);
    });
    document.querySelector('.upload-button').textContent = 'Cambiar Imagen(es)';
};

    const activateAgent = (agentName, buttonElement) => {
        if (currentActiveButton) currentActiveButton.classList.remove('active');
        buttonElement.classList.add('active');
        currentActiveButton = buttonElement;
        resultImage.src = '';
        resultImage.style.display = 'none';
        welcomeMessage.style.display = 'block';
        saveBtn.style.display = 'none'; // OCULTAR el botón de guardar al cambiar de agente
        uploadedImagesBase64 = [];
        agentUIs[agentName] ? agentUIs[agentName]() : agentPanel.innerHTML = `<p>El agente "${agentName}" no ha sido implementado.</p>`;
    };

    // --- FUNCIONES DE LLAMADA A LA API ---

    const handleApiCall = async (prompt) => {
        if (!prompt || prompt.trim() === '' || prompt.trim() === '.') return alert('Por favor, completa los campos requeridos.');
        loader.style.display = 'block';
        resultImage.style.display = 'none';
        welcomeMessage.style.display = 'none';
        saveBtn.style.display = 'none'; // Ocultar mientras se genera
        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn) generateBtn.disabled = true;

        try {
            const response = await fetch('/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!response.ok) { /* ... */ }
            const data = await response.json();
            if (data.image_b64) {
                resultImage.src = `data:image/png;base64,${data.image_b64}`;
                resultImage.style.display = 'block';
                saveBtn.style.display = 'flex'; // MOSTRAR el botón de guardar
            }
        } catch (error) {
            console.error('Error:', error);
            alert(`No se pudo generar la imagen: ${error.message}`);
            welcomeMessage.style.display = 'block';
        } finally {
            loader.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
        }
    };

    

    const handleImageEditApiCall = async (prompt, images) => { // AHORA SIEMPRE RECIBE UN ARRAY
    const finalPrompt = `Using the provided image(s) as context, ${prompt}`;
    console.log(`[Frontend Log] Enviando a /edit-image: "${finalPrompt}"`);
    console.log(`[Frontend Log] Enviando ${images.length} imágenes.`);
    
    loader.style.display = 'block';
    resultImage.style.opacity = 0.5;
    saveBtn.style.display = 'none'; // Ocultar mientras se edita
    
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) generateBtn.disabled = true;
    
    try {
        // Validar que las imágenes tengan el formato correcto
        const validImages = images.filter(img => {
            if (!img || typeof img !== 'string') {
                console.warn('Imagen inválida encontrada:', img);
                return false;
            }
            if (!img.startsWith('data:image/')) {
                console.warn('Imagen sin formato data URL encontrada:', img.substring(0, 50));
                return false;
            }
            return true;
        });

        if (validImages.length === 0) {
            throw new Error('No se encontraron imágenes válidas para editar');
        }

        console.log(`[Frontend Log] ${validImages.length} imágenes válidas de ${images.length} totales`);

        const response = await fetch('/edit-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: finalPrompt,
                imagesBase64: validImages
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Frontend Error] Respuesta del servidor:', response.status, errorText);
            
            // Intentar parsear como JSON para obtener el mensaje de error
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.error || `Error del servidor: ${response.status}`);
            } catch (parseError) {
                throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
            }
        }

        // Verificar que la respuesta sea JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('[Frontend Error] Respuesta no es JSON:', responseText);
            throw new Error('El servidor no devolvió JSON válido. Revisa los logs del servidor.');
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        if (data.image_b64) {
            resultImage.src = `data:image/png;base64,${data.image_b64}`;
            resultImage.style.display = 'block';
            saveBtn.style.display = 'flex'; // MOSTRAR el botón de guardar
            console.log('[Frontend Log] Imagen editada exitosamente');
        } else {
            throw new Error('El servidor no devolvió una imagen');
        }

    } catch (error) {
        console.error('[Frontend Error] Error en handleImageEditApiCall:', error);
        alert(`No se pudo editar la imagen: ${error.message}`);
        
        // Mostrar mensaje de bienvenida si no hay imagen
        if (!resultImage.src || resultImage.src.includes('data:,')) {
            welcomeMessage.style.display = 'block';
        }
    } finally {
        loader.style.display = 'none';
        resultImage.style.opacity = 1;
        if (generateBtn) generateBtn.disabled = false;
    }
};

    // --- EVENT LISTENERS Y ESTADO INICIAL ---

    menuButtons.forEach(button => {
        button.addEventListener('click', () => activateAgent(button.dataset.agent, button));
    });

    // EVENT LISTENER PARA EL BOTÓN DE GUARDAR
    saveBtn.addEventListener('click', () => {
        if (!resultImage.src) return;
        const link = document.createElement('a');
        link.href = resultImage.src;
        link.download = `ai-studio-${Date.now()}.png`;
        link.click();
    });

    const firstButton = document.querySelector('.menu-button');
    if (firstButton) activateAgent(firstButton.dataset.agent, firstButton);
});