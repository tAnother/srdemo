const fs = require('fs');
const vosk = require('vosk');
const { spawn } = require('child_process');
const processVideo = require('./process_vid');

const { Readable } = require('stream');
const wav = require('wav');

const MODEL_PATH = 'model';
const AUDIO_DIR = './tmp/wav';
const RESULT_DIR = './tmp/stt_result';

const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4000;

let FILE_NAME = 'grow_like_a_weed.mp4';
let CHUNK_DURATION = 10;

const speechToText_stream = async (file) => {
  vosk.setLogLevel(-1);
  const model = new vosk.Model(MODEL_PATH);
  const rec = new vosk.Recognizer({ model: model, sampleRate: SAMPLE_RATE });

  const ffmpeg_run = spawn('ffmpeg', ['-loglevel', 'quiet', '-i', file,
    '-ar', String(SAMPLE_RATE), '-ac', '1',
    '-f', 's16le', '-bufsize', String(BUFFER_SIZE), '-']);

  let res = '';
  ffmpeg_run.stdout.on('data', (stdout) => {
    rec.acceptWaveform(stdout);
    console.log(rec.partialResult());
    console.log(rec.result());
    console.log(rec.finalResult());
  });
  ffmpeg_run.stdout.on('end', () => {
    console.log(res);
    return res;
  })
}

const speechToText_simple = async (file, callback) => {
  vosk.setLogLevel(-1);
  const model = new vosk.Model(MODEL_PATH);

  const wfReader = new wav.Reader();
  const wfReadable = new Readable().wrap(wfReader);

  let res = '';
  // console.log('stt', file);

  wfReader.on('format', async ({ audioFormat, sampleRate, channels }) => {
    if (audioFormat != 1 || channels != 1) {
      console.error('Audio file must be WAV format mono PCM.');
      process.exit(1);
    }
    const rec = new vosk.Recognizer({ model: model, sampleRate: sampleRate });
    for await (const data of wfReadable) {
      const end_of_speech = rec.acceptWaveform(data);
      if (end_of_speech) {
        let p = rec.result().text;
        // console.log('res', file, tmp);
        res += p + ' ';
      } else {
        // console.log('par', JSON.stringify(rec.partialResult(), null, 4));
      }
    }
    let p = rec.finalResult().text;
    // console.log('fin', file, tmp);
    res += p;
    // console.log('res', file, res);
    rec.free();
    callback(res);
  });

  fs.createReadStream(file, { 'highWaterMark': 4096 }).pipe(wfReader).on('finish',
    function (err) {
      model.free();
    });
}

const main = async () => {
  if (!fs.existsSync(MODEL_PATH)) {
    console.log('Please download the model from https://alphacephei.com/vosk/models and unpack as ' + MODEL_PATH + ' in the current folder.')
    process.exit()
  }
  if (!fs.existsSync(RESULT_DIR)) {
    fs.mkdirSync(RESULT_DIR, { recursive: true });
  }
  if (process.argv.length > 2) {
    FILE_NAME = process.argv[2];
  }

  await processVideo(FILE_NAME, CHUNK_DURATION);

  let results = [];
  const files = fs.readdirSync(AUDIO_DIR);
  files.forEach((file) => {
    speechToText_simple(`${AUDIO_DIR}/${file}`, (res) => {
      results.push({
        time: file,   // TODO: fix time
        text: res,
      });
      console.log(results);
    });
  });
}

main();