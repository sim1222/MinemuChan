import Module from '@/module';
import autobind from 'autobind-decorator';

import accurateInterval from 'accurate-interval';

export default class extends Module {
	public readonly name = 'jihou';

	@autobind
	public install() {
		accurateInterval(this.post, 1000 * 60 * 60, { aligned: true, immediate: true });

		return {};
	}

	@autobind
	private async post() {
		const date = new Date();
		date.setMinutes(date.getMinutes() + 1);

		const hour = date.getHours();

		switch (hour) {
			default:
				this.ai.post({
					text: `${hour}時だよ！ふともも見せてね！`
				});
				break;

			case 7:
				this.ai.post({
					text: `みんなおはよ！${hour}時だよ！ふともも見せてね！`
				});
				break;

			case 1:
				this.ai.post({
					text: `${hour}時だよ！みんなそろそろ寝る時間かな？その前にふともも見せてね！`
				});
				break;

			case 5:
				this.ai.post({
					text: `${hour}時だよ！ふともも見せる時間だよ！！`
				});
				break;
		}
	}
}
