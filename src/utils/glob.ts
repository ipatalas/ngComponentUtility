import * as glob from 'glob';

const options = <IOptions>{
	absolute: true
};

export default function (pattern: string, opts?: IOptions) {
	return new Promise<string[]>((resolve, reject) => {
		glob(pattern, { ...options, ...opts }, (err, matches) => {
			if (err) {
				return reject(err);
			}

			resolve(matches);
		});
	});
};

export const init = (cwd: string) => {
	options.cwd = cwd;
};

export interface IOptions extends glob.IOptions {
	absolute: boolean;
}