import { pipeline, env } from '@xenova/transformers';

// Configurações de Segurança e Proxy Customizado
env.allowLocalModels = false;
env.remoteHost = self.location.origin + '/api/hfproxy/'; // Força o tráfego da IA passar pelo nosso Backbone Anti-Bloqueio

let extractor = null;

// Initialize the model as soon as the worker starts
const initModel = async () => {
    try {
        postMessage({ status: 'loading' });
        extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32', { quantized: true });
        postMessage({ status: 'ready' });
    } catch (err) {
        postMessage({ status: 'error', message: err.message });
    }
};

initModel();

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    if (!extractor) {
        postMessage({ status: 'error', message: 'Model is not loaded yet.' });
        return;
    }

    const { imageBase64 } = event.data;
    
    try {
        // Run the complex AI model on the background thread
        const output = await extractor(imageBase64);
        const embedding = Array.from(output.data);
        
        postMessage({ status: 'success', embedding });
    } catch (err) {
        postMessage({ status: 'error', message: err.message });
    }
});
