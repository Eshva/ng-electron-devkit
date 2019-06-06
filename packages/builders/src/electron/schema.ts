import { BrowserBuilderOptions } from "@angular-devkit/build-angular";


export interface ElectronBuilderSchema extends BrowserBuilderOptions {
    electronTSConfig: string,
    electronPlatforms: string,
    electronProjectDir: string
}