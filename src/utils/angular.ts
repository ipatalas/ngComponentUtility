import * as path from 'path';
import * as fs from 'fs';

const reVersion = /@?(~|^)?1\.[56]\.\d/;

export function isValidAngularProject(projectRoot: string): boolean {
	const pkg = path.join(projectRoot, 'package.json');
	const bower = path.join(projectRoot, 'bower.json');

	if (fs.existsSync(pkg)) {
		if (detectPackageJson(pkg) || detectJSPM(pkg)) {
			return true;
		}
	}

	if (fs.existsSync(bower)) {
		return detectPackageJson(bower);
	}

	return false;
}

function detectPackageJson(packagePath: string) {
	const pkg = require(packagePath);
	const ver = (pkg.dependencies && pkg.dependencies['angular']);
	return ver && reVersion.test(ver) || false;
}

function detectJSPM(packagePath: string) {
	const pkg = require(packagePath);
	const ver = (pkg.jspm && pkg.jspm.dependencies && pkg.jspm.dependencies['angular']);
	return ver && reVersion.test(ver) || false;
}

// TODO: Ionic template https://github.com/jdnichollsc/Ionic-Starter-Template
