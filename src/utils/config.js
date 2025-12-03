const { GoogleSheetsService } = require("../services/googleSheets");
const { logger } = require("./logger");

/**
 * Parse a Google Sheets URL to extract the sheet ID
 * @param {string} url - The Google Sheets URL
 * @returns {string} - The sheet ID
 */
function parseSheetIdFromUrl(url) {
  // Google Sheets URLs have the format:
  // https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid=0
  // or
  // https://docs.google.com/spreadsheets/d/{SHEET_ID}

  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

  if (!match || !match[1]) {
    throw new Error(`Invalid Google Sheets URL: ${url}`);
  }

  return match[1];
}

/**
 * Load configuration from the Commander Database Google Sheet
 * @returns {Promise<Array>} - Array of sheet configurations
 */
async function loadConfig() {
  try {
    // Get the database sheet ID from environment variable
    const databaseSheetId = process.env.DATABASE_SHEET_ID;

    if (!databaseSheetId) {
      throw new Error("DATABASE_SHEET_ID environment variable is required");
    }

    logger.info(
      `Loading configuration from database sheet: ${databaseSheetId}`
    );

    // Initialize Google Sheets service
    const sheetsService = new GoogleSheetsService();
    await sheetsService.initialize();

    // Fetch data from Commander Database sheet, starting from row 3
    // Columns: A = name, B = sheet URL, L = webhook URL
    const rows = await sheetsService.getRange(
      databaseSheetId,
      "A3:M",
      "Commander Database"
    );

    if (!rows || rows.length === 0) {
      throw new Error("No commander data found in Commander Database sheet");
    }

    // Build configuration array
    const config = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 3; // Actual row number in the sheet

      // Column A (index 0) = name
      const name = row[0];

      // Column C (index 2) = sheet URL
      const sheetUrl = row[2];

      // Column M (index 12) = webhook URL
      const webhookUrl = row[12];

      // Skip rows that don't have all required fields
      if (!name || !sheetUrl || !webhookUrl) {
        logger.debug(
          `Skipping row ${rowNumber}: missing required fields (name: ${!!name}, sheetUrl: ${!!sheetUrl}, webhookUrl: ${!!webhookUrl})`
        );
        continue;
      }

      try {
        // Parse the sheet ID from the URL
        const sheetId = parseSheetIdFromUrl(sheetUrl);

        // Build the configuration object with hardcoded cell addresses
        config.push({
          name: name.trim(),
          sheetId: sheetId,
          sheetName: "Sheet1",
          webhookUrl: webhookUrl.trim(),
          currentSuppliesCell: "C9",
          dailyConsumptionCell: "C11",
        });

        logger.debug(`Added configuration for: ${name}`);
      } catch (error) {
        logger.warn(`Skipping row ${rowNumber} (${name}): ${error.message}`);
      }
    }

    if (config.length === 0) {
      throw new Error(
        "No valid commander configurations found in Commander Database sheet"
      );
    }

    // Validate the configuration
    validateConfig(config);

    logger.info(
      `Successfully loaded configuration for ${config.length} commanders`
    );

    return config;
  } catch (error) {
    logger.error("Failed to load configuration:", error);
    throw new Error(`Configuration loading failed: ${error.message}`);
  }
}

function validateConfig(config) {
  if (!Array.isArray(config)) {
    throw new Error("Configuration must be an array of sheet configurations");
  }

  if (config.length === 0) {
    throw new Error(
      "Configuration must contain at least one sheet configuration"
    );
  }

  config.forEach((sheetConfig, index) => {
    const requiredFields = [
      "name",
      "sheetId",
      "webhookUrl",
      "currentSuppliesCell",
      "dailyConsumptionCell",
    ];

    for (const field of requiredFields) {
      if (!sheetConfig[field]) {
        throw new Error(
          `Sheet configuration ${index} is missing required field: ${field}`
        );
      }
    }

    // Validate webhook URL format
    try {
      new URL(sheetConfig.webhookUrl);
    } catch (error) {
      throw new Error(
        `Sheet configuration ${index} has invalid webhook URL: ${sheetConfig.webhookUrl}`
      );
    }

    // Validate cell addresses (basic validation)
    if (!isValidCellAddress(sheetConfig.currentSuppliesCell)) {
      throw new Error(
        `Sheet configuration ${index} has invalid currentSuppliesCell: ${sheetConfig.currentSuppliesCell}`
      );
    }

    if (!isValidCellAddress(sheetConfig.dailyConsumptionCell)) {
      throw new Error(
        `Sheet configuration ${index} has invalid dailyConsumptionCell: ${sheetConfig.dailyConsumptionCell}`
      );
    }
  });

  logger.info(`Configuration validation passed for ${config.length} sheets`);
}

function isValidCellAddress(cellAddress) {
  // Basic validation for cell addresses like A1, B2, AA10, etc.
  return /^[A-Z]+[1-9][0-9]*$/.test(cellAddress);
}

module.exports = {
  loadConfig,
  validateConfig,
  isValidCellAddress,
  parseSheetIdFromUrl,
};
