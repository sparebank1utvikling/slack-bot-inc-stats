# Stage 1: Build the app
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Define build arguments
ARG DATABASE_URL

# Use build arguments as environment variables during build
ENV DATABASE_URL=$DATABASE_URL

# Install app dependencies
COPY package*.json ./
RUN npm install --include=dev

# Copy the rest of the application code
COPY . .

# Build the app (if needed)
# RUN npm run build

# Stage 2: Create the production image
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy necessary files from the build stage
COPY --from=build /app .

# Set runtime environment variables
# Set DATABASE_URL for runtime
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production

# Expose the port on which the app will run
EXPOSE 3001

# Command to run the app
CMD ["node", "server.js"]
