import React, { useState, useEffect, useRef } from 'react';
import { WeatherData, StarData } from './types';
import { fetchWeatherData, calculateLimitingMagnitude, brightStars, fetchBortleScale } from './api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [mode, setMode] = useState<'api' | 'manual'>('api');
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
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleCoreRef = useRef<L.Circle | null>(null);
  const circleInnerRef = useRef<L.Circle | null>(null);
  const circleOuterRef = useRef<L.Circle | null>(null);

  const modeRef = useRef(mode);
  const handleFetchRef = useRef(handleFetchLiveWeather);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    handleFetchRef.current = handleFetchLiveWeather;
  }, [handleFetchLiveWeather]);

  // Helper to get Bortle-specific color
  const getBortleColor = (b: number) => {
    if (b <= 2) return '#00ffd0'; // 청정 지역 (Teal)
    if (b <= 4) return '#2bff00'; // 외곽/시골 (Green)
    if (b <= 6) return '#ffbb00'; // 도심 경계 (Yellow/Orange)
    if (b <= 8) return '#ff5500'; // 도심 (Orange)
    return '#ff0000'; // 도심 중심 (Red)
  };

  // Initialize Leaflet Map (persistent across modes)
  useEffect(() => {
    const initialLat = lat || 37.5665;
    const initialLon = lon || 126.9780;

    const timer = setTimeout(() => {
      if (mapRef.current) return;

      const map = L.map('map').setView([initialLat, initialLon], 10);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Custom red glowing dot marker matching PDF-DS red
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: var(--color-functional-red); width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: var(--shadow-functional-glow);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([initialLat, initialLon], {
        draggable: true,
        icon: customIcon
      }).addTo(map);
      markerRef.current = marker;

      // 3-Layer Light Pollution Dome
      const initialColor = getBortleColor(bortle);
      
      const circleCore = L.circle([initialLat, initialLon], {
        radius: bortle * 300,
        fillColor: initialColor,
        fillOpacity: 0.4,
        color: initialColor,
        weight: 1
      }).addTo(map);
      circleCoreRef.current = circleCore;

      const circleInner = L.circle([initialLat, initialLon], {
        radius: bortle * 800,
        fillColor: initialColor,
        fillOpacity: 0.2,
        color: initialColor,
        weight: 1
      }).addTo(map);
      circleInnerRef.current = circleInner;

      const circleOuter = L.circle([initialLat, initialLon], {
        radius: bortle * 2000,
        fillColor: initialColor,
        fillOpacity: 0.08,
        color: initialColor,
        weight: 1.5,
        dashArray: '5, 10'
      }).addTo(map);
      circleOuterRef.current = circleOuter;

      // Bind dynamic popup
      const updatePopup = (bVal: number) => {
        const popupContent = `
          <div style="font-family: var(--font-sans); color: #09090b; font-size: 12px; padding: 4px; line-height: 1.4;">
            <strong style="color: var(--color-functional-red); font-size: 13px;">Bortle ${bVal} 광공해 돔</strong><br/>
            • 핵심 영역: ${(bVal * 0.3).toFixed(1)}km<br/>
            • 확산 영향권: ${(bVal * 2.0).toFixed(1)}km
          </div>
        `;
        marker.bindPopup(popupContent);
        circleOuter.bindPopup(popupContent);
      };
      updatePopup(bortle);

      // Handle map clicks
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLon } = e.latlng;
        marker.setLatLng([clickLat, clickLon]);
        circleCore.setLatLng([clickLat, clickLon]);
        circleInner.setLatLng([clickLat, clickLon]);
        circleOuter.setLatLng([clickLat, clickLon]);
        
        setInputLat(clickLat.toFixed(4));
        setInputLon(clickLon.toFixed(4));
        setLat(clickLat);
        setLon(clickLon);
        setPresetIndex(0);

        if (modeRef.current === 'api') {
          handleFetchRef.current(clickLat, clickLon);
        }
      });

      // Handle marker drag
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        circleCore.setLatLng(position);
        circleInner.setLatLng(position);
        circleOuter.setLatLng(position);
        
        setInputLat(position.lat.toFixed(4));
        setInputLon(position.lng.toFixed(4));
        setLat(position.lat);
        setLon(position.lng);
        setPresetIndex(0);

        if (modeRef.current === 'api') {
          handleFetchRef.current(position.lat, position.lng);
        }
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleCoreRef.current = null;
        circleInnerRef.current = null;
        circleOuterRef.current = null;
      }
    };
  }, []);

  // Sync map view, marker, and light pollution circles when coordinates or bortle scale updates
  useEffect(() => {
    if (lat !== null && lon !== null && mapRef.current) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
      
      const color = getBortleColor(bortle);
      
      if (circleCoreRef.current) {
        circleCoreRef.current.setLatLng([lat, lon]);
        circleCoreRef.current.setRadius(bortle * 300);
        circleCoreRef.current.setStyle({
          fillColor: color,
          color: color,
          fillOpacity: 0.4
        });
      }
      
      if (circleInnerRef.current) {
        circleInnerRef.current.setLatLng([lat, lon]);
        circleInnerRef.current.setRadius(bortle * 800);
        circleInnerRef.current.setStyle({
          fillColor: color,
          color: color,
          fillOpacity: 0.2
        });
      }

      if (circleOuterRef.current) {
        circleOuterRef.current.setLatLng([lat, lon]);
        circleOuterRef.current.setRadius(bortle * 2000);
        circleOuterRef.current.setStyle({
          fillColor: color,
          color: color,
          fillOpacity: 0.08
        });
      }

      const popupContent = `
        <div style="font-family: var(--font-sans); color: #09090b; font-size: 12px; padding: 4px; line-height: 1.4;">
          <strong style="color: var(--color-functional-red); font-size: 13px;">Bortle ${bortle} 광공해 돔</strong><br/>
          • 핵심 영역: ${(bortle * 0.3).toFixed(1)}km<br/>
          • 확산 영향권: ${(bortle * 2.0).toFixed(1)}km
        </div>
      `;
      if (markerRef.current) markerRef.current.bindPopup(popupContent);
      if (circleOuterRef.current) circleOuterRef.current.bindPopup(popupContent);
      
      mapRef.current.setView([lat, lon], mapRef.current.getZoom());
    }
  }, [lat, lon, bortle]);

  // 초기 진입 시 서울시청 기상 정보 자동 조회
  useEffect(() => {
    setLat(37.5665);
    setLon(126.9780);
    setInputLat("37.5665");
    setInputLon("126.9780");
    setPresetIndex(1);
    setBortle(8);
    handleFetchLiveWeather(37.5665, 126.9780);
  }, []);

  // 수동 시뮬레이션 상태
  const [manualSky, setManualSky] = useState<number>(1);
  const [manualReh, setManualReh] = useState<number>(50);
  const [manualPty, setManualPty] = useState<number>(0);
  const [manualT1h, setManualT1h] = useState<number>(20);

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

  async function handleFetchLiveWeather(targetLat: number, targetLon: number) {
    setLoading(true);
    try {
      const data = await fetchWeatherData(targetLat, targetLon);
      setWeather(data);
      const fetchedBortle = await fetchBortleScale(targetLat, targetLon);
      if (fetchedBortle !== null) {
        setBortle(fetchedBortle);
      }
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
      setMobileNavOpen(false); // Close sidebar on mobile after fetch
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

  const displaySky = mode === 'api' ? (weather?.SKY ?? 1) : manualSky;
  const displayReh = mode === 'api' ? (weather?.REH ?? 50) : manualReh;
  const displayPty = mode === 'api' ? (weather?.PTY ?? 0) : manualPty;
  const displayT1h = mode === 'api' ? (weather?.T1H ?? 20) : manualT1h;
  const displayTime = mode === 'api' ? (weather ? new Date(weather.time).toLocaleTimeString() : '-') : '실시간 시뮬레이션 중';

  return (
    <div className="pdf-app">
      <div className="stars-bg"></div>
      
      {/* Mobile Top Header (Hidden on Desktop) */}
      <header className="mobile-header pdf-flex-row pdf-justify-between pdf-items-center pdf-p-150 pdf-border-bottom" style={{ height: '56px', backgroundColor: 'var(--color-bg-secondary)', zIndex: 100 }}>
        <div className="pdf-text-label-16 pdf-font-bold">✨ AstroLimit</div>
        <button 
          className="pdf-btn-primary pdf-btn-xs" 
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          {mobileNavOpen ? "설정 닫기" : "설정 열기"}
        </button>
      </header>

      {/* Main Drawer Overlay for mobile */}
      {mobileNavOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setMobileNavOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}
        ></div>
      )}

      {/* Left Sidebar (Settings Control Center) */}
      <aside className={`pdf-sidebar ${mobileNavOpen ? 'mobile-nav-open' : ''}`} style={{ padding: '24px' }}>
        <div className="pdf-mb-300 desktop-logo">
          <h1 className="pdf-text-heading-32 pdf-font-bold">✨ AstroLimit</h1>
          <p className="pdf-text-copy-13-mono pdf-text-muted pdf-mt-100">PHYSICAL-DIGITAL INTEGRATED CALCULATOR</p>
        </div>

        {/* Tab mode selection */}
        <div className="pdf-flex-row pdf-gap-100 pdf-mb-300" style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border-default)' }}>
          <button 
            className={`pdf-btn-primary pdf-btn-xs ${mode === 'api' ? '' : 'pdf-secondary-btn'}`}
            style={{ flex: 1, height: '32px', borderRadius: '6px', fontSize: '11px', border: mode === 'api' ? 'none' : '1px solid transparent' }}
            onClick={() => setMode('api')}
          >
            📡 실시간 API
          </button>
          <button 
            className={`pdf-btn-primary pdf-btn-xs ${mode === 'manual' ? '' : 'pdf-secondary-btn'}`}
            style={{ flex: 1, height: '32px', borderRadius: '6px', fontSize: '11px', border: mode === 'manual' ? 'none' : '1px solid transparent' }}
            onClick={() => setMode('manual')}
          >
            🛠️ 시뮬레이션
          </button>
        </div>

        {/* Setting Groups */}
        <div className="pdf-flex-col pdf-gap-200">
          {/* Bortle scale selection */}
          <div className="pdf-panel" style={{ padding: '16px', marginBottom: 0 }}>
            <div className="pdf-panel-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '8px' }}>
              <label className="pdf-text-label-14-mono pdf-font-bold">BORTLE SCALE: <span className="pdf-text-red">{bortle}</span></label>
            </div>
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
            <p className="pdf-text-copy-13-mono pdf-text-muted pdf-mt-100" style={{ fontSize: '10px' }}>
              {bortle === 1 && "Bortle 1: 최고의 밤하늘 (극한의 시골)"}
              {bortle === 2 && "Bortle 2: 매우 어두운 밤하늘"}
              {bortle === 3 && "Bortle 3: 시골 하늘"}
              {bortle === 4 && "Bortle 4: 시골/도심 경계"}
              {bortle === 5 && "Bortle 5: 도심 외곽 하늘"}
              {bortle === 6 && "Bortle 6: 밝은 도심 외곽"}
              {bortle === 7 && "Bortle 7: 도심 하늘"}
              {bortle === 8 && "Bortle 8: 매우 밝은 도심"}
              {bortle === 9 && "Bortle 9: 도심 중심부 (광공해 극심)"}
            </p>
          </div>

          {mode === 'api' ? (
            <>
              {/* Presets */}
              <div className="pdf-flex-col pdf-gap-050">
                <label className="pdf-text-label-14-mono pdf-text-muted">국내 별 관측지 프리셋</label>
                <select 
                  className="pdf-input pdf-input-sm" 
                  value={presetIndex} 
                  onChange={(e) => handlePresetChange(Number(e.target.value))}
                  style={{ maxWidth: '100%', height: '40px' }}
                >
                  {PRESETS.map((p, idx) => (
                    <option key={idx} value={idx}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Coordinate Inputs */}
              <div className="pdf-flex-col pdf-gap-050">
                <label className="pdf-text-label-14-mono pdf-text-muted">위도 / 경도 직접 입력</label>
                <div className="pdf-flex-row pdf-gap-100">
                  <input 
                    type="number" 
                    placeholder="위도" 
                    value={inputLat} 
                    onChange={(e) => {
                      setInputLat(e.target.value);
                      setPresetIndex(0);
                    }} 
                    className="pdf-input pdf-input-sm"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <input 
                    type="number" 
                    placeholder="경도" 
                    value={inputLon} 
                    onChange={(e) => {
                      setInputLon(e.target.value);
                      setPresetIndex(0);
                    }} 
                    className="pdf-input pdf-input-sm"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                </div>
              </div>



              {/* Action Buttons */}
              <div className="pdf-flex-col pdf-gap-100 pdf-mt-100">
                <button 
                  className="pdf-btn-primary pdf-btn-sm" 
                  onClick={handleCustomFetch}
                  disabled={loading}
                >
                  {loading ? "조회 중..." : "📡 실시간 데이터 조회"}
                </button>
                <button 
                  className="pdf-secondary-btn pdf-btn-sm" 
                  style={{ justifyContent: 'center' }}
                  onClick={handleLocate}
                  disabled={loading}
                >
                  📍 GPS 내 위치 스캔
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Sky condition selector */}
              <div className="pdf-flex-col pdf-gap-050">
                <label className="pdf-text-label-14-mono pdf-text-muted">하늘 상태 (SKY)</label>
                <select 
                  className="pdf-input pdf-input-sm" 
                  value={manualSky} 
                  onChange={(e) => setManualSky(Number(e.target.value))}
                  style={{ maxWidth: '100%', height: '40px' }}
                >
                  <option value="1">맑음 (SKY 1) - 감쇄 0.0</option>
                  <option value="3">구름많음 (SKY 3) - 감쇄 -1.5</option>
                  <option value="4">흐림 (SKY 4) - 감쇄 -4.0</option>
                </select>
              </div>

              {/* Humidity slider */}
              <div className="pdf-flex-col pdf-gap-050">
                <label className="pdf-text-label-14-mono pdf-text-muted">상대 습도 (REH): <span className="pdf-text-red">{manualReh}%</span></label>
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
                {manualReh > 80 && (
                  <span className="pdf-text-copy-13-mono pdf-text-red" style={{ fontSize: '10px' }}>
                    ⚠️ 고습도 페널티 적용 (-0.5)
                  </span>
                )}
              </div>

              {/* Precipitation selector */}
              <div className="pdf-flex-col pdf-gap-050">
                <label className="pdf-text-label-14-mono pdf-text-muted">강수 여부 (PTY)</label>
                <select 
                  className="pdf-input pdf-input-sm" 
                  value={manualPty} 
                  onChange={(e) => setManualPty(Number(e.target.value))}
                  style={{ maxWidth: '100%', height: '40px' }}
                >
                  <option value="0">강수 없음</option>
                  <option value="1">강수 감지 (관측 불가 -5.0)</option>
                </select>
              </div>

              {/* Temperature slider */}
              <div className="pdf-flex-col pdf-gap-050">
                <label className="pdf-text-label-14-mono pdf-text-muted">기온 (T1H): <span className="pdf-text-red">{manualT1h}℃</span></label>
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
      </aside>

      {/* Right Content Area */}
      <main className="pdf-main-view">
        <div className="pdf-main-content pdf-content-relative">
          {/* Header specification block */}
          <div className="pdf-mb-300">
            <span className="pdf-text-label-14-mono pdf-text-red pdf-font-bold" style={{ display: 'block', marginBottom: '8px' }}>
              CH.1 ATMOSPHERIC LIGHT PENETRATION METRICS
            </span>
            <h2 className="pdf-text-heading-32 pdf-font-bold">실시간 천체 관측 한계 등급 대시보드</h2>
          </div>

          <div className="pdf-flex-col pdf-gap-300">
            {/* Top row split widgets */}
            <div className="pdf-flex-row pdf-gap-300 pdf-flex-wrap" style={{ width: '100%' }}>
              
              {/* Calculated limiting magnitude display */}
              <div className="pdf-panel pdf-flex-col pdf-justify-between" style={{ flex: '1 1 45%', minWidth: '280px', padding: '24px' }}>
                <div>
                  <span className="pdf-text-label-14-mono pdf-text-muted" style={{ display: 'block', marginBottom: '16px' }}>
                    EST. LIMITING MAGNITUDE
                  </span>
                  <div className="pdf-text-heading-72 pdf-text-red pdf-font-bold pdf-shadow-glow" style={{ fontSize: '78px', lineHeight: '1.0' }}>
                    {limitingMag > 0 ? limitingMag.toFixed(1) : '0.0'}
                  </div>
                </div>
                <div className="pdf-mt-200">
                  <strong className="pdf-text-label-16" style={{ display: 'block', marginBottom: '6px' }}>관측 감도 적합도</strong>
                  <p className="pdf-text-copy-14 pdf-text-muted">{desc}</p>
                </div>
              </div>

              {/* Observatory location & weather specifics */}
              <div className="pdf-panel" style={{ flex: '1 1 45%', minWidth: '280px', padding: '24px' }}>
                <span className="pdf-text-label-14-mono pdf-text-muted" style={{ display: 'block', marginBottom: '16px' }}>
                  OBSERVATORY METRICS
                </span>
                
                <div className="pdf-flex-col pdf-gap-150">
                  <div className="pdf-flex-row pdf-justify-between pdf-border-bottom pdf-pb-100">
                    <span className="pdf-text-copy-14 pdf-text-muted">관측지 좌표</span>
                    <strong className="pdf-text-copy-14">
                      {lat !== null && lon !== null ? `${lat.toFixed(4)}°, ${lon.toFixed(4)}°` : '시뮬레이션 모드'}
                    </strong>
                  </div>
                  <div className="pdf-flex-row pdf-justify-between pdf-border-bottom pdf-pb-100">
                    <span className="pdf-text-copy-14 pdf-text-muted">데이터 업데이트</span>
                    <strong className="pdf-text-copy-14">{displayTime}</strong>
                  </div>
                  <div className="pdf-flex-row pdf-justify-between pdf-border-bottom pdf-pb-100">
                    <span className="pdf-text-copy-14 pdf-text-muted">하늘 상태</span>
                    <strong className="pdf-text-copy-14">
                      {displaySky === 1 ? '맑음' : displaySky === 3 ? '구름많음' : '흐림'}
                    </strong>
                  </div>
                  <div className="pdf-flex-row pdf-justify-between pdf-border-bottom pdf-pb-100">
                    <span className="pdf-text-copy-14 pdf-text-muted">상대 습도</span>
                    <strong className="pdf-text-copy-14">{displayReh}%</strong>
                  </div>
                  <div className="pdf-flex-row pdf-justify-between pdf-border-bottom pdf-pb-100">
                    <span className="pdf-text-copy-14 pdf-text-muted">기온</span>
                    <strong className="pdf-text-copy-14">{displayT1h}℃</strong>
                  </div>
                  <div className="pdf-flex-row pdf-justify-between">
                    <span className="pdf-text-copy-14 pdf-text-muted">강수 감지</span>
                    <strong className="pdf-text-copy-14">{displayPty === 0 ? '없음' : '강수 감지'}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* OSM Interactive Map Overlay Visualizer */}
            <div className="pdf-panel" style={{ padding: '24px', position: 'relative' }}>
              <div className="pdf-panel-header pdf-flex-row pdf-justify-between pdf-items-center" style={{ borderBottom: '1px solid var(--color-border-default)', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 className="pdf-text-label-16 pdf-font-bold">광공해 돔 시각화 지도 (Bortle Light Pollution Dome Overlay Map)</h3>
                <span className="pdf-badge" style={{ backgroundColor: 'var(--color-functional-red)', color: 'white', border: 'none' }}>OSM OVERLAY</span>
              </div>
              <p className="pdf-text-copy-14 pdf-text-muted pdf-mb-200">
                선택한 관측지 주변의 Bortle 등급별 광공해 돔(Dome)의 확산 범위를 시각화합니다. 지도 위를 클릭하거나 빨간 마커를 직접 드래그하여 임의의 관측 지점을 선택할 수 있습니다.
              </p>
              <div id="map" style={{ height: '380px', borderRadius: '8px', border: '1px solid var(--color-border-default)', zIndex: 1, position: 'relative' }}></div>
              
              {/* Bortle Scale Color Spectrum Legend */}
              <div className="map-legend-container" style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: '6px',
                border: '1px solid var(--color-border-default)'
              }}>
                <div className="pdf-text-label-14-mono pdf-font-bold pdf-mb-100" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-primary)' }}>
                  <span style={{ color: 'var(--color-functional-red)' }}>●</span> BORTLE SCALE COLOR SPECTRUM
                </div>
                <div className="pdf-flex-row pdf-gap-150 pdf-flex-wrap" style={{ fontSize: '11px', rowGap: '8px' }}>
                  <div className="pdf-flex-row pdf-items-center pdf-gap-050">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#00ffd0', borderRadius: '50%' }}></span>
                    <span className="pdf-text-muted">Class 1-2 (청정 밤하늘)</span>
                  </div>
                  <div className="pdf-flex-row pdf-items-center pdf-gap-050">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#2bff00', borderRadius: '50%' }}></span>
                    <span className="pdf-text-muted">Class 3-4 (외곽/시골)</span>
                  </div>
                  <div className="pdf-flex-row pdf-items-center pdf-gap-050">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#ffbb00', borderRadius: '50%' }}></span>
                    <span className="pdf-text-muted">Class 5-6 (도심 경계)</span>
                  </div>
                  <div className="pdf-flex-row pdf-items-center pdf-gap-050">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#ff5500', borderRadius: '50%' }}></span>
                    <span className="pdf-text-muted">Class 7-8 (밝은 도심)</span>
                  </div>
                  <div className="pdf-flex-row pdf-items-center pdf-gap-050">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#ff0000', borderRadius: '50%' }}></span>
                    <span className="pdf-text-muted">Class 9 (극심한 광공해)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Observable star list panel */}
            <div className="pdf-panel" style={{ padding: '24px' }}>
              <div className="pdf-panel-header pdf-flex-row pdf-justify-between pdf-items-center">
                <h3 className="pdf-text-label-16 pdf-font-bold">현재 기상 및 광공해 조건 가용 항성 ({stars.length}개)</h3>
                <span className="pdf-badge">TABLE MATRIX</span>
              </div>
              <p className="pdf-text-copy-14 pdf-text-muted pdf-mb-200">
                산출된 한계 등급보다 밝아 맨눈으로 식별 가능한 상위 20개 주요 밝은 별 목록입니다.
              </p>

              {limitingMag > 0 && stars.length === 0 ? (
                <div className="pdf-text-center pdf-p-300 pdf-text-muted pdf-bg-secondary pdf-radius-md" style={{ border: '1px dashed var(--color-border-default)' }}>
                  현재 대기 조건이 너무 어두워 관측이 제한됩니다.
                </div>
              ) : stars.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="pdf-table" style={{ marginTop: '8px' }}>
                    <thead>
                      <tr>
                        <th className="pdf-text-label-14-mono">항성 이름 (Star Identifier)</th>
                        <th className="pdf-text-label-14-mono">가시 밝기 등급 (Magnitude)</th>
                        <th className="pdf-text-label-14-mono">적경 (RA)</th>
                        <th className="pdf-text-label-14-mono">적위 (Dec)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stars.map((star, idx) => (
                        <tr key={idx} style={{ backgroundColor: star.mag <= 0 ? 'rgba(173, 29, 29, 0.05)' : 'transparent' }}>
                          <td className="pdf-text-copy-14"><strong>{star.name}</strong></td>
                          <td className="pdf-text-copy-13-mono pdf-text-red pdf-font-bold">{star.mag.toFixed(2)}</td>
                          <td className="pdf-text-copy-13-mono pdf-text-muted">{star.ra.toFixed(2)}h</td>
                          <td className="pdf-text-copy-13-mono pdf-text-muted">{star.dec.toFixed(2)}°</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="pdf-text-center pdf-p-300 pdf-text-muted pdf-bg-secondary pdf-radius-md" style={{ border: '1px dashed var(--color-border-default)' }}>
                  좌측 제어 센터에서 날씨를 조회하거나 시뮬레이션을 작동시키면 관측 항성 분석 매트릭스가 갱신됩니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Inline styling to support mobile header media query */}
      <style>{`
        @media (min-width: 1200px) {
          .mobile-header {
            display: none !important;
          }
          .desktop-logo {
            display: block !important;
          }
        }
        @media (max-width: 1199px) {
          .desktop-logo {
            display: none !important;
          }
          .pdf-sidebar {
            width: 85% !important;
            max-width: 340px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
