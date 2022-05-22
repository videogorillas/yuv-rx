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
