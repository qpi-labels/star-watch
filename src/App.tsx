import React, { useState, useEffect } from 'react';
import { WeatherData, StarData } from './types';
import { fetchWeatherData, calculateLimitingMagnitude, brightStars, fetchBortleScale } from './api';

interface PresetLocation {
  name: string;
  lat: number;
  lon: number;
  bortle: number;
}

const PRESETS: PresetLocation[] = [
  { name: "선택 안 함 (직접 입력)", lat: 37.5665, lon: 126.9780, bortle: 6 },
  { name: "서울시청 (Bortle 8)", lat: 37.5665, lon: 126.9780, bortle: 8 },
  { name: "보현산 천문대 (Bortle 2)", lat: 36.1643, lon: 128.9765, bortle: 2 },
  { name: "소백산 천문대 (Bortle 2)", lat: 36.9348, lon: 128.4552, bortle: 2 },
  { name: "제주도 1100고지 (Bortle 3)", lat: 33.3578, lon: 126.4633, bortle: 3 },
  { name: "지리산 정령치 (Bortle 3)", lat: 35.3780, lon: 127.5307, bortle: 3 },
];

const App: React.FC = () => {
  const [mode, setMode] = useState<'api' | 'manual'>('manual'); // 테스트 용이성을 위해 수동 모드 기본값 설정
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [inputLat, setInputLat] = useState<string>("");
  const [inputLon, setInputLon] = useState<string>("");
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [bortle, setBortle] = useState<number>(6);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [limitingMag, setLimitingMag] = useState<number>(0);
  const [stars, setStars] = useState<StarData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 수동 시뮬레이션 상태
  const [manualSky, setManualSky] = useState<number>(1);
  const [manualReh, setManualReh] = useState<number>(50);
  const [manualPty, setManualPty] = useState<number>(0);
  const [manualT1h, setManualT1h] = useState<number>(20);

  // 슬라이더 조절 시 실시간으로 계산 적용
  useEffect(() => {
    let weatherObj: WeatherData | null = null;
    if (mode === 'api') {
      weatherObj = weather;
    } else {
      weatherObj = {
        time: new Date().toISOString(),
        SKY: manualSky,
        REH: manualReh,
        PTY: manualPty,
        T1H: manualT1h
      };
    }

    if (weatherObj) {
      const mag = calculateLimitingMagnitude(weatherObj, bortle);
      setLimitingMag(mag);
      const visibleStars = brightStars
        .filter(star => star.mag <= mag)
        .sort((a, b) => a.mag - b.mag);
      setStars(visibleStars);
    } else {
      setLimitingMag(0);
      setStars([]);
    }
  }, [mode, weather, bortle, manualSky, manualReh, manualPty, manualT1h]);

  const handlePresetChange = (index: number) => {
    setPresetIndex(index);
    if (index > 0) {
      const preset = PRESETS[index];
      setInputLat(preset.lat.toString());
      setInputLon(preset.lon.toString());
      setBortle(preset.bortle);
      setLat(preset.lat);
      setLon(preset.lon);
      handleFetchLiveWeather(preset.lat, preset.lon);
    }
  };

  const handleFetchLiveWeather = async (targetLat: number, targetLon: number) => {
    setLoading(true);
    try {
      const data = await fetchWeatherData(targetLat, targetLon);
      setWeather(data);
      const fetchedBortle = await fetchBortleScale(targetLat, targetLon);
      setBortle(fetchedBortle);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.message || "";
      if (errMsg.includes("403:")) {
        alert(errMsg.substring(errMsg.indexOf("403:") + 4));
      } else if (errMsg.includes("401:")) {
        alert(errMsg.substring(errMsg.indexOf("401:") + 4));
      } else {
        alert("기상청 API 연동에 실패했습니다. (CORS 문제 또는 네트워크 에러). 수동 시뮬레이션 모드를 사용하여 계산 결과를 계속 검증하실 수 있습니다.");
      }
      setMode('manual');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomFetch = () => {
    const parsedLat = parseFloat(inputLat);
    const parsedLon = parseFloat(inputLon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      alert("올바른 위도와 경도를 입력해주세요.");
      return;
    }
    setLat(parsedLat);
    setLon(parsedLon);
    handleFetchLiveWeather(parsedLat, parsedLon);
  };

  const handleLocate = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          setLat(latitude);
          setLon(longitude);
          setInputLat(latitude.toFixed(4));
          setInputLon(longitude.toFixed(4));
          setPresetIndex(0);
          handleFetchLiveWeather(latitude, longitude);
        },
        (error) => {
          console.error(error);
          alert("위치 정보를 가져올 수 없습니다. 직접 입력 혹은 시뮬레이션 모드를 사용해주세요.");
          setLoading(false);
        }
      );
    } else {
      alert("이 브라우저에서는 위치 정보가 지원되지 않습니다.");
      setLoading(false);
    }
  };

  let desc = "관측 적합도를 계산하세요";
  if (limitingMag >= 6) desc = "매우 맑음! 맨눈으로 수천 개의 별이 보입니다. 은하수 관측이 가능합니다.";
  else if (limitingMag >= 4) desc = "양호함. 주요 별자리와 밝은 별 관측이 가능합니다.";
  else if (limitingMag > 0) desc = "나쁨. 밝은 1~2등성만 겨우 보입니다.";
  else desc = "매우 나쁨. 구름이나 비로 인해 별을 관측하기 어렵습니다.";

  // 현재 활성화된 날씨 정보 표시용 변수
  const displaySky = mode === 'api' ? (weather?.SKY ?? 1) : manualSky;
  const displayReh = mode === 'api' ? (weather?.REH ?? 50) : manualReh;
  const displayPty = mode === 'api' ? (weather?.PTY ?? 0) : manualPty;
  const displayT1h = mode === 'api' ? (weather?.T1H ?? 20) : manualT1h;
  const displayTime = mode === 'api' ? (weather ? new Date(weather.time).toLocaleTimeString() : '-') : '실시간 시뮬레이션 중';

  return (
    <div className="pdf-app">
      <div className="stars-bg"></div>
      <header className="pdf-header">
        <div className="logo">✨ AstroLimit</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: mode === 'api' ? '#4ade80' : '#a1a1aa' }}>
            ● {mode === 'api' ? '실시간 연동' : '수동 시뮬레이션'}
          </span>
        </div>
      </header>

      <main className="pdf-main">
        {/* 제어 패널 (설정 영역) */}
        <section className="glass-card settings-section">
          <div className="mode-tabs">
            <button 
              className={`tab-btn ${mode === 'api' ? 'active' : ''}`} 
              onClick={() => setMode('api')}
            >
              📡 실시간 기상청 API 모드
            </button>
            <button 
              className={`tab-btn ${mode === 'manual' ? 'active' : ''}`} 
              onClick={() => setMode('manual')}
            >
              🛠️ 수동 시뮬레이션 모드
            </button>
          </div>

          <div className="settings-grid">
            {/* 공통: 보틀 스케일 */}
            <div className="form-group">
              <label className="form-label">광공해 등급 (Bortle Scale): <span style={{ color: 'var(--color-accent)' }}>{bortle}</span></label>
              <div className="range-container">
                <input 
                  type="range" 
                  min="1" 
                  max="9" 
                  value={bortle} 
                  onChange={(e) => setBortle(Number(e.target.value))} 
                  className="range-slider"
                />
              </div>
              <span className="preset-info">
                {bortle === 1 && "Bortle 1: 최고의 밤하늘 (극한의 시골)"}
                {bortle === 2 && "Bortle 2: 매우 어두운 밤하늘"}
                {bortle === 3 && "Bortle 3: 시골 하늘"}
                {bortle === 4 && "Bortle 4: 시골/도심 경계"}
                {bortle === 5 && "Bortle 5: 도심 외곽 하늘"}
                {bortle === 6 && "Bortle 6: 밝은 도심 외곽"}
                {bortle === 7 && "Bortle 7: 도심 하늘"}
                {bortle === 8 && "Bortle 8: 매우 밝은 도심"}
                {bortle === 9 && "Bortle 9: 도심 중심부 (광공해 극심)"}
              </span>
            </div>

            {/* 모드별 세부 제어 */}
            {mode === 'api' ? (
              <>
                <div className="form-group">
                  <label className="form-label">국내 관측지 프리셋</label>
                  <select 
                    className="form-select" 
                    value={presetIndex} 
                    onChange={(e) => handlePresetChange(Number(e.target.value))}
                  >
                    {PRESETS.map((p, idx) => (
                      <option key={idx} value={idx}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">위경도 직접 입력</label>
                  <div className="form-input-row">
                    <input 
                      type="number" 
                      placeholder="위도" 
                      value={inputLat} 
                      onChange={(e) => {
                        setInputLat(e.target.value);
                        setPresetIndex(0);
                      }} 
                      className="form-input"
                    />
                    <input 
                      type="number" 
                      placeholder="경도" 
                      value={inputLon} 
                      onChange={(e) => {
                        setInputLon(e.target.value);
                        setPresetIndex(0);
                      }} 
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn" 
                    style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid var(--color-border-default)' }}
                    onClick={handleLocate}
                    disabled={loading}
                  >
                    📍 GPS 내 위치
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleCustomFetch}
                    disabled={loading}
                  >
                    {loading ? "조회 중..." : "날씨 조회"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">구름량 상태 (SKY)</label>
                  <select 
                    className="form-select" 
                    value={manualSky} 
                    onChange={(e) => setManualSky(Number(e.target.value))}
                  >
                    <option value="1">맑음 (SKY 1) - 감쇄 0.0</option>
                    <option value="3">구름많음 (SKY 3) - 감쇄 -1.5</option>
                    <option value="4">흐림 (SKY 4) - 감쇄 -4.0</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">상대 습도 (REH): <span style={{ color: 'var(--color-accent)' }}>{manualReh}%</span></label>
                  <div className="range-container">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={manualReh} 
                      onChange={(e) => setManualReh(Number(e.target.value))} 
                      className="range-slider"
                    />
                  </div>
                  <span className="preset-info">
                    {manualReh > 80 ? "⚠️ 습도 80% 초과 패널티 적용 (-0.5)" : "대기 혼탁 양호"}
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">강수 형태 (PTY)</label>
                  <select 
                    className="form-select" 
                    value={manualPty} 
                    onChange={(e) => setManualPty(Number(e.target.value))}
                  >
                    <option value="0">없음 - 감쇄 0.0</option>
                    <option value="1">비 - 패널티 적용 (-5.0)</option>
                    <option value="2">비/눈 - 패널티 적용 (-5.0)</option>
                    <option value="3">눈 - 패널티 적용 (-5.0)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">기온 (T1H): <span style={{ color: 'var(--color-accent)' }}>{manualT1h}℃</span></label>
                  <div className="range-container">
                    <input 
                      type="range" 
                      min="-20" 
                      max="40" 
                      value={manualT1h} 
                      onChange={(e) => setManualT1h(Number(e.target.value))} 
                      className="range-slider"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 대시보드 그리드 */}
        <section className="dashboard-grid">
          <div className="glass-card col-span-2">
            <h2>📍 관측 위치 좌표</h2>
            <div className="data-value">
              {lat !== null && lon !== null ? `${lat.toFixed(4)}°, ${lon.toFixed(4)}°` : '시뮬레이션 가상 좌표'}
            </div>
            <div className="data-label">
              업데이트: {displayTime}
            </div>
          </div>

          <div className="glass-card highlight-card col-span-2">
            <h2>🔭 계산된 육안 한계 등급 (Limiting Mag)</h2>
            <div className="data-value huge">{limitingMag > 0 ? limitingMag.toFixed(1) : '0.0'}</div>
            <div className="data-label">{desc}</div>
          </div>

          <div className="glass-card">
            <h3>☁️ 하늘상태</h3>
            <div className="data-value">
              {displaySky === 1 ? '맑음' : displaySky === 3 ? '구름많음' : '흐림'}
            </div>
          </div>
          <div className="glass-card">
            <h3>💧 상대습도</h3>
            <div className="data-value">{displayReh}%</div>
          </div>
          <div className="glass-card">
            <h3>🌡️ 기온</h3>
            <div className="data-value">{displayT1h}℃</div>
          </div>
          <div className="glass-card">
            <h3>☔ 강수형태</h3>
            <div className="data-value">
              {displayPty === 0 ? '없음' : displayPty === 1 ? '비' : displayPty === 2 ? '비/눈' : displayPty === 3 ? '눈' : '빗방울/눈날림'}
            </div>
          </div>
        </section>

        {/* 별 목록 */}
        <section className="stars-section">
          <h2>🌟 현재 조건에서 맨눈 관측 가능한 주요 별 ({stars.length}개)</h2>
          <div className="glass-card list-card">
            <ul className="stars-list">
              {limitingMag > 0 && stars.length === 0 ? (
                <li className="empty-state">현재 조건에서 관측 가능한 별이 없습니다.</li>
              ) : stars.length > 0 ? (
                stars.map((star, idx) => (
                  <li key={idx}>
                    <div className="star-item-name">{star.name}</div>
                    <div className="star-item-mag">밝기 등급: {star.mag.toFixed(2)}</div>
                  </li>
                ))
              ) : (
                <li className="empty-state">계산을 진행하면 관측 가능 별 목록이 갱신됩니다.</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
