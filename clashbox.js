
/*
 * ClashBox V1.5 | HarmonyOS / Mihomo JavaScript Override
 *
 * IGG / SNTP independently loaded subscriptions.
 * One airport configuration is active at a time.
 *
 * This script only modifies:
 * - proxy-groups
 * - rules
 * - rule-providers
 *
 * It does NOT modify:
 * - DNS / DoH
 * - hosts
 * - TUN / MTU
 * - sniffer
 * - proxies
 * - proxy-providers
 *
 * Official airport DNS configurations are preserved.
 */

function main(config, profileName) {
  if (!config || typeof config !== "object") return config;

  var cfg = config;
  var nodes = Array.isArray(cfg.proxies) ? cfg.proxies : [];
  var providers = cfg["proxy-providers"] || {};
  var providerKeys = Object.keys(providers);

  // ==================================================
  // 1. NODE CLASSIFICATION
  // ==================================================

  if (!nodes.length && !providerKeys.length) {
    return cfg;
  }

  var regions = [
    "香港", "日本", "美国", "新加坡",
    "台湾", "韩国", "其他地区"
  ];

  var pool = {};
  var seenNodes = {};

  regions.forEach(function (r) {
    pool[r] = [];
  });

  var info =
    /流量|到期|套餐|剩余|订阅|客服|官网|过期|重置|traffic|expire|subscription|reset/i;

  function classify(n) {
    if (/🇹🇼|台灣|台湾|台北|\bTW\b|Taiwan/i.test(n))
      return "台湾";
    if (/🇭🇰|香港|港区|Hong[ -]?Kong|\bHK\b/i.test(n))
      return "香港";
    if (/🇯🇵|日本|东京|大阪|Japan|Tokyo|Osaka|\bJP\b/i.test(n))
      return "日本";
    if (/🇸🇬|新加坡|狮城|獅城|Singapore|\bSG\b/i.test(n))
      return "新加坡";
    if (/🇺🇸|美国|美國|洛杉矶|西雅图|纽约|圣何塞|硅谷|United[ -]?States|\bUS\b/i.test(n))
      return "美国";
    if (/🇰🇷|韩国|韓國|首尔|首爾|Korea|Seoul|\bKR\b/i.test(n))
      return "韩国";
    return "其他地区";
  }

  function isLow(n) {
    return /0[.]2(?:0)?\s*(?:x|×|倍|倍率)|20\s*[%％]/i.test(n);
  }

  nodes.forEach(function (n) {
    if (!n || !n.name || n.type === "dns" ||
        info.test(n.name) || seenNodes[n.name])
      return;

    seenNodes[n.name] = true;
    pool[classify(n.name)].push(n.name);
  });

  var providerOnly =
    !Object.keys(seenNodes).length &&
    providerKeys.length > 0;

  var active = regions.filter(function (r) {
    return providerOnly || pool[r].length;
  });

  var visible = {};

  active.forEach(function (r) {
    visible[r] = true;
  });

  visible["机场总控"] = true;

  function unique(arr) {
    return Array.from(new Set(arr || []));
  }

  function available(arr) {
    return unique(arr.filter(function (x) {
      return x === "DIRECT" ||
        x === "REJECT" ||
        visible[x] ||
        seenNodes[x];
    }));
  }

  function choose(arr) {
    var result = available(arr);
    return result.length ? result : ["DIRECT"];
  }

  // ==================================================
  // 2. POLICY GROUPS
  // ==================================================

  var groups = [];

  function group(name, type, members, hidden) {
    var g = {
      name: name,
      type: type,
      proxies: unique(members)
    };

    if (hidden) g.hidden = true;

    if (type === "url-test") {
      g.url = "http://www.gstatic.com/generate_204";
      g.interval = 1200;
      g.timeout = 5000;
      g.tolerance = 100;
      g.lazy = true;
    }

    if (type === "select" && g.proxies.length) {
      g["default-selected"] = g.proxies[0];
    }

    groups.push(g);
    return g;
  }

  var patterns = {
    "香港": "(?i)(香港|港区|HK[0-9 _-]|Hong.?Kong|🇭🇰)",
    "日本": "(?i)(日本|东京|大阪|JP[0-9 _-]|Japan|Tokyo|Osaka|🇯🇵)",
    "美国": "(?i)(美国|美國|US[0-9 _-]|United.?States|Seattle|Los.?Angeles|🇺🇸)",
    "新加坡": "(?i)(新加坡|狮城|獅城|SG[0-9 _-]|Singapore|🇸🇬)",
    "台湾": "(?i)(台湾|台灣|台北|TW[0-9 _-]|Taiwan|🇹🇼)",
    "韩国": "(?i)(韩国|韓國|首尔|首爾|KR[0-9 _-]|Korea|Seoul|🇰🇷)",
    "其他地区": "(?i)^(?!.*(?:香港|日本|美国|新加坡|台湾|韩国|HK|JP|US|SG|TW|KR|Hong|Japan|States|Singapore|Taiwan|Korea)).*$"
  };

  function applyProvider(g, region, lowOnly) {
    if (!providerOnly) return;

    g.use = providerKeys.slice();

    if (lowOnly) {
      var area =
        "(香港|HK|美国|US|日本|JP|新加坡|SG|Singapore|Japan|Hong.?Kong)";
      var rate =
        "(0[.]2(0)?[ ]*(x|×|倍|倍率)|20[ ]*[%％])";

      g.filter =
        "(?i)(" + area + ".*" + rate +
        "|" + rate + ".*" + area + ")";
    } else {
      g.filter = patterns[region];
    }

    g["exclude-filter"] =
      "(?i)(流量|套餐|到期|剩余|订阅|官网|客服|traffic|expire)";
  }

  group("机场总控", "select",
    active.concat(["DIRECT"]));

  active.forEach(function (r) {
    var g = group(
      r,
      "select",
      [r + " · 自动优选"].concat(pool[r])
    );
    applyProvider(g, r, false);
  });

  var us = visible["美国"] ? ["美国"] : [];
  var hk = visible["香港"] ? ["香港"] : [];
  var jp = visible["日本"] ? ["日本"] : [];
  var sg = visible["新加坡"] ? ["新加坡"] : [];

  var others = active.filter(function (r) {
    return ["美国", "香港", "日本", "新加坡"]
      .indexOf(r) === -1;
  });

  var usFull = pool["美国"].filter(function (n) {
    return !isLow(n);
  });

  var fixedUS =
    usFull[0] || pool["美国"][0] || "";

  group("AI 服务", "select",
    choose((fixedUS ? [fixedUS] : [])
      .concat(us, jp, sg, hk, ["机场总控"])));

  var lowNodes =
    ["香港", "美国", "日本", "新加坡"]
      .reduce(function (all, r) {
        return all.concat(pool[r].filter(isLow));
      }, []);

  function emby(name, members) {
    var g = group(
      name,
      "select",
      unique(choose(members).concat(lowNodes))
    );

    applyProvider(g, "", true);
    return g;
  }

  emby("SNTP-Emby",
    us.concat(hk, jp, sg, others, ["DIRECT"]));

  emby("1111 影院",
    us.concat(hk, jp, sg, ["DIRECT"]));

  emby("Yusen 影院",
    ["DIRECT"].concat(hk, jp, us, sg));

  emby("宸澄影院",
    ["DIRECT"].concat(hk, us, jp, sg));

  group("SNTP 机场服务", "select",
    choose(["DIRECT", "机场总控"]
      .concat(hk, jp, us)));

  group("哔哩哔哩", "select",
    choose(["DIRECT"].concat(hk, ["机场总控"])));

  group("国际流媒体", "select",
    choose(hk.concat(us, jp, sg,
      ["机场总控", "DIRECT"])));

  group("Telegram / 社交", "select",
    choose(["机场总控"].concat(
      us, hk, jp, ["DIRECT"])));

  group("开发者工具", "select",
    choose(sg.concat(us, jp, hk,
      ["机场总控", "DIRECT"])));

  group("Microsoft 服务", "select",
    choose(["DIRECT", "机场总控"]
      .concat(us, hk)));

  group("Apple 服务", "select",
    choose(["DIRECT", "机场总控"]
      .concat(us, hk)));

  group("Steam / 游戏", "select",
    choose(["DIRECT", "机场总控"]
      .concat(hk, us)));

  group("网络检测", "select",
    choose(["机场总控"].concat(
      us, hk, ["DIRECT"])));

  group("国内服务", "select",
    ["DIRECT", "机场总控"]);

  group("国际服务", "select",
    choose(["机场总控"].concat(
      hk, us, jp, sg, ["DIRECT"])));

  group("漏网之鱼", "select",
    choose(["DIRECT", "机场总控"]
      .concat(hk, us)));

  active.forEach(function (r) {
    var g = group(
      r + " · 自动优选",
      "url-test",
      pool[r],
      true
    );
    applyProvider(g, r, false);
  });

  // ==================================================
  // 3. RULE PROVIDERS
  // ==================================================

  var defs = cfg["rule-providers"] || {};

  function provider(name, url, behavior, format) {
    Object.keys(defs).forEach(function (k) {
      if (defs[k] && defs[k].url === url) {
        name = k;
      }
    });

    if (!defs[name]) {
      defs[name] = {
        type: "http",
        behavior: behavior,
        format: format,
        url: url,
        path: "./rule_provider/" + name +
          (format === "mrs" ? ".mrs" : ".yaml"),
        interval: 86400
      };
    }

    return name;
  }

  var root =
    "https://raw.githubusercontent.com/666OS/rules/release/mihomo/";

  var ai = provider("USR_AI",
    root + "domain/AI.mrs", "domain", "mrs");

  var tg = provider("USR_Telegram",
    root + "domain/Telegram.mrs",
    "domain", "mrs");

  var tgIP = provider("USR_TelegramIP",
    root + "ip/Telegram.mrs",
    "ipcidr", "mrs");

  var dev = provider("USR_Dev",
    root + "domain/Dev.mrs",
    "domain", "mrs");

  var streaming = provider("USR_Streaming",
    root + "domain/Streaming.mrs",
    "domain", "mrs");

  var bili = provider(
    "USR_Bilibili",
    "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml",
    "classical",
    "yaml"
  );

  // ==================================================
  // 4. ROUTING RULES
  // ==================================================

  var personal = [
    "DOMAIN-SUFFIX,deepseek.com,DIRECT",
    "DOMAIN-SUFFIX,deepseek.cn,DIRECT",
    "DOMAIN-SUFFIX,kimi.com,DIRECT",
    "DOMAIN-SUFFIX,kimi.ai,DIRECT",
    "DOMAIN-SUFFIX,moonshot.cn,DIRECT",
    "DOMAIN-SUFFIX,moonshot.ai,DIRECT",
    "DOMAIN-SUFFIX,qwen.ai,DIRECT",
    "DOMAIN-SUFFIX,tongyi.com,DIRECT",
    "DOMAIN-SUFFIX,doubao.com,DIRECT",
    "DOMAIN-SUFFIX,volcengine.com,DIRECT",
    "DOMAIN-SUFFIX,bigmodel.cn,DIRECT",
    "DOMAIN-SUFFIX,zhipuai.cn,DIRECT",

    "DOMAIN-SUFFIX,sntp.me,SNTP 机场服务",
    "DOMAIN-SUFFIX,sntp.uk,SNTP 机场服务",

    "DOMAIN,std.cn2gias.uk,SNTP-Emby",
    "DOMAIN,s2.array2026.cc,DIRECT",
    "DOMAIN,s3.array2026.com,DIRECT",

    "DOMAIN,emby.yusen.cc.cd,Yusen 影院",
    "DOMAIN,aaa.yusen6.ccwu.cc,Yusen 影院",
    "DOMAIN,13.yusen.cyou,Yusen 影院",
    "DOMAIN,embya.yusen.cyou,Yusen 影院",
    "DOMAIN-KEYWORD,yusen,Yusen 影院",

    "DOMAIN,embycc.wybcs.work,宸澄影院",

    "DOMAIN-SUFFIX,emby.moe,1111 影院",
    "DOMAIN-SUFFIX,xxlb.net,1111 影院",
    "DOMAIN-SUFFIX,loseremby.org,1111 影院",
    "DOMAIN-SUFFIX,zabc.net,1111 影院",

    "DOMAIN-SUFFIX,openai.com,AI 服务",
    "DOMAIN-SUFFIX,chatgpt.com,AI 服务",
    "DOMAIN-SUFFIX,oaistatic.com,AI 服务",
    "DOMAIN-SUFFIX,oaiusercontent.com,AI 服务",
    "DOMAIN-SUFFIX,anthropic.com,AI 服务",
    "DOMAIN-SUFFIX,claude.ai,AI 服务",
    "DOMAIN-SUFFIX,perplexity.ai,AI 服务",
    "DOMAIN,gemini.google.com,AI 服务",
    "DOMAIN,aistudio.google.com,AI 服务",
    "DOMAIN,generativelanguage.googleapis.com,AI 服务",

    "RULE-SET," + ai + ",AI 服务",
    "RULE-SET," + bili + ",哔哩哔哩",
    "RULE-SET," + tg + ",Telegram / 社交",
    "RULE-SET," + tgIP +
      ",Telegram / 社交,no-resolve",

    "DOMAIN-SUFFIX,github.com,开发者工具",
    "DOMAIN-SUFFIX,githubusercontent.com,开发者工具",
    "DOMAIN-SUFFIX,githubassets.com,开发者工具",
    "DOMAIN-SUFFIX,github.io,开发者工具",
    "DOMAIN-SUFFIX,ghcr.io,开发者工具",
    "DOMAIN-SUFFIX,gitlab.com,开发者工具",
    "DOMAIN-SUFFIX,docker.io,开发者工具",
    "DOMAIN-SUFFIX,pypi.org,开发者工具",
    "DOMAIN-SUFFIX,npmjs.org,开发者工具",
    "RULE-SET," + dev + ",开发者工具",

    "DOMAIN-SUFFIX,steamcommunity.com,Steam / 游戏",
    "DOMAIN-SUFFIX,steampowered.com,Steam / 游戏",
    "DOMAIN-SUFFIX,steamcontent.com,Steam / 游戏",

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

    "DOMAIN-SUFFIX,weixin.qq.com,DIRECT",
    "DOMAIN-SUFFIX,wechat.com,DIRECT",
    "DOMAIN-SUFFIX,alipay.com,DIRECT",
    "DOMAIN-SUFFIX,taobao.com,DIRECT",
    "DOMAIN-SUFFIX,jd.com,DIRECT",

    "RULE-SET," + streaming + ",国际流媒体"
  ];

  // Preserve original airport rules.
  var aliases = {
    "🔰 节点选择": "机场总控",
    "守候网络": "机场总控",
    "节点总控": "机场总控",
    "🌍 国外媒体": "国际流媒体",
    "🌏 国内媒体": "国内服务",
    "📺 YouTube": "国际流媒体",
    "📺 Disney": "国际流媒体",
    "📺 Netflix": "国际流媒体",
    "📺 HBOMAX": "国际流媒体",
    "📺 HBO": "国际流媒体",
    "📺 Bilibili": "哔哩哔哩",
    "📲 Telegram": "Telegram / 社交",
    "📲 电报信息": "Telegram / 社交",
    "社交媒体": "Telegram / 社交",
    "💬 OpenAi": "AI 服务",
    "openAI": "AI 服务",
    "ChatGPT / OpenAI": "AI 服务",
    "其他 AI": "AI 服务",
    "💬 Gemini": "AI 服务",
    "💬 Claude": "AI 服务",
    "🍎 Apple": "Apple 服务",
    "🍎 苹果服务": "Apple 服务",
    "Ⓜ️ 微软服务": "Microsoft 服务",
    "🌏 Steam": "Steam / 游戏",
    "🎯 本地直连": "DIRECT",
    "🐟 漏网之鱼": "漏网之鱼",
    "守候影院": "SNTP-Emby",
    "🎬 守候网络 Emby": "SNTP-Emby",
    "🎬 1111影院": "1111 影院",
    "🎬 Yusen Emby": "Yusen 影院",
    "🎬 宸澄影院": "宸澄影院"
  };

  var groupNames = {};
  groups.forEach(function (g) {
    groupNames[g.name] = true;
  });

  var oldGroupNames = {};
  (cfg["proxy-groups"] || []).forEach(function (g) {
    if (g && g.name) oldGroupNames[g.name] = true;
  });

  var oldRules = [];

  (cfg.rules || []).forEach(function (r) {
    if (typeof r !== "string") return;

    var parts = r.split(",");
    if (parts[0] === "MATCH") return;

    var index = parts.length - 1;
    if (parts[index] === "no-resolve") index--;

    var target = parts[index];
    var mapped = aliases[target] || target;

    if (!groupNames[mapped] &&
        oldGroupNames[target] &&
        mapped !== "DIRECT" &&
        mapped !== "REJECT") {
      mapped = "机场总控";
    }

    parts[index] = mapped;
    oldRules.push(parts.join(","));
  });

  // Avoid repeating personal rules.
  var priority = {};

  personal.forEach(function (r) {
    var p = r.split(",");
    priority[p[0] + "|" + p[1]] = true;
  });

  var filtered = [];
  var seen = {};

  oldRules.forEach(function (r) {
    var p = r.split(",");
    var key = p[0] + "|" + p[1];

    if (priority[key] || seen[r]) return;

    seen[r] = true;
    filtered.push(r);
  });

  cfg["proxy-groups"] = groups;
  cfg["rule-providers"] = defs;

  cfg.rules = personal.concat(
    filtered,
    ["MATCH,漏网之鱼"]
  );

  console.log(
    "[ClashBox V1.5] " +
    (profileName || "") +
    " groups=" + groups.length +
    " rules=" + cfg.rules.length
  );

  return cfg;
}

/*
 * ClashBox V1.6 - Color Policy Group Icons
 * HarmonyOS / Mihomo
 *
 * Based on ClashBox V1.5.
 * Uses verified Qure Color PNG icons.
 *
 * Only adds the icon property to proxy-groups.
 *
 * Preserves:
 * - Official DNS / DoH
 * - TUN / MTU
 * - Proxy nodes and providers
 * - Routing rules
 * - All Emby settings
 * - Existing policy group behavior
 */

(function () {
  var originalMain = main;

  var base =
    "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/";

  var icons = {
    // Main
    "机场总控": "Proxy.png",

    // Regions
    "香港": "Hong_Kong.png",
    "日本": "Japan.png",
    "美国": "United_States.png",
    "新加坡": "Singapore.png",
    "台湾": "Taiwan.png",
    "韩国": "Korea.png",
    "其他地区": "Global.png",

    // AI
    "AI 服务": "Auto.png",
    "国内 AI": "Auto.png",

    // Emby
    "SNTP-Emby": "Emby.png",
    "1111 影院": "Emby.png",
    "Yusen 影院": "Emby.png",
    "宸澄影院": "Emby.png",

    // Airport
    "SNTP 机场服务": "Direct.png",

    // Streaming
    "哔哩哔哩": "DomesticMedia.png",
    "国际流媒体": "ForeignMedia.png",

    // Applications
    "Telegram / 社交": "Telegram.png",
    "开发者工具": "Global.png",
    "Apple 服务": "Apple.png",
    "Microsoft 服务": "Microsoft.png",
    "Steam / 游戏": "Game.png",

    // Network
    "网络检测": "Speedtest.png",
    "国内服务": "DomesticMedia.png",
    "国际服务": "Global.png",
    "漏网之鱼": "Final.png"
  };

  // Preserve the original ClashBox main function.
  main = function () {
    var result = originalMain.apply(
      this,
      arguments
    );

    if (
      !result ||
      !Array.isArray(result["proxy-groups"])
    ) {
      return result;
    }

    result["proxy-groups"].forEach(
      function (group) {
        if (
          !group ||
          typeof group.name !== "string"
        ) {
          return;
        }

        var name = group.name;
        var file = icons[name];

        // Region auto-test groups.
        if (name.indexOf("自动优选") !== -1) {
          file = "Auto.png";
        }

        // Fallback icon for unmatched groups.
        if (!file) {
          file = "Global.png";
        }

        group.icon = base + file;
      }
    );

    if (typeof console !== "undefined") {
      console.log(
        "[ClashBox V1.6] Color icons applied: " +
        result["proxy-groups"].length
      );
    }

    return result;
  };
})();
