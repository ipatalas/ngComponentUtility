import { Transform } from 'stream';

type VoidFunction = () => void;

export class SplitToLines extends Transform {
	private lastLineData: string;

	constructor() {
		super({ objectMode: true });
	}

	public _transform(chunk: Buffer, _encoding: string, done: VoidFunction) {
		let data = chunk.toString();
		if (this.lastLineData) {
			data = this.lastLineData + data;
		}

		const lines = data.split(/\r\n|[\r\n]/);
		this.lastLineData = lines.splice(lines.length - 1, 1)[0];

		lines.forEach(this.push.bind(this));

		done();
	}

	public _flush(done: VoidFunction) {
		if (this.lastLineData) {
			this.push(this.lastLineData);
			this.lastLineData = null;
		}

		done();
	}
}
