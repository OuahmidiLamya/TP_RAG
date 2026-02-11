FROM node:24-bookworm-slim

# Create a non-root user for security
RUN groupadd -g 1001 nodejs &&     useradd -m -u 1001 -g nodejs nodeuser

WORKDIR /app

# Install nodemon globally before switching users
RUN npm install -g nodemon

# Copy dependency files first
COPY package*.json ./

# Install dependencies (including dev)
RUN npm install --include=dev && npm cache clean --force

# Copy source code
COPY . .

# Fix ownership
RUN chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

EXPOSE 3000

CMD ["npm", "run", "dev"]
