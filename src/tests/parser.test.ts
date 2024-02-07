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

it('reads video difference from custom ffmpeg video filter', async () => {
    const basename = `${__dirname}/resources`;
    const input1 = `${basename}/mouse.mp4`;
    const input2 = `${basename}/mouse_text.mp4`;
    const frames = await lastValueFrom(new YuvParser({
        ffmpeg: ffmpegPath,
        verbose: true
    }).readCustom([
        '-i',
        input1,
        '-i',
        input2,
        '-filter_complex',
        '[0:v]format=gray[2];[1:v]format=gray[3];[2][3]blend=all_mode=difference[d];[d]format=yuv420p[v]',
        '-map',
        '[v]',
    ]).pipe(toArray()));
    expect(frames[0].colorPlanes.y.data.readUInt8(54*720+170)).toBeGreaterThan(42);
    expect(frames[10].colorPlanes.y.data.readUInt8(54*720+170)).toBeGreaterThan(42);
    expect(frames[42].colorPlanes.y.data.readUInt8(54*720+170)).toBeGreaterThan(42);
    expect(frames[0].colorPlanes.y.data.readUInt8(154*720+170)).toBeLessThan(20);
    expect(frames[10].colorPlanes.y.data.readUInt8(154*720+170)).toBeLessThan(20);
    expect(frames[42].colorPlanes.y.data.readUInt8(154*720+170)).toBeLessThan(20);
});
