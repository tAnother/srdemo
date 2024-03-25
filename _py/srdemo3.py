#!/usr/bin/env python3

# import subprocess
import speech_recognition as sr
from moviepy.editor import *

from os import path
VIDEO_FILE = path.join(path.dirname(path.realpath(__file__)), "grow like a weed.mp4")
AUDIO_PATH = path.join(path.dirname(path.realpath(__file__)), "grow like a weed.wav")

# convert using ffmpeg directly:
# command = f"ffmpeg -i {VIDEO_FILE} -ab 160k -ac 2 -ar 44100 -vn {AUDIO_PATH}"
# subprocess.call(command, shell=True)

r = sr.Recognizer()
vid = VideoFileClip(VIDEO_FILE)
if vid.audio:
    print("has audio")
    vid.audio.write_audiofile(AUDIO_PATH)
else:
    print("no audio")
    exit(0)


with sr.AudioFile(AUDIO_PATH) as source:
    audio = r.record(source)

# recognize speech using Sphinx
try:
    print("Sphinx thinks you said " + r.recognize_sphinx(audio))
except sr.UnknownValueError:
    print("Sphinx could not understand audio")
except sr.RequestError as e:
    print("Sphinx error; {0}".format(e))

try:
    print("Vosk Speech Recognition thinks you said " + r.recognize_vosk(audio))
except sr.UnknownValueError:
    print("Vosk Speech Recognition could not understand audio")
except sr.RequestError as e:
    print("Could not request results from Vosk Speech Recognition service; {0}".format(e))