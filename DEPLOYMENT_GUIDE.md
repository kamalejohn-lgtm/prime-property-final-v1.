# PrimeProperty Partners - Deployment Guide (Render.com)

This guide explains how to deploy the **PrimeProperty Portal** to its own unique URL on Render.com without affecting your other projects.

---

## Step 1: Create a Separate GitHub Repository
To avoid overwriting your "ecomig-portal", you **must** use a new repository.
1. Log in to [GitHub](https://github.com).
2. Click the **+** icon in the top right and select **New repository**.
3. Name it: `prime-property-portal` (or any name you prefer).
4. Set it to **Public** or **Private** and click **Create repository**.

## Step 2: Export from AI Studio to the NEW Repo
1. In the Google AI Studio editor, click the **Settings (Gear Icon)** in the top right.
2. Select **Export to GitHub**.
3. Authenticate and select your **new** repository (`prime-property-portal`).
4. Push the code.

## Step 3: Create a New Static Site on Render
1. Log in to your existing [Render.com](https://render.com) account.
2. Click the blue **New +** button and select **Static Site**.
3. Connect the **new** `prime-property-portal` repository you just created.
4. Use these exact settings:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
5. Click **Create Static Site**.

## Step 4: Configure Firebase (Admin Dashboard)
For the Admin Dashboard (`/admin`) to work properly on Render, you need to add your Firebase configuration:
1. In the Render Dashboard for your new project, go to the **Environment** tab.
2. Under "Secret Files", create a file named `.env`.
3. Copy and paste the following values (these are specific to your PrimeProperty project):

```env
VITE_FIREBASE_API_KEY=AIzaSyBDWLova95unO8oHfiPBKIFe-3YN_CHwyA
VITE_FIREBASE_AUTH_DOMAIN=gen-lang-client-0098760129.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0098760129
VITE_FIREBASE_STORAGE_BUCKET=gen-lang-client-0098760129.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=760161693987
VITE_FIREBASE_APP_ID=1:760161693987:web:ce47803b84556d530c9c96
```
4. Click **Save Changes**.

## Step 5: Customize Your URL
1. In the Render Dashboard, go to the **Settings** tab.
2. Look for **Custom Domains** or the **Subdomain** setting.
3. Edit the subdomain to: `primerperty` (so your URL becomes `primerperty.onrender.com`).

---

## Important Recovery Note
If your `ecomig-portal.onrender.com` is currently showing the PrimeProperty site, do the following:
1. Go to the GitHub repository for `ecomig-portal`.
2. Revert the last commit to bring back the original ecomig files.
3. Render will detect the revert and automatically restore your old site.
