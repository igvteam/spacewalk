# URL Shortener Setup Guide

## Overview

This guide explains how to configure the custom TinyURL domain (`t.3dg.io`) with environment variables across different deployment environments.

## Architecture

The URL shortener uses environment variables to securely manage the TinyURL API key across different deployment scenarios:

- **Development**: Local environment variables
- **Netlify**: Netlify environment variables  
- **Client Premises**: Client server environment variables

## Implementation

### 1. Update Vite Configuration

First, modify your `vite.config.mjs` to inject environment variables:

```javascript
// vite.config.mjs
import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    'process.env.TINYURL_API_KEY': JSON.stringify(process.env.TINYURL_API_KEY)
  },
  // ... your existing config
})
```

**Example of complete vite.config.mjs:**
```javascript
// vite.config.mjs
import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    'process.env.TINYURL_API_KEY': JSON.stringify(process.env.TINYURL_API_KEY)
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  }
})
```

### 2. Update Frontend Configuration

Modify `spacewalk-config.js` to use the injected environment variable:

```javascript
// spacewalk-config.js
urlShortener: {
    provider: 'tinyURL',
    apiKey: process.env.TINYURL_API_KEY || 'YOUR_TINYURL_API_KEY',
    domain: 't.3dg.io',
    endpoint: 'https://api.tinyurl.com/create'
}
```

**Example of complete spacewalk-config.js:**
```javascript
// spacewalk-config.js
import genomes from '/src/resources/genomes.json'
import trackRegistry from '/src/resources/tracks/trackRegistry.json'

const spacewalkConfig = {
    trackRegistry,
    igvConfig: {
        genome: 'hg19',
        locus: 'all',
        genomeList: genomes,
        showTrackLabels: true,
        showControls: false,
        showCursorGuide: true,
        queryParametersSupported: false,
        tracks: []
    },
    juiceboxConfig: {
        width: 480,
        height: 480,
        contactMapMenu: {
            id: 'contact-map-datalist',
            items: 'https://aidenlab.org/juicebox/res/hicfiles.json'
        }
    },
    urlShortener: {
        provider: 'tinyURL',
        apiKey: process.env.TINYURL_API_KEY || 'YOUR_TINYURL_API_KEY',
        domain: 't.3dg.io',
        endpoint: 'https://api.tinyurl.com/create'
    }
}

export { spacewalkConfig }
```

### 3. Install Required Dependencies

```bash
npm install dotenv
```

### 4. Update Package.json Scripts

Add environment-aware scripts:

```json
{
  "scripts": {
    "dev": "node -r dotenv/config node_modules/.bin/vite",
    "build": "node -r dotenv/config node_modules/.bin/vite build",
    "preview": "vite preview"
  }
}
```

**Example of complete package.json scripts section:**
```json
{
  "name": "spacewalk",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node -r dotenv/config node_modules/.bin/vite",
    "build": "node -r dotenv/config node_modules/.bin/vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "dotenv": "^16.3.1",
    "igv-utils": "^1.0.0"
  },
  "devDependencies": {
    "vite": "^4.4.5"
  }
}
```

## Deployment Environments

### Development (Your Office)

#### Step 1: Create Environment File
Create a `.env` file in your project root:
```bash
# .env
TINYURL_API_KEY=your_actual_api_key_here
```

**Important:** The `.env` file is automatically ignored by git (see `.gitignore`), so your API key won't be committed to the repository.

**Example .env file:**
```bash
# Environment variables for Spacewalk
TINYURL_API_KEY=your_actual_api_key_here

# Optional: Add other environment variables
NODE_ENV=development
VITE_APP_VERSION=1.0.0
```

#### Step 2: Install Dependencies
```bash
npm install dotenv
```

#### Step 3: Update Vite Config
Modify your `vite.config.mjs`:
```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    __TINYURL_API_KEY__: JSON.stringify(process.env.TINYURL_API_KEY)
  },
  // ... your existing configuration
})
```

#### Step 4: Update Spacewalk Config
Modify `spacewalk-config.js`:
```javascript
urlShortener: {
    provider: 'tinyURL',
    apiKey: `__TINYURL_API_KEY__`, // This gets replaced at build time
    domain: 't.3dg.io',
    endpoint: 'https://api.tinyurl.com/create'
}
```

#### Step 5: Test the Application
```bash
# Start development server with environment variables
npm run dev

# The URL shortener should work immediately in development mode
```

#### Step 6: Build the Application
```bash
# Build with environment variables
npm run build

# Verify the build worked
ls dist/
```

#### Step 7: Test the Build
```bash
# Preview the built application
npm run preview

# Check that the API key was injected (should show your actual key)
grep -r "your_actual_api_key_here" dist/
```

### Netlify Deployment

#### Step 1: Configure Environment Variables
1. In your Netlify dashboard, go to **Site settings** → **Environment variables**
2. Add a new variable:
   - **Key**: `TINYURL_API_KEY`
   - **Value**: `your_actual_api_key_here`

#### Step 2: Update Build Configuration
Create or update your `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
```

**Example of complete netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--version"

[dev]
  command = "npm run dev"
  port = 3000
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Step 3: Deploy
```bash
# Push to your connected repository
git add .
git commit -m "Add environment variable support for URL shortener"
git push

# Netlify will automatically build with the environment variable
```

#### Step 4: Verify Deployment
1. Check the Netlify build logs to ensure the environment variable was loaded
2. Test the URL shortening functionality in the deployed app
3. Verify that shortened URLs use your custom domain `t.3dg.io`

### Client Premises Deployment

#### What You Provide
Send the client a deployment package containing:
```
deployment-package/
├── dist/                    # Pre-built application (for immediate use)
├── src/                     # Source code
├── package.json            # Dependencies
├── vite.config.mjs         # Build configuration
├── .env.example            # Example environment file
├── setup-instructions.md   # This guide
└── build-scripts/          # Optional build scripts
```

**Example deployment package structure:**
```
spacewalk-deployment/
├── dist/
│   ├── index.html
│   ├── assets/
│   │   ├── main.js
│   │   └── main.css
│   └── favicon.ico
├── src/
│   ├── resources/
│   └── js/
├── package.json
├── vite.config.mjs
├── .env.example
├── setup-instructions.md
└── build-scripts/
    ├── build.sh
    └── deploy.sh
```

#### Client Setup Instructions

#### Step 1: Extract and Install
```bash
# Extract the deployment package
unzip spacewalk-deployment.zip
cd spacewalk-deployment

# Install dependencies
npm install
```

#### Step 2: Set Up Environment Variables
Choose one method:

**Method A: Environment File (Recommended)**
```bash
# Create .env file
cp .env.example .env

# Edit .env and add your API key
nano .env
# Add: TINYURL_API_KEY=your_actual_api_key_here
```

**Example .env.example file:**
```bash
# Copy this file to .env and fill in your values
TINYURL_API_KEY=your_tinyurl_api_key_here
NODE_ENV=production
VITE_APP_VERSION=1.0.0
```

**Method B: System Environment Variable**
```bash
# Linux/Mac
export TINYURL_API_KEY=your_actual_api_key_here

# Windows (Command Prompt)
set TINYURL_API_KEY=your_actual_api_key_here

# Windows (PowerShell)
$env:TINYURL_API_KEY="your_actual_api_key_here"
```

#### Step 3: Test the Application
```bash
# Start development server with environment variables
npm run dev

# The URL shortener should work immediately in development mode
```

#### Step 4: Build the Application
```bash
# Build with environment variables
npm run build

# Verify the build
ls dist/
```

#### Step 5: Test the Build
```bash
# Preview the application
npm run preview

# Check that the API key was injected
grep -r "your_actual_api_key_here" dist/
```

#### Step 6: Deploy to Web Server
```bash
# Copy the dist/ folder to your web server directory
cp -r dist/* /var/www/html/

# Or serve directly from the dist/ folder
cd dist/
python -m http.server 8000
```

**Example deployment scripts:**

**build.sh:**
```bash
#!/bin/bash
# Build script for Spacewalk deployment

echo "Building Spacewalk with environment variables..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create .env file with TINYURL_API_KEY"
    exit 1
fi

# Build the application
npm run build:env

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build successful! Files are in dist/ directory"
else
    echo "Build failed!"
    exit 1
fi
```

**deploy.sh:**
```bash
#!/bin/bash
# Deployment script for Spacewalk

echo "Deploying Spacewalk to web server..."

# Build the application
./build.sh

# Copy to web server directory
sudo cp -r dist/* /var/www/html/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

echo "Deployment complete!"
```

#### Step 7: Verify Deployment
1. Open the application in a web browser
2. Test the URL shortening functionality
3. Verify that shortened URLs use your custom domain `t.3dg.io`

## Security Considerations

### API Key Exposure
- The API key is embedded in the built JavaScript files
- Anyone with access to the application can extract the key
- Consider the security implications for your specific use case

### Git Repository Security
- The `.env` file is automatically ignored by git (see `.gitignore`)
- Never commit API keys to your repository
- Use `.env.example` files to document required environment variables

### Mitigation Strategies
1. **Access Control**: Ensure only authorized users can access the application
2. **Usage Monitoring**: Monitor your TinyURL account for unusual activity
3. **Rate Limiting**: Consider implementing rate limiting on your TinyURL account
4. **Regular Rotation**: Periodically rotate your API key

## Troubleshooting

### Common Issues

#### Environment Variable Not Found
```
Error: TINYURL_API_KEY is not defined
```
**Solution**: 
1. Ensure the environment variable is set before building
2. Check that your `.env` file exists and contains the correct key
3. Verify you're using `npm run build:env` instead of `npm run build`

#### Build Fails
```
Error: process.env is not defined
```
**Solution**: 
1. Use the `build:env` script that loads dotenv
2. Ensure dotenv is installed: `npm install dotenv`
3. Check that your `vite.config.mjs` has the correct define configuration

#### API Key Not Working
```
Error: TinyURL API error: 401 Unauthorized
```
**Solution**: 
1. Verify the API key is correct and has proper permissions
2. Check that the key was properly injected into the build
3. Test the API key independently with curl or Postman

#### Build Output Missing API Key
```
# When you run: grep -r "your_actual_api_key_here" dist/
# No results found
```
**Solution**:
1. Check that `process.env.TINYURL_API_KEY` is used in `spacewalk-config.js`
2. Verify the Vite config has the correct define statement: `'process.env.TINYURL_API_KEY': JSON.stringify(process.env.TINYURL_API_KEY)`
3. Ensure the environment variable is set before building

### Debug Steps

#### Step 1: Verify Environment Variable
```bash
# Check if the variable is set
echo $TINYURL_API_KEY

# On Windows
echo %TINYURL_API_KEY%
```

#### Step 2: Check Build Configuration
```bash
# Verify vite.config.mjs has the define statement
grep -n "process.env.TINYURL_API_KEY" vite.config.mjs

# Verify spacewalk-config.js uses the environment variable
grep -n "process.env.TINYURL_API_KEY" spacewalk-config.js
```

#### Step 3: Test the Build Process
```bash
# Build with verbose output
npm run build -- --debug

# Check build output
ls -la dist/

# Look for the API key in the built files
grep -r "your_actual_api_key_here" dist/
```

#### Step 4: Test URL Shortening
1. Open the application in a web browser
2. Open browser developer tools (F12)
3. Go to the Console tab
4. Try to create a shareable link
5. Check for any error messages in the console

#### Step 5: Verify API Key Injection
```bash
# Check the built JavaScript files for your API key
find dist/ -name "*.js" -exec grep -l "your_actual_api_key_here" {} \;
```

### Advanced Debugging

#### Check Vite Build Logs
```bash
# Build with detailed logging
npm run build -- --logLevel info
```

#### Test Environment Variable Loading
```bash
# Test if dotenv is working
node -r dotenv/config -e "console.log(process.env.TINYURL_API_KEY)"
```

#### Verify TinyURL API Key
```bash
# Test the API key directly
curl -X POST "https://api.tinyurl.com/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACTUAL_API_KEY" \
  -d '{"url": "https://example.com", "domain": "t.3dg.io"}'
```

**Expected successful response:**
```json
{
  "data": {
    "domain": "t.3dg.io",
    "alias": "abc123",
    "tiny_url": "https://t.3dg.io/abc123",
    "url": "https://example.com"
  },
  "code": 0,
  "errors": []
}
```

**Example error responses:**
```json
// Invalid API key
{
  "code": 1,
  "errors": ["Invalid API key"],
  "data": null
}

// Invalid domain
{
  "code": 1,
  "errors": ["Domain not found"],
  "data": null
}
```

## Alternative Approaches

If the environment variable approach doesn't meet your security requirements, consider:

1. **Runtime Configuration**: Use `window.SPACEWALK_CONFIG` for client-side configuration
2. **Backend Proxy**: Create a server-side API that handles URL shortening
3. **Serverless Functions**: Use Netlify Functions or similar for server-side processing

## Support

For issues with this setup:
1. Check the browser console for error messages
2. Verify environment variables are properly set
3. Test the TinyURL API key independently
4. Review the TinyURL API documentation for any changes

---

**Note**: This setup balances security with deployment simplicity. For maximum security, consider implementing a backend proxy solution.
