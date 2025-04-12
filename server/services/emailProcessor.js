const natural = require('natural');
const { extractAmounts, extractDate, extractVendor } = require('./textExtraction');

/**
 * Advanced email receipt processor
 * This service identifies receipts in emails and extracts structured data
 */
class EmailReceiptProcessor {
  constructor() {
    // Initialize NLP classifier
    this.classifier = new natural.BayesClassifier();
    this.trainClassifier();
  }

  /**
   * Train the classifier with sample receipt email patterns
   */
  trainClassifier() {
    // Examples of receipt-related content
    [
      'your order has shipped', 'order confirmation', 'receipt for your purchase',
      'payment confirmation', 'invoice', 'transaction receipt', 'thank you for your order',
      'your payment was successful', 'order details', 'your receipt from'
    ].forEach(text => this.classifier.addDocument(text, 'receipt'));

    // Examples of non-receipt content
    [
      'meeting invitation', 'newsletter', 'account security', 'password reset',
      'limited time offer', 'promotion', 'update your preferences', 'verify your account'
    ].forEach(text => this.classifier.addDocument(text, 'non-receipt'));

    // Train the classifier
    this.classifier.train();
  }

  /**
   * Determine if an email is likely a receipt
   * @param {Object} email - The email object with subject and body
   * @returns {Boolean} - Whether this email is likely a receipt
   */
  isReceiptEmail(email) {
    // First check from address for common vendors
    const commonVendors = [
      'amazon', 'ebay', 'walmart', 'target', 'costco', 'bestbuy', 'apple',
      'uber', 'lyft', 'doordash', 'grubhub', 'instacart', 'invoice', 'receipt', 
      'order', 'purchase', 'payment', 'transaction'
    ];
    
    const fromAddress = email.from?.toLowerCase() || '';
    const subject = email.subject?.toLowerCase() || '';
    const body = email.body?.toLowerCase() || '';
    
    // Check from address for common vendors
    const fromVendorMatch = commonVendors.some(vendor => 
      fromAddress.includes(vendor));
    
    // Check subject for receipt-related keywords
    const subjectMatch = commonVendors.some(vendor => 
      subject.includes(vendor));
    
    // Check for receipt identifiers in subject
    const receiptIdentifiers = ['receipt', 'order', 'invoice', 'purchase', 'payment', 'confirmation'];
    const hasReceiptIdentifier = receiptIdentifiers.some(word => subject.includes(word));
    
    // Use the classifier on the subject and first part of body
    const classifierResult = this.classifier.classify(subject + ' ' + body.substring(0, 500));
    
    // If multiple signals indicate this is a receipt, return true
    return (fromVendorMatch && hasReceiptIdentifier) || 
           (subjectMatch && hasReceiptIdentifier) ||
           (classifierResult === 'receipt' && (fromVendorMatch || subjectMatch || hasReceiptIdentifier));
  }

  /**
   * Extract structured receipt data from email content
   * @param {Object} email - The email object with subject and body
   * @returns {Object} - Extracted receipt data
   */
  extractReceiptData(email) {
    try {
      const fromAddress = email.from || '';
      const subject = email.subject || '';
      const body = email.body || '';
      const htmlBody = email.htmlBody || '';
      
      // Extract vendor from the from address or subject
      const vendor = extractVendor(fromAddress, subject, body);
      
      // Extract amount and currency - look for patterns like $XX.XX
      const { amount, currency } = extractAmounts(body, htmlBody);
      
      // Extract date - default to received date if we can't find a transaction date
      const date = extractDate(body) || email.receivedAt;
      
      // Look for order/confirmation/receipt number patterns
      const orderNumberMatch = body.match(/order[^a-zA-Z0-9]*#?\s*([a-zA-Z0-9-]+)/i) ||
                              body.match(/confirmation[^a-zA-Z0-9]*#?\s*([a-zA-Z0-9-]+)/i) ||
                              body.match(/receipt[^a-zA-Z0-9]*#?\s*([a-zA-Z0-9-]+)/i);
      
      const orderNumber = orderNumberMatch ? orderNumberMatch[1] : null;
      
      return {
        vendor,
        amount,
        currency,
        date,
        orderNumber,
        receiptType: 'email',
        confidence: this.calculateConfidence(vendor, amount, date),
        emailId: email.id,
        raw: {
          subject,
          from: fromAddress,
          date: email.receivedAt
        }
      };
    } catch (error) {
      console.error('Error extracting receipt data:', error);
      return {
        vendor: null,
        amount: null,
        currency: null,
        date: email.receivedAt,
        confidence: 0,
        error: error.message,
        emailId: email.id
      };
    }
  }

  /**
   * Calculate confidence score for the extracted data
   * @param {String} vendor - Extracted vendor
   * @param {Number} amount - Extracted amount
   * @param {Date} date - Extracted date
   * @returns {Number} - Confidence score (0-1)
   */
  calculateConfidence(vendor, amount, date) {
    let score = 0;
    if (vendor) score += 0.3;
    if (amount) score += 0.5;
    if (date) score += 0.2;
    return Math.min(score, 1);
  }
  
  /**
   * Process an email to determine if it's a receipt and extract data
   * @param {Object} email - The email object
   * @returns {Object} - Processing result with receipt data if applicable
   */
  processEmail(email) {
    if (!this.isReceiptEmail(email)) {
      return { isReceipt: false };
    }
    
    const receiptData = this.extractReceiptData(email);
    return {
      isReceipt: true,
      data: receiptData
    };
  }
}

module.exports = new EmailReceiptProcessor();