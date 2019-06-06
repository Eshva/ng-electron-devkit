import {
    BuilderContext,
    BuilderOutput,
    createBuilder
} from "@angular-devkit/architect";
import { Observable, of } from "rxjs";
import { concatMap, map } from "rxjs/operators";
import { DevServerBuilderOptions } from "@angular-devkit/build-angular";
import { buildWebpackConfig, compileElectronEntryPoint } from '../common/common';
import { ElectronBuilderSchema } from '../electron/schema';
import { ChildProcess, spawn } from 'child_process';
import {
    getSystemPath,
    json,
    normalize,
    resolve,
    Path
} from '@angular-devkit/core';

export function buildWebpackElectron(
    options: DevServerBuilderOptions,
    context: BuilderContext) {
    const builder = new ElectronDevServerBuilder(options, context);
    return builder.run();
}

export default createBuilder<json.JsonObject & DevServerBuilderOptions>(buildWebpackElectron);

export class ElectronDevServerBuilder {
    constructor(
        private readonly options: DevServerBuilderOptions,
        private readonly context: BuilderContext) {
        this.root = normalize(this.context.workspaceRoot);
    }

    electronProcess: ChildProcess;
    originalAddLiveReload: any;

    public run(): Observable<BuilderOutput> {
        this.originalAddLiveReload = this['_addLiveReload'] as any;
        this['_addLiveReload'] = this._overriddenAddLiveReload;

        let browserOptions = (this['_getBrowserOptions'](this.options) as Observable<{ options: ElectronBuilderSchema }>);
        return of(null).pipe(
            concatMap(() => browserOptions),
            concatMap(options => {
                return this.compileElectronEntryPoint(this.root, options.options)
                    .pipe(map(() => options.options));
            }),
            concatMap(options => {
                return this.startElectron(this.root, options)
                    .pipe(map(() => options));
            }),
            concatMap(options => {
                // watching does not work as intended, therefor its disabled right now
                /*if(options.watchElectron){
                    return new Observable<BuilderOutput>(obs => {
                        let electronProjectDir = getSystemPath(resolve(this.context.workspace.root, normalize(options.electronProjectDir)));

                        let hostWatchEventObservable = this.context.host.watch(normalize(electronProjectDir),{recursive: true, persistent:false});
                        hostWatchEventObservable.subscribe(
                            (event) => {
                                // Watch Typescript files in electron project dir
                                let escapedElectronProjectDirForRegex = options.electronProjectDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                let changedTsFiles = event.path.match(new RegExp('(?!.*\\/node_modules\\/.*)(.*' + escapedElectronProjectDirForRegex + '.*)(.*\\.ts$)'));
                                if (changedTsFiles && changedTsFiles.length > 0) {
                                    console.log(event);
                                    this.compileElectronEntryPoint(this.context.workspace.root, options).pipe(take(1)).subscribe((BuilderOutput) => {
                                        this.electronProcess.kill();
                                        this.startElectron(this.context.workspace.root, options).pipe(take(1)).subscribe((startElectronBuilderOutput) => {
                                            this.context.logger.info('restarted Electron Application');
                                        })
                                    });
                                }
                            },
                            (error) => obs.next({success: false}));
                    })
                }else {*/
                return of({ success: true });
                //}

            })
        )
    }

    _overriddenAddLiveReload(options, browserOptions, webpackConfig, // tslint:disable-line:no-any
        clientAddress) {
        if (this.originalAddLiveReload) {
            this.originalAddLiveReload.apply(this, arguments);

            let newWebpackConfig = buildWebpackConfig(webpackConfig);
            Object.assign(webpackConfig, newWebpackConfig);
        }
    }


    compileElectronEntryPoint(root: Path, options: ElectronBuilderSchema): Observable<BuilderOutput> {
        let electronProjectDir = getSystemPath(resolve(root, normalize(options.electronProjectDir)));
        return compileElectronEntryPoint(options, this.context, electronProjectDir)
    }

    startElectron(root: Path, options: ElectronBuilderSchema): Observable<BuilderOutput> {

        return new Observable(obs => {
            let electronProjectDir = getSystemPath(resolve(root, normalize(options.electronProjectDir)));

            let args = [electronProjectDir, '--serve'];
            let electron: any = require('electron');

            this.electronProcess = spawn('electron', args, { stdio: 'inherit' });
            // this.electronProcess.on('close', (code) => process.exit(code));

            obs.next({ success: true });
        })
    }

    private readonly root: Path;
}
