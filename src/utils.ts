// 격자 변환 상수 (기상청 가이드라인)
const RE = 6371.00877; // 지구 반경(km)
const GRID = 5.0;      // 격자 간격(km)
const SLAT1 = 30.0;    // 투영 위도1(degree)
const SLAT2 = 60.0;    // 투영 위도2(degree)
const OLON = 126.0;    // 기준점 경도(degree)
const OLAT = 38.0;     // 기준점 위도(degree)
const XO = 43;         // 기준점 X좌표(GRID)
const YO = 136;        // 기전점 Y좌표(GRID)

export function dfs_xy_conv(code: "toXY" | "toLL", v1: number, v2: number) {
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);
  
  const rs: { lat?: number; lng?: number; x?: number; y?: number } = {};
  if (code === "toXY") {
    rs.lat = v1;
    rs.lng = v2;
    let ra = Math.tan(Math.PI * 0.25 + (v1) * DEGRAD * 0.5);
    ra = re * sf / Math.pow(ra, sn);
    let theta = v2 * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;
    rs.x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    rs.y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  }
  return rs;
}

export function getBaseDateTimeForUltraSrtFcst() {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  let date = now.getDate();
  let hours = now.getHours();
  let minutes = now.getMinutes();

  // 초단기예보(getUltraSrtFcst)는 매시간 30분 생성되며 45분 이후부터 API 호출이 가능합니다.
  // 예: 현재 시간이 10시 40분 -> base_time은 0930 (10시 30분 예보는 아직 안나옴)
  // 예: 현재 시간이 10시 50분 -> base_time은 1030
  
  if (minutes < 45) {
    hours = hours - 1;
    if (hours < 0) {
      // 자정 이전으로 넘어갈 경우 전날로 계산
      const prevDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      year = prevDate.getFullYear();
      month = prevDate.getMonth() + 1;
      date = prevDate.getDate();
      hours = 23;
    }
  }

  const base_date = `${year}${month.toString().padStart(2, '0')}${date.toString().padStart(2, '0')}`;
  const base_time = `${hours.toString().padStart(2, '0')}30`;

  return { base_date, base_time };
}
