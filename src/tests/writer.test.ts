import {YuvParser} from '../parser';
import {path as ffmpegPath} from '@ffmpeg-installer/ffmpeg';
import {YuvWriter} from '../writer';
import * as fs from 'fs';

it('reads a video and writes it back', async () => {
    const framesRx = new YuvParser({
        ffmpeg: ffmpegPath,
    }).read(`${__dirname}/resources/colors.mp4`);
    const writer = new YuvWriter({
        ffmpeg: ffmpegPath,
    });
    const outputFile = `${__dirname}/resources/colors_out.mp4`;
    const frameCount = await writer.write(framesRx, outputFile, {overwrite: true});
    expect(frameCount).toStrictEqual(6);
    fs.rmSync(outputFile);
});
