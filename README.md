## これってなに？

Misskey用の[Aiベース](https://github.com/syuilo/ai)のBotです。

 ```
     _   __      ____           __  ________                __
    / | / /_  __/ / /________ _/ /_/ ____/ /_  ____ _____  / /
   /  |/ / / / / / / ___/ __ `/ __/ /   / __ \/ __ `/ __ \/ /
  / /|  / /_/ / / / /__/ /_/ / /_/ /___/ / / / /_/ / / / /_/
/_/ |_/\__,_/_/_/\___/\__,_/\__/\____/_/ /_/\__,_/_/ /_(_)
```

## 大きな変更点

- 自動投稿の内容
- 自動返信の内容
- ゴママヨに反応
- ゲーム機能と絵文字を自動生成するやつがない
- GitHubのStatusがわかる
- CloudflareのStatusがわかる
- やることを決めてくれる
- 気圧の状況を教えてくれる
- 時報機能
- シェル芸機能
- 怪レい曰本语に変換してくれる機能
- アニメ予想機能

## 導入方法

### Dockerを使わずに動かす

#### 必要要件

- [Node.js](https://nodejs.org/) v18
- [pnpm](https://pnpm.io/) v7
- [MeCab](https://taku910.github.io/mecab/)

#### インストール

まず適当なディレクトリにこのリポジトリをクローンします。

次にそのディレクトリに`config.json`を作成します。中身は次のようにします。

``` json
{
	"host": "https:// + あなたのインスタンスのURL (末尾の / は除く)",
	"i": "ぬるきゃっとちゃん！として動かしたいアカウントのアクセストークン",
	"master": "管理者のユーザー名(オプション)",
	"notingEnabled": "ランダムにノートを投稿する機能。true(on) or false(off)",
	"keywordEnabled": "キーワードを覚える機能 (MeCab が必要) true or false",
	"serverMonitoring": "サーバー監視の機能(重かったりすると教えてくれるよ。)true or false",
	"mecab": "MeCab のインストールパス (ソースからインストールした場合、大体は /usr/local/bin/mecab) ",
	"mecabDic": "MeCab の辞書ファイルパス(オプション)",
	"memoryDir": "memory.jsonの保存先(オプション、デフォルトは'.'(レポジトリのルートです))",
	"shellgeiUrl": "シェル芸BotのAPIのURLです(オプション、デフォルトはhttps://websh.jiro4989.com/api/shellgei)"
	"gomamayo": "ゴママヨの意味をを表す絵文字を入れる(デフォルトだと:gomamayo:)",
 	"antenna": "アンテナを受信したの意味をを表す絵文字を入れる(デフォルトだと:bibibi_nullcatchan:)",
	"nadenade": "なでるの意味をを表す絵文字を入れる(デフォルトだと:ablobcatfloofpat:)",
  	"erai": "えらいの意味をを表す絵文字を入れる(デフォルトだと:erait:)",
  	"unko": "あなた今うんこって言いましたねの意味をを表す絵文字を入れる(デフォルトだと:anataima_unkotte_iimashitane:)",
  	"ti": "ちの意味をを表す絵文字を入れる(デフォルトだと:_ti:)"
}
```
`pnpm fetch`して`pnpm build`して`pnpm start`すれば起動できます。

### Dockerで動かす

#### 必要要件

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/) v2

#### インストール

まず適当なディレクトリにこのリポジトリをクローンします。

次にそのディレクトリに`config.json`を作成します。中身は次のようにします。
（MeCabの設定、memoryDirについては触らないでください）

``` json
{
	"host": "https:// + あなたのインスタンスのURL (末尾の / は除く)",
	"i": "ぬるきゃっとちゃん！として動かしたいアカウントのアクセストークン",
	"master": "管理者のユーザー名(オプション)",
	"notingEnabled": "ランダムにノートを投稿する機能。true(on) or false(off)",
	"keywordEnabled": "キーワードを覚える機能 (MeCab が必要) true or false",
	"mecab": "/usr/bin/mecab",
	"mecabDic": "/min",
	"memoryDir": "data",
	"shellgeiUrl": "シェル芸BotのAPIのURLです(オプション、デフォルトではhttps://websh.jiro4989.com/api/shellgei)",
	"gomamayo": "ゴママヨの意味をを表す絵文字を入れる(デフォルトだと:gomamayo:)",
 	"antenna": "アンテナを受信したの意味をを表す絵文字を入れる(デフォルトだと:bibibi_nullcatchan:)",
	"nadenade": "なでるの意味をを表す絵文字を入れる(デフォルトだと:ablobcatfloofpat:)",
  	"erai": "えらいの意味をを表す絵文字を入れる(デフォルトだと:erait:)",
  	"unko": "あなた今うんこって言いましたねの意味をを表す絵文字を入れる(デフォルトだと:anataima_unkotte_iimashitane:)",
  	"ti": "ちの意味をを表す絵文字を入れる(デフォルトだと:_ti:)"
}
```

`docker compose up -d`すれば起動できます。

#### 一部の機能にはフォントが必要です。NullcatChan!にはフォントは同梱されていないので、ご自身でフォントをインストールしてそのフォントを`font.ttf`という名前でインストールディレクトリに設置してください。
#### NullcatChan!は記憶の保持にインメモリデータベースを使用しており、nullcatchanのインストールディレクトリに `memory.json` という名前で永続化されます。
