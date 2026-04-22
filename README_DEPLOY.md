# Deploying to Render

This project is configured for a **Static Site** deployment on Render.

## Prerequisites
1.  **GitHub Account**: Ensure your code is pushed to a GitHub repository.
2.  **Render Account**: Sign up at [render.com](https://render.com).

## Deployment Steps

### 1. Connect to GitHub
In your Render Dashboard:
-   Click **New +** and select **Static Site**.
-   Connect your GitHub account and select this repository.

### 2. Configure Settings
Render should automatically detect the settings from `render.yaml`, but if not, use these:
-   **Name**: `ecomig-portal` (or your choice)
-   **Build Command**: `npm install && npm run build`
-   **Publish Directory**: `dist`

### 3. Set Environment Variables
Go to the **Environment** tab in your Render service and add these:
-   `GEMINI_API_KEY`: Your Google AI (Gemini) API key.
-   `APP_URL`: Your live site URL (e.g., `https://ecomig-portal.onrender.com`).

### 4. SPA Routing
The `render.yaml` already includes a rewrite rule for Single Page Application (SPA) routing. If you configure it manually, ensure you add a **Rewrite Rule**:
-   **Source**: `/*`
-   **Destination**: `/index.html`
-   **Action**: `Rewrite`

## Troubleshooting
-   **Images not showing**: Ensure all images are in the `public/` directory and referenced with a leading slash (e.g., `src="/staff.jpg.png"`).
-   **Build fails**: Check the Render build logs. Ensure `node_modules` is NOT in your GitHub repo (it should be in `.gitignore`).
