const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

/**
 * Service to interact with the Python Voice Cloning Engine
 * This module is pending validation from the core engine.
 */
class VoiceClonerService {
    constructor(engineUrl = 'http://localhost:8000') {
        this.engineUrl = engineUrl;
    }

    /**
     * Clones a voice from a reference audio and generates a new audio from text
     * @param {string} text - The text to be spoken
     * @param {string} audioPath - Path to the reference audio file
     * @param {string} language - Language code (default 'pt')
     * @returns {Promise<Buffer>} - The generated audio buffer
     */
    async cloneAndSpeak(text, audioPath, language = 'pt') {
        try {
            const formData = new FormData();
            formData.append('text', text);
            formData.append('language', language);
            formData.append('file', fs.createReadStream(audioPath));

            const response = await axios.post(`${this.engineUrl}/clone`, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                responseType: 'arraybuffer'
            });

            return Buffer.from(response.data);
        } catch (error) {
            console.error('Error in VoiceClonerService:', error.message);
            throw new Error(`Voice Cloning Engine failed: ${error.message}`);
        }
    }

    /**
     * Checks if the engine is alive and ready
     */
    async checkHealth() {
        try {
            const response = await axios.get(`${this.engineUrl}/health`);
            return response.data;
        } catch (error) {
            return { status: 'offline', error: error.message };
        }
    }
}

module.exports = new VoiceClonerService();
