export interface WeatherData {
  time: string;
  SKY: number; // 하늘상태 (1: 맑음, 3: 구름많음, 4: 흐림)
  REH: number; // 습도 (%)
  PTY: number; // 강수형태 (0: 없음, 1: 비, 2: 비/눈, 3: 눈, 5: 빗방울, 6: 빗방울눈날림, 7: 눈날림)
  T1H: number; // 기온 (℃)
}

export interface StarData {
  name: string;
  mag: number;
  ra: number;
  dec: number;
}
