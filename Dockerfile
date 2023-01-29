FROM node:lts

RUN apt-get update
RUN apt-get install -y build-essential mecab libmecab-dev mecab-ipadic-utf8 sudo git make curl xz-utils file fonts-noto

WORKDIR /mecab-ipadic-neologd
RUN git clone --depth 1 https://github.com/neologd/mecab-ipadic-neologd.git
RUN cd mecab-ipadic-neologd && ./bin/install-mecab-ipadic-neologd -n -y -a

WORKDIR /nullcatchan
COPY . ./
RUN npm install
RUN npm build

CMD ["npm", "start"]
