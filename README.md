# Smart Digital Receipt System

## Gmail Integration Setup

To enable Gmail integration for fetching email receipts, you need to set up Google API credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" and select "OAuth client ID"
5. Select "Web application" as the application type
6. Add the following Authorized redirect URIs:
   - `http://localhost:5000/api/gmail/callback` (for development)
   - Your production callback URL if applicable
7. Click "Create" to generate your client ID and client secret
8. Add these credentials to your `.env` file:

```
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:5000/api/gmail/callback
```

9. Make sure to enable the Gmail API for your project:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it

## Troubleshooting

### SVG Rendering Issues

If you see errors like `Error: <path> attribute d: Expected arc flag ('0' or '1')`, it means there are problems with the SVG paths in your React components. This can happen when SVG paths are minified or have syntax errors. To fix this:

1. Replace the problematic SVG paths with valid ones
2. Use libraries like `heroicons` or `react-icons` which provide reliable SVG components
3. Validate your SVG markup with an SVG validator

### Gmail API Configuration

If you see the error "Missing required environment variables", follow these steps:

1. Make sure your `.env` file exists in the project root
2. Ensure all required variables are defined in the file
3. Restart your server after making changes to the `.env` file
4. Check server logs for additional error information

Remember that you need to have Google Developer credentials to use the Gmail API. If you don't have these yet, follow the Gmail Integration Setup instructions above.
