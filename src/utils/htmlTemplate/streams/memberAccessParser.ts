import { Transform } from 'stream';
import { events } from '../../../symbols';

export class MemberAccessParser extends Transform {
	private memberAccessRegex: RegExp;
	private lineNumber: number = 0;

	constructor(controllerAlias: string) {
		super({ objectMode: true });

		this.memberAccessRegex = new RegExp(`${this.escapeRegex(controllerAlias)}\\.([\\w$]+)`, 'gi');
	}

	private escapeRegex = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

	public _transform(line: string, _encoding: string, done: () => void) {
		let m: RegExpExecArray;

		// tslint:disable-next-line:no-conditional-assignment
		while ((m = this.memberAccessRegex.exec(line)) !== null) {
			const eventData: IMemberAccessEntry = {
				line: this.lineNumber,
				character: m.index,
				memberName: m[1],
				expression: m[0]
			};
			this.emit(events.memberFound, eventData);
		}

		this.lineNumber++;
		done();
	}
}

export interface IMemberAccessEntry {
	line: number;
	character: number;
	memberName: string;
	expression: string;
}
