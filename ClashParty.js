
/*
 * Clash Party | Personal V1.8 FULL
 * Windows / Mihomo
 *
 * IGG / SNTP 独立订阅，不合并机场节点。
 *
 * 功能：
 * 1. 地区策略组与自动优选
 * 2. 海外 AI 与国内 AI 独立分流
 * 3. Google Antigravity / Gemini / AI Studio
 * 4. Google 登录 / OAuth / 验证 / 会员 / 支付
 * 5. ChatGPT / Claude / Cursor / Grok
 * 6. 四个独立 Emby 策略组
 * 7. Telegram / 社交 / 国际流媒体
 * 8. Apple / Microsoft / Steam / 开发者工具
 * 9. IP 检测与网络测速
 * 10. Qure Color 彩色策略组图标
 *
 * 不修改官方 DNS / DoH / Hosts / TUN
 * 不修改代理节点与节点提供器。
 *
 * 本文件为完整独立脚本，直接覆盖旧版本。
 */

function main(config) {
  if (!config || typeof config !== "object") {
    return config;
  }

  try {
    var oldGroups = Array.isArray(config["proxy-groups"])
      ? config["proxy-groups"] : [];

    var oldRules = Array.isArray(config.rules)
      ? config.rules : [];

    var nodes = Array.isArray(config.proxies)
      ? config.proxies : [];

    var proxyProviders = config["proxy-providers"] || {};
    var providerNames = Object.keys(proxyProviders);

    // ==================================================
    // 1. 国家及地区节点分类
    // ==================================================

    var countries = [
      "香港",
      "日本",
      "美国",
      "新加坡",
      "台湾",
      "韩国",
      "其他地区"
    ];

    var pools = {};
    var knownNodes = {};

    countries.forEach(function (r) {
      pools[r] = [];
    });

    var infoNode =
      /流量|套餐|到期|剩余|过期|订阅|客服|traffic|expire/i;

    function region(n) {
      if (/🇭🇰|香港|Hong[ -]?Kong|\bHK\b|\bHK\s*[-_#]?\s*\d/i.test(n)) {
        return "香港";
      }

      if (/🇯🇵|日本|东京|大阪|Japan|Tokyo|Osaka|\bJP\b|\bJP\s*[-_#]?\s*\d/i.test(n)) {
        return "日本";
      }

      if (/🇺🇸|美国|美國|洛杉矶|西雅图|纽约|United[ -]?States|Seattle|Los[ -]?Angeles|\bUS\b|\bUS\s*[-_#]?\s*\d/i.test(n)) {
        return "美国";
      }

      if (/🇸🇬|新加坡|狮城|Singapore|\bSG\b|\bSG\s*[-_#]?\s*\d/i.test(n)) {
        return "新加坡";
      }

      if (/🇹🇼|台湾|台灣|台北|Taiwan|\bTW\b|\bTW\s*[-_#]?\s*\d/i.test(n)) {
        return "台湾";
      }

      if (/🇰🇷|韩国|韓國|首尔|首爾|Korea|Seoul|\bKR\b|\bKR\s*[-_#]?\s*\d/i.test(n)) {
        return "韩国";
      }

      return "其他地区";
    }

    nodes.forEach(function (n) {
      if (
        !n ||
        !n.name ||
        !n.type ||
        n.type === "dns" ||
        infoNode.test(n.name)
      ) {
        return;
      }

      if (
        /^(DIRECT|REJECT|PASS|GLOBAL|REJECT-DROP)$/i.test(n.name) ||
        knownNodes[n.name]
      ) {
        return;
      }

      knownNodes[n.name] = true;
      pools[region(n.name)].push(n.name);
    });

    var providerOnly =
      Object.keys(knownNodes).length === 0 &&
      providerNames.length > 0;

    var active = countries.filter(function (r) {
      return pools[r].length || providerOnly;
    });

    if (!active.length) {
      console.warn(
        "[Clash Party V1.8] 未找到节点，保留原配置"
      );

      return config;
    }

    function unique(xs) {
      var out = [];
      var seen = {};

      (xs || []).forEach(function (x) {
        if (
          typeof x === "string" &&
          x &&
          !seen["#" + x]
        ) {
          seen["#" + x] = true;
          out.push(x);
        }
      });

      return out;
    }

    // ==================================================
    // 2. 节点提供器筛选
    // ==================================================

    var filters = {
      "香港": "(?i)(香港|Hong.?Kong|HK[0-9 _-]|🇭🇰)",
      "日本": "(?i)(日本|Japan|Tokyo|Osaka|JP[0-9 _-]|🇯🇵)",
      "美国": "(?i)(美国|美國|United.?States|Seattle|Los.?Angeles|US[0-9 _-]|🇺🇸)",
      "新加坡": "(?i)(新加坡|狮城|Singapore|SG[0-9 _-]|🇸🇬)",
      "台湾": "(?i)(台湾|台灣|Taiwan|TW[0-9 _-]|🇹🇼)",
      "韩国": "(?i)(韩国|韓國|Korea|Seoul|KR[0-9 _-]|🇰🇷)",
      "其他地区": "(?i).*"
    };

    var excluded =
      "(?i)(流量|套餐|到期|剩余|过期|订阅|客服|traffic|expire)";

    var otherExcluded =
      "(?i)(流量|套餐|到期|剩余|过期|订阅|客服|traffic|expire|香港|日本|美国|美國|新加坡|台湾|台灣|韩国|韓國|Hong.?Kong|Japan|United.?States|Singapore|Taiwan|Korea|HK[0-9 _-]|JP[0-9 _-]|US[0-9 _-]|SG[0-9 _-]|TW[0-9 _-]|KR[0-9 _-]|🇭🇰|🇯🇵|🇺🇸|🇸🇬|🇹🇼|🇰🇷)";

    // ==================================================
    // 3. 彩色策略组图标
    // ==================================================

    var iconBase =
      "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/";

    var icons = {
      "机场总控": "Proxy.png",

      "香港": "Hong_Kong.png",
      "日本": "Japan.png",
      "美国": "United_States.png",
      "新加坡": "Singapore.png",
      "台湾": "Taiwan.png",
      "韩国": "Korea.png",
      "其他地区": "Global.png",

      "AI 服务": "Auto.png",
      "国内 AI 服务": "Auto.png",
      "国内 AI": "Auto.png",

      "SNTP-Emby": "Emby.png",
      "1111 影院": "Emby.png",
      "Yusen 影院": "Emby.png",
      "宸澄影院": "Emby.png",

      "SNTP 机场服务": "Direct.png",
      "哔哩哔哩": "DomesticMedia.png",
      "国际流媒体": "ForeignMedia.png",

      "Telegram / 社交": "Telegram.png",
      "开发者工具": "Global.png",

      "Apple 服务": "Apple.png",
      "Microsoft 服务": "Microsoft.png",
      "Steam / 游戏": "Game.png",

      "网络检测": "Speedtest.png",
      "国内服务": "DomesticMedia.png",
      "国际服务": "Global.png",
      "漏网之鱼": "Final.png"
    };

    function getIcon(name) {
      if (name.indexOf("自动优选") !== -1) {
        return iconBase + "Auto.png";
      }

      return iconBase + (icons[name] || "Global.png");
    }

    // ==================================================
    // 4. 策略组生成
    // ==================================================

    var generated = [];
    var made = {};

    function addGroup(
      name,
      type,
      members,
      hidden,
      providerRegion
    ) {
      var g = {
        name: name,
        type: type,
        proxies: unique(members),
        icon: getIcon(name)
      };

      if (hidden) {
        g.hidden = true;
      }

      if (type === "url-test") {
        g.url = "https://www.gstatic.com/generate_204";
        g.interval = 1200;
        g.tolerance = 100;
        g.lazy = true;
      }

      if (providerOnly && providerRegion) {
        g.use = providerNames.slice();
        g.filter = filters[providerRegion];

        g["exclude-filter"] =
          providerRegion === "其他地区"
            ? otherExcluded
            : excluded;
      }

      if (
        g.type === "select" &&
        g.proxies[0] === "DIRECT"
      ) {
        g["default-selected"] = "DIRECT";
      }

      generated.push(g);
      made[name] = true;

      return g;
    }

    function available(list) {
      return list.filter(function (r) {
        return active.indexOf(r) >= 0;
      });
    }

    function prefer(list) {
      var xs = available(list);

      return xs.length
        ? xs
        : ["机场总控"];
    }

    // ==================================================
    // 5. Emby 低倍率节点
    // ==================================================

    function isEmbyLowRate(name) {
      return /(?:^|[^0-9])(?:0[.．]2(?:0)?\s*(?:[x×倍])|20\s*%)(?![0-9])/i.test(name);
    }

    var embyLowRate = unique(
      ["香港", "美国", "日本"].reduce(
        function (out, country) {
          return out.concat(
            pools[country].filter(isEmbyLowRate)
          );
        },
        []
      )
    );

    var embyCountryPattern =
      "(?:香港|Hong.?Kong|HK[0-9 _-]|🇭🇰|美国|美國|United.?States|Seattle|Los.?Angeles|US[0-9 _-]|🇺🇸|日本|Japan|Tokyo|Osaka|JP[0-9 _-]|🇯🇵)";

    var embyRatePattern =
      "(?:0[.]2(?:0)?[x×倍]|20[ ]*%)";

    var embyProviderFilter =
      "(?i)(?:" +
      embyCountryPattern +
      ".*" +
      embyRatePattern +
      "|" +
      embyRatePattern +
      ".*" +
      embyCountryPattern +
      ")";

    function addEmbyGroup(name, preferred) {
      var g = addGroup(
        name,
        "select",
        preferred.concat(embyLowRate)
      );

      if (providerOnly) {
        g.use = providerNames.slice();
        g.filter = embyProviderFilter;
        g["exclude-filter"] = excluded;
      }
    }

    // ==================================================
    // 6. 地区策略组
    // ==================================================

    addGroup(
      "机场总控",
      "select",
      active.concat(["DIRECT"])
    );

    active.forEach(function (r) {
      addGroup(
        r,
        "select",
        [r + " · 自动优选"].concat(pools[r]),
        false,
        providerOnly ? r : null
      );
    });

    // ==================================================
    // 7. 海外及国内 AI
    // ==================================================

    // 保留具体美国节点，便于固定 AI 出口。
    var usFixed = pools["美国"].filter(
      function (n) {
        return !isEmbyLowRate(n);
      }
    );

    addGroup(
      "AI 服务",
      "select",
      unique(
        usFixed.slice(0, 1).concat(
          prefer([
            "美国",
            "日本",
            "新加坡",
            "香港"
          ]),
          pools["美国"],
          ["机场总控"]
        )
      )
    );

    addGroup(
      "国内 AI 服务",
      "select",
      ["DIRECT"].concat(
        available([
          "香港",
          "美国",
          "日本",
          "新加坡"
        ]),
        ["机场总控"]
      )
    );

    // ==================================================
    // 8. 四个独立 Emby 策略组
    // ==================================================

    addEmbyGroup(
      "SNTP-Emby",
      prefer([
        "美国",
        "香港",
        "日本",
        "新加坡",
        "其他地区"
      ]).concat(["DIRECT"])
    );

    addEmbyGroup(
      "1111 影院",
      prefer([
        "美国",
        "香港",
        "日本",
        "新加坡"
      ]).concat(["DIRECT"])
    );

    addEmbyGroup(
      "Yusen 影院",
      ["DIRECT"].concat(
        available(["香港", "日本", "美国"])
      )
    );

    addEmbyGroup(
      "宸澄影院",
      ["DIRECT"].concat(
        available(["香港", "美国", "日本"])
      )
    );

    // ==================================================
    // 9. 其他应用策略组
    // ==================================================

    addGroup(
      "SNTP 机场服务",
      "select",
      ["DIRECT", "机场总控"].concat(
        available(["香港", "日本", "美国"])
      )
    );

    addGroup(
      "哔哩哔哩",
      "select",
      ["DIRECT"].concat(
        available(["香港"]),
        ["机场总控"]
      )
    );

    addGroup(
      "国际流媒体",
      "select",
      prefer([
        "香港",
        "美国",
        "日本",
        "新加坡"
      ]).concat(["机场总控", "DIRECT"])
    );

    addGroup(
      "Telegram / 社交",
      "select",
      ["机场总控"].concat(
        available(["美国", "香港", "日本"]),
        ["DIRECT"]
      )
    );

    addGroup(
      "开发者工具",
      "select",
      prefer([
        "新加坡",
        "美国",
        "日本",
        "香港"
      ]).concat(["机场总控", "DIRECT"])
    );

    addGroup(
      "Apple 服务",
      "select",
      ["DIRECT", "机场总控"].concat(
        available(["美国", "香港"])
      )
    );

    addGroup(
      "Microsoft 服务",
      "select",
      ["DIRECT", "机场总控"].concat(
        available(["美国", "香港"])
      )
    );

    addGroup(
      "Steam / 游戏",
      "select",
      ["DIRECT", "机场总控"].concat(
        available(["香港", "美国"])
      )
    );

    addGroup(
      "国内服务",
      "select",
      ["DIRECT", "机场总控"]
    );

    addGroup(
      "国际服务",
      "select",
      ["机场总控"].concat(
        available([
          "香港",
          "美国",
          "日本",
          "新加坡"
        ]),
        ["DIRECT"]
      )
    );

    addGroup(
      "网络检测",
      "select",
      ["机场总控"].concat(
        available(["美国", "香港"]),
        ["DIRECT"]
      )
    );

    addGroup(
      "漏网之鱼",
      "select",
      ["DIRECT", "机场总控"].concat(
        available(["香港", "美国"])
      )
    );

    // ==================================================
    // 10. 地区自动优选
    // ==================================================

    active.forEach(function (r) {
      addGroup(
        r + " · 自动优选",
        "url-test",
        pools[r],
        true,
        providerOnly ? r : null
      );
    });

    // 保留机场原有策略组，避免旧规则引用失效。
    var legacy = oldGroups.filter(
      function (g) {
        return g &&
          g.name &&
          !made[g.name];
      }
    ).map(function (g) {
      var copy = Object.assign({}, g);

      copy.hidden = true;

      if (!copy.icon) {
        copy.icon = getIcon(copy.name);
      }

      return copy;
    });

    var groups = generated.concat(legacy);

    // ==================================================
    // 11. 远程规则提供器
    // ==================================================

    var providers = Object.assign(
      {},
      config["rule-providers"] || {}
    );

    function ensureProvider(
      key,
      url,
      behavior,
      format,
      ext
    ) {
      var found = Object.keys(providers).filter(
        function (k) {
          return providers[k] &&
            providers[k].url === url;
        }
      );

      if (found.length) {
        return found[0];
      }

      var k = key;
      var idx = 2;

      while (providers[k]) {
        k = key + "_" + idx++;
      }

      providers[k] = {
        type: "http",
        behavior: behavior,
        format: format,
        url: url,
        path: "./rule_provider/" + k + "." + ext,
        interval: 86400
      };

      return k;
    }

    var base =
      "https://github.com/666OS/rules/raw/release/mihomo/";

    var pTG = ensureProvider(
      "USR_Telegram",
      base + "domain/Telegram.mrs",
      "domain",
      "mrs",
      "mrs"
    );

    var pTGIP = ensureProvider(
      "USR_TelegramIP",
      base + "ip/Telegram.mrs",
      "ipcidr",
      "mrs",
      "mrs"
    );

    var pDev = ensureProvider(
      "USR_Dev",
      base + "domain/Dev.mrs",
      "domain",
      "mrs",
      "mrs"
    );

    var pBili = ensureProvider(
      "USR_Bilibili",
      "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml",
      "classical",
      "yaml",
      "yaml"
    );

    var pStream = ensureProvider(
      "USR_Streaming",
      base + "domain/Streaming.mrs",
      "domain",
      "mrs",
      "mrs"
    );

    // ==================================================
    // 12. 自定义高优先级分流规则
    // ==================================================

    var personal = [

      // ======================================
      // 国内 AI
      // ======================================

      "DOMAIN-SUFFIX,deepseek.com,国内 AI 服务",
      "DOMAIN-SUFFIX,deepseek.cn,国内 AI 服务",
      "DOMAIN-SUFFIX,kimi.com,国内 AI 服务",
      "DOMAIN-SUFFIX,kimi.ai,国内 AI 服务",
      "DOMAIN-SUFFIX,moonshot.cn,国内 AI 服务",
      "DOMAIN-SUFFIX,moonshot.ai,国内 AI 服务",
      "DOMAIN-SUFFIX,qwen.ai,国内 AI 服务",
      "DOMAIN-SUFFIX,tongyi.com,国内 AI 服务",
      "DOMAIN-SUFFIX,doubao.com,国内 AI 服务",
      "DOMAIN-SUFFIX,bigmodel.cn,国内 AI 服务",
      "DOMAIN-SUFFIX,zhipuai.cn,国内 AI 服务",
      "DOMAIN-SUFFIX,modelscope.cn,国内 AI 服务",
      "DOMAIN-SUFFIX,siliconflow.cn,国内 AI 服务",
      "DOMAIN,yuanbao.tencent.com,国内 AI 服务",
      "DOMAIN,hunyuan.tencent.com,国内 AI 服务",

      // ======================================
      // Google Antigravity
      // ======================================

      "DOMAIN-SUFFIX,antigravity.google,AI 服务",
      "DOMAIN-SUFFIX,antigravity.google.com,AI 服务",

      "DOMAIN,cloudcode-pa.googleapis.com,AI 服务",
      "DOMAIN,daily-cloudcode-pa.googleapis.com,AI 服务",
      "DOMAIN,autopush-cloudcode-pa.googleapis.com,AI 服务",

      "DOMAIN,businessaicode.googleapis.com,AI 服务",
      "DOMAIN,businessaicode.mtls.googleapis.com,AI 服务",
      "DOMAIN,geminicodeassist.googleapis.com,AI 服务",

      // ======================================
      // Google Gemini / AI Studio
      // ======================================

      "DOMAIN-SUFFIX,gemini.google.com,AI 服务",
      "DOMAIN-SUFFIX,gemini.google,AI 服务",
      "DOMAIN-SUFFIX,bard.google.com,AI 服务",
      "DOMAIN-SUFFIX,aistudio.google.com,AI 服务",

      "DOMAIN-SUFFIX,ai.google.dev,AI 服务",
      "DOMAIN-SUFFIX,ai.google,AI 服务",
      "DOMAIN-SUFFIX,deepmind.google,AI 服务",

      "DOMAIN,generativelanguage.googleapis.com,AI 服务",
      "DOMAIN,aiplatform.googleapis.com,AI 服务",
      "DOMAIN,discoveryengine.googleapis.com,AI 服务",

      // ======================================
      // Google 其他 AI 产品
      // ======================================

      "DOMAIN-SUFFIX,notebooklm.google,AI 服务",
      "DOMAIN-SUFFIX,notebooklm.google.com,AI 服务",
      "DOMAIN-SUFFIX,labs.google,AI 服务",
      "DOMAIN-SUFFIX,opal.google,AI 服务",
      "DOMAIN-SUFFIX,jules.google,AI 服务",
      "DOMAIN-SUFFIX,stitch.withgoogle.com,AI 服务",

      // ======================================
      // Google 登录 / OAuth / 账户验证
      // ======================================

      "DOMAIN-SUFFIX,accounts.google.com,AI 服务",
      "DOMAIN-SUFFIX,myaccount.google.com,AI 服务",
      "DOMAIN-SUFFIX,account.google.com,AI 服务",

      "DOMAIN,oauth2.googleapis.com,AI 服务",
      "DOMAIN,oauthaccountmanager.googleapis.com,AI 服务",
      "DOMAIN,identitytoolkit.googleapis.com,AI 服务",
      "DOMAIN,securetoken.googleapis.com,AI 服务",
      "DOMAIN,people.googleapis.com,AI 服务",
      "DOMAIN,openidconnect.googleapis.com,AI 服务",

      "DOMAIN,apis.google.com,AI 服务",

      // ======================================
      // Google 人机验证 / 安全验证
      // ======================================

      "DOMAIN-SUFFIX,recaptcha.net,AI 服务",
      "DOMAIN,recaptcha.google.com,AI 服务",
      "DOMAIN,recaptchaenterprise.googleapis.com,AI 服务",
      "DOMAIN,content-recaptchaenterprise.googleapis.com,AI 服务",

      "DOMAIN,www.google.com,AI 服务",
      "DOMAIN-SUFFIX,gstatic.com,AI 服务",
      "DOMAIN-SUFFIX,googleusercontent.com,AI 服务",

      // ======================================
      // Google 共享 API 与资源
      // ======================================

      "DOMAIN-SUFFIX,googleapis.com,AI 服务",
      "DOMAIN-SUFFIX,googleapis.cn,AI 服务",
      "DOMAIN-SUFFIX,ggpht.com,AI 服务",
      "DOMAIN-SUFFIX,googleadapis.com,AI 服务",

      // Google 下载与云端开发服务

      "DOMAIN,dl.google.com,AI 服务",
      "DOMAIN,dl.googleusercontent.com,AI 服务",
      "DOMAIN,storage.googleapis.com,AI 服务",
      "DOMAIN,console.cloud.google.com,AI 服务",

      // ======================================
      // Google One / 会员 / 支付
      // ======================================

      "DOMAIN-SUFFIX,one.google.com,AI 服务",
      "DOMAIN-SUFFIX,pay.google.com,AI 服务",
      "DOMAIN-SUFFIX,payments.google.com,AI 服务",
      "DOMAIN-SUFFIX,wallet.google.com,AI 服务",

      // ======================================
      // OpenAI / ChatGPT
      // ======================================

      "DOMAIN-SUFFIX,openai.com,AI 服务",
      "DOMAIN-SUFFIX,chatgpt.com,AI 服务",
      "DOMAIN-SUFFIX,oaistatic.com,AI 服务",
      "DOMAIN-SUFFIX,oaiusercontent.com,AI 服务",
      "DOMAIN-SUFFIX,sora.com,AI 服务",

      // ======================================
      // 第三方登录与安全验证
      // ======================================

      "DOMAIN-SUFFIX,auth0.com,AI 服务",
      "DOMAIN-SUFFIX,arkoselabs.com,AI 服务",
      "DOMAIN,challenges.cloudflare.com,AI 服务",

      // ======================================
      // Anthropic / Claude
      // ======================================

      "DOMAIN-SUFFIX,anthropic.com,AI 服务",
      "DOMAIN-SUFFIX,claude.ai,AI 服务",
      "DOMAIN-SUFFIX,claude.com,AI 服务",

      // ======================================
      // 其他海外 AI
      // ======================================

      "DOMAIN-SUFFIX,perplexity.ai,AI 服务",
      "DOMAIN-SUFFIX,grok.com,AI 服务",
      "DOMAIN-SUFFIX,x.ai,AI 服务",
      "DOMAIN-SUFFIX,cursor.com,AI 服务",
      "DOMAIN-SUFFIX,cursor.sh,AI 服务",
      "DOMAIN-SUFFIX,cursorapi.com,AI 服务",
      "DOMAIN-SUFFIX,openrouter.ai,AI 服务",

      // ======================================
      // SNTP 机场服务
      // ======================================

      "DOMAIN-SUFFIX,sntp.me,SNTP 机场服务",
      "DOMAIN-SUFFIX,sntp.uk,SNTP 机场服务",

      // ======================================
      // SNTP Emby
      // 主线路走代理，备用线路直连
      // ======================================

      "DOMAIN,std.cn2gias.uk,SNTP-Emby",
      "DOMAIN,s2.array2026.cc,DIRECT",
      "DOMAIN,s3.array2026.com,DIRECT",

      // ======================================
      // Yusen Emby
      // ======================================

      "DOMAIN,emby.yusen.cc.cd,Yusen 影院",
      "DOMAIN,aaa.yusen6.ccwu.cc,Yusen 影院",
      "DOMAIN,13.yusen.cyou,Yusen 影院",
      "DOMAIN,embya.yusen.cyou,Yusen 影院",
      "DOMAIN-KEYWORD,yusen,Yusen 影院",

      // ======================================
      // 宸澄 Emby
      // ======================================

      "DOMAIN,embycc.wybcs.work,宸澄影院",

      // ======================================
      // 1111 Emby
      // ======================================

      "DOMAIN-SUFFIX,emby.moe,1111 影院",
      "DOMAIN-SUFFIX,xxlb.net,1111 影院",
      "DOMAIN-SUFFIX,loseremby.org,1111 影院",
      "DOMAIN-SUFFIX,zabc.net,1111 影院",

      // ======================================
      // Bilibili
      // ======================================

      "RULE-SET," + pBili + ",哔哩哔哩",

      // ======================================
      // Telegram / 社交
      // ======================================

      "RULE-SET," + pTG + ",Telegram / 社交",

      "RULE-SET," + pTGIP +
        ",Telegram / 社交,no-resolve",

      // ======================================
      // 开发者工具
      // ======================================

      "DOMAIN-SUFFIX,github.com,开发者工具",
      "DOMAIN-SUFFIX,githubusercontent.com,开发者工具",
      "DOMAIN-SUFFIX,githubassets.com,开发者工具",
      "DOMAIN-SUFFIX,github.io,开发者工具",
      "DOMAIN-SUFFIX,ghcr.io,开发者工具",
      "DOMAIN-SUFFIX,gitlab.com,开发者工具",
      "DOMAIN-SUFFIX,docker.io,开发者工具",
      "DOMAIN-SUFFIX,pypi.org,开发者工具",
      "DOMAIN-SUFFIX,npmjs.org,开发者工具",

      "RULE-SET," + pDev + ",开发者工具",

      // ======================================
      // Steam
      // ======================================

      "DOMAIN-SUFFIX,steamcommunity.com,Steam / 游戏",
      "DOMAIN-SUFFIX,steampowered.com,Steam / 游戏",
      "DOMAIN-SUFFIX,steamcontent.com,Steam / 游戏",

      // ======================================
      // IP 检测
      // ======================================

      "DOMAIN-SUFFIX,ipinfo.io,网络检测",
      "DOMAIN-SUFFIX,ip-api.com,网络检测",
      "DOMAIN-SUFFIX,ip.sb,网络检测",
      "DOMAIN-SUFFIX,ifconfig.me,网络检测",
      "DOMAIN-SUFFIX,ipify.org,网络检测",
      "DOMAIN-SUFFIX,ipcheck.ing,网络检测",
      "DOMAIN-SUFFIX,myip.com,网络检测",
      "DOMAIN-SUFFIX,icanhazip.com,网络检测",
      "DOMAIN-SUFFIX,ident.me,网络检测",
      "DOMAIN-SUFFIX,whatismyipaddress.com,网络检测",
      "DOMAIN-SUFFIX,browserleaks.com,网络检测",
      "DOMAIN-SUFFIX,ipleak.net,网络检测",
      "DOMAIN-SUFFIX,iplocation.net,网络检测",
      "DOMAIN-SUFFIX,ip138.com,网络检测",

      // ======================================
      // 网络测速
      // ======================================

      "DOMAIN,speed.cloudflare.com,网络检测",
      "DOMAIN-SUFFIX,speedtest.net,网络检测",
      "DOMAIN-SUFFIX,ookla.com,网络检测",
      "DOMAIN-SUFFIX,fast.com,网络检测",

      // ======================================
      // 国内常用应用
      // ======================================

      "DOMAIN-SUFFIX,weixin.qq.com,DIRECT",
      "DOMAIN-SUFFIX,wechat.com,DIRECT",
      "DOMAIN-SUFFIX,alipay.com,DIRECT",
      "DOMAIN-SUFFIX,taobao.com,DIRECT",
      "DOMAIN-SUFFIX,jd.com,DIRECT",

      // ======================================
      // 国际流媒体
      // ======================================

      "RULE-SET," + pStream + ",国际流媒体"
    ];

    // ==================================================
    // 13. 机场原策略组映射
    // ==================================================

    var aliases = {
      "openAI": "AI 服务",
      "ChatGPT / OpenAI": "AI 服务",
      "其他 AI": "AI 服务",
      "国外 AI": "AI 服务",
      "海外 AI": "AI 服务",
      "💬 OpenAi": "AI 服务",
      "💬 Cursor": "AI 服务",
      "💬 Gemini": "AI 服务",
      "💬 Claude": "AI 服务",
      "💬 Perplexity": "AI 服务",

      "🎬 Yusen Emby": "Yusen 影院",
      "📺 Bilibili": "哔哩哔哩",

      "📲 电报信息": "Telegram / 社交",
      "📲 Telegram": "Telegram / 社交",
      "电报信息": "Telegram / 社交",
      "社交媒体": "Telegram / 社交",

      "🌍 国外媒体": "国际流媒体",
      "流媒体": "国际流媒体",
      "🌏 国内媒体": "国内服务",
      "🎯 本地直连": "DIRECT",

      "Ⓜ️ 微软服务": "Microsoft 服务",
      "微软服务": "Microsoft 服务",
      "🛩 Copilot": "Microsoft 服务",

      "🍎 苹果服务": "Apple 服务",
      "苹果服务": "Apple 服务",

      "SteamGame": "Steam / 游戏",
      "🌏 Steam": "Steam / 游戏",

      "🐟 漏网之鱼": "漏网之鱼",
      "守候网络": "机场总控",
      "🔰 节点选择": "机场总控",
      "🌏 GFWlist": "国际服务",
      "网络云盘": "国际服务"
    };

    var oldEmbyGroups = {
      "🎬 守候网络 Emby": true,
      "📺 Emby影院": true
    };

    // ==================================================
    // 14. 解析原始规则
    // ==================================================

    function parsedRule(s) {
      var pieces = s.split(",");
      var idx = pieces.length - 1;

      if (pieces[idx] === "no-resolve") {
        idx--;
      }

      return {
        pieces: pieces,
        idx: idx,
        target: (pieces[idx] || "").trim()
      };
    }

    // 保留本地网络和系统安全规则。
    function safetyRule(s) {
      if (
        /^AND,\(\(NETWORK,UDP\),\(DST-PORT,53\)\),dns$/i.test(s)
      ) {
        return true;
      }

      if (
        /^DOMAIN-SUFFIX,local,(DIRECT|🎯 本地直连)$/i.test(s)
      ) {
        return true;
      }

      if (
        /^DOMAIN-SUFFIX,cn\.bing\.com,DIRECT$/i.test(s)
      ) {
        return true;
      }

      var p = parsedRule(s);

      if (
        p.target !== "DIRECT" &&
        p.target !== "🎯 本地直连"
      ) {
        return false;
      }

      if (
        /^IP-CIDR,((127\.|10\.|192\.168\.|169\.254\.|100\.64\.)|172\.16\.)/i.test(s)
      ) {
        return true;
      }

      if (
        /^IP-CIDR6?,(172\.16\.0\.0\/12|::1\/|fc00:|fe80:|fd00:)/i.test(s)
      ) {
        return true;
      }

      return false;
    }

    // ==================================================
    // 15. 合并机场原始规则并去重
    // ==================================================

    var head = [];
    var rest = [];
    var seen = {};
    var stillHead = true;
    var priorityKeys = {};

    function ruleKey(s) {
      var p = s.split(",");

      return (p[0] || "") +
        "|" +
        (p[1] || "");
    }

    personal.forEach(function (s) {
      priorityKeys[ruleKey(s)] = true;
    });

    oldRules.forEach(function (s) {
      if (
        typeof s !== "string" ||
        !s.trim()
      ) {
        return;
      }

      var p = parsedRule(s);

      // 原有 MATCH 规则统一在末尾重建。
      if (p.pieces[0] === "MATCH") {
        return;
      }

      // 不沿用宽泛 AI.mrs，使用自定义精确规则。
      if (
        p.pieces[0] === "RULE-SET" &&
        providers[p.pieces[1]] &&
        /\/domain\/AI[.]mrs(?:$|[?])/i.test(
          providers[p.pieces[1]].url || ""
        )
      ) {
        return;
      }

      // 排除旧 Emby 分组的宽泛规则。
      if (oldEmbyGroups[p.target]) {
        return;
      }

      if (
        /^(DOMAIN|DOMAIN-SUFFIX),((cn2gias\.uk)|(array2026\.(com|cc)))/i.test(s)
      ) {
        return;
      }

      // 映射旧策略组名称。
      p.pieces[p.idx] =
        aliases[p.target] || p.target;

      var out = p.pieces.join(",");

      // 自定义规则优先，避免重复。
      if (
        priorityKeys[ruleKey(out)] ||
        seen[out]
      ) {
        return;
      }

      seen[out] = true;

      if (stillHead && safetyRule(out)) {
        head.push(out);
      } else {
        stillHead = false;
        rest.push(out);
      }
    });

    // ==================================================
    // 16. 最终规则顺序
    // ==================================================

    // 1. 原始本地网络保护规则
    // 2. 个人精确分流规则
    // 3. 原机场剩余规则
    // 4. MATCH 漏网之鱼

    var finalRules = unique(
      head.concat(
        personal,
        rest,
        ["MATCH,漏网之鱼"]
      )
    );

    // ==================================================
    // 17. 写入最终配置
    // ==================================================

    // 仅修改三个字段。
    // 不接管 DNS / DoH / TUN / Hosts。
    // 保留所有机场官方节点及节点提供器。

    config["proxy-groups"] = groups;
    config["rule-providers"] = providers;
    config.rules = finalRules;

    console.log(
      "[Clash Party V1.8 FULL] OK" +
      " | nodes=" + Object.keys(knownNodes).length +
      " | regions=" + active.length +
      " | groups=" + groups.length +
      " | custom=" + personal.length +
      " | original=" + rest.length +
      " | providers=" + Object.keys(providers).length +
      " | Google AI=Enhanced" +
      " | Antigravity=Enabled" +
      " | Icons=Qure Color" +
      " | DNS=Official"
    );

    return config;

  } catch (e) {

    if (typeof console !== "undefined") {
      console.error(
        "[Clash Party V1.8 FULL] ERROR",
        e && (e.stack || e)
      );
    }

    return config;
  }
}
