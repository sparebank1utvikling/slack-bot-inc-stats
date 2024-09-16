FROM node:20-bullseye-slim

# Create app directory
WORKDIR /myapp

# Copy package.json
COPY package.json ./

# Set npm registry to the public registry
RUN npm config set registry https://registry.npmjs.org/

# Install dependencies with verbose logging
RUN npm install --verbose

# Check if dotenv is installed
RUN npm list dotenv

# Debug: Show the contents of package.json
RUN echo "Contents of package.json:" && cat package.json

# Check node_modules content
RUN echo "Contents of node_modules after npm install:" && ls -la /myapp/node_modules

# Check if dotenv is in node_modules
RUN echo "Contents of dotenv after npm install:" && ls -la /myapp/node_modules/dotenv || echo "dotenv not found"

# Copy the application source code
COPY . .

EXPOSE 8080
# Command to run the app
CMD ["npm", "start"]
