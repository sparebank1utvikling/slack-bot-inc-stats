# Use Node.js base image
FROM node:20-bullseye-slim as base

# Define environment variables
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production

# Setup production node_modules
FROM base as production-deps
# Set working directory
WORKDIR /myapp

COPY package.json package-lock.json ./
RUN rm -rf /myapp/node_modules && npm install

# Debug: List node_modules
RUN ls -la /myapp/node_modules && ls -la /myapp/node_modules/@slack/bolt

from base 

WORKDIR /myapp

# Copy the rest of the application code without overwriting node_modules
COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY app/ ./app/
COPY package.json package-lock.json ./

# Set runtime environment variables
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production

EXPOSE 80

# Command to run the app
CMD ["npm", "start"]