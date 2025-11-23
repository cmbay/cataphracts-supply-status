# Cataphracts Supply Status Monitor

Automated supply tracking for Cataphracts campaigns. Monitors Google Sheets for army supply levels and sends daily Discord notifications.

## What it does

- Reads current supplies and daily consumption from Google Sheets
- Subtracts daily consumption from current supplies
- Updates the sheet with new supply levels
- Sends Discord alerts when supplies are low
- Runs automatically once per day (configurable - see below)

## Setup

### 1. Google Cloud Setup

Create a Google Cloud project (free):

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create new project
3. Enable Google Sheets API (APIs & Services > Library)
4. Create Service Account (APIs & Services > Credentials)
5. Download the JSON key file
6. Share your Google Sheets with the service account email (Editor permissions)

### 2. Google Sheets Format

#### Commander Database Sheet

Create a Google Sheet with a tab named **"Commander Database"** that contains your commander configuration starting from row 3:

| Column | Field               | Description                                                  |
| ------ | ------------------- | ------------------------------------------------------------ |
| A      | Commander Name      | The name of the commander/army                               |
| B      | Sheet URL           | The full Google Sheets URL for this commander's supply sheet |
| L      | Discord Webhook URL | The Discord webhook URL for notifications                    |

**Example:**

```
Row 1: [Headers - optional]
Row 2: [Headers - optional]
Row 3: "Saraian 1st Army" | "https://docs.google.com/spreadsheets/d/1AbCdEfG.../edit" | ... | "https://discord.com/api/webhooks/123/abc"
Row 4: "Keltic Raiders"   | "https://docs.google.com/spreadsheets/d/1ZyXwVu.../edit" | ... | "https://discord.com/api/webhooks/456/def"
```

**Note:** The system will automatically:

- Parse the sheet ID from the URL in column B
- Use "Sheet1" as the sheet name
- Use cell C9 for current supplies
- Use cell C11 for daily consumption

#### Individual Commander Supply Sheets

Each commander's supply sheet (referenced in the Commander Database) must have:

- **Cell C9**: Current Supplies (a number, e.g., `150`)
- **Cell C11**: Daily Consumption (a number, e.g., `5`)

These cells are hardcoded and used for all commanders.

Example layout:

```
A9: Current Supplies        C9: 150
A11: Daily Consumption      C11: 5
```

### 3. Discord Webhooks

Create webhooks for notifications:

**Channel webhook:**

```
https://discord.com/api/webhooks/{webhook_id}/{token}
```

**Thread webhook:**

```
https://discord.com/api/webhooks/{webhook_id}/{token}?thread_id={thread_id}
```

To create: Right-click channel > Edit Channel > Integrations > Create Webhook > Copy URL

To get thread id:

1. User Settings > Advanced > Enable Developer Mode
1. Right-click thread > Copy Thread ID

### 4. GitHub Repository

1. Fork this repository
2. Add these secrets (Settings > Secrets and variables > Actions):
   - `GOOGLE_SERVICE_ACCOUNT_KEY`: Base64-encoded service account JSON
   - `DATABASE_SHEET_ID`: The Google Sheet ID of your Commander Database sheet

**To get the Database Sheet ID:**

From your Commander Database Google Sheets URL:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890/edit
                                       ^^^^^^^^^ This is your sheet ID ^^^^^^^^^
```

The sheet ID is the long alphanumeric string between `/d/` and `/edit` in the URL.

### 5. Configuration

Configuration is now automatically loaded from your Commander Database Google Sheet. The system will:

1. Connect to the sheet specified by `DATABASE_SHEET_ID`
2. Read the "Commander Database" tab
3. Process each row starting from row 3
4. Extract commander name (Column A), sheet URL (Column B), and webhook URL (Column L)
5. Automatically configure each commander with:
   - Sheet name: "Sheet1"
   - Current supplies cell: C9
   - Daily consumption cell: C11

**No manual JSON configuration needed!** Just maintain your Commander Database sheet and the system will automatically discover and process all commanders.

## Timing Configuration

The system runs daily at **midnight EST** (5 AM UTC). To change this:

1. Edit `.github/workflows/supply-monitor.yml`
2. Modify the cron schedule: `- cron: "0 5 * * *"`

**Cron format:** `minute hour day month weekday`

- `0 5 * * *` = 5 AM UTC daily (midnight EST)
- `0 12 * * *` = noon UTC daily
- `0 0 * * 1` = midnight UTC every Monday

**Time zones:** GitHub Actions runs in UTC. Calculate your local time offset.

## Example Output

The bot sends Discord embeds with supply status:

### Normal Status (15+ days remaining)

```
✅ Supply Status: Saraian 1st Army

📅 Current Day: Monday, June 25th
📦 Current Supplies: 150
📉 Daily Consumption: 5
⏰ Days Remaining: 30 days
🚨 Zero Supplies Date: Wednesday, July 25th
```

### Warning (4-7 days remaining)

```
⚠️ **WARNING**: Saraian 1st Army supplies are running low. 5 days remaining.

⚠️ Supply Status: Saraian 1st Army

📅 Current Day: Monday, June 25th
📦 Current Supplies: 25
📉 Daily Consumption: 5
⏰ Days Remaining: 5 days
🚨 Zero Supplies Date: Saturday, June 30th
```

### Critical (1-3 days remaining)

```
🚨 **URGENT**: Saraian 1st Army supplies are critically low! Only 2 days remaining.

🚨 Supply Status: Saraian 1st Army

📅 Current Day: Monday, June 25th
📦 Current Supplies: 10
📉 Daily Consumption: 5
⏰ Days Remaining: 2 days
🚨 Zero Supplies Date: Wednesday, June 27th
```

### Zero Supplies

```
🚨 **CRITICAL**: Saraian 1st Army supplies have reached ZERO today! Immediate restocking required.

🚨 ZERO SUPPLIES ALERT: Saraian 1st Army

📅 Current Day: Monday, June 25th
📦 Current Supplies: 0 (OUT OF STOCK)
📉 Daily Consumption: 5
⏰ Days Remaining: 0 days - IMMEDIATE ACTION REQUIRED
🚨 Status: Supplies have just been depleted today
```

## Alert Thresholds

- **Green** (✅): 15+ days remaining
- **Yellow** (⚡): 8-14 days remaining
- **Orange** (⚠️): 4-7 days remaining
- **Red** (🚨): 1-3 days remaining
- **Critical** (🚨): 0 days remaining

## Adding Multiple Commanders

To monitor multiple commanders, simply add more rows to your Commander Database sheet. Each row (starting from row 3) represents a different commander/army:

**Example Commander Database:**

| A (Name)         | B (Sheet URL)                                   | ... | L (Webhook URL)                                        |
| ---------------- | ----------------------------------------------- | --- | ------------------------------------------------------ |
| Saraian 1st Army | https://docs.google.com/spreadsheets/d/1AbC.../ | ... | https://discord.com/api/webhooks/111/aaa               |
| Keltic Raiders   | https://docs.google.com/spreadsheets/d/1ZyX.../ | ... | https://discord.com/api/webhooks/222/bbb               |
| Northern Legion  | https://docs.google.com/spreadsheets/d/1DeF.../ | ... | https://discord.com/api/webhooks/333/ccc?thread_id=444 |

The system will automatically process all rows with complete data (name, sheet URL, and webhook URL).

## Security & Privacy

This project uses **targeted private logging** to protect sensitive supply data and tactical intelligence while maintaining full debugging capabilities.

### What's Protected in Public Logs

- 🔒 **Supply numbers**: Actual amounts replaced with "X"
- 🔒 **Tactical status**: "Critically low supplies" → "Supply status updated"
- 🔒 **Operational intelligence**: Army readiness alerts sanitized
- 🔒 **Discord webhook URLs**: Authentication tokens hidden
- 🔒 **Service account details**: Credentials sanitized

### What's Fully Visible in Public Logs

- ✅ **Sheet names**: "Processing sheet: Saraian 1st Army"
- ✅ **Complete error messages**: Full stack traces and debugging details
- ✅ **Operation status**: Success/failure, timing, progress
- ✅ **Configuration issues**: Validation errors, API failures

### Example Comparison

**Local Development:**

```
[WARN] Saraian 1st Army supplies are critically low
[ERROR] Saraian 3rd Army supplies have reached zero! Immediate restocking required
[ERROR] Authentication failed for Google Sheets API
```

**GitHub Actions (Tactical Intelligence Sanitized):**

```
[WARN] Saraian 1st Army supply status updated
[ERROR] Saraian 3rd Army supply status updated! action required
[ERROR] Authentication failed for Google Sheets API
```

This approach protects **operational security and tactical intelligence** while maintaining **full transparency for debugging** errors and system status.

**Important**: Log levels (INFO/WARN/ERROR) remain consistent between local development and public logs, preventing analysis of logging patterns to infer tactical situations.

See [Private Logging Documentation](docs/PRIVATE_LOGGING.md) for complete details.

## Testing

Validate configuration:

```bash
npm install
npm run validate
```

Test run (will modify sheets and send Discord messages):

```bash
npm start
```

Manual GitHub Actions run: Go to Actions tab > Supply Status Monitor > Run workflow

## Troubleshooting

**"No data found in cell"**: Check cell address format ("B2" not "b2"), verify cell contains numbers

**"Authentication failed"**: Re-encode service account JSON to Base64, check Google Sheets API is enabled

**"Discord webhook failed"**: Verify webhook URL, check if webhook was deleted

**Wrong timing**: Modify cron schedule in `.github/workflows/supply-monitor.yml`

## License

MIT
