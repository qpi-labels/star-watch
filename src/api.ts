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

interface PM10Station {
  id: number;
  name: string;
  lat: number;
  lon: number;
}

const PM10_STATIONS: PM10Station[] = [
  { id: 90, name: "속초", lat: 38.2509, lon: 128.5647 },
  { id: 93, name: "북춘천", lat: 37.9475, lon: 127.7547 },
  { id: 94, name: "광덕산", lat: 38.1172, lon: 127.4333 },
  { id: 100, name: "대관령", lat: 37.6771, lon: 128.7183 },
  { id: 102, name: "백령도", lat: 37.9667, lon: 124.6333 },
  { id: 108, name: "서울", lat: 37.5714, lon: 126.9658 },
  { id: 115, name: "울릉도", lat: 37.4815, lon: 130.9023 },
  { id: 116, name: "관악산", lat: 37.4453, lon: 126.964 },
  { id: 119, name: "수원", lat: 37.2587, lon: 126.9859 },
  { id: 121, name: "영월", lat: 37.1856, lon: 128.4659 },
  { id: 130, name: "울진", lat: 36.9859, lon: 129.4011 },
  { id: 132, name: "안면도", lat: 36.5333, lon: 126.3167 },
  { id: 135, name: "추풍령", lat: 36.2231, lon: 127.9946 },
  { id: 136, name: "안동", lat: 36.5658, lon: 128.7297 },
  { id: 140, name: "군산", lat: 35.9806, lon: 126.7645 },
  { id: 143, name: "대구", lat: 35.8778, lon: 128.6529 },
  { id: 146, name: "전주", lat: 35.8236, lon: 127.1352 },
  { id: 152, name: "울산", lat: 35.5824, lon: 129.3175 },
  { id: 160, name: "구덕산", lat: 35.1561, lon: 129.0069 },
  { id: 185, name: "고산", lat: 33.3000, lon: 126.1600 },
  { id: 192, name: "진주", lat: 35.1783, lon: 128.1132 },
  { id: 201, name: "강화", lat: 37.7475, lon: 126.4853 },
  { id: 229, name: "북격렬비도", lat: 36.6119, lon: 125.5539 },
  { id: 232, name: "천안", lat: 36.8197, lon: 127.1264 },
  { id: 268, name: "진도", lat: 34.4730, lon: 126.2585 },
  { id: 273, name: "문경", lat: 36.5833, lon: 128.1833 },
  { id: 399, name: "장성 황룡", lat: 35.2794, lon: 126.7611 },
  { id: 501, name: "충주 노은", lat: 37.0457, lon: 127.7997 }
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

  // 호출할 기상청 typ01 url API (지상 관측 실시간 자료조회 및 PM10 황사 관측자료)
  const weatherUrl = `/api-kma/api/typ01/url/sfc_nc_var.php?tm1=${tm1}&tm2=${tm2}&lon=${lon}&lat=${lat}&obs=ta,hm,td,rn_ox,vs&authKey=${authKey}`;
  const pm10Url = `/api-kma/api/typ01/url/kma_pm10.php?tm1=${tm1}&tm2=${tm2}&authKey=${authKey}`;

  const [weatherRes, pm10Res] = await Promise.all([
    fetch(weatherUrl),
    fetch(pm10Url).catch(err => {
      console.error("PM10 fetch failed, using fallback:", err);
      return null;
    })
  ]);

  if (!weatherRes.ok) {
    if (weatherRes.status === 403) {
      throw new Error("403:기상청 API 키의 IP 제한이나 권한 설정으로 인해 연결이 거부되었습니다. 기상청 API Hub 마이페이지에서 공인 IP 주소(180.81.33.9)가 단기예보가 아닌 지상관측자료 API에 등록되어 있는지 확인해주세요.");
    }
    if (weatherRes.status === 401) {
      throw new Error("401:인증키가 유효하지 않습니다. 사용 중인 기상청 authKey 값을 확인해주세요.");
    }
    throw new Error(`Failed to fetch KMA weather data (Status: ${weatherRes.status})`);
  }

  // 날씨 데이터 디코딩 처리
  const weatherBuffer = await weatherRes.arrayBuffer();
  const weatherDecoder = new TextDecoder('euc-kr');
  const weatherText = weatherDecoder.decode(weatherBuffer);

  const weatherLines = weatherText.split('\n');
  const weatherDataLines = weatherLines.filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('#');
  });

  if (weatherDataLines.length === 0) {
    throw new Error('조회된 실시간 관측 데이터가 없습니다. 기상청 허브 상태를 확인해주세요.');
  }

  const lastWeatherLine = weatherDataLines[weatherDataLines.length - 1];
  const weatherParts = lastWeatherLine.split(',').map(p => p.trim());

  if (weatherParts.length < 6) {
    throw new Error('기상청 날씨 응답 포맷이 올바르지 않습니다.');
  }

  const timeStr = weatherParts[0];          // "YYYYMMDDHHMM"
  const ta = parseFloat(weatherParts[1]);   // 기온
  const hm = parseFloat(weatherParts[2]);   // 상대습도
  const rn_ox = parseFloat(weatherParts[4]);// 강수유무 (0 = 강수없음, 1 = 비/눈 등)
  const vs = parseFloat(weatherParts[5]);   // 시정 (km)

  let SKY = 1;
  if (vs >= 20) {
    SKY = 1;
  } else if (vs >= 10) {
    SKY = 3;
  } else {
    SKY = 4;
  }

  const PTY = rn_ox > 0 ? 1 : 0;
  const formattedTime = `${timeStr.substring(0, 4)}-${timeStr.substring(4, 6)}-${timeStr.substring(6, 8)} ${timeStr.substring(8, 10)}:${timeStr.substring(10, 12)}`;

  // PM10 데이터 파싱 및 근접 측정소 매칭
  let nearestPM10: number | undefined = undefined;
  let pm10StationName: string | undefined = undefined;

  if (pm10Res && pm10Res.ok) {
    try {
      const pm10Buffer = await pm10Res.arrayBuffer();
      const pm10Decoder = new TextDecoder('euc-kr');
      const pm10Text = pm10Decoder.decode(pm10Buffer);

      const pm10Lines = pm10Text.split('\n');
      const stationReadings: { [stnId: number]: { time: string, value: number } } = {};

      for (const line of pm10Lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const parts = trimmed.split(',').map(p => p.trim());
        if (parts.length < 3) continue;

        const pTimeStr = parts[0];
        const stnId = parseInt(parts[1], 10);
        const pm10Value = parseFloat(parts[2]);

        if (isNaN(stnId) || isNaN(pm10Value) || pm10Value < 0) continue;

        if (!stationReadings[stnId] || pTimeStr > stationReadings[stnId].time) {
          stationReadings[stnId] = { time: pTimeStr, value: pm10Value };
        }
      }

      // 내 위치에서 가장 가까운 측정소 찾기
      let minDistance = Infinity;
      let nearestStn: PM10Station | null = null;

      for (const station of PM10_STATIONS) {
        if (stationReadings[station.id] !== undefined) {
          const dist = getDistance(lat, lon, station.lat, station.lon);
          if (dist < minDistance) {
            minDistance = dist;
            nearestStn = station;
          }
        }
      }

      if (nearestStn) {
        nearestPM10 = stationReadings[nearestStn.id].value;
        pm10StationName = `${nearestStn.name} (약 ${minDistance.toFixed(1)}km)`;
      }
    } catch (e) {
      console.error("Error parsing PM10 data:", e);
    }
  }

  return {
    time: formattedTime,
    SKY,
    REH: hm,
    PTY,
    T1H: ta,
    PM10: nearestPM10,
    pm10StationName: pm10StationName
  };
}

export function calculateLimitingMagnitude(weather: WeatherData | null, bortle: number): number {
  let baseMag = 7.5 - (bortle * 0.4);
  if (!weather) return 0;
  
  // 기상청 API SKY: 1(맑음), 3(구름많음), 4(흐림)
  // 맑음일 때는 감쇄 없음, 구름많음 1.5등급 감쇄, 흐림 4.0등급 감쇄
  let cloudPenalty = 0;
  if (weather.SKY === 3) cloudPenalty = 1.5;
  else if (weather.SKY === 4) cloudPenalty = 4.0;
  
  let mag = baseMag - cloudPenalty;
  
  // 습도 페널티 (대기 혼탁)
  if (weather.REH > 80) mag -= 0.5;

  // 비나 눈이 오면 시정이 매우 안좋음 (사실상 관측 불가)
  if (weather.PTY > 0) mag -= 5.0;

  // PM10 페널티 추가
  if (weather.PM10 !== undefined && weather.PM10 > 30) {
    let pm10Penalty = 0;
    if (weather.PM10 <= 80) {
      // 보통 단계 (31~80): 최대 -0.3 페널티
      pm10Penalty = ((weather.PM10 - 30) / 50) * 0.3;
    } else if (weather.PM10 <= 150) {
      // 나쁨 단계 (81~150): 최대 -1.0 페널티
      pm10Penalty = 0.3 + ((weather.PM10 - 80) / 70) * 0.7;
    } else {
      // 매우 나쁨 단계 (151+): 최대 -2.5 페널티 (상한 2.5)
      pm10Penalty = 1.0 + Math.min(1.5, ((weather.PM10 - 150) / 150) * 1.5);
    }
    mag -= pm10Penalty;
  }

  return Math.max(0, mag);
}

export async function fetchBortleScale(lat: number, lon: number): Promise<number | null> {
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
    return null; // 매칭 안 될 경우 null
  } catch (error) {
    console.error("Bortle scale fetch failed:", error);
    return null; // 에러 시 null
  }
}
