// 기본 상태 관리
const state = {
  lat: null,
  lon: null,
  weather: null,
  bortle: 5, // 기본값 (도심 외곽)
  limitingMag: 0,
  stars: []
};

// 상위 20개 밝은 별 데이터 (HYG Database 일부 추출)
const brightStars = [
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

// DOM 요소를 업데이트하는 함수
function updateUI() {
  document.getElementById('location-display').innerText = state.lat 
    ? `${state.lat.toFixed(4)}°, ${state.lon.toFixed(4)}°` 
    : '위치 정보를 불러와주세요';

  if (state.weather) {
    document.getElementById('cloud-display').innerText = `${state.weather.cloud_cover} %`;
    document.getElementById('humidity-display').innerText = `${state.weather.relative_humidity_2m} %`;
    document.getElementById('visibility-display').innerText = `${(state.weather.visibility / 1000).toFixed(1)} km`;
    
    // 시간 업데이트
    const date = new Date(state.weather.time);
    document.getElementById('time-display').innerText = `업데이트: ${date.toLocaleTimeString()}`;
  }

  document.getElementById('bortle-display').innerText = state.bortle;

  if (state.limitingMag > 0) {
    document.getElementById('mag-display').innerText = state.limitingMag.toFixed(1);
    
    let desc = '';
    if (state.limitingMag >= 6) desc = "매우 맑음! 맨눈으로 수천 개의 별이 보입니다.";
    else if (state.limitingMag >= 4) desc = "양호함. 주요 별자리와 밝은 별 관측이 가능합니다.";
    else if (state.limitingMag >= 2) desc = "나쁨. 밝은 1~2등성만 겨우 보입니다.";
    else desc = "매우 나쁨. 별을 관측하기 어렵습니다.";
    
    document.getElementById('mag-desc').innerText = desc;
  }

  // 별 목록 업데이트
  const starsList = document.getElementById('stars-list');
  starsList.innerHTML = '';
  
  if (state.stars.length === 0 && state.limitingMag > 0) {
    starsList.innerHTML = '<li class="empty-state">현재 조건에서 보이는 별이 없습니다.</li>';
  } else if (state.stars.length > 0) {
    state.stars.forEach(star => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="star-item-name">${star.name}</div>
        <div class="star-item-mag">등급: ${star.mag}</div>
      `;
      starsList.appendChild(li);
    });
  } else {
    starsList.innerHTML = '<li class="empty-state">계산을 완료하면 이곳에 별 목록이 나타납니다.</li>';
  }
}

// 한계 등급 계산 알고리즘 (초안)
function calculateLimitingMagnitude() {
  // 1. Bortle Scale 기반 기본 한계 등급 (Bortle 1 = 7.5, Bortle 9 = 4.0 등)
  let baseMag = 7.5 - (state.bortle * 0.4); 

  // 2. 기상 악화 감쇄 로직
  if (!state.weather) return 0;
  
  const cloudFactor = state.weather.cloud_cover / 100; // 0 ~ 1
  const humidityFactor = state.weather.relative_humidity_2m / 100; // 0 ~ 1
  const visibilityKm = state.weather.visibility / 1000;
  
  // 구름이 많으면 급격히 감쇄
  let mag = baseMag - (cloudFactor * 4.0); 
  
  // 습도 및 시정에 따른 감쇄
  if (humidityFactor > 0.8) mag -= 0.5;
  if (visibilityKm < 10) mag -= (10 - visibilityKm) * 0.1;

  return Math.max(0, mag);
}

// 별 필터링 함수
function filterStars() {
  // 실제 프로덕션에서는 현재 시간에 따른 고도(Altitude) 계산이 들어가야 함
  // 현재는 단순히 계산된 한계 등급보다 밝은(등급 숫자가 작은) 별만 추출
  state.stars = brightStars
    .filter(star => star.mag <= state.limitingMag)
    .sort((a, b) => a.mag - b.mag); // 가장 밝은 별부터 정렬
}

// Open-Meteo API 데이터 획득
async function fetchWeatherData(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=relative_humidity_2m,cloud_cover,visibility&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    
    state.weather = data.current;
    
    // 도심일수록 Bortle Scale이 높음 (임시 추정 로직)
    state.bortle = 6; 
    
    state.limitingMag = calculateLimitingMagnitude();
    filterStars();
    updateUI();
  } catch (error) {
    console.error("날씨 데이터를 가져오는 중 오류 발생:", error);
    alert("날씨 데이터를 가져오는데 실패했습니다.");
  }
}

// 초기화 및 이벤트 리스너
document.getElementById('btn-locate').addEventListener('click', () => {
  const btn = document.getElementById('btn-locate');
  btn.innerText = "위치 찾는 중...";
  btn.disabled = true;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.lat = position.coords.latitude;
        state.lon = position.coords.longitude;
        btn.innerText = "데이터 분석 중...";
        
        fetchWeatherData(state.lat, state.lon).then(() => {
          btn.innerText = "계산 완료";
          btn.disabled = false;
        });
      },
      (error) => {
        console.error("위치 정보 에러:", error);
        alert("위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.");
        btn.innerText = "내 위치로 계산하기";
        btn.disabled = false;
      }
    );
  } else {
    alert("이 브라우저에서는 위치 정보가 지원되지 않습니다.");
    btn.innerText = "내 위치로 계산하기";
    btn.disabled = false;
  }
});
