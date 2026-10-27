
/* ClashBox 共用 V2.1 · IGG / 守候网络 | 三 Emby + SNTP独立服务
 * 1111按官方 hc.list 24小时动态更新；1111: 美/港/日/新，默认美国。
 * Yusen: 直连/港/日/美；守候影院独立；SNTP服务: 直连/港/日/美。
 * 守候 QX 规则中的影院与机场服务拆分，排除公共云泛域名。
 * 保留地区选择、流媒体、AI、IP检测、666OS规则及官方DNS。
 * 使用方法：覆盖 GitHub clashbox.js；不和其他覆写脚本叠加。
 */
function main(config, profileName) {
  if (!config || typeof config !== 'object' || !Array.isArray(config.proxies) || !Array.isArray(config['proxy-groups'])) return config;
  var i, j, original = config['proxy-groups'], byName = {};
  for (i = 0; i < original.length; i++) if (original[i] && typeof original[i].name === 'string') byName[original[i].name] = original[i];
  var igg = !!(byName['🔰 节点选择'] && byName['🐟 漏网之鱼'] && !byName['📺 Emby影院']);
  var shouhou = !!(byName['守候网络'] || byName['📺 Emby影院'] || (byName['节点总控'] && byName['ChatGPT / OpenAI']));
  if (!igg && !shouhou) return config;
  var G = '🎬 守候网络 Emby', Y = '🎬 Yusen Emby';
  var E = '🎬 1111 Emby', S = '🛰️ SNTP 机场服务';
  var regions = ['香港','台湾','日本','新加坡','美国','其他地区'];
  var pools = {'香港':[],'台湾':[],'日本':[],'新加坡':[],'美国':[],'其他地区':[]};
  var names = [], nameExists = {}, excluded = /流量|到期|套餐|剩余|订阅|客服|官网|过期|traffic|expire/i;
  function classify(name) {
    if (/🇹🇼|台灣|台湾|台北|taiwan|(?:^|[^a-z])TW(?:\d|[^a-z]|$)/i.test(name)) return '台湾';
    if (/🇭🇰|香港|hong.?kong|(?:^|[^a-z])HK(?:\d|[^a-z]|$)/i.test(name)) return '香港';
    if (/🇯🇵|日本|东京|大阪|japan|(?:^|[^a-z])JP(?:\d|[^a-z]|$)/i.test(name)) return '日本';
    if (/🇸🇬|新加坡|狮城|singapore|(?:^|[^a-z])SG(?:\d|[^a-z]|$)/i.test(name)) return '新加坡';
    if (/🇺🇸|美国|美國|洛杉矶|西雅图|圣何塞|硅谷|纽约|united.?states|(?:^|[^a-z])US(?:\d|[^a-z]|$)/i.test(name)) return '美国';
    return '其他地区';
  }
  function unique(items) {
    var out = [], seen = {};
    for (var z = 0; z < items.length; z++) {
      var s = items[z];
      if (typeof s !== 'string' || seen['!' + s]) continue;
      seen['!' + s] = true; out.push(s);
    }
    return out;
  }
  if (shouhou) {
    var seenEndpoint = {}, dedup = [];
    for (i = 0; i < config.proxies.length; i++) {
      var node = config.proxies[i];
      if (!node || !node.name || !node.type) continue;
      var keys = Object.keys(node).sort(), fingerprint = '';
      for (j = 0; j < keys.length; j++) {
        var key = keys[j];
        if (key !== 'name') fingerprint += key + ':' + JSON.stringify(node[key]) + ';';
      }
      if (!seenEndpoint[fingerprint]) { seenEndpoint[fingerprint] = true; dedup.push(node); }
    }
    config.proxies = dedup;
  }
  for (i = 0; i < config.proxies.length; i++) {
    var p = config.proxies[i];
    if (!p || typeof p.name !== 'string' || p.type === 'dns' || excluded.test(p.name) || /^(DNS|DIRECT|REJECT|PASS)$/i.test(p.name)) continue;
    if (nameExists['!' + p.name]) continue;
    nameExists['!' + p.name] = true;
    names.push(p.name); pools[classify(p.name)].push(p.name);
  }
  var groups = [], groupNames = {};
  function makeGroup(name, type, members) {
    var proxyList = unique(members);
    if (!proxyList.length) proxyList = ['REJECT'];
    var g = {name:name, type:type, proxies:proxyList};
    if (type === 'url-test') {
      g.url = 'http://www.gstatic.com/generate_204';
      g.interval = 3600; g.timeout = 5000; g.tolerance = 100; g.lazy = false;
    }
    g.hidden = false;
    g['include-all'] = false; g['include-all-proxies'] = false; g['include-all-providers'] = false;
    if (groupNames[name] !== undefined) groups[groupNames[name]] = g;
    else { groupNames[name] = groups.length; groups.push(g); }
  }
  var order = ['香港','美国','新加坡','日本','台湾','其他地区'];
  // Emby 组只显示地区，具体节点在地区组内设置。
  // 无可用节点的地区会落到 REJECT，不生成无效节点引用。
  var validRegions = order.filter(function(r) { return pools[r].length > 0; });
  makeGroup(G, 'select', validRegions.length ? validRegions : ['REJECT']);
  makeGroup(E, 'select', ['美国','香港','日本','新加坡']);
  makeGroup(Y, 'select', ['DIRECT','香港','日本','美国']);
  makeGroup(S, 'select', ['DIRECT','香港','日本','美国']);
  for (i = 0; i < regions.length; i++) {
    var r = regions[i];
    makeGroup(r, 'select', [r + ' · 智能优选'].concat(pools[r]));
    makeGroup(r + ' · 智能优选', 'url-test', pools[r]);
  }
  var aliases = {};
  if (shouhou) {
    makeGroup('节点总控','select',['香港','美国','日本','新加坡','台湾','其他地区','DIRECT']);
    makeGroup('ChatGPT / OpenAI','select',['美国'].concat(pools['美国']));
    makeGroup('国内服务','select',['DIRECT','节点总控']);
    makeGroup('国际服务','select',['香港','美国','新加坡','日本','节点总控','DIRECT']);
    makeGroup('其他 AI','select',['美国','新加坡','日本','节点总控']);
    makeGroup('开发者工具','select',['新加坡','美国','日本','香港','节点总控']);
    makeGroup('流媒体','select',['香港','美国','日本','新加坡','节点总控']);
    makeGroup('社交媒体','select',['香港','美国','日本','节点总控']);
    makeGroup('微软服务','select',['DIRECT','香港','美国','节点总控']);
    makeGroup('苹果服务','select',['DIRECT','香港','美国','节点总控']);
    makeGroup('漏网之鱼','select',['DIRECT','香港','美国','节点总控']);
    aliases = {
      '守候网络':'节点总控','📺 Emby影院':'流媒体',
      '📺 YouTube':'流媒体','📺 Disney':'流媒体','📺 Netflix':'流媒体',
      '🐭 Twitch':'流媒体','📺 HBOMAX':'流媒体','🍎 Apple TV':'流媒体',
      '📺 Bilibili':'国内服务',
      '📲 Telegram':'社交媒体','电报信息':'社交媒体',
      '💬 OpenAi':'ChatGPT / OpenAI',
      '💬 Cursor':'其他 AI','💬 Gemini':'其他 AI','💬 Claude':'其他 AI','💬 Perplexity':'其他 AI',
      '🌏 Discord':'社交媒体','🌏 Twitter':'社交媒体','🌏 巴哈姆特':'社交媒体','🌏 Tiktok':'社交媒体',
      '🌏 Dropbox':'国际服务','网络云盘':'国际服务',
      '✈️ Bing':'微软服务','🛩 Copilot':'微软服务',
      '🍎 Apple':'苹果服务','🌏 GFWlist':'国际服务',
      'Steam / 游戏':'漏网之鱼','🌏 Steam':'漏网之鱼', '🌏 Xbox':'漏网之鱼',
      'PT 下载':'漏网之鱼', '🌏 PrivateTracker':'漏网之鱼',
      '🐟 漏网之鱼':'漏网之鱼', ' 📺 YouTube':'流媒体'
    };
  } else {
    makeGroup('开发者工具','select',['新加坡','美国','日本','香港','台湾','其他地区']);
    makeGroup('🔰 节点选择','select',['香港','美国','日本','新加坡','台湾','其他地区','DIRECT']);
    makeGroup('🌍 国外媒体','select',['香港','日本','美国','新加坡','🔰 节点选择']);
    makeGroup('🌏 国内媒体','select',['DIRECT','香港','🔰 节点选择']);
    makeGroup('社交媒体','select',['香港','美国','新加坡','日本','🔰 节点选择']);
    makeGroup('Ⓜ️ 微软服务','select',['DIRECT','香港','美国','🔰 节点选择']);
    makeGroup('🍎 苹果服务','select',['DIRECT','香港','美国','🔰 节点选择']);
    var aiEntries = ['美国'].concat(pools['美国']);
    if (nameExists['!ChatGPT & AI 专线']) aiEntries.unshift('ChatGPT & AI 专线');
    makeGroup('openAI','select',aiEntries);
    makeGroup('🎯 本地直连','select',['DIRECT']);
    makeGroup('🐟 漏网之鱼','select',['DIRECT','香港','美国','🔰 节点选择']);
    aliases = {
      '📲 电报信息':'社交媒体', '电报信息':'社交媒体',
      'SteamGame':'🐟 漏网之鱼','Steam / 游戏':'🐟 漏网之鱼',
      '🌏 Steam':'🐟 漏网之鱼','🌏 Xbox':'🐟 漏网之鱼',
      'PT 下载':'🐟 漏网之鱼','🌏 PrivateTracker':'🐟 漏网之鱼',
      '网络云盘':'🔰 节点选择','🌏 Dropbox':'🔰 节点选择',
      '♻️ 自动选择 - HK':'香港 · 智能优选',
      '♻️ 自动选择 - US':'美国 · 智能优选',
      '♻️ 自动选择 - JP':'日本 · 智能优选'
    };
  }
  function translateRule(rule) {
    if (typeof rule !== 'string') return null;
    var parts = rule.split(','), end = parts.length - 1;
    if (parts[end] === 'no-resolve') end--;
    if (aliases[parts[end]]) parts[end] = aliases[parts[end]];
    return parts.join(',');
  }
  var oldRules = Array.isArray(config.rules) ? config.rules : [];
  var kept = [], oldTail = [], seenRule = {};
  for (i = 0; i < oldRules.length; i++) {
    var rule = translateRule(oldRules[i]);
    if (!rule || rule.indexOf('MATCH,') === 0 || seenRule['!' + rule]) continue;
    seenRule['!' + rule] = true;
    // GEOIP CN/GEOSITE cn 等兜底规则靠后，避免提前截住媒体/社交规则。
    if (/^(GEOIP,CN,|GEOSITE,cn,|DOMAIN-SUFFIX,cn,)/i.test(rule)) oldTail.push(rule);
    else kept.push(rule);
  }

  var dev = '开发者工具';
  var ai = shouhou ? 'ChatGPT / OpenAI' : 'openAI';
  var aiOther = shouhou ? '其他 AI' : 'openAI';
  var social = '社交媒体';
  var stream = shouhou ? '流媒体' : '🌍 国外媒体';
  var apple = shouhou ? '苹果服务' : '🍎 苹果服务';
  var microsoft = shouhou ? '微软服务' : 'Ⓜ️ 微软服务';
  var cn = shouhou ? '国内服务' : '🎯 本地直连';
  var fallback = shouhou ? '漏网之鱼' : '🐟 漏网之鱼';
  var ipCheckExit = shouhou ? '节点总控' : '🔰 节点选择';

  // ClashBox 检测页/浏览器第三方 IP 查询：将常见接口置于规则最前方。
  // 仅当请求实际经过 Mihomo 时才生效；不能修改 App 绕过 VPN 的原生请求。
  var ipCheckHosts = [
    'ipinfo.io','ip-api.com','ipapi.co','ipapi.is','ipwho.is',
    'ipify.org','api.ipify.org','api64.ipify.org','ip.sb','ip.skk.moe',
    'ifconfig.me','ifconfig.co','icanhazip.com','ident.me','checkip.amazonaws.com',
    'api.myip.com','ping0.cc','ip111.cn','myip.ipip.net','ipleak.net',
    'ipcheck.ing','ip2location.io','ipgeolocation.io'
  ];
  var priority = [
    // 1111 规则来自管理员提供的动态列表，兼容新增与删除。
    // classical/text；首次加载要求可连接 GitHub，之后由内核缓存和刷新。
    'RULE-SET,CB_1111HC,' + E,
    // 守候影院：QX 官方 cn2gias.uk + SNTP Standard 两条 CF 精确入口。
    'DOMAIN-SUFFIX,cn2gias.uk,' + G,
    'DOMAIN,s2.array2026.cc,' + G,
    'DOMAIN,s3.array2026.com,' + G,
    // SNTP 机场服务：来自 QX 官方的 SNTP 组（不含公共云泛域名）。
    'DOMAIN-SUFFIX,sntp.uk,' + S,
    'DOMAIN-SUFFIX,qzyidc.com,' + S,
    'DOMAIN-SUFFIX,eihhu.com,' + S,
    'DOMAIN-SUFFIX,1a1api.top,' + S,
    'DOMAIN-SUFFIX,wuyouyun.com,' + S,
    // Yusen 继续单独控制，支持 DIRECT 和地区组。
    'DOMAIN-KEYWORD,yusen,' + Y
  ];
  ipCheckHosts.forEach(function(host) { priority.push('DOMAIN,' + host + ',' + ipCheckExit); });
  // 用于 IP 检测的 www/API 子域名：更完整，但不使用过宽的 DOMAIN-KEYWORD,ip。
  ['ipinfo.io','ip-api.com','ipapi.co','ipify.org','ip.sb','ip.skk.moe',
    'ifconfig.me','ifconfig.co','ping0.cc','ip2location.io','ipgeolocation.io']
    .forEach(function(host) { priority.push('DOMAIN-SUFFIX,' + host + ',' + ipCheckExit); });
  [
    'github.com','githubusercontent.com','githubassets.com','github.io',
    'ghcr.io','gitlab.com','bitbucket.org','npmjs.com','npmjs.org',
    'pypi.org','pythonhosted.org','docker.com','docker.io','quay.io'
  ].forEach(function(host) { priority.push('DOMAIN-SUFFIX,' + host + ',' + dev); });
  ['openai.com','chatgpt.com','oaistatic.com','oaiusercontent.com']
    .forEach(function(host) { priority.push('DOMAIN-SUFFIX,' + host + ',' + ai); });
  ['t.me','telegram.org','telegram.me','telegram.dog','telegra.ph','telesco.pe']
    .forEach(function(host) { priority.push('DOMAIN-SUFFIX,' + host + ',' + social); });
  ['qq.com','weixin.qq.com','wechat.com','taobao.com','jd.com','alipay.com','bilibili.com']
    .forEach(function(host) { priority.push('DOMAIN-SUFFIX,' + host + ',' + cn); });

  // 采用昨天看到的 666OS 模板之分类结构，精选 8 个远程 MRS；
  // 不启用广告 MITM/拦截、不改 DNS、不改 GLOBAL，不导入大型全量代理集。
  var providers = config['rule-providers'];
  if (!providers || typeof providers !== 'object' || Array.isArray(providers)) providers = {};
  // 1111 提供的原始 classical 规则；不要硬编码旧清单，确保删除也可同步生效。
  providers.CB_1111HC = {
    type: 'http', behavior: 'classical', format: 'text',
    url: 'https://raw.githubusercontent.com/zxcll/sub/refs/heads/main/hc.list',
    path: './rule_provider/CB_1111HC.list', interval: 86400,
    proxy: '开发者工具'
  };
  function addProvider(name, kind, suffix) {
    if (providers[name]) return;
    providers[name] = {
      type:'http', behavior:kind, format:'mrs',
      url:'https://github.com/666OS/rules/raw/release/mihomo/' +
          (kind === 'ipcidr' ? 'ip/' : 'domain/') + suffix + '.mrs',
      path:'./rule_provider/666OS_' + name + '.mrs', interval:86400
    };
  }
  addProvider('CB_AI','domain','AI');
  addProvider('CB_Telegram','domain','Telegram');
  addProvider('CB_TelegramIP','ipcidr','Telegram');
  addProvider('CB_SocialMedia','domain','SocialMedia');
  addProvider('CB_Streaming','domain','Streaming');
  addProvider('CB_Apple','domain','Apple');
  addProvider('CB_Microsoft','domain','Microsoft');
  addProvider('CB_China','domain','China');
  config['rule-providers'] = providers;

  var templateRules = [
    'RULE-SET,CB_AI,' + aiOther,
    'RULE-SET,CB_Telegram,' + social,
    'RULE-SET,CB_TelegramIP,' + social + ',no-resolve',
    'RULE-SET,CB_SocialMedia,' + social,
    'RULE-SET,CB_Streaming,' + stream,
    'RULE-SET,CB_Apple,' + apple,
    'RULE-SET,CB_Microsoft,' + microsoft
  ];
  // 承接现有规则、只替换同类型域名入口和已删除策略组的旧引用。
  var managed = {};
  priority.forEach(function(rule) {
    var p = rule.split(',');
    // RULE-SET 引用不会与原规则的同名键冲突。
    if (p[0] !== 'RULE-SET') managed[p[0] + '|' + p[1]] = true;
  });
  // 旧配置里广泛匹配 array2026.com/cc 的影院规则应剔除：
  // 现在只匹配 s2.array2026.cc 和 s3.array2026.com 两个已确认入口。
  ['array2026.com','array2026.cc'].forEach(function(host) {
    managed['DOMAIN-SUFFIX|' + host] = true;
  });
  function suppressManaged(r) {
    var p = r.split(',');
    return !managed[p[0] + '|' + p[1]];
  }
  kept = kept.filter(suppressManaged);
  oldTail = oldTail.filter(suppressManaged);
  // 将模板中的国内规则放在海外优先规则之后、国内 IP 兜底之前。
  config.rules = unique(priority.concat(templateRules, kept, ['RULE-SET,CB_China,' + cn], oldTail, ['MATCH,' + fallback]));
  config['proxy-groups'] = groups;
  // 严格不读写 config.dns / config.hosts。官方订阅负责所有 DNS。
  return config;
}
