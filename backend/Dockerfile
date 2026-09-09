FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Lockfile-exact, production-only install. The previous `npm install` ignored
# the committed lockfile and pulled devDependencies into the image.
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev && npm cache clean --force

# The image mirrors the repo layout so database/migrate.js resolves
# ../backend/src/config/database exactly as it does on a developer machine.
COPY backend ./backend
COPY database ./database

WORKDIR /app/backend
USER node
EXPOSE 3001

# `npm start` -> node server.js. The image used to run nodemon, a devDependency.
CMD ["npm", "start"]
