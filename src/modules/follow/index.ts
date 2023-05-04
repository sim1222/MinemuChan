import autobind from 'autobind-decorator';
import Module from '@/module';
import Message from '@/message';
import config from '@/config';

export default class extends Module {
	public readonly name = 'follow';

	@autobind
	public install() {
		return {
			mentionHook: this.mentionHook
		};
	}

	@autobind
	private async mentionHook(msg: Message) {
		if (msg.text && msg.includes(['フォロー', 'フォロバ', 'follow me'])) {
			if (!msg.user.isFollowing) {
				this.ai.api('following/create', {
					userId: msg.userId
				});
				msg.reply('これからよろしくね！とりあえずふともも見せて？', { immediate: true });
				return {
					reaction: msg.friend.love >= 0 ? '💙' : null
				};
			} else {
				return {
					reaction: msg.friend.love >= 0 ? '💙' : null
				};
			}
		} else {
			return false;
		}
	}
}
