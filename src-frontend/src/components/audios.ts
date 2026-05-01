import { Howl } from "howler";
import notifyAudio from "@shared/sounds/notify.mp3";
import finishedAudio from "@shared/sounds/finished.mp3";

export const sounds = {
  notify: new Howl({ src: [notifyAudio] }),
  finished: new Howl({ src: [finishedAudio] }),
};
