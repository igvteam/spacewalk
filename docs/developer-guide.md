---
layout: default
title: Developer Guide
nav_order: 3
---

# Developer Guide

This guide is for developers who want to run their own instance of Spacewalk or contribute to the project.

## Developer Installation

### Prerequisites
- Node.js >= v20.8.0
- npm >= v10.1.0
- Modern web browser with ECMAScript 2015 support

### Installation Steps

```bash
# Clone the repository
git clone https://github.com/igvteam/spacewalk.git

# Navigate to project directory
cd spacewalk

# Install dependencies
npm install

# Build the application
npm run build

# Start the server
npm run start
```

Visit `localhost:8080/index.html` in your browser to launch your local instance of the application.
