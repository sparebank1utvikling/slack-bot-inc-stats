# Stage 1: Build the app
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Install app dependencies
# Copy package.json and package-lock.json files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of the application code
COPY /app .

COPY .env .

# Build the app (if your app has a build step, e.g., using Webpack, etc.)
# RUN npm run build

# Stage 2: Create the production image
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app .

# Set environment variables
ENV NODE_ENV=production

# Expose the port on which the app will run
EXPOSE 3001

# Command to run the app
CMD ["node", "server.js"]