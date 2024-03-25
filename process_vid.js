const { exec } = require('child_process');
const fs = require('fs');

const VIDEO_DIR = './tmp/vid'
const AUDIO_DIR = './tmp/wav'
const IMG_DIR = './tmp/img'

const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4000;

const runFFmpegCommand = (command) => new Promise((resolve, reject) => {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return reject(error);
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
    }
    resolve(stdout);
  });
});

const chunkVideo = async (inputFile, chunkDuration) => {
  try {
    const command = `ffmpeg -i ${inputFile} \
    -c copy -map 0 \
    -segment_time ${chunkDuration} -f segment \
    ${VIDEO_DIR}/output_%03d.mp4`;

    await runFFmpegCommand(command);
    console.log("Video chunking completed.");
  } catch (error) {
    console.error("Failed to chunk video:", error);
  }
};

const encodeTime = (chunkDuration) => {
  const files = fs.readdirSync(VIDEO_DIR);
  files.forEach((file, index) => {
    let start = index * chunkDuration;
    let end = start + chunkDuration;
    start = new Date(start * 1000).toISOString().slice(11, 19);
    end = new Date(start * 1000).toISOString().slice(11, 19);
    let newFile = `output_${start}-${end}`;
    fs.renameSync(`${VIDEO_DIR}/${file}`, `${VIDEO_DIR}/${newFile}`);
  });
}

const convertChunksToAudio = async () => {
  try {
    const files = fs.readdirSync(VIDEO_DIR);
    for (const file of files) {
      const outputFile = file.replace(".mp4", ".wav");
      // const command = `ffmpeg -i ${VIDEO_DIR}/${file} ${AUDIO_DIR}/${outputFile}`;

      // convert to 16 bit:
      const command = `ffmpeg -i ${VIDEO_DIR}/${file} \
      -ar ${SAMPLE_RATE} \
      -ac 1 \
      -f s16le \
      ${AUDIO_DIR}/${outputFile}`;

      await runFFmpegCommand(command);
      console.log(`Converted ${file} to audio.`);
    }
  } catch (error) {
    console.error("Failed to convert video chunks to audio:", error);
  }
};

// Extract the first frame of each chunk
// To extract more frames (e.g. at 0s & 5s):
//  ffmpeg -i input_chunk.mp4 -vf "select='eq(t,0)+eq(t,5)'" -vsync vfr output_frame_%02d.jpg
const extractKeyFrames = async () => {
  try {
    const files = fs.readdirSync(VIDEO_DIR);
    for (const file of files) {
      const outputFile = file.replace(".mp4", "_first_frame.jpg");
      const command = `ffmpeg -i ${VIDEO_DIR}/${file} -frames:v 1 ${IMG_DIR}/${outputFile}`;
      await runFFmpegCommand(command);
      console.log(`Extracted key frame from ${file}.`);
    }
  } catch (error) {
    console.error("Failed to extract key frames:", error);
  }
};

const processVideo = async (inputFile, chunkDuration) => {
  if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
  } else {
    // TODO: empty the dir?
  }
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
  if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
  }

  await chunkVideo(inputFile, chunkDuration);
  encodeTime(chunkDuration);
  await convertChunksToAudio();
  await extractKeyFrames();
};

// processVideo('grow_like_a_weed.mp4', 10);

module.exports = processVideo;
