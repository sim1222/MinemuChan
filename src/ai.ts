// AI CORE

import * as fs from 'fs';
import autobind from 'autobind-decorator';
import loki from 'lokijs';
import chalk from 'chalk';
import { v4 as uuid } from 'uuid';
import delay from 'timeout-as-promise';

import config from '@/config';
import Module from '@/module';
import Message from '@/message';
import Friend, { FriendDoc } from '@/friend';
import { User } from '@/misskey/user';
import Stream from '@/stream';
import log from '@/utils/log';
const pkg = require('../package.json');

type MentionHook = (msg: Message) => Promise<boolean | HandlerResult>;
type ContextHook = (key: any, msg: Message, data?: any) => Promise<void | boolean | HandlerResult>;
type TimeoutCallback = (data?: any) => void;

export type HandlerResult = {
	reaction?: string | null;
	immediate?: boolean;
};

export type InstallerResult = {
	mentionHook?: MentionHook;
	contextHook?: ContextHook;
	timeoutCallback?: TimeoutCallback;
};

export type Meta = {
	lastWakingAt: number;
};

/**
 * 藍
 */
export default class 藍 {
	public readonly version = pkg._v;
	public account: User;
	public connection: Stream;
	public modules: Module[] = [];
	private mentionHooks: MentionHook[] = [];
	private contextHooks: { [moduleName: string]: ContextHook } = {};
	private timeoutCallbacks: { [moduleName: string]: TimeoutCallback } = {};
	public db: loki;
	public lastSleepedAt: number;

	private meta: loki.Collection<Meta>;

	private contexts: loki.Collection<{
		isDm: boolean;
		noteId?: string;
		userId?: string;
		module: string;
		key: string | null;
		data?: any;
	}>;

	private timers: loki.Collection<{
		id: string;
		module: string;
		insertedAt: number;
		delay: number;
		data?: any;
	}>;

	public friends: loki.Collection<FriendDoc>;
	public moduleData: loki.Collection<any>;

	/**
	 * 藍インスタンスを生成します
	 * @param account 藍として使うアカウント
	 * @param modules モジュール。先頭のモジュールほど高優先度
	 */
	constructor(account: User, modules: Module[]) {
		this.account = account;
		this.modules = modules;

		let memoryDir = '.';
		if (config.memoryDir) {
			memoryDir = config.memoryDir;
		}
		const file = process.env.NODE_ENV === 'test' ? `${memoryDir}/test.memory.json` : `${memoryDir}/memory.json`;

		this.log(`Lodaing the memory from ${file}...`);

		this.db = new loki(file, {
			autoload: true,
			autosave: true,
			autosaveInterval: 1000,
			autoloadCallback: err => {
				if (err) {
					this.log(chalk.red(`Failed to load the memory: ${err}`));
				} else {
					this.log(chalk.green('The memory loaded successfully'));
					this.run();
				}
			}
		});
	}

	@autobind
	public log(msg: string) {
		log(chalk`[{magenta Core}]: ${msg}`);
	}

	@autobind
	private run() {
		//#region Init DB
		this.meta = this.getCollection('meta', {});

		this.contexts = this.getCollection('contexts', {
			indices: ['key']
		});

		this.timers = this.getCollection('timers', {
			indices: ['module']
		});

		this.friends = this.getCollection('friends', {
			indices: ['userId']
		});

		this.moduleData = this.getCollection('moduleData', {
			indices: ['module']
		});
		//#endregion

		const meta = this.getMeta();
		this.lastSleepedAt = meta.lastWakingAt;

		// Init stream
		this.connection = new Stream();

		//#region Main stream
		const mainStream = this.connection.useSharedConnection('main');

		// メンションされたとき
		mainStream.on('mention', async data => {
			if (data.userId == this.account.id) return; // 自分は弾く
			if (data.text && data.text.startsWith('@' + this.account.username)) {
				// Misskeyのバグで投稿が非公開扱いになる
				if (data.text == null) data = await this.api('notes/show', { noteId: data.id });
				this.onReceiveMessage(new Message(this, data, false));
			}
		});

		// 返信されたとき
		mainStream.on('reply', async data => {
			if (data.userId == this.account.id) return; // 自分は弾く
			if (data.text && data.text.startsWith('@' + this.account.username)) return;
			// Misskeyのバグで投稿が非公開扱いになる
			if (data.text == null) data = await this.api('notes/show', { noteId: data.id });
			this.onReceiveMessage(new Message(this, data, false));
		});

		// Renoteされたとき
		mainStream.on('renote', async data => {
			if (data.userId == this.account.id) return; // 自分は弾く
			if (data.text == null && (data.files || []).length == 0) return;

			// リアクションする
			this.api('notes/reactions/create', {
				noteId: data.id,
				reaction: '💙'
			});
		});

		// メッセージ
		mainStream.on('messagingMessage', data => {
			if (data.userId == this.account.id) return; // 自分は弾く
			this.onReceiveMessage(new Message(this, data, true));
		});

		// 通知
		mainStream.on('notification', data => {
			this.onNotification(data);
		});
		//#endregion

		// Install modules
		this.modules.forEach(m => {
			this.log(`Installing ${chalk.cyan.italic(m.name)}\tmodule...`);
			m.init(this);
			const res = m.install();
			if (res != null) {
				if (res.mentionHook) this.mentionHooks.push(res.mentionHook);
				if (res.contextHook) this.contextHooks[m.name] = res.contextHook;
				if (res.timeoutCallback) this.timeoutCallbacks[m.name] = res.timeoutCallback;
			}
		});

		// タイマー監視
		this.crawleTimer();
		setInterval(this.crawleTimer, 1000);

		setInterval(this.logWaking, 10000);

		this.log(chalk.green.bold('Nullcat chan is now running!'));
		this.log(`Mode: ${process.env.NODE_ENV}`);
	}

	/**
	 * ユーザーから話しかけられたとき
	 * (メンション、リプライ、トークのメッセージ)
	 */
	@autobind
	private async onReceiveMessage(msg: Message): Promise<void> {
		this.log(chalk.gray(`<<< An message received: ${chalk.underline(msg.id)}`));

		// Ignore message if the user is a bot
		// To avoid infinity reply loop.
		if (msg.user.isBot) {
			return;
		}

		const isNoContext = !msg.isDm && msg.replyId == null;

		// Look up the context
		const context = isNoContext
			? null
			: this.contexts.findOne(
					msg.isDm
						? {
								isDm: true,
								userId: msg.userId
						  }
						: {
								isDm: false,
								noteId: msg.replyId
						  }
			  );

		let reaction: string | null = '💙' ;
		let immediate: boolean = false;

		//#region
		const invokeMentionHooks = async () => {
			let res: boolean | HandlerResult | null = null;

			for (const handler of this.mentionHooks) {
				res = await handler(msg);
				if (res === true || typeof res === 'object') break;
			}

			if (res != null && typeof res === 'object') {
				if (res.reaction != null) reaction = res.reaction;
				if (res.immediate != null) immediate = res.immediate;
			}
		};

		// コンテキストがあればコンテキストフック呼び出し
		// なければそれぞれのモジュールについてフックが引っかかるまで呼び出し
		if (context != null) {
			const handler = this.contextHooks[context.module];
			const res = await handler(context.key, msg, context.data);

			if (res != null && typeof res === 'object') {
				if (res.reaction != null) reaction = res.reaction;
				if (res.immediate != null) immediate = res.immediate;
			}

			if (res === false) {
				await invokeMentionHooks();
			}
		} else {
			await invokeMentionHooks();
		}
		//#endregion

		if (!immediate) {
			await delay(1000);
		}

		if (msg.isDm) {
			// 既読にする
			this.api('messaging/messages/read', {
				messageId: msg.id
			});
		} else {
			// リアクションする
			if (reaction) {
				this.api('notes/reactions/create', {
					noteId: msg.id,
					reaction: reaction
				});
			}
		}
	}

	@autobind
	private onNotification(notification: any) {
		switch (notification.type) {
			// リアクションされたら親愛度を少し上げる
			// TODO: リアクション取り消しをよしなにハンドリングする
			case 'reaction': {
				const friend = new Friend(this, { user: notification.user });
				friend.incLove(0.1);
				break;
			}

			default:
				break;
		}
	}

	@autobind
	private crawleTimer() {
		const timers = this.timers.find();
		for (const timer of timers) {
			// タイマーが時間切れかどうか
			if (Date.now() - (timer.insertedAt + timer.delay) >= 0) {
				this.log(`Timer expired: ${timer.module} ${timer.id}`);
				this.timers.remove(timer);
				this.timeoutCallbacks[timer.module](timer.data);
			}
		}
	}

	@autobind
	private logWaking() {
		this.setMeta({
			lastWakingAt: Date.now()
		});
	}

	/**
	 * データベースのコレクションを取得します
	 */
	@autobind
	public getCollection(name: string, opts?: any): loki.Collection {
		let collection: loki.Collection;

		collection = this.db.getCollection(name);

		if (collection == null) {
			collection = this.db.addCollection(name, opts);
		}

		return collection;
	}

	@autobind
	public lookupFriend(userId: User['id']): Friend | null {
		const doc = this.friends.findOne({
			userId: userId
		});

		if (doc == null) return null;

		const friend = new Friend(this, { doc: doc });

		return friend;
	}

	/**
	 * ファイルをドライブにアップロードします
	 */
	@autobind
	public async upload(file: Buffer | fs.ReadStream, meta: any) {
		const res = await fetch(`${config.apiUrl}/drive/files/create`, {
			method: "POST",
			body: JSON.stringify({
				i: config.i,
				file: {
					value: file,
					options: meta
				}
			}),
			headers: {
				"Content-Type": "application/json",
			}
		});
		return res;
	}

	/**
	 * 投稿します
	 */
	@autobind
	public async post(param: any) {
		if (process.env.NODE_ENV === 'production') {
			const res = await this.api('notes/create', param);
			return res.createdNote;
		} else {
			log(chalk`[{magenta Debug:Post}]: ${JSON.stringify(param)}`);
			return null;
		}
	}

	/**
	 * 指定ユーザーにトークメッセージを送信します
	 */
	@autobind
	public sendMessage(userId: any, param: any) {
		if (process.env.NODE_ENV === 'production') {
			return this.api(
				'messaging/messages/create',
				Object.assign(
					{
						userId: userId
					},
					param
				)
			);
		} else {
			log(chalk`[{magenta Debug:SendMessage}]: userId: ${userId}`);
			log(chalk`[{magenta Debug:SendMessage}]: param: ${JSON.stringify(param)}`);
			return null;
		}
	}

	/**
	 * APIを呼び出します
	 */
	@autobind
	public api(endpoint: string, param?: any) {
		return fetch(`${config.apiUrl}/${endpoint}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				...{ i: config.i }, ...param
			}),
		}).then(res => {
			if(res.status != 204)
				return res.json();

			return new Promise((resolve, reject) => {
				resolve(JSON.parse("{}"));
			})
		});
	}

	/**
	 * コンテキストを生成し、ユーザーからの返信を待ち受けます
	 * @param module 待ち受けるモジュール名
	 * @param key コンテキストを識別するためのキー
	 * @param isDm トークメッセージ上のコンテキストかどうか
	 * @param id トークメッセージ上のコンテキストならばトーク相手のID、そうでないなら待ち受ける投稿のID
	 * @param data コンテキストに保存するオプションのデータ
	 */
	@autobind
	public subscribeReply(module: Module, key: string | null, isDm: boolean, id: string, data?: any) {
		this.contexts.insertOne(
			isDm
				? {
						isDm: true,
						userId: id,
						module: module.name,
						key: key,
						data: data
				  }
				: {
						isDm: false,
						noteId: id,
						module: module.name,
						key: key,
						data: data
				  }
		);
	}

	/**
	 * 返信の待ち受けを解除します
	 * @param module 解除するモジュール名
	 * @param key コンテキストを識別するためのキー
	 */
	@autobind
	public unsubscribeReply(module: Module, key: string | null) {
		this.contexts.findAndRemove({
			key: key,
			module: module.name
		});
	}

	/**
	 * 指定したミリ秒経過後に、そのモジュールのタイムアウトコールバックを呼び出します。
	 * このタイマーは記憶に永続化されるので、途中でプロセスを再起動しても有効です。
	 * @param module モジュール名
	 * @param delay ミリ秒
	 * @param data オプションのデータ
	 */
	@autobind
	public setTimeoutWithPersistence(module: Module, delay: number, data?: any) {
		const id = uuid();
		this.timers.insertOne({
			id: id,
			module: module.name,
			insertedAt: Date.now(),
			delay: delay,
			data: data
		});

		this.log(`Timer persisted: ${module.name} ${id} ${delay}ms`);
	}

	@autobind
	public getMeta() {
		const rec = this.meta.findOne();

		if (rec) {
			return rec;
		} else {
			const initial: Meta = {
				lastWakingAt: Date.now()
			};

			this.meta.insertOne(initial);
			return initial;
		}
	}

	@autobind
	public setMeta(meta: Partial<Meta>) {
		const rec = this.getMeta();

		for (const [k, v] of Object.entries(meta)) {
			rec[k] = v;
		}

		this.meta.update(rec);
	}
}
