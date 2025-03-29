const Tesseract = require('tesseract.js');
const axios = require('axios');
const sharp = require('sharp');

async function extractTextFromImage(imageUrl) {
  try {
    console.log('Starting OCR process for:', imageUrl);
    
    // Download the image with timeout and retry logic
    const response = await axios({
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 10000, // 10 second timeout
      maxContentLength: 10 * 1024 * 1024, // 10MB max
    });
    
    console.log('Image downloaded successfully, size:', response.data.length);

    // Process the image with sharp
    const processedImageBuffer = await sharp(response.data)
      .greyscale()
      .normalize()
      .sharpen()
      .toBuffer();
    
    console.log('Image processed with sharp');

    // Initialize Tesseract with specific configuration
    const result = await Tesseract.recognize(
      processedImageBuffer,
      'eng',
      {
        logger: m => console.log('Tesseract progress:', m),
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$.,:-()/ ',
        tessedit_pageseg_mode: '1',
        tessedit_ocr_engine_mode: '3',
      }
    );

    if (!result || !result.data || !result.data.text) {
      throw new Error('Tesseract returned invalid result');
    }

    console.log('OCR completed successfully');
    return result.data.text;
  } catch (error) {
    console.error('Detailed OCR error:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}

module.exports = {
  extractTextFromImage
};
