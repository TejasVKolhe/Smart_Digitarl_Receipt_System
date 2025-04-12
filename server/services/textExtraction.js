/**
 * Extract vendor name from email parts
 */
const extractVendor = (fromAddress, subject, body) => {
  // Try to extract from the "from" email address
  const fromMatch = fromAddress.match(/([^<@\s]+)@([^@\s>]+)/);
  if (fromMatch) {
    // Extract the domain part (e.g., amazon.com)
    const domain = fromMatch[2];
    // Get the main part of the domain (e.g., amazon from amazon.com)
    const mainDomain = domain.split('.')[0];
    
    // Common email services that aren't actual vendors
    const commonEmailProviders = ['gmail', 'yahoo', 'outlook', 'hotmail', 'aol', 'protonmail'];
    if (!commonEmailProviders.includes(mainDomain.toLowerCase())) {
      return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
    }
  }
  
  // Next try to extract from the subject line - Add Indian vendors
  const subjectVendors = [
    'Amazon', 'Walmart', 'Uber', 'Lyft', 'DoorDash', 'Grubhub', 'Instacart',
    'Target', 'Best Buy', 'Apple', 'Microsoft', 'Netflix', 'Spotify', 'eBay',
    // Indian vendors
    'Flipkart', 'Myntra', 'Ajio', 'Nykaa', 'Meesho', 'Snapdeal', 
    'Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Bigbasket', 'Grofers',
    'MakeMyTrip', 'Goibibo', 'Cleartrip', 'Easemytrip', 'Yatra',
    'Paytm', 'PhonePe', 'GooglePay', 'Razorpay',
    'JioMart', 'Reliance', 'TataCliq', 'Croma', 'DMart', 'FirstCry',
    'Ola', 'Rapido', 'RedBus', 'IRCTC',
    'The Souled Store', 'Bewakoof', 'TeePublic'
  ];
  
  for (const vendor of subjectVendors) {
    if (subject.includes(vendor.toLowerCase())) {
      return vendor;
    }
  }
  
  // Try to find "from [Vendor Name]" pattern in subject
  const fromVendorMatch = subject.match(/from\s+([A-Z][A-Za-z0-9\s&]+)/);
  if (fromVendorMatch) {
    return fromVendorMatch[1].trim();
  }
  
  // Look for "Your [Vendor] order" pattern
  const yourVendorMatch = subject.match(/your\s+([A-Z][A-Za-z0-9\s&]+)\s+order/i);
  if (yourVendorMatch) {
    return yourVendorMatch[1].trim();
  }
  
  // As a last resort, look for company names in the body
  const bodyFirstParagraph = body.split('\n').slice(0, 5).join(' ');
  const thanksMatch = bodyFirstParagraph.match(/thank you for (shopping|ordering) (from|with|at) ([A-Z][A-Za-z0-9\s&]+)/i);
  if (thanksMatch) {
    return thanksMatch[3].trim();
  }
  
  return null;
};

/**
 * Extract monetary amounts from text with improved Indian currency support
 */
const extractAmounts = (plainText, htmlText) => {
  // Try to find currency symbols followed by numbers
  const amountRegex = /(?:[\$\€\£\¥\₹])\s*(\d+(?:[.,]\d+)*)/g;
  
  let amounts = [];
  let match;
  
  // Extract all money amounts from the text
  while ((match = amountRegex.exec(plainText)) !== null) {
    // Convert "1,234.56" to 1234.56
    const amount = parseFloat(match[1].replace(/,/g, ''));
    
    // Skip very small amounts like $0.00
    if (!isNaN(amount) && amount > 0.5) {
      amounts.push({
        raw: match[0],
        value: amount,
        currency: match[0].charAt(0)
      });
    }
  }
  
  // If no amounts found, try more generic patterns including Indian formats
  if (amounts.length === 0) {
    const totalRegexPatterns = [
      // Standard formats
      /total:?\s*(?:[\$\€\£\¥\₹])?\s*(\d+(?:[.,]\d+)*)/gi,
      
      // Indian Rupee formats
      /(?:rs\.?|inr)\s*(\d+(?:[.,]\d+)*)/gi,
      /rupees\s*(\d+(?:[.,]\d+)*)/gi,
      
      // Total after GST (common in India)
      /(?:total after gst|final amount):?\s*(?:[\$\€\£\¥\₹]|rs\.?|inr)?\s*(\d+(?:[.,]\d+)*)/gi
    ];
    
    for (const pattern of totalRegexPatterns) {
      while ((match = pattern.exec(plainText)) !== null) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0.5) {
          // Determine currency
          let currency = '$'; // Default
          
          if (match[0].toLowerCase().includes('rs.') || 
              match[0].toLowerCase().includes('inr') || 
              match[0].toLowerCase().includes('rupees') ||
              match[0].includes('₹')) {
            currency = '₹';
          }
          
          amounts.push({
            raw: match[0],
            value: amount,
            currency: currency
          });
        }
      }
    }
  }
  
  // Sort amounts in descending order - usually the largest is the total
  amounts.sort((a, b) => b.value - a.value);
  
  // Look specifically for "Total", "Amount", "Grand Total" patterns that may indicate the final amount
  const totalMatches = plainText.match(/(?:total|amount|grand total|paid):?\s*(?:[\$\€\£\¥\₹])?\s*(\d+(?:[.,]\d+)*)/i);
  
  if (totalMatches) {
    const totalAmount = parseFloat(totalMatches[1].replace(/,/g, ''));
    if (!isNaN(totalAmount) && totalAmount > 0.5) {
      return { 
        amount: totalAmount,
        currency: plainText.charAt(totalMatches.index - 1).match(/[\$\€\£\¥\₹]/) ? 
                 plainText.charAt(totalMatches.index - 1) : '$'
      };
    }
  }
  
  // If we found amounts, return the largest one (likely the total)
  if (amounts.length > 0) {
    return { 
      amount: amounts[0].value,
      currency: amounts[0].currency 
    };
  }
  
  return { amount: null, currency: null };
};

/**
 * Extract date from text with improved Indian date format support
 */
const extractDate = (text) => {
  // Look for common date patterns
  const datePatterns = [
    // MM/DD/YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // MM-DD-YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/,
    // Month DD, YYYY
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{1,2}),? (\d{4})/i,
    // DD Month YYYY
    /(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{4})/i,
    // YYYY-MM-DD
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    // Indian format (DD/MM/YYYY)
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // Indian format (DD-MM-YYYY)
    /(\d{1,2})-(\d{1,2})-(\d{4})/
  ];
  
  // Look for specific date labels
  const dateContexts = [
    'order date', 'purchase date', 'transaction date', 'payment date',
    'date of purchase', 'invoice date', 'receipt date'
  ];
  
  // First try to find dates with contexts
  for (const context of dateContexts) {
    const contextIndex = text.toLowerCase().indexOf(context);
    if (contextIndex !== -1) {
      // Look for a date pattern in the 50 characters after the context
      const subsequentText = text.substr(contextIndex, 50);
      
      for (const pattern of datePatterns) {
        const match = subsequentText.match(pattern);
        if (match) {
          return new Date(match[0]);
        }
      }
    }
  }
  
  // If no context-specific date is found, look for any date in the text
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return new Date(match[0]);
    }
  }
  
  // Handle Indian date format specifically
  const indianDateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (indianDateMatch) {
    try {
      // Indian dates are in DD/MM/YYYY format
      const day = parseInt(indianDateMatch[1]);
      const month = parseInt(indianDateMatch[2]) - 1; // Months are 0-based in JS
      const year = parseInt(indianDateMatch[3]);
      
      // Only process if values are valid
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
        return new Date(year, month, day);
      }
    } catch (e) {
      console.error('Error parsing Indian date format:', e);
    }
  }
  
  return null;
};

module.exports = {
  extractVendor,
  extractAmounts,
  extractDate
};