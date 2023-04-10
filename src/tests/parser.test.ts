import {path as ffmpegPath} from '@ffmpeg-installer/ffmpeg';
import {YuvParser} from '../parser';
import {lastValueFrom, toArray} from 'rxjs';

it('parses video into frames', async () => {
    const framesRx = new YuvParser({
        ffmpeg: ffmpegPath,
        verbose: true
    }).read(`${__dirname}/resources/colors.mp4`);
    const frames = await lastValueFrom(framesRx.pipe(toArray()));
    expect(frames.length).toStrictEqual(6);
});

it('handles empty stream correctly', async () => {
    const frames = await lastValueFrom(new YuvParser({
        ffmpeg: ffmpegPath,
        verbose: true
    }).read(`${__dirname}/resources/colors.mp4`, {
        seekSeconds: 42
    }).pipe(toArray()));
    expect(frames.length).toStrictEqual(0);
});

it('parses MPEG-DASH into frames', async () => {
    const basename = `${__dirname}/resources/stream`;
    const input = `concat:${basename}-2.0.m4s|${basename}-2.2.m4s`;
    const frames = await lastValueFrom(new YuvParser({
        ffmpeg: ffmpegPath,
        verbose: true
    }).read(input, {
        seekSeconds: 1,
        vframes: 3
    }).pipe(toArray()));
    expect(frames.length).toStrictEqual(3);
});
