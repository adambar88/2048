# 2048 React

A simple 2048 game built with React, Vite, and TypeScript.

## How to Play

Use your **arrow keys** to move the tiles. When two tiles with the same number touch, they **merge into one!**

## Deployment to Coolify

This project is configured to be served from `https://apps.barczynski.dev/2048/`.

### Step-by-Step Coolify Configuration

1. **Push to GitHub**: Push this code to your GitHub repository.
2. **Create New Resource**:
   - Open your Coolify panel at `https://panel.barczynski.dev`.
   - Go to your Project (or create a new one).
   - Click **+ New Resource** and select **Public/Private Repository (GitHub)**.
3. **Select Repository**: Select the repository where you pushed the code.
4. **Build Pack**: Coolify should automatically detect the **Dockerfile**. If not, manually select "Dockerfile" as the Build Pack.
5. **Configure Domain**:
   - In the **Domains** field, enter: `https://apps.barczynski.dev`.
   - Since we want it at the `/2048` path, Coolify/Traefik needs to know how to route it. 
   - Under **General Settings** -> **Domains**, set it exactly to: `https://apps.barczynski.dev`.
   - **Crucial**: Because the `Dockerfile` and Vite are already configured for the `/2048/` path, you just need to make sure Traefik routes traffic to this container. 
   - In Coolify, under the **Service** or **Resource** settings, look for the **Labels** or **Advanced** section where Traefik rules are defined. 
   - Usually, for a subpath, you set the Domain to `https://apps.barczynski.dev` and the container will handle the `/2048` path because Nginx is listening for it.
6. **Port Mapping**: Ensure the internal port is set to `80` (which is what Nginx uses in the Dockerfile).
7. **Deploy**: Click **Deploy**.

### Technical Detail on Subpath Routing
The app is built with a base path of `/2048/`. The Docker container serves files from `/usr/share/nginx/html/2048`. This means:
- A request to `https://apps.barczynski.dev/2048/` will be sent to the container.
- Nginx inside the container will see the path `/2048/` and serve `/usr/share/nginx/html/2048/index.html`.
- All assets will be requested from `https://apps.barczynski.dev/2048/assets/...`, which Nginx will also serve correctly.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
