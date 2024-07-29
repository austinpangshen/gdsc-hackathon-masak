
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

// Collect the receipt from Gmail
function getReceipts(startDate,endDate,useDateRange) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  var query = 'subject:receipt OR subject:invoice';
  if (useDateRange) { //<--if not all time scan then it will scan in a date range
    if (startDate) {
      query += ` after:${startDate}`;
    }
    if (endDate) {
      query += ` before:${endDate}`;
    }
  }

  var threads = GmailApp.search(query);
  
  threads.forEach(thread => {
    var messages = thread.getMessages();
    messages.forEach(message => {
      var from = message.getFrom();
      var subject = message.getSubject();
      var date = message.getDate();
      var body = message.getPlainBody();

      // Extract amount of receipt  
      var amountMatch1 = /Total Amount Paid\s*:\s*(MYR|RM)\s?(\d+(?:,\d{3})*(?:\.\d{2})?)/s;
      var totalAmountMatch = body.match(amountMatch1);

      var amountMatch2= /You've paid\s*(RM)\s*:\s*(MYR|RM)\s?(\d+(?:,\d{3})*(?:\.\d{2})?)/s;
      var totalAmountMatch2 = body.match(amountMatch2);

      //case1
      if (totalAmountMatch) {
        currency = totalAmountMatch[1];
        amount = parseFloat(totalAmountMatch[2].replace(/,/g, ''));
      } 
      //case2
      else if(totalAmountMatch2){
        currency = totalAmountMatch2[1];
        amount = parseFloat(totalAmountMatch2[2].replace(/,/g, ''));
      }
      //more cases can be added if needed
      else {

        var currencyType = /(MYR|RM)\s?(\d+(?:,\d{3})*(?:\.\d{2})?)/;
        var matchAmount2 = body.match(currencyType);
        var currency = matchAmount2 ? matchAmount2[1] : 'N/A';
        var amount = matchAmount2 ? parseFloat(matchAmount2[2].replace(/,/g, '')) : 'N/A';
      }

      // show out the amount for debugging...
      Logger.log('Extracted amount: ' + amount);
      
      // Extract PDF attachments
      var attachments = message.getAttachments();
      var pdfText = '';
      attachments.forEach(attachment => {
        if (attachment.getContentType() == 'application/pdf') {
          pdfText += extractTextFromPDF(attachment);
        }
      });
      
      // Parse PDF text if PDF was found
      
      var pdfData = pdfText ? parseReceiptPDF(pdfText) : {};

      // Record receipt information into Google Sheets
      sheet.appendRow([
        date,
        from,
        amount !== 'N/A' ? amount : pdfData.amount || 'N/A',
        pdfData.category || subject,
        pdfText || body
      ]);
    });
  });
}

// Placeholder PDF text extraction function
function extractTextFromPDF(pdfBlob) {
  // Implement PDF parsing logic here
  // For example, Google Cloud Vision API (text extraction library)
  //Unfortunately due to our group members didnt have any ability to complete this function QAQ
  return "Parsed PDF text here"; // Replace with actual extracted text
}

// Placeholder function to parse the extracted PDF text
function parseReceiptPDF(pdfText) {
  // Implement logic to parse the PDF text and extract receipt details
  // This function should parse the text and return an object with fields like date, vendor, amount, category, and description
  return {
    date: "", // Extracted date from PDF text
    vendor: "", // Extracted vendor from PDF text
    amount: "", // Extracted amount from PDF text
    category: "", // Extracted category from PDF text
    description: pdfText // Use PDF text as description
  };
}

// Function for save manual receipt entry into sheets
function saveReceiptData(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");

  // Makesure the sheet exists
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Sheet1");
    // Add headers if the sheet was newly created
    sheet.appendRow(["Date", "Vendor", "Amount", "Category", "Description"]);
  }

  // Append receipt information into the sheet
  sheet.appendRow([data.date, data.vendor, data.amount, data.category, data.notes]);
}

// Function to handle uploaded receipt in pdf
function handleUploadedReceipt(pdfBlob) {
  var pdfText = extractTextFromPDF(pdfBlob);
  var receiptData = parseReceiptPDF(pdfText);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  sheet.appendRow([receiptData.date, receiptData.vendor, receiptData.amount, receiptData.category, receiptData.description]);
}




