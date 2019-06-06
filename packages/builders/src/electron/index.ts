import {
    BuilderContext,
    BuilderOutput,
    createBuilder
} from '@angular-devkit/architect';
import {
    getSystemPath,
    join,
    json,
    normalize,
    resolve,
    Path
} from '@angular-devkit/core';
import { rimraf } from "rimraf";
import { rmdir } from "rmdir";
import treeKill from "tree-kill";
import { ElectronBuilderSchema } from "./schema";
import { Observable, of } from 'rxjs';
import { compileElectronEntryPoint } from '../common/common';
import { spawn, ChildProcess } from 'child_process';
import { concatMap } from 'rxjs/operators';

export function build(
    options: ElectronBuilderSchema,
    context: BuilderContext) {
    const electronBuilder = new ElectronBuilder(options, context);
    return of(null).pipe(
        concatMap(() => electronBuilder.compileElectronEntryPoint()),
        concatMap(() => electronBuilder.installElectronApplicationDependencies())
    )
}

export default createBuilder<json.JsonObject & ElectronBuilderSchema>(build);

export class ElectronBuilder {
    constructor(
        private readonly options: ElectronBuilderSchema,
        private readonly context: BuilderContext) {
        this.root = normalize(this.context.workspaceRoot);
    }

    public compileElectronEntryPoint(): Observable<BuilderOutput> {
        return compileElectronEntryPoint(this.options, this.context, this.options.outputPath)
    }

    public installElectronApplicationDependencies(): Observable<BuilderOutput> {
        return new Observable<BuilderOutput>(output => {
            const electronProjectPath: Path = resolve(this.root, normalize(this.options.electronProjectDir));
            const electronNodeModulesPath = getSystemPath(resolve(electronProjectPath, normalize('node_modules')));
            rimraf(electronNodeModulesPath, { rmdir: rmdir }, (error) => {
                if (error) {
                    this.context.logger.info(error.message);
                    output.error(error);
                    output.next({ success: false });
                    output.complete();
                }
            });
            let electronBuilderExecutable: string;
            if (process.platform === 'win32') {
                electronBuilderExecutable = 'electron-builder.cmd';
            } else {
                electronBuilderExecutable = 'electron-builder';
            }
            const electronBuilderExecutablePath: string = getSystemPath(join(this.root, 'node_modules', '.bin', electronBuilderExecutable));
            const childProcess: ChildProcess = spawn(electronBuilderExecutablePath, ['install-app-deps'], { cwd: getSystemPath(electronProjectPath) });
            const killForkedProcess = () => {
                if (childProcess && childProcess.pid) {
                    treeKill(childProcess.pid, 'SIGTERM');
                }
            };
            // Handle child process exit.
            const handleChildProcessExit = (code) => {
                killForkedProcess();
                if (code && code !== 0) {
                    output.error();
                }
                output.next({ success: true });
                output.complete();
            };
            childProcess.once('exit', handleChildProcessExit);
            childProcess.once('SIGINT', handleChildProcessExit);
            childProcess.once('uncaughtException', handleChildProcessExit);
            const handleParentProcessExit = () => {
                killForkedProcess();
            };
            process.once('exit', handleParentProcessExit);
            process.once('SIGINT', handleParentProcessExit);
            process.once('uncaughtException', handleParentProcessExit);
        })
    }
    /*
        public packElectronApplication(
            options: ElectronBuilderSchema,
            context: BuilderContext): Observable<BuilderOutput> {
    
            let args: BuildElectronArgs = {
                projectDir: getSystemPath(resolve(root, normalize(options.electronProjectDir))),
                platforms: options.electronPlatforms
            };
    
            context.logger.info(
                `Running electron-builder with projectDir: ${args.projectDir} and platforms: ${args.platforms}`
            );
    
            return runModuleAsObservableFork(
                getSystemPath(root),
                '@ng-electron-devkit/builders/dist/electron/build-electron',
                'build',
                [
                    args
                ],
            );
        }
    */

    private readonly root: Path;
}
/*

    constructor(public context: BuilderContext) {
        super(context);
    }

    run(builderConfig: BuilderConfiguration<ElectronBuilderSchema>): Observable<BuilderOutput> {
        return of(null).pipe(
            concatMap(() => super.run(builderConfig)),
            concatMap(() => this.compileElectronEntryPoint(builderConfig)),
            concatMap(() => this.installElectronApplicationDependencies(builderConfig)),
            concatMap(() => this.packElectronApplication(builderConfig))
        )
    }

    buildWebpackConfig(
        root: Path,
        projectRoot: Path,
        host: any,
        options: NormalizedBrowserBuilderSchema
    ): any {
        let browserConfig = super.buildWebpackConfig(root, projectRoot, host, options);
        return buildWebpackConfig(browserConfig);
    }

    compileElectronEntryPoint(builderConfig: BuilderConfiguration<ElectronBuilderSchema>): Observable<BuilderOutput> {
        return compileElectronEntryPoint(this.context, builderConfig.options, builderConfig.options.outputPath)
    }

    packElectronApplication(builderConfig: BuilderConfiguration<ElectronBuilderSchema>): Observable<BuilderOutput> {

        const root = this.context.workspaceRoot;

        let args: BuildElectronArgs = {
            projectDir: getSystemPath(resolve(root, normalize(builderConfig.options.electronProjectDir))),
            platforms: builderConfig.options.electronPlatforms
        };

        this.context.logger.info(
            `Running electron-builder with projectDir: ${args.projectDir} and platforms: ${args.platforms}`
        );

        return runModuleAsObservableFork(
            getSystemPath(root),
            '@ng-electron-devkit/builders/dist/electron/build-electron',
            'build',
            [
                args
            ],
        );
    }

    installElectronApplicationDependencies(builderConfig: BuilderConfiguration<ElectronBuilderSchema>): Observable<BuilderOutput>{


        return new Observable<BuilderOutput>( obs =>{
            const electronProjectPath : Path = resolve(root, normalize(builderConfig.options.electronProjectDir));
            const electronNodeModulesPath  = getSystemPath(resolve(  electronProjectPath ,normalize('node_modules')));
            rimraf(electronNodeModulesPath,{rmdir: rmdir}, (error)=>{
                if(error){
                    this.context.logger.info(error.message);
                    obs.error(error);
                    obs.next({success: false});
                    obs.complete();
                }
            });
            let electronBuilderExecutable : string ;
            if(process.platform === 'win32'){
                electronBuilderExecutable=   'electron-builder.cmd';
            }else{
                electronBuilderExecutable= 'electron-builder';
            }
            const electronBuilderExecutablePath : string = getSystemPath(join(root, 'node_modules' , '.bin', electronBuilderExecutable));
            const childProcess: ChildProcess = spawn(electronBuilderExecutablePath , ['install-app-deps'] ,{cwd:getSystemPath(electronProjectPath)});
            const killForkedProcess = () => {
                if (childProcess && childProcess.pid) {
                    treeKill(childProcess.pid, 'SIGTERM');
                }
            };
            // Handle child process exit.
            const handleChildProcessExit = (code) => {
                killForkedProcess();
                if (code && code !== 0) {
                    obs.error();
                }
                obs.next({ success: true });
                obs.complete();
            };
            childProcess.once('exit', handleChildProcessExit);
            childProcess.once('SIGINT', handleChildProcessExit);
            childProcess.once('uncaughtException', handleChildProcessExit);
            const handleParentProcessExit = () => {
                killForkedProcess();
            };
            process.once('exit', handleParentProcessExit);
            process.once('SIGINT', handleParentProcessExit);
            process.once('uncaughtException', handleParentProcessExit);
        })

    }
}


export default ElectronBuilder;
*/