FROM node
RUN which ffmpeg || apt-get update && apt-get install -y ffmpeg
WORKDIR /app/
COPY package.json package-lock.json /app/
RUN npm install
COPY src /app/src/
CMD ["node", "src/index.js"]
