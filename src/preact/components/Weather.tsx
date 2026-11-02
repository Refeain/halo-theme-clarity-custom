import { useState, useEffect } from 'preact/hooks';
import './Weather.scss';

interface WeatherProps {
  apiKey: string;
  iconBase: string;
}

interface WeatherData {
  temperature: string;
  text: string;
  code: string;
  city: string;
  updateTime: string;
}

interface CachedWeather {
  data: WeatherData;
  timestamp: number;
}

type Status = 'loading' | 'success' | 'error';

const CACHE_KEY = 'weather_cache';
const CACHE_DURATION = 60 * 60 * 1000;

export function Weather({ apiKey, iconBase }: WeatherProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<WeatherData | null>(null);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  const getIconPath = (code: string) => {
    const folder = isDark ? 'black' : 'white';
    return `${iconBase}/${folder}/${code}@2x.png`;
  };

  // 从缓存读取
  const getCache = (): WeatherData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp }: CachedWeather = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch {}
    return null;
  };

  // 保存到缓存
  const setCache = (data: WeatherData) => {
    try {
      const cached: CachedWeather = { data, timestamp: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {}
  };

  const fetchWeather = async (forceRefresh = false) => {
    // 检查缓存
    if (!forceRefresh) {
      const cached = getCache();
      if (cached) {
        setData(cached);
        setStatus('success');
        return;
      }
    }

    setStatus('loading');
    try {
      const weatherRes = await fetch(
        `https://api.seniverse.com/v3/weather/now.json?key=${apiKey}&location=ip&language=zh-Hans&unit=c`
      );
      const weatherData = await weatherRes.json();

      if (weatherData.results && weatherData.results[0]) {
        const result = weatherData.results[0];
        const updateTime = new Date(result.last_update);

        const newData: WeatherData = {
          temperature: result.now.temperature,
          text: result.now.text,
          code: result.now.code,
          city: result.location.name,
          updateTime: `${updateTime.getHours().toString().padStart(2, '0')}:${updateTime.getMinutes().toString().padStart(2, '0')} 更新`,
        };

        setData(newData);
        setCache(newData);
        setStatus('success');
      } else {
        throw new Error('Weather API Error');
      }
    } catch (err) {
      console.error('Weather error:', err);
      setStatus('error');
    }
  };

  useEffect(() => {
    fetchWeather();

    // 监听主题变化
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return (
    <div class="weather-card">
      {status === 'loading' && (
        <div class="weather-loading">
          <span class="icon-[ph--spinner] animate-spin"></span>
          <span>获取天气中...</span>
        </div>
      )}

      {status === 'error' && (
        <div class="weather-error" onClick={() => fetchWeather(true)}>
          <span class="icon-[ph--arrow-clockwise-bold]"></span>
          <span>点击重试</span>
        </div>
      )}

      {status === 'success' && data && (
        <div class="weather-content">
          <div class="weather-left">
            <img 
              class="weather-icon" 
              src={getIconPath(data.code)} 
              alt={data.text}
            />
          </div>
          <div class="weather-right">
            <div class="weather-main">
              <span class="temp-value">{data.temperature}</span>
              <span class="temp-unit">°C</span>
              <span class="weather-text">{data.text}</span>
            </div>
            <div class="weather-meta">
              <span class="weather-city">
                <span class="icon-[ph--map-pin-bold]"></span>
                <span>{data.city}</span>
              </span>
              <span class="weather-update">
                <span class="icon-[ph--clock-bold]"></span>
                <span>{data.updateTime}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
