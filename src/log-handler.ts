export type FfmpegLogHandler = 'none' | 'stdout' | 'stderr' | ((log: string) => void);

/* eslint-disable */
export function logHandlerFn(logHandlerConfig: FfmpegLogHandler): (log: any) => void {
    switch (logHandlerConfig) {
        case 'none': return () => {};
        case 'stdout': return log => console.log(log.toString());
        case 'stderr': return log => console.error(log.toString());
        default: return logHandlerConfig;
    }
}
/* eslint-enable */
