/* ClashBox 通用 V1.6 · iGuGe + 守候网络
 * 六地区、双 Emby、旧策略组映射、保持机场 DNS，不修改 GLOBAL。
 */
function main(config, profileName) {
  if (!config || typeof config !== 'object' || !Array.isArray(config.proxies) || !Array.isArray(config['proxy-groups'])) return config;
  var i, j, original = config['proxy-groups'], byName = {};
  for (i = 0; i < original.length; i++) if (original[i] && typeof original[i].name === 'string') byName[original[i].name] = original[i];
  var igg = !!(byName['🔰 节点选择'] && byName['🐟 漏网之鱼'] && !byName['📺 Emby影院']);
  var shouhou = !!(byName['守候网络'] || byName['📺 Emby影院'] || (byName['节点总控'] && byName['ChatGPT / OpenAI']));
  if (!igg && !shouhou) return config;
  var G = '🎬 守候网络 Emby', Y = '🎬 Yusen Emby';
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
    if (!proxyList.length) proxyList = ['DIRECT'];
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
  makeGroup(G,'select',['美国','香港','新加坡','日本','台湾','其他地区','DIRECT']);
  makeGroup(Y,'select',['DIRECT'].concat(order));
  for (i = 0; i < regions.length; i++) {
    var r = regions[i];
    makeGroup(r,'select',[r + ' · 智能优选'].concat(pools[r]));
    makeGroup(r + ' · 智能优选','url-test',pools[r]);
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
    makeGroup('网络云盘','select',['DIRECT','香港','新加坡','美国','节点总控']);
    makeGroup('社交媒体','select',['香港','美国','日本','节点总控']);
    makeGroup('微软服务','select',['DIRECT','香港','美国','节点总控']);
    makeGroup('苹果服务','select',['DIRECT','香港','美国','节点总控']);
    makeGroup('电报信息','select',['香港','美国','节点总控']);
    makeGroup('Steam / 游戏','select',['DIRECT','香港','节点总控']);
    makeGroup('PT 下载','select',['DIRECT','香港','节点总控']);
    makeGroup('漏网之鱼','select',['DIRECT','香港','美国','节点总控']);
    aliases = {
      '守候网络':'节点总控','📺 Emby影院':'流媒体',
      '📺 YouTube':'流媒体','📺 Disney':'流媒体','📺 Netflix':'流媒体',
      '🐭 Twitch':'流媒体','📺 HBOMAX':'流媒体','🍎 Apple TV':'流媒体',
      '📺 Bilibili':'国内服务','📲 Telegram':'电报信息',
      '💬 OpenAi':'ChatGPT / OpenAI',
      '💬 Cursor':'其他 AI','💬 Gemini':'其他 AI','💬 Claude':'其他 AI','💬 Perplexity':'其他 AI',
      '🌏 Steam':'Steam / 游戏','🌏 Xbox':'Steam / 游戏',
      '🌏 Discord':'社交媒体','🌏 Twitter':'社交媒体','🌏 巴哈姆特':'社交媒体','🌏 Tiktok':'社交媒体',
      '🌏 Dropbox':'网络云盘','✈️ Bing':'微软服务','🛩 Copilot':'微软服务',
      '🍎 Apple':'苹果服务','🌏 GFWlist':'国际服务',
      '🌏 PrivateTracker':'PT 下载','🐟 漏网之鱼':'漏网之鱼',
      ' 📺 YouTube':'流媒体'
    };
  } else {
    makeGroup('开发者工具','select',['新加坡','美国','日本','香港','台湾','其他地区']);
    makeGroup('🔰 节点选择','select',['香港','美国','日本','新加坡','台湾','其他地区','DIRECT']);
    makeGroup('🌍 国外媒体','select',['香港','日本','美国','新加坡','🔰 节点选择']);
    makeGroup('🌏 国内媒体','select',['DIRECT','香港','🔰 节点选择']);
    makeGroup('Ⓜ️ 微软服务','select',['DIRECT','香港','美国','🔰 节点选择']);
    makeGroup('📲 电报信息','select',['香港','美国','🔰 节点选择']);
    makeGroup('🍎 苹果服务','select',['DIRECT','香港','美国','🔰 节点选择']);
    makeGroup('SteamGame','select',['DIRECT','香港','🔰 节点选择']);
    var aiEntries = ['美国'].concat(pools['美国']);
    if (nameExists['!ChatGPT & AI 专线']) aiEntries.unshift('ChatGPT & AI 专线');
    makeGroup('openAI','select',aiEntries);
    makeGroup('🎯 本地直连','select',['DIRECT']);
    makeGroup('🐟 漏网之鱼','select',['DIRECT','香港','美国','🔰 节点选择']);
    aliases['♻️ 自动选择 - HK'] = '香港 · 智能优选';
    aliases['♻️ 自动选择 - US'] = '美国 · 智能优选';
    aliases['♻️ 自动选择 - JP'] = '日本 · 智能优选';
  }
  function translateRule(rule) {
    if (typeof rule !== 'string') return null;
    var parts = rule.split(','), end = parts.length - 1;
    if (parts[end] === 'no-resolve') end--;
    if (aliases[parts[end]]) parts[end] = aliases[parts[end]];
    return parts.join(',');
  }
  var oldRules = Array.isArray(config.rules) ? config.rules : [];
  var kept = [], seenRule = {};
  for (i = 0; i < oldRules.length; i++) {
    var rule = translateRule(oldRules[i]);
    if (!rule || rule.indexOf('MATCH,') === 0 || seenRule['!' + rule]) continue;
    seenRule['!' + rule] = true;
    kept.push(rule);
  }
  var dev = '开发者工具';
  var ai = shouhou ? 'ChatGPT / OpenAI' : 'openAI';
  var additions = [
    'DOMAIN-KEYWORD,yusen,' + Y,
    'DOMAIN-SUFFIX,array2026.com,' + G,
    'DOMAIN-SUFFIX,array2026.cc,' + G,
    'DOMAIN-SUFFIX,cn2gias.uk,' + G,
    'DOMAIN-SUFFIX,sntp.uk,' + G,
    'DOMAIN-SUFFIX,github.com,' + dev,
    'DOMAIN-SUFFIX,githubusercontent.com,' + dev,
    'DOMAIN-SUFFIX,githubassets.com,' + dev,
    'DOMAIN-SUFFIX,github.io,' + dev,
    'DOMAIN-SUFFIX,ghcr.io,' + dev,
    'DOMAIN-SUFFIX,gitlab.com,' + dev,
    'DOMAIN-SUFFIX,openai.com,' + ai,
    'DOMAIN-SUFFIX,chatgpt.com,' + ai,
    'DOMAIN-SUFFIX,oaistatic.com,' + ai,
    'DOMAIN-SUFFIX,oaiusercontent.com,' + ai
  ];
  var managed = {};
  for (i = 0; i < additions.length; i++) {
    var t = additions[i].split(','); managed[t[0] + '|' + t[1]] = true;
  }
  var filtered = [];
  for (i = 0; i < kept.length; i++) {
    var e = kept[i].split(',');
    if (!managed[e[0] + '|' + e[1]]) filtered.push(kept[i]);
  }
  config.rules = additions.concat(filtered,['MATCH,' + (shouhou ? '漏网之鱼' : '🐟 漏网之鱼')]);
  config['proxy-groups'] = groups;
  if (igg && config.dns && typeof config.dns === 'object') {
    var policy = config.dns['nameserver-policy'];
    if (!policy || typeof policy !== 'object' || Array.isArray(policy)) policy = {};
    var d = ['https://223.5.5.5/dns-query','https://doh.pub/dns-query'];
    policy['+.array2026.com'] = d;
    policy['+.array2026.cc'] = d;
    policy['+.cn2gias.uk'] = d;
    policy['+.sntp.uk'] = d;
    config.dns['nameserver-policy'] = policy;
  }
  return config;
}
