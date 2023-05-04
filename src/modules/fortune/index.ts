import autobind from 'autobind-decorator';
import Module from '@/module';
import Message from '@/message';
import serifs from '@/serifs';
import seedrandom from 'seedrandom';
import { genItem } from '@/vocabulary';

export const blessing = ['みねむのふともも :eti_suri:', 'なんかすごいふともも✨', '特大ふともも✨', '大大ふともも🎊', '大ふともも🎊', 'ふともも🎉', '中ふともも🎉', '小ふともも🎉', 'コンフォート🗿', '大コンフォート🗿'];

export default class extends Module {
	public readonly name = 'fortune';

	@autobind
	public install() {
		return {
			mentionHook: this.mentionHook
		};
	}

	@autobind
	private async mentionHook(msg: Message) {
		if (msg.includes(['占', 'うらな', '運勢', 'おみくじ'])) {
			const date = new Date();
			const seed = `${date.getFullYear()}/${date.getMonth()}/${date.getDate()}@${msg.userId}`;
			const rng = seedrandom(seed);
			const omikuji = blessing[Math.floor(rng() * blessing.length)];
			const item = genItem(rng);
			msg.reply(`**${omikuji}**\nラッキーアイテム: ${item}`, {
				cw: serifs.fortune.cw(msg.friend.name)
			});
			return true;
		} else {
			return false;
		}
	}
}
