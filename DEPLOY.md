# Deploy to Vercel (Hobby)

1. Push this repository to GitHub.
2. Sign in to Vercel, choose **Add New… → Project**, and import the GitHub repository. Authorize access to the repository if prompted.
3. Keep the detected framework as **Next.js**. The project root is the repository root; the default install and build settings are sufficient.
4. No environment variables are required. Choose **Deploy**.

Vercel creates a production deployment for the configured production branch (normally `main`). New commits to that branch trigger production redeployments. Pull requests and other branches receive Preview deployments with their own URLs; subsequent commits update those previews.

The repository declares Node.js `22.x` in `package.json`. To change the deployment Node version in Vercel, open the project **Settings → Build and Deployment → Node.js Version**, select the desired version, and redeploy.
