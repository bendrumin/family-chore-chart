# Use nginx as base image for serving static files
FROM nginx:alpine

# Copy the frontend files to nginx's default serving directory
COPY ../../frontend /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 