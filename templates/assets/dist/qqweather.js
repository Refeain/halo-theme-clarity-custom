/* ============================================
   天气预报小组件 — 腾讯天气 + 腾讯位置服务
   1. 腾讯位置服务 IP 定位：/qqlbs 代理 → apis.map.qq.com
   2. 腾讯天气查询：/qqweather 代理 → wis.qq.com
   LBS Key 由 Nginx 服务端注入，前端不携带；
   定位每 5 分钟随自动刷新重算（浏览器定位免费，GNSS→WiFi 两级尝试，位置新鲜度 1 分钟），
   天气上游约 30 分钟更新，Nginx 侧按城市缓存 5 分钟。
   数据缓存 10 分钟 (localStorage, 按城市独立)
   ============================================ */
(function () {
  var CACHE_KEY_BASE = "zcode_qqweather_cache";
  var CACHE_TTL = 6e5; // 10 分钟

  var ICON_RULES = [
    ["雷", "qw-lightning"],
    ["雨夹|冻雨", "qw-snow"],
    ["雨", "qw-rain"],
    ["雪", "qw-snow"],
    ["雾|霾|沙|尘", "qw-fog"],
    ["阴", "icon-[ph--cloud-bold]"],
    ["云", "icon-[ph--cloud-bold]"],
    ["晴", "icon-[ph--sun-bold]"]
  ];

  function iconFor(text) {
    for (var i = 0; i < ICON_RULES.length; i++) {
      if (new RegExp(ICON_RULES[i][0]).test(text || "")) return ICON_RULES[i][1];
    }
    return "icon-[ph--sun-bold]";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function showMsg(container, html, retry) {
    container.innerHTML =
      '<div class="weather-error" style="display:flex;align-items:center;justify-content:center;gap:0.5em;padding:0.75rem 1rem;font-size:0.9em;color:var(--c-text-3)' +
      (retry ? ";cursor:pointer" : "") +
      '">' +
      html +
      "</div>";
    if (retry) {
      container.onclick = function () {
        container.onclick = null;
        load(container);
      };
    } else {
      container.onclick = null;
    }
  }

  var lastData = null;
  var lastCity = "";
  var lastFetchTs = 0; // 最后成功拉取数据的时刻
  var locCache = null; // {loc, ts} 定位结果在 TTL 内复用
  var LOC_TTL = 3e5; // 5 分钟：每次自动刷新重新定位（浏览器定位免费，逆地理有服务端缓存）
  var themeMo = null;

  function weatherCode(text) {
    var t = text || "";
    var rules = [
      ["雷", 5], ["雨夹雪", 19], ["冻雨", 19], ["暴雨", 10], ["大雨", 9],
      ["中雨", 8], ["小雨", 7], ["阵雨", 4], ["雨", 7],
      ["暴雪", 17], ["大雪", 16], ["中雪", 15], ["小雪", 14], ["雪", 14],
      ["冰雹", 5], ["沙尘", 20], ["扬沙", 20], ["浮尘", 29], ["霾", 30], ["雾", 18],
      ["阴", 3], ["多云", 1], ["晴", 0]
    ];
    for (var i = 0; i < rules.length; i++) {
      if (t.indexOf(rules[i][0]) !== -1) return rules[i][1];
    }
    return 0;
  }

  function render(container, data, city) {
    var o = (data && data.observe) || {};
    var d = new Date(lastFetchTs || Date.now());
    var hhmm = (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
    lastData = data;
    lastCity = city;
    var dark = document.documentElement.classList.contains("dark");
    var code = weatherCode(o.weather);
    var qqIconUrl = o.weather_url || "";
    var iconSrc = qqIconUrl
      ? "https://www.yuyt.cn/qqicon/" + qqIconUrl.replace("https://mat1.gtimg.com/", "")
      : "/themes/theme-clarity/assets/images/" + (dark ? "black" : "white") + "/" + code + "@2x.png";
    container.innerHTML =
      '<div class="qw-card">' +
      '<div class="qw-content">' +
      '<img class="qw-icon-img" src="' + iconSrc + '" alt="' + esc(o.weather || "") + '">' +
      '<div class="qw-main">' +
      '<div class="qw-temp">' + esc(o.degree != null ? o.degree : "--") + '<span class="qw-deg">°C</span><span class="qw-text">' + esc(o.weather || "") + '</span></div>' +
      '<div class="qw-meta">' +
      '<span class="qw-meta-item"><span class="icon-[ph--map-pin-bold]"></span><span>' + esc(city) + '</span></span>' +
      '<span class="qw-meta-item"><span class="icon-[ph--clock-bold]"></span><span>' + (hhmm ? hhmm + " 更新" : "") + '</span></span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    if (!themeMo) {
      themeMo = new MutationObserver(function () {
        if (lastData) render(container, lastData, lastCity);
      });
      themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    }
  }

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      return r.json();
    });
  }

  function locate(lbsApi) {
    var url = lbsApi;
    return fetchJSON(url).then(function (json) {
      if (!json || json.status !== 0 || !json.result || !json.result.ad_info) {
        var msg = json && json.message ? json.message : "定位失败";
        throw new Error(msg);
      }
      return json.result.ad_info;
    });
  }

  function geoPosition() {
    // 两级尝试：先 GNSS 高精度（室内常拿不到），再 WiFi/网络定位，都失败才交给 IP 回退。
    // 移动运营商出口 IP 在 IP 库里登记地与实际位置无关（会定位到兰州），所以尽力保住设备定位。
    var attempts = [
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 6e4 },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 6e4 }
    ];
    return new Promise(function (resolve, reject) {
      if (!window.navigator || !navigator.geolocation) {
        reject(new Error("浏览器不支持定位"));
        return;
      }
      var idx = 0, settled = false, timer = null, lastErr = null;
      function finish(fn, val) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        fn(val);
      }
      function tryNext() {
        if (settled) return;
        if (idx >= attempts.length) {
          finish(reject, new Error(lastErr && lastErr.code === 3 ? "定位超时" : "定位失败"));
          return;
        }
        var opt = attempts[idx++];
        timer = setTimeout(function () { finish(reject, new Error("定位超时")); }, opt.timeout + 1500);
        navigator.geolocation.getCurrentPosition(
          function (p) { finish(resolve, p.coords); },
          function (err) {
            if (settled) return;
            lastErr = err;
            if (err && err.code === 1) { finish(reject, new Error("位置授权被拒绝")); return; }
            tryNext();
          },
          opt
        );
      }
      tryNext();
    });
  }

  // WGS-84(GPS) -> GCJ-02(火星坐标，腾讯/高德用)：不转换会偏移 300~700 米
  function wgs84ToGcj02(lat, lng) {
    if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) {
      return { lat: lat, lng: lng }; // 境外无偏移
    }
    function tfLat(x, y) {
      var r = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
      r += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
      r += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
      r += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320.0 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
      return r;
    }
    function tfLng(x, y) {
      var r = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
      r += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
      r += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
      r += (150.0 * Math.sin(y / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
      return r;
    }
    var a = 6378245.0, ee = 0.00669342162296594323;
    var dLat = tfLat(lng - 105.0, lat - 35.0);
    var dLng = tfLng(lng - 105.0, lat - 35.0);
    var radLat = lat / 180.0 * Math.PI;
    var magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    var sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    return { lat: lat + dLat, lng: lng + dLng };
  }

  function geocode(geocoderApi, lat, lng) {
    // toFixed(3) ≈ 100 米格网：县级定位足够，静止时 GPS 抖动不会打穿服务端缓存
    var url = geocoderApi + "?location=" + lat.toFixed(3) + "," + lng.toFixed(3);
    return fetchJSON(url).then(function (json) {
      if (!json || json.status !== 0 || !json.result || !json.result.address_component) {
        throw new Error("逆地理失败");
      }
      return json.result.address_component;
    });
  }

  function getLoc(geocoderApi, lbsApi) {
    if (locCache && Date.now() - locCache.ts < LOC_TTL) {
      return Promise.resolve(locCache.loc);
    }
    var p = geoPosition()
      .then(function (coords) {
        var gcj = wgs84ToGcj02(coords.latitude, coords.longitude);
        return geocode(geocoderApi, gcj.lat, gcj.lng).then(function (ac) {
          return {
            province: ac.province || "",
            city: ac.city || ac.province || "",
            label: ac.district || ac.city || ac.province || ""
          };
        });
      })
      .catch(function () {
        return locate(lbsApi).then(function (ad) {
          var province = ad.province || "";
          var city = ad.city || "";
          var label = ad.district || city || province;
          if ((!city || !ad.district) && ad.location && ad.location.lat != null) {
            return geocode(geocoderApi, ad.location.lat, ad.location.lng)
              .then(function (ac) {
                return {
                  province: ac.province || province,
                  city: ac.city || ac.province || "",
                  label: ac.district || ac.city || ac.province || label
                };
              })
              .catch(function () {
                return { province: province, city: city, label: label };
              });
          }
          return { province: province, city: city, label: label };
        });
      });
    return p.then(function (loc) {
      if (loc && (loc.city || loc.province)) {
        locCache = { loc: loc, ts: Date.now() };
      }
      return loc;
    });
  }

  function fetchWeather(api, province, city) {
    var url =
      api +
      "?source=pc&weather_type=observe&province=" +
      encodeURIComponent(province) +
      "&city=" +
      encodeURIComponent(city);
    return fetchJSON(url).then(function (json) {
      if (!json || !json.data || !json.data.observe || !json.data.observe.degree) {
        throw new Error("天气数据为空");
      }
      return json;
    });
  }

  function load(container) {
    var weatherApi = container.dataset.api || "/qqweather";
    var lbsApi = container.dataset.lbsapi || "/qqlbs";

    // 缓存按 key+城市 独立
    var cached = null;
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf(CACHE_KEY_BASE) !== 0) return;
        var raw = localStorage.getItem(k);
        var v = null;
        try { v = JSON.parse(raw || "null"); } catch (e) { v = null; }
        var expired = v && v.timestamp && Date.now() - v.timestamp >= CACHE_TTL;
        // 无效（空天气）或过期条目直接清除，不再累积
        if (!v || !v.data || !v.data.observe || !v.data.observe.degree || !v.city || expired) {
          localStorage.removeItem(k);
          return;
        }
        if (!cached) { cached = v; }
      });
      if (cached) {
        lastFetchTs = cached.timestamp || Date.now();
        render(container, cached.data, cached.city);
        return;
      }
    } catch (e) {}

    showMsg(
      container,
      '<span class="icon-[ph--spinner] animate-spin"></span><span>定位中...</span>',
      false
    );

    var geocoderApi = container.dataset.geocoderapi || "/qqgeocoder";

    // 优先浏览器精确定位（区县级），拒绝/失败/超时自动回退 IP 定位
    var locPromise = getLoc(geocoderApi, lbsApi)
      .catch(function () {
        return locate(lbsApi).then(function (ad) {
          var province = ad.province || "";
          var city = ad.city || "";
          var label = ad.district || city || province;
          if ((!city || !ad.district) && ad.location && ad.location.lat != null) {
            // IP 只定位到省：用 IP 经纬度逆地理补齐市/区
            return geocode(geocoderApi, ad.location.lat, ad.location.lng)
              .then(function (ac) {
                return {
                  province: ac.province || province,
                  city: ac.city || ac.province || "",
                  label: ac.district || ac.city || ac.province || label
                };
              })
              .catch(function () {
                return { province: province, city: city, label: label };
              });
          }
          return { province: province, city: city, label: label };
        });
      });

    locPromise
      .then(function (loc) {
        return fetchWeather(weatherApi, loc.province, loc.city).then(function (data) {
          lastFetchTs = Date.now();
          var displayName = (loc.label || loc.city || loc.province).replace(/市$/, "") || loc.province;
          render(container, data.data, displayName);
          try {
            localStorage.setItem(
              CACHE_KEY_BASE + "_" + loc.province + "_" + loc.city,
              JSON.stringify({ data: data.data, city: displayName, timestamp: Date.now() })
            );
          } catch (e) {}
        });
      })
      .catch(function (err) {
        var msg = esc((err && err.message) || "获取失败");
        showMsg(
          container,
          '<span class="icon-[ph--warning-bold]"></span><span>' + msg + "，点击重试</span>",
          true
        );
      });
  }

  window.mountQQWeather = function (container) {
    if (!container) return;
    load(container);
    // 每 5 分钟自动刷新（页面可见时），定位随刷新重算，天气由服务端缓存兜底
    if (!container.dataset.autoRefresh) {
      container.dataset.autoRefresh = "1";
      setInterval(function () {
        if (document.visibilityState !== "visible") return;
        try {
          Object.keys(localStorage).forEach(function (k) {
            if (k.indexOf(CACHE_KEY_BASE) === 0) localStorage.removeItem(k);
          });
        } catch (e) {}
        load(container);
      }, 3e5);
      // 每分钟重绘时间显示（不发网络请求）
      setInterval(function () {
        if (document.visibilityState === "visible" && lastData) {
          render(container, lastData, lastCity);
        }
      }, 6e4);
    }
  };
})();
