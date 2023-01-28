// Nullcat chan! bootstrapper

import * as chalk from "chalk"
import "module-alias/register"
import * as request from "request-promise-native"
import config from "./config"
import BirthdayModule from "../../NullcatChan/src/modules/birthday"
import CoreModule from "../../NullcatChan/src/modules/core"
import EmojiReactModule from "../../NullcatChan/src/modules/emoji-react"
import FeelingModule from "../../NullcatChan/src/modules/feeling"
import FollowModule from "../../NullcatChan/src/modules/follow"
import FortuneModule from "../../NullcatChan/src/modules/fortune"
import GitHubStatusModule from "../../NullcatChan/src/modules/github-status"
import CloudflareStatus from "../../NullcatChan/src/modules/cloudflare-status";
import GomamayoModule from "../../NullcatChan/src/modules/gomamayo"
import JihouModule from "../../NullcatChan/src/modules/jihou"
import KeywordModule from "../../NullcatChan/src/modules/keyword"
import KiatsuModule from "../../NullcatChan/src/modules/kiatsu"
import NotingModule from "../../NullcatChan/src/modules/noting"
import PingModule from "../../NullcatChan/src/modules/ping"
import ReminderModule from "../../NullcatChan/src/modules/reminder"
import ServerModule from "../../NullcatChan/src/modules/server"
import SleepReportModule from "../../NullcatChan/src/modules/sleep-report"
import TalkModule from "../../NullcatChan/src/modules/talk"
import TimerModule from "../../NullcatChan/src/modules/timer"
import TraceMoeModule from "../../NullcatChan/src/modules/trace-moe"
import ValentineModule from "../../NullcatChan/src/modules/valentine"
import WhatModule from "../../NullcatChan/src/modules/what"
import YarukotoModule from "../../NullcatChan/src/modules/yarukoto"
import NullcatChan from "../../NullcatChan/src/nullcat-chan"
import _log from "../../NullcatChan/src/utils/log"
import ShellGeiModule from "../../NullcatChan/src/modules/shellgei"
import SversionModule from "../../NullcatChan/src/modules/version"
import AyashiiModule from "../../NullcatChan/src/modules/ayashii"

const promiseRetry = require("promise-retry")

const pkg = require("../../NullcatChan/package.json")

console.log("    _   __      ____           __  ________                __     ")
console.log("   / | / /_  __/ / /________ _/ /_/ ____/ /_  ____ _____  / /     ")
console.log("  /  |/ / / / / / / ___/ __ `/ __/ /   / __ \\/ __ `/ __ \\/ /    ")
console.log(" / /|  / /_/ / / / /__/ /_/ / /_/ /___/ / / / /_/ / / / /_/       ")
console.log("/_/ |_/\\__,_/_/_/\\___/\\__,_/\\__/\\____/_/ /_/\\__,_/_/ /_(_)\n")

function log(msg: string): void {
	_log(`[Boot]: ${msg}`)
}

log(chalk.bold(`Nullcat chan! v${pkg._v}`))

promiseRetry(
	(retry) => {
		log(`Account fetching... ${chalk.gray(config.host)}`)

		// アカウントをフェッチ
		return request
			.post(`${config.apiUrl}/i`, {
				json: {
					i: config.i,
				},
			})
			.catch(retry)
	},
	{
		retries: 3,
	}
)
	.then((account) => {
		const acct = `@${account.username}`
		log(chalk.green(`Account fetched successfully: ${chalk.underline(acct)}`))

		log("Starting Nullcat chan...")

		// ぬるきゃっとちゃん起動
		new NullcatChan(account, [
			new CoreModule(),
			new EmojiReactModule(),
			new FortuneModule(),
			new TimerModule(),
			new TalkModule(),
			new FollowModule(),
			new BirthdayModule(),
			new ValentineModule(),
			new KeywordModule(),
			new SleepReportModule(),
			new NotingModule(),
			new ReminderModule(),
			new GomamayoModule(),
			new GitHubStatusModule(),
			new CloudflareStatus(),
			new YarukotoModule(),
			new KiatsuModule(),
			new JihouModule(),
			new WhatModule(),
			new FeelingModule(),
			new TraceMoeModule(),
			new ServerModule(),
			new ShellGeiModule(),
			new SversionModule(),
			new AyashiiModule(),
			new PingModule(),
		])
	})
	.catch((e) => {
		log(chalk.red("Failed to fetch the account"))
	})
