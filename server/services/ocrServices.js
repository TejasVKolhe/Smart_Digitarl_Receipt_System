const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

// Configure axios for OCR requests
const axiosInstance = axios.create({
  timeout: 60000, // 60 second timeout
  maxContentLength: 20 * 1024 * 1024, // 20MB max content size
  maxBodyLength: 20 * 1024 * 1024, // 20MB max body size
});

/**
 * Extract text from image using OCR
 * @param {string} imageUrl - URL of the image to process
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromImage(imageUrl) {
  console.log('Starting OCR process for:', imageUrl);
  
  // Create a temp directory if it doesn't exist
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Generate a unique filename
  const tempFilePath = path.join(tempDir, `temp_${Date.now()}.png`);
  
  try {
    // Download the image with retry logic
    let imageData = null;
    const maxRetries = 3;
    let retries = 0;
    let lastError = null;
    
    while (retries < maxRetries) {
      try {
        const response = await axiosInstance.get(imageUrl, {
          responseType: 'arraybuffer',
          headers: {
            'Accept': 'image/*, application/octet-stream'
          }
        });
        imageData = response.data;
        break; // Success, exit retry loop
      } catch (error) {
        retries++;
        lastError = error;
        console.log(`Download attempt ${retries} failed:`, error.message);
        
        if (retries < maxRetries) {
          // Exponential backoff wait: 1s, 2s, 4s...
          const waitTime = Math.pow(2, retries - 1) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!imageData) {
      throw new Error(`Failed to download image after ${maxRetries} attempts: ${lastError?.message}`);
    }
    
    // Save the image to a temporary file
    fs.writeFileSync(tempFilePath, imageData);
    console.log('Image saved to:', tempFilePath);
    
    // Process the image with Tesseract OCR using the correct API for the current version
    // Modern Tesseract.js API
    const worker = await createWorker('eng');
    
    console.log('OCR worker initialized with English language');
    
    // Recognize text from image
    const { data } = await worker.recognize(tempFilePath);
    console.log('OCR processing complete');
    
    // Clean up resources
    await worker.terminate();
    
    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('Temporary file deleted');
    }
    
    return data.text;
  } catch (error) {
    console.error('Detailed OCR error:', error);
    
    // Clean up temp file if it exists
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Temporary file deleted after error');
      } catch (unlinkError) {
        console.error('Error deleting temporary file:', unlinkError.message);
      }
    }
    
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}

module.exports = {
  extractTextFromImage
};
