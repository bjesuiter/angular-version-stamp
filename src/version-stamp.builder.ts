import {BuilderContext, BuilderOutput, createBuilder} from '@angular-devkit/architect';
import {resolve} from 'path';
import {writeFile} from 'fs-extra';
import {VersionStampBuilderSchema} from "../schema";
import readPkg = require("read-pkg");

const {gitDescribe} = require('git-describe');
const version = require('project-version');

/**
 * This angular builder stamps the project version as a string env var into the project on every build.
 * It should be used with the cli "architect"-api
 */
export default createBuilder(_versionStampBuilder);

async function _versionStampBuilder(options: VersionStampBuilderSchema, context: BuilderContext): Promise<BuilderOutput> {
    // This try guards against errors in getGitInfo
    try {
        const gitInfo = await getGitInfo(context.workspaceRoot);
        gitInfo.version = await getPackageVersion(context.workspaceRoot);
        const success = await writeVersionEvnFile(context, gitInfo);
        context.reportStatus('Done.');
        return {success: success};
    } catch (err) {
        return {success: false};
    }
}

async function getPackageVersion(workspaceRoot: string) {
    const pkg = await readPkg({cwd: workspaceRoot});
    return pkg.version;
}

async function getGitInfo(path: string) {
    const gitInfo = gitDescribe({
        dirtyMark: false,
        dirtySemver: false
    }, path);

    gitInfo.version = version;
    return gitInfo;
}

/**
 * Returns success state
 */
async function writeVersionEvnFile({logger, workspaceRoot}: BuilderContext, gitInfo: any): Promise<boolean> {
    const file = resolve(workspaceRoot, 'src', 'environments', 'version-info.ts');
    try {
        await writeFile(file,
            `// IMPORTANT: THIS FILE IS AUTO GENERATED! DO NOT MANUALLY EDIT OR CHECKIN!
    /* tslint:disable */
    export const VERSION = ${JSON.stringify(gitInfo, null, 4)};
    /* tslint:enable */
    `, {encoding: 'utf-8'});
        logger.info(`Wrote version info ${gitInfo.raw} to ${file}`);
    } catch (e) {
        logger.error(`[FAILED] Writing version info ${gitInfo.raw} to ${file}`, e);
        return false
    }
    return true;
}
