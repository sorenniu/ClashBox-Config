/* Personal Routing V1.2 | ClashBox 鸿蒙 | Mihomo JavaScript override
 * 适配独立启用的 IGG / SNTP 机场配置。每份订阅单独使用，不跨机场合并节点。
 * 修改范围：proxy-groups / rules / rule-providers；不读取或改写 DNS、DoH、hosts、proxies。
 * 不与旧版 V2.1/V2.2、其他分组/分流脚本叠加使用。
 * GitHub 公开仓库可存放：不含订阅链接、密码、DoH UUID。
 */
function main(config, profileName) {
  if (!config || typeof config !== 'object') return config;
  var cfg = config;
  var rawNodes = Array.isArray(cfg.proxies) ? cfg.proxies : [];
  var proxyProviders = cfg['proxy-providers'] || {};
  var providerKeys = Object.keys(proxyProviders);
  if (!rawNodes.length && !providerKeys.length) {
    if (typeof console !== 'undefined') console.warn('[Personal V1.2] 未找到节点或节点提供器，跳过覆写');
    return cfg;
  }

  // 只按当前正在启用的单个机场配置生成分组，不识别/抓取另一个机场。
  var regionOrder = ['香港', '日本', '美国', '新加坡', '台湾', '韩国', '其他地区'];
  var pool = {};
  regionOrder.forEach(function (r) { pool[r] = []; });
  var nodeSeen = {};
  var unusable = /(?:流量|到期|套餐|剩余|订阅|客服|官网|过期|traffic|expire|剩余时间|重置时间)/i;
  function classify(n) {
    if (/🇹🇼|台灣|台湾|台北|\bTW\s*[-_#]?\s*\d|\bTaiwan\b/i.test(n)) return '台湾';
    if (/🇭🇰|香港|Hong[ -]?Kong|\bHK\s*[-_#]?\s*\d|\bHK\b/i.test(n)) return '香港';
    if (/🇯🇵|日本|东京|大阪|Japan|Tokyo|Osaka|\bJP\s*[-_#]?\s*\d|\bJP\b/i.test(n)) return '日本';
    if (/🇸🇬|新加坡|狮城|Singapore|\bSG\s*[-_#]?\s*\d|\bSG\b/i.test(n)) return '新加坡';
    if (/🇺🇸|美国|美國|洛杉矶|西雅图|圣何塞|硅谷|纽约|United[ -]?States|Seattle|Los[ -]?Angeles|\bUS\s*[-_#]?\s*\d|\bUS\b/i.test(n)) return '美国';
    if (/🇰🇷|韩国|韓國|首尔|首爾|Korea|Seoul|\bKR\s*[-_#]?\s*\d|\bKR\b/i.test(n)) return '韩国';
    return '其他地区';
  }
  rawNodes.forEach(function (node) {
    if (!node || typeof node.name !== 'string' || node.type === 'dns' || unusable.test(node.name)) return;
    if (/^(DIRECT|REJECT|REJECT-DROP|PASS|DNS|GLOBAL)$/i.test(node.name)) return;
    if (nodeSeen[node.name]) return;
    nodeSeen[node.name] = true;
    pool[classify(node.name)].push(node.name);
  });
  var providerOnly = !Object.keys(nodeSeen).length && !!providerKeys.length;
  if (!Object.keys(nodeSeen).length && !providerOnly) return cfg;
  var regionFilter = {
    '香港': '(?i)(香港|港|HK[0-9\\s_-]|Hong[ -]?Kong|🇭🇰)',
    '日本': '(?i)(日本|东京|大阪|JP[0-9\\s_-]|Japan|Tokyo|Osaka|🇯🇵)',
    '美国': '(?i)(美国|美國|US[0-9\\s_-]|United[ -]?States|Seattle|Los[ -]?Angeles|🇺🇸)',
    '新加坡': '(?i)(新加坡|狮城|SG[0-9\\s_-]|Singapore|🇸🇬)',
    '台湾': '(?i)(台湾|台灣|台北|TW[0-9\\s_-]|Taiwan|🇹🇼)',
    '韩国': '(?i)(韩国|韓國|首尔|KR[0-9\\s_-]|Korea|Seoul|🇰🇷)',
    '其他地区': '(?i)^(?!.*(?:香港|日本|美国|美國|新加坡|台湾|台灣|韩国|韓國|HK[0-9]|JP[0-9]|US[0-9]|SG[0-9]|TW[0-9]|KR[0-9]|🇭🇰|🇯🇵|🇺🇸|🇸🇬|🇹🇼|🇰🇷)).*$'
  };
  var active = regionOrder.filter(function (r) { return providerOnly || pool[r].length > 0; });
  function unique(items) {
    var seen = {}, out = [];
    (items || []).forEach(function (x) {
      if (typeof x !== 'string' || seen['#' + x]) return;
      seen['#' + x] = true; out.push(x);
    });
    return out;
  }
  function enabled(names) {
    return unique(names.filter(function (n) { return n === 'DIRECT' || n === 'REJECT' || !!visible[n] || !!nodeSeen[n]; }));
  }
  var visible = {};
  active.forEach(function (r) { visible[r] = true; });
  visible['机场总控'] = true;
  var groups = [];
  function addGroup(name, type, options, hidden) {
    var g = {name: name, type: type, proxies: unique(options)};
    if (hidden) g.hidden = true;
    if (type === 'url-test') {
      g.url = 'http://www.gstatic.com/generate_204';
      g.interval = 1200; g.timeout = 5000; g.tolerance = 100; g.lazy = true;
    }
    if (providerOnly && regionFilter[name.replace(/ · 自动优选$/, '')]) {
      g.use = providerKeys.slice();
      g.filter = regionFilter[name.replace(/ · 自动优选$/, '')];
      g['exclude-filter'] = '(?i)(流量|套餐|到期|剩余|订阅|官网|客服|traffic|expire)';
    }
    if (type === 'select' && g.proxies.length) g['default-selected'] = g.proxies[0];
    groups.push(g);
  }
  addGroup('机场总控', 'select', enabled(active.concat(['DIRECT'])));
  active.forEach(function (r) {
    var auto = r + ' · 自动优选';
    addGroup(r, 'select', [auto].concat(pool[r]));
  });

  function choose(preferred, fallback) {
    var r = enabled(preferred);
    return r.length ? r : [fallback || 'DIRECT'];
  }
  var usDirect = pool['美国'].slice();
  var us = visible['美国'] ? ['美国'] : [];
  var hk = visible['香港'] ? ['香港'] : [];
  var jp = visible['日本'] ? ['日本'] : [];
  var sg = visible['新加坡'] ? ['新加坡'] : [];
  var other = active.filter(function (r) { return ['美国', '香港', '日本', '新加坡'].indexOf(r) === -1; });
  addGroup('AI 服务', 'select', choose(us.concat(usDirect, jp, sg, hk, ['机场总控'])));
  addGroup('SNTP-Emby', 'select', choose(us.concat(hk, jp, sg, other, ['DIRECT'])));
  addGroup('1111 影院', 'select', choose(us.concat(hk, jp, sg, ['DIRECT'])));
  addGroup('Yusen 影院', 'select', choose(['DIRECT'].concat(hk, jp, us)));
  addGroup('SNTP 机场服务', 'select', choose(['DIRECT', '机场总控'].concat(hk, jp, us)));
  addGroup('哔哩哔哩', 'select', choose(['DIRECT'].concat(hk, ['机场总控'])));
  addGroup('国际流媒体', 'select', choose(hk.concat(us, jp, sg, ['机场总控', 'DIRECT'])));
  addGroup('Telegram / 社交', 'select', choose(['机场总控'].concat(us, hk, jp, ['DIRECT'])));
  addGroup('开发者工具', 'select', choose(sg.concat(us, jp, hk, ['机场总控', 'DIRECT'])));
  addGroup('Microsoft 服务', 'select', choose(['DIRECT', '机场总控'].concat(us, hk)));
  addGroup('Apple 服务', 'select', choose(['DIRECT', '机场总控'].concat(us, hk)));
  addGroup('Steam / 游戏', 'select', choose(['DIRECT', '机场总控'].concat(hk, us)));
  addGroup('网络检测', 'select', choose(['机场总控'].concat(us, hk, ['DIRECT'])));
  addGroup('国内服务', 'select', ['DIRECT', '机场总控']);
  addGroup('国际服务', 'select', choose(['机场总控'].concat(hk, us, jp, sg, ['DIRECT'])));
  addGroup('漏网之鱼', 'select', choose(['DIRECT', '机场总控'].concat(hk, us)));
  // 自动测速组虽然可被地区组引用，但尽可能不在首页单独出现。
  active.forEach(function (r) {
    addGroup(r + ' · 自动优选', 'url-test', pool[r].slice(), true);
  });

  // 原机场策略组的规则引用映射到新策略，避免删组导致原机场规则失效。
  var alias = {
    '🔰 节点选择': '机场总控', '守候网络': '机场总控', '节点总控': '机场总控',
    '♻️ 自动选择 - HK': '香港', '♻️ 自动选择 - JP': '日本', '♻️ 自动选择 - US': '美国',
    '🌍 国外媒体': '国际流媒体', '🌏 国内媒体': '国内服务',
    '📺 YouTube': '国际流媒体', '📺 Disney': '国际流媒体',
    '📺 Netflix': '国际流媒体', '📺 HBOMAX': '国际流媒体',
    '📺 HBO': '国际流媒体', '🐭 Twitch': '国际流媒体',
    '🍎 Apple TV': '国际流媒体', '流媒体': '国际流媒体',
    '📺 Bilibili': '哔哩哔哩', '📺 哔哩哔哩': '哔哩哔哩',
    '📲 Telegram': 'Telegram / 社交', '📲 电报信息': 'Telegram / 社交',
    '电报信息': 'Telegram / 社交', '社交媒体': 'Telegram / 社交',
    '🌏 Discord': 'Telegram / 社交', '🌏 Twitter': 'Telegram / 社交',
    '🌏 Tiktok': 'Telegram / 社交', '🌏 巴哈姆特': 'Telegram / 社交',
    '💬 OpenAi': 'AI 服务', 'openAI': 'AI 服务',
    'ChatGPT / OpenAI': 'AI 服务', '其他 AI': 'AI 服务',
    '💬 Cursor': 'AI 服务', '💬 Gemini': 'AI 服务',
    '💬 Claude': 'AI 服务', '💬 Perplexity': 'AI 服务',
    '🛩 Copilot': 'AI 服务', '✈️ Bing': 'Microsoft 服务',
    'Ⓜ️ 微软服务': 'Microsoft 服务', '微软服务': 'Microsoft 服务',
    '🍎 Apple': 'Apple 服务', '🍎 苹果服务': 'Apple 服务', '苹果服务': 'Apple 服务',
    'SteamGame': 'Steam / 游戏', '🌏 Steam': 'Steam / 游戏',
    'Steam / 游戏': 'Steam / 游戏', '🌏 Xbox': 'Steam / 游戏',
    '🌏 Dropbox': '国际服务', '网络云盘': '国际服务',
    '🌏 GFWlist': '国际服务', '🌏 PrivateTracker': '国际服务',
    '国际服务': '国际服务', '国内服务': '国内服务',
    '🎯 本地直连': 'DIRECT', '🐟 漏网之鱼': '漏网之鱼',
    '漏网之鱼': '漏网之鱼', '开发者工具': '开发者工具',
    '🎬 Yusen Emby': 'Yusen 影院'
  };
  var oldGroupNames = {};
  (Array.isArray(cfg['proxy-groups']) ? cfg['proxy-groups'] : []).forEach(function (g) {
    if (g && g.name) oldGroupNames[g.name] = true;
  });
  var availableGroup = {};
  groups.forEach(function (g) { availableGroup[g.name] = true; });
  function getTarget(rule) {
    var p = rule.split(',');
    var k = p.length - 1;
    if (p[k] === 'no-resolve') k--;
    return {parts: p, index: k, target: String(p[k] || '').trim()};
  }
  function canonical(oldName) {
    var newName = alias[oldName] || oldName;
    if (availableGroup[newName] || ['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'dns', 'DNS'].indexOf(newName) !== -1) return newName;
    if (oldGroupNames[oldName]) {
      if (/Emby/i.test(oldName)) return 'SNTP-Emby';
      if (/AI|OpenAI|GPT|Claude|Gemini|Cursor/i.test(oldName)) return 'AI 服务';
      if (/Bili/i.test(oldName)) return '哔哩哔哩';
      if (/媒体|Netflix|Disney|YouTube|视频|影音/i.test(oldName)) return '国际流媒体';
      if (/国内|直连/i.test(oldName)) return 'DIRECT';
      return '机场总控';
    }
    return newName;
  }
  // 既然用户仅希望 SNTP 主入口进入 SNTP-Emby，移除旧机场 Emby 宽泛规则。
  var legacyEmby = {'📺 Emby影院': true, '🎬 守候网络 Emby': true,
    '🎬 守候网络 Emby影院': true, '守候影院': true, 'SNTP-Emby': true};
  var oldRules = Array.isArray(cfg.rules) ? cfg.rules : [];
  var safeHead = [], tail = [], matchTargets = [];
  function isSafetyRule(rule) {
    return /^(IP-CIDR6?,(?:127\.|10\.|172\.16\.|192\.168\.|169\.254\.|100\.64\.|::1\/|fc00:|fe80:))/i.test(rule) ||
      /^DOMAIN-SUFFIX,local,/i.test(rule) ||
      /^AND,\(\(NETWORK,UDP\),\(DST-PORT,53\)\),dns$/i.test(rule);
  }
  var leadingSafe = true;
  oldRules.forEach(function (old) {
    if (typeof old !== 'string') return;
    var obj = getTarget(old), type = obj.parts[0];
    if (type === 'MATCH') { matchTargets.push(obj.target); return; }
    if (legacyEmby[obj.target]) return;
    var mapped = canonical(obj.target);
    // 原规则引用了已删除的分组时，不产生无效出站。
    if (oldGroupNames[obj.target] && !availableGroup[mapped] && mapped !== 'DIRECT') mapped = '机场总控';
    obj.parts[obj.index] = mapped;
    var rule = obj.parts.join(',');
    if (leadingSafe && isSafetyRule(rule)) safeHead.push(rule);
    else { leadingSafe = false; tail.push(rule); }
  });

  // 只添加必要的自定义远程源；不引入 1111 过宽的 IP-CIDR。
  var defs = cfg['rule-providers'] && typeof cfg['rule-providers'] === 'object'
    ? Object.assign({}, cfg['rule-providers']) : {};
  function ensureProvider(name, url, behavior, format) {
    var keys = Object.keys(defs);
    for (var i = 0; i < keys.length; i++) if (defs[keys[i]] && defs[keys[i]].url === url) return keys[i];
    var key = name, idx = 2;
    while (defs[key]) key = name + '_' + idx++;
    defs[key] = {type:'http', behavior:behavior, format:format, url:url,
      path:'./rule_provider/' + key + (format === 'mrs' ? '.mrs' : '.yaml'), interval:86400};
    return key;
  }
  var pAI = ensureProvider('USR_AI', 'https://github.com/666OS/rules/raw/release/mihomo/domain/AI.mrs', 'domain', 'mrs');
  var pTelegram = ensureProvider('USR_Telegram', 'https://github.com/666OS/rules/raw/release/mihomo/domain/Telegram.mrs', 'domain', 'mrs');
  var pTelegramIP = ensureProvider('USR_TelegramIP', 'https://github.com/666OS/rules/raw/release/mihomo/ip/Telegram.mrs', 'ipcidr', 'mrs');
  var pDev = ensureProvider('USR_Dev', 'https://github.com/666OS/rules/raw/release/mihomo/domain/Dev.mrs', 'domain', 'mrs');
  var pBili = ensureProvider('USR_Bilibili', 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml', 'classical', 'yaml');
  var pStreaming = ensureProvider('USR_Streaming', 'https://github.com/666OS/rules/raw/release/mihomo/domain/Streaming.mrs', 'domain', 'mrs');

  // 私人精确路由：优于机场的 GEOIP、GEOSITE、DOMAIN、MATCH 等通用分流。
  var personal = [
    'DOMAIN-SUFFIX,sntp.me,SNTP 机场服务',
    'DOMAIN-SUFFIX,sntp.uk,SNTP 机场服务',
    'DOMAIN,std.cn2gias.uk,SNTP-Emby',
    'DOMAIN,s2.array2026.cc,DIRECT',
    'DOMAIN,s3.array2026.com,DIRECT',
    'DOMAIN,emby.yusen.cc.cd,Yusen 影院',
    'DOMAIN,aaa.yusen6.ccwu.cc,Yusen 影院',
    'DOMAIN,13.yusen.cyou,Yusen 影院',
    'DOMAIN,embya.yusen.cyou,Yusen 影院',
    'DOMAIN-SUFFIX,emby.moe,1111 影院',
    'DOMAIN-SUFFIX,xxlb.net,1111 影院',
    'DOMAIN-SUFFIX,loseremby.org,1111 影院',
    'DOMAIN-SUFFIX,zabc.net,1111 影院',
    'DOMAIN-SUFFIX,openai.com,AI 服务',
    'DOMAIN-SUFFIX,chatgpt.com,AI 服务',
    'DOMAIN-SUFFIX,oaistatic.com,AI 服务',
    'DOMAIN-SUFFIX,oaiusercontent.com,AI 服务',
    'DOMAIN-SUFFIX,anthropic.com,AI 服务',
    'DOMAIN-SUFFIX,claude.ai,AI 服务',
    'DOMAIN-SUFFIX,perplexity.ai,AI 服务',
    'DOMAIN,gemini.google.com,AI 服务',
    'DOMAIN,aistudio.google.com,AI 服务',
    'DOMAIN,generativelanguage.googleapis.com,AI 服务',
    'RULE-SET,' + pAI + ',AI 服务',
    'RULE-SET,' + pBili + ',哔哩哔哩',
    'RULE-SET,' + pTelegram + ',Telegram / 社交',
    'RULE-SET,' + pTelegramIP + ',Telegram / 社交,no-resolve',
    'DOMAIN-SUFFIX,github.com,开发者工具',
    'DOMAIN-SUFFIX,githubusercontent.com,开发者工具',
    'DOMAIN-SUFFIX,githubassets.com,开发者工具',
    'DOMAIN-SUFFIX,github.io,开发者工具',
    'DOMAIN-SUFFIX,ghcr.io,开发者工具',
    'DOMAIN-SUFFIX,gitlab.com,开发者工具',
    'DOMAIN-SUFFIX,docker.io,开发者工具',
    'DOMAIN-SUFFIX,pypi.org,开发者工具',
    'DOMAIN-SUFFIX,npmjs.org,开发者工具',
    'RULE-SET,' + pDev + ',开发者工具',
    'DOMAIN-SUFFIX,steamcommunity.com,Steam / 游戏',
    'DOMAIN-SUFFIX,steampowered.com,Steam / 游戏',
    'DOMAIN-SUFFIX,steamcontent.com,Steam / 游戏',
    'DOMAIN,ipinfo.io,网络检测',
    'DOMAIN,ip-api.com,网络检测',
    'DOMAIN,ip.sb,网络检测',
    'DOMAIN,ifconfig.me,网络检测',
    'DOMAIN,api.ipify.org,网络检测',
    'DOMAIN,ipcheck.ing,网络检测',
    'DOMAIN-SUFFIX,weixin.qq.com,DIRECT',
    'DOMAIN-SUFFIX,wechat.com,DIRECT',
    'DOMAIN-SUFFIX,alipay.com,DIRECT',
    'DOMAIN-SUFFIX,taobao.com,DIRECT',
    'DOMAIN-SUFFIX,jd.com,DIRECT',
    'RULE-SET,' + pStreaming + ',国际流媒体'
  ];
  function matchKey(s) {
    var p = s.split(',');
    return p[0] + '|' + (p[1] || '');
  }
  var personalKeys = {};
  personal.forEach(function (s) { personalKeys[matchKey(s)] = true; });
  // 原机场同条件旧规则已由个人规则覆盖；其余原有规则保持相对顺序。
  var oldDedup = {};
  tail = tail.filter(function (s) {
    var k = matchKey(s);
    if (personalKeys[k] || oldDedup['!' + s]) return false;
    oldDedup['!' + s] = true;
    return true;
  });
  cfg['proxy-groups'] = groups;
  cfg['rule-providers'] = defs;
  cfg.rules = safeHead.concat(personal, tail, ['MATCH,漏网之鱼']);
  if (typeof console !== 'undefined') console.log('[Personal V1.2 ClashBox 鸿蒙] 已加载：地区=' + active.length + ', 个人规则=' + personal.length + ', 原机场规则=' + tail.length);
  return cfg;
}
