export type SoundId = "rain" | "fire" | "cafe" | "sea" | "keyboard" | "pencil";

export type SoundItem = {
  id: SoundId;
  title: string;
  asset: any;
  icon: any;          
  defaultVolume: number;
};

export const SOUND_LIST: SoundItem[] = [
  {
    id: "rain",
    title: "Rain",
    asset: require("../../assets/sounds/rain.mp3"),
    icon: require("../../assets/icons/rain.png"),
    defaultVolume: 0.6,
  },
  {
    id: "fire",
    title: "Fire",
    asset: require("../../assets/sounds/fire.mp3"),
    icon: require("../../assets/icons/fire.png"),
    defaultVolume: 0.6,
  },
  {
    id: "cafe",
    title: "Cafe",
    asset: require("../../assets/sounds/cafe.mp3"),
    icon: require("../../assets/icons/cafe.png"),
    defaultVolume: 0.6,
  },
  {
    id: "sea",
    title: "Sea",
    asset: require("../../assets/sounds/sea.mp3"),
    icon: require("../../assets/icons/sea.png"),
    defaultVolume: 0.5,
  },
  {
    id: "keyboard",
    title: "Keyboard",
    asset: require("../../assets/sounds/keyboard.mp3"),
    icon: require("../../assets/icons/keyboard.png"),
    defaultVolume: 0.5,
  },
  {
    id: "pencil",
    title: "Pencil",
    asset: require("../../assets/sounds/pencil.mp3"),
    icon: require("../../assets/icons/pencil.png"),
    defaultVolume: 0.6,
  },
];
