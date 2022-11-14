FROM node:lts as dependencies
WORKDIR /flamingo_liquidator
COPY package.json package-lock.json ./
RUN npm install

FROM node:lts as builder
WORKDIR /flamingo_liquidator
COPY . .
COPY --from=dependencies /flamingo_liquidator/node_modules ./node_modules
RUN npm run build

FROM node:lts as runner
WORKDIR /flamingo_liquidator
COPY --from=builder /flamingo_liquidator/node_modules ./node_modules
COPY --from=builder /flamingo_liquidator/package.json ./package.json
COPY --from=builder /flamingo_liquidator/dist ./dist
COPY --from=builder /flamingo_liquidator/config ./config

CMD ["npm", "run", "liquidator"]
