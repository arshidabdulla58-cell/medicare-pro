# Portfolio deployment: Render and MongoDB Atlas

This deployment serves the compiled React website, Express API and Socket.IO from one Render web service. MongoDB Atlas provides the replica set required for appointment transactions. No local database files are uploaded. Use synthetic patient data only.

## 1. Create accounts and repository

Create or sign into GitHub, Render and MongoDB Atlas yourself. Keep passwords, recovery codes and API keys out of chat. Create an empty private GitHub repository named `medicare-pro`. From this project folder, initialize Git, review the files being staged, commit and push to that repository. Do not upload `.env`, `node_modules`, `server/.local-mongodb`, uploads or logs. Existing `.gitignore` excludes those paths.

## 2. Set up Atlas

Create a cluster that supports transactions. Create a dedicated database user with read/write access to the `medicare_pro` database. Obtain its application connection URI and include `/medicare_pro` before the query string. URL-encode special characters in the database password. Store this URI only in Render's MONGODB_URI environment setting.

Use Atlas Network Access to allow the outbound IP ranges displayed for your Render service. Keep the local development database separate.

## 3. Create the Render service

Connect your GitHub repository to Render and use the root `render.yaml` Blueprint. Review the selected plan before creating the service. Alternatively create a Node web service with repository root as root directory, build command `npm ci --include=dev && npm run build`, start command `node server/dist/server.js`, and health check `/api/v1/health/ready`.

Set NODE_ENV=production, NODE_VERSION=24, COOKIE_SAME_SITE=lax, and HOSPITAL_ID=65f0c0c2e5b1d229b984a101. Supply MONGODB_URI privately. The Blueprint generates JWT_ACCESS_SECRET; for manual setup use a cryptographically random secret at least 32 characters long.

Set CLIENT_ORIGIN to the exact public HTTPS service URL (no trailing slash). If Render has not assigned the URL yet, update this setting immediately after creation and redeploy before testing sign-in. Do not use localhost. PORT is provided by Render. The start command deliberately reads environment settings from Render, without requiring a committed `.env` file.

## 4. Verify the deployment

Wait for the readiness check to succeed. Verify `/`, `/login`, and direct reload of `/my-appointments`. Register a synthetic patient, sign in, reload to exercise refresh cookies, then sign out. Verify appointment booking and notification delivery with separate staff and patient sessions. Configure an administrator using the project's bootstrap script in a secure environment connected to the deployed database; never add a public administrator registration route. Configure SMTP_URL and EMAIL_FROM together for password-reset delivery.

The application is not deployed merely by adding these files. A successful cloud deployment, database connectivity and browser checks are required before sharing a live demo link. File uploads, unfinished clinical workflows and scheduled reminders are not made available by this configuration.

## Hosting notes

This production configuration trusts one reverse proxy, as expected for the Render service. Revisit that setting if the proxy topology changes. To move the frontend to Vercel later, configure API/socket origins and authentication cookie routing explicitly; the current deployment intentionally uses one origin.

References: https://render.com/docs/deploy-node-express-app and https://render.com/docs/blueprint-spec
