import {spawn} from 'child_process';
import {Observable} from 'rxjs';
import {FfmpegLogHandler, logHandlerFn} from './log-handler';

export type PixFmt = 'yuv420p' | 'yuv422p'

type Y4MOptions = {
    pixFmt?: PixFmt,
    seekSeconds?: number,
    vframes?: number,
    videoStream?: number,
    iFramesOnly?: boolean
}

export type Y4MStreamOptions = Y4MOptions & {
    ffmpegLogHandler?: FfmpegLogHandler,
    verbose?: boolean
}

function inputArgs(path: string, options?: Y4MOptions): string[] {
    const params = [];
    params.push('-flags2', '+showall');
    const seekseconds = options?.seekSeconds ?? 0;
    if (seekseconds > 0) {
        params.push('-ss', seekseconds.toString());
    }
    if (options?.iFramesOnly) {
        params.push('-skip_frame', 'nokey');
    }
    params.push('-i', path);
    const vstream = options?.videoStream;
    if (vstream != null) {
        params.push('-map', `0:v:${vstream}`);
    }
    const vframes = options?.vframes ?? null;
    if (vframes != null) {
        params.push('-vframes', vframes.toString());
    }
    return params;
}

function outputArgs(pixFmt?: PixFmt): string[] {
    return ['-loglevel', 'error', '-f', 'yuv4mpegpipe', '-pix_fmt', pixFmt ?? 'yuv420p', '-strict', '-1', '-threads', '0', '-'];
}

function yuv4mpeg(path: string, options?: Y4MOptions): string[] {
    return [...inputArgs(path, options), ...outputArgs(options?.pixFmt)];
}

function yuv4mpegStream(ffmpeg: string, args: string[], options?: Y4MStreamOptions): Observable<Buffer> {
    return new Observable<Buffer>(subscriber => {
        if (options?.verbose) {
            console.log('FFMpeg:', ffmpeg);
            console.log('Arguments:', args.join(' '));
        }
        const handleFfmpegLog = logHandlerFn(options?.ffmpegLogHandler ?? 'none');
        let exited = false;
        const child = spawn(ffmpeg, args, {stdio: 'pipe'});

        child.on('exit', (code?: number, signal?: NodeJS.Signals) => {
            exited = true;
            if (options?.verbose) {
                console.log(new Error(`FFMpeg exited with code ${code}, signal ${signal}`));
            }
            if (code != null && code == 0) {
                if (child.stdout.readableEnded) {
                    subscriber.complete();
                }
            } else {
                subscriber.error(new Error(`FFMpeg exited with exit code ${code}, signal ${signal}`));
            }
        });
        child.stdout.on('end', () => {
            if (options?.verbose) {
                console.log('Output stream ended');
            }
            if (exited) {
                subscriber.complete();
            }
        });
        child.stdout.on('data', data => {
            if (options?.verbose) {
                console.log(`Received data (${data.length} bytes)`);
            }
            subscriber.next(data);
        });
        child.stderr.on('data', handleFfmpegLog);
    });

}

export function yuv4mpegStreamForCustomInput(ffmpeg: string, args: string[], options?: Y4MStreamOptions): Observable<Buffer> {
    return yuv4mpegStream(ffmpeg, [...args, ...outputArgs(options?.pixFmt)], options);
}

export function yuv4mpegStreamForPath(ffmpeg: string, path: string, options?: Y4MStreamOptions): Observable<Buffer> {
    return yuv4mpegStream(ffmpeg, yuv4mpeg(path, options), options);
}
