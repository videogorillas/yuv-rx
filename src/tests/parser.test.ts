import {path as ffmpegPath} from '@ffmpeg-installer/ffmpeg';
import {YuvParser} from '../parser';
import {toArray} from 'rxjs';

it('parses video into frames', done => {
    let tested = false;
    new YuvParser({
        ffmpeg: ffmpegPath,
        verbose: true
    }).read(`${__dirname}/resources/colors.mp4`).pipe(toArray()).subscribe({
        next: frames => {
            expect(frames.length).toStrictEqual(6);
            tested = true;
        },
        error: err => {
            console.error(err);
            throw err;
        },
        complete: () => {
            if (tested) {
                done();
            } else {
                throw 'completed without emitting data';
            }
        }
    });
});

it('handles empty stream correctly', done => {
    let tested = false;
    new YuvParser({
        ffmpeg: ffmpegPath,
        verbose: true
    }).read(`${__dirname}/resources/colors.mp4`, {
        seekSeconds: 42
    }).pipe(toArray()).subscribe({
        next: frames => {
            expect(frames.length).toStrictEqual(0);
            tested = true;
        },
        error: err => {
            console.error(err);
            throw err;
        },
        complete: () => {
            if (tested) {
                done();
            } else {
                throw 'completed without emitting data';
            }
        }
    });
});

it('parses MPEG-DASH into frames', done => {
    let tested = false;
    const basename = `${__dirname}/resources/stream`;
    const input = `concat:${basename}-2.0.m4s|${basename}-2.2.m4s`;
    new YuvParser({
        ffmpeg: ffmpegPath,
        verbose: true
    }).read(input, {
        seekSeconds: 1,
        vframes: 3
    }).pipe(toArray()).subscribe({
        next: frames => {
            expect(frames.length).toStrictEqual(3);
            tested = true;
        },
        error: err => {
            console.error(err);
            throw err;
        },
        complete: () => {
            if (tested) {
                done();
            } else {
                throw 'completed without emitting data';
            }
        }
    });
});
