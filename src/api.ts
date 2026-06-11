import { WeatherData, StarData } from './types';

export const brightStars: StarData[] = [
  { name: "Sirius (시리우스)", mag: -1.44, ra: 6.75, dec: -16.71 },
  { name: "Canopus (카노푸스)", mag: -0.62, ra: 6.39, dec: -52.69 },
  { name: "Rigil Kentaurus (알파 센타우리)", mag: -0.27, ra: 14.66, dec: -60.83 },
  { name: "Arcturus (아크투루스)", mag: -0.05, ra: 14.26, dec: 19.18 },
  { name: "Vega (직녀성)", mag: 0.03, ra: 18.61, dec: 38.78 },
  { name: "Capella (카펠라)", mag: 0.08, ra: 5.27, dec: 45.99 },
  { name: "Rigel (리겔)", mag: 0.18, ra: 5.24, dec: -8.20 },
  { name: "Procyon (프로키온)", mag: 0.40, ra: 7.65, dec: 5.22 },
  { name: "Achernar (아케르나르)", mag: 0.45, ra: 1.62, dec: -57.24 },
  { name: "Betelgeuse (베텔게우스)", mag: 0.45, ra: 5.91, dec: 7.40 },
  { name: "Hadar (베타 센타우리)", mag: 0.61, ra: 14.06, dec: -60.37 },
  { name: "Altair (견우성)", mag: 0.76, ra: 19.84, dec: 8.86 },
  { name: "Acrux (알파 크루시스)", mag: 0.77, ra: 12.44, dec: -63.09 },
  { name: "Aldebaran (알데바란)", mag: 0.87, ra: 4.59, dec: 16.50 },
  { name: "Antares (안타레스)", mag: 0.96, ra: 16.49, dec: -26.43 },
  { name: "Spica (스피카)", mag: 0.97, ra: 13.41, dec: -11.16 },
  { name: "Pollux (폴룩스)", mag: 1.16, ra: 7.75, dec: 28.02 },
  { name: "Fomalhaut (포말하우트)", mag: 1.17, ra: 22.96, dec: -29.62 },
  { name: "Deneb (데네브)", mag: 1.25, ra: 20.69, dec: 45.28 },
  { name: "Mimosa (베타 크루시스)", mag: 1.25, ra: 12.78, dec: -59.68 }
];

export async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
  // 1. KST 기준 현재 시간 및 1시간 전 시간 계산 (yyyymmddhhmm 형식)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000; // KST는 UTC+9
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstPrev = new Date(now.getTime() + kstOffset - 60 * 60 * 1000); // 1시간 전

  const formatKst = (date: Date) => {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}`;
  };

  const tm1 = formatKst(kstPrev);
  const tm2 = formatKst(kstNow);

  // 2. 사용자가 제공한 authKey
  const authKey = "SSCp_h23QfGgqf4dt1Hxog";

  // 호출할 기상청 typ01 url API (지상 관측 실시간 자료조회)
  // obs=ta(기온),hm(상대습도),td(이슬점온도),rn_ox(강수유무),vs(시정)
  const url = `/api-kma/api/typ01/url/sfc_nc_var.php?tm1=${tm1}&tm2=${tm2}&lon=${lon}&lat=${lat}&obs=ta,hm,td,rn_ox,vs&authKey=${authKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("403:기상청 API 키의 IP 제한이나 권한 설정으로 인해 연결이 거부되었습니다. 기상청 API Hub 마이페이지에서 공인 IP 주소(180.81.33.9)가 단기예보가 아닌 지상관측자료 API에 등록되어 있는지 확인해주세요.");
    }
    if (res.status === 401) {
      throw new Error("401:인증키가 유효하지 않습니다. 사용 중인 기상청 authKey 값을 확인해주세요.");
    }
    throw new Error(`Failed to fetch KMA weather data (Status: ${res.status})`);
  }

  // 데이터 인코딩이 EUC-KR이므로 디코딩 처리
  const buffer = await res.arrayBuffer();
  const decoder = new TextDecoder('euc-kr');
  const text = decoder.decode(buffer);

  // 줄 단위로 분할하여 주석(#)과 공백 라인 필터링
  const lines = text.split('\n');
  const dataLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('#');
  });

  if (dataLines.length === 0) {
    throw new Error('조회된 실시간 관측 데이터가 없습니다. 기상청 허브 상태를 확인해주세요.');
  }

  // 가장 최근 관측 행 선택
  const lastLine = dataLines[dataLines.length - 1];
  const parts = lastLine.split(',').map(p => p.trim());

  if (parts.length < 6) {
    throw new Error('기상청 응답 포맷이 올바르지 않습니다.');
  }

  const timeStr = parts[0];          // "YYYYMMDDHHMM"
  const ta = parseFloat(parts[1]);   // 기온
  const hm = parseFloat(parts[2]);   // 상대습도
  // const td = parseFloat(parts[3]);   // 이슬점온도
  const rn_ox = parseFloat(parts[4]);// 강수유무 (0 = 강수없음, 1 = 비/눈 등)
  const vs = parseFloat(parts[5]);   // 시정 (km)

  // 시정(vs) 값을 이용하여 하늘 상태(SKY) 추정
  // 시정이 20km 이상이면 맑음(1), 10km 이상이면 구름많음(3), 10km 미만이면 흐림(4)
  let SKY = 1;
  if (vs >= 20) {
    SKY = 1;
  } else if (vs >= 10) {
    SKY = 3;
  } else {
    SKY = 4;
  }

  // 강수 여부 매핑
  const PTY = rn_ox > 0 ? 1 : 0;

  // 출력 시간 포맷 생성
  const formattedTime = `${timeStr.substring(0, 4)}-${timeStr.substring(4, 6)}-${timeStr.substring(6, 8)} ${timeStr.substring(8, 10)}:${timeStr.substring(10, 12)}`;

  return {
    time: formattedTime,
    SKY,
    REH: hm,
    PTY,
    T1H: ta
  };
}

export function calculateLimitingMagnitude(weather: WeatherData | null, bortle: number): number {
  let baseMag = 7.5 - (bortle * 0.4);
  if (!weather) return 0;
  
  // 기상청 API SKY: 1(맑음), 3(구름많음), 4(흐림)
  // 맑음일 때는 감쇄 없음, 구름많음 1등급 감쇄, 흐림 3등급 감쇄
  let cloudPenalty = 0;
  if (weather.SKY === 3) cloudPenalty = 1.5;
  else if (weather.SKY === 4) cloudPenalty = 4.0;
  
  let mag = baseMag - cloudPenalty;
  
  // 습도 페널티 (대기 혼탁)
  if (weather.REH > 80) mag -= 0.5;

  // 비나 눈이 오면 시정이 매우 안좋음 (사실상 관측 불가)
  if (weather.PTY > 0) mag -= 5.0;

  return Math.max(0, mag);
}

export async function fetchBortleScale(lat: number, lon: number): Promise<number> {
  const formattedLat = lat.toFixed(2);
  const formattedLon = lon.toFixed(2);
  const url = `/api-clearoutside/forecast/${formattedLat}/${formattedLon}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch Bortle data');
    const html = await res.text();
    
    // HTML에서 "Class X Bortle" 패턴 탐색
    const match = html.match(/Class\s+<strong>(\d+)<\/strong>\s+Bortle/i) || 
                  html.match(/Class\s+(\d+)\s+Bortle/i) ||
                  html.match(/btn-bortle-(\d+)/i);
                  
    if (match && match[1]) {
      const bortleValue = parseInt(match[1], 10);
      if (bortleValue >= 1 && bortleValue <= 9) {
        return bortleValue;
      }
    }
    return 6; // 매칭 안 될 경우 기본값
  } catch (error) {
    console.error("Bortle scale fetch failed:", error);
    return 6; // 에러 시 기본값
  }
}
