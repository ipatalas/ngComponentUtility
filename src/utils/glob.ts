import * as glob from 'glob';

const options = <glob.IOptions>{
	absolute: true
};

export default function(pattern: string) {
	return new Promise<string[]>((resolve, reject) => {
		glob(pattern, options, (err, matches) => {
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
