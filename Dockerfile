FROM node
RUN which ffmpeg || apt-get update && apt-get install -y ffmpeg
RUN apt-get update && apt-get install -y nginx supervisor
WORKDIR /app/
COPY package.json package-lock.json /app/
RUN npm install
COPY src /app/src/
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisord.conf
# Create user for nginx
RUN useradd -r -s /bin/false nginx
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
# CMD ["nginx",   
# nginx will run in the foreground, logs will be printed to stdout
