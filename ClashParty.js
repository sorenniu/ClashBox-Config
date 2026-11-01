/* Clash Party | Personal V1.5 FULL | IGG / SNTP
 * 独立订阅各自应用，保持官方 proxies、DNS/DoH、hosts、proxy-providers 等不变。
 * 生效顺序：本地系统/局域网保护 -> 自定义精确规则 -> 机场剩余规则 -> MATCH 漏网之鱼。
 * 此文件须作为 JavaScript 覆写使用，不是机场订阅 YAML。不要同时启用旧的分组覆写。
 */
function main(config) {
  if (!config || typeof config !== 'object') return config;
  try {
    var oldGroups = Array.isArray(config['proxy-groups']) ? config['proxy-groups'] : [];
    var oldRules = Array.isArray(config.rules) ? config.rules : [];
    var nodes = Array.isArray(config.proxies) ? config.proxies : [];
    var proxyProviders = config['proxy-providers'] || {};
    var providerNames = Object.keys(proxyProviders);
    var countries = ['香港','日本','美国','新加坡','台湾','韩国','其他地区'];
    var pools = {}, knownNodes = {}, i;
    countries.forEach(function(r) { pools[r] = []; });
    var infoNode = /流量|套餐|到期|剩余|过期|订阅|客服|traffic|expire/i;
    function region(n) {
      if (/🇭🇰|香港|Hong[ -]?Kong|\bHK\b|\bHK\s*[-_#]?\s*\d/i.test(n)) return '香港';
      if (/🇯🇵|日本|东京|大阪|Japan|Tokyo|Osaka|\bJP\b|\bJP\s*[-_#]?\s*\d/i.test(n)) return '日本';
      if (/🇺🇸|美国|美國|洛杉矶|西雅图|纽约|United[ -]?States|Seattle|Los[ -]?Angeles|\bUS\b|\bUS\s*[-_#]?\s*\d/i.test(n)) return '美国';
      if (/🇸🇬|新加坡|狮城|Singapore|\bSG\b|\bSG\s*[-_#]?\s*\d/i.test(n)) return '新加坡';
      if (/🇹🇼|台湾|台灣|台北|Taiwan|\bTW\b|\bTW\s*[-_#]?\s*\d/i.test(n)) return '台湾';
      if (/🇰🇷|韩国|韓國|首尔|首爾|Korea|Seoul|\bKR\b|\bKR\s*[-_#]?\s*\d/i.test(n)) return '韩国';
      return '其他地区';
    }
    nodes.forEach(function(n) {
      if (!n || !n.name || !n.type || n.type === 'dns' || infoNode.test(n.name)) return;
      if (/^(DIRECT|REJECT|PASS|GLOBAL|REJECT-DROP)$/i.test(n.name) || knownNodes[n.name]) return;
      knownNodes[n.name] = true;
      pools[region(n.name)].push(n.name);
    });
    var providerOnly = Object.keys(knownNodes).length === 0 && providerNames.length > 0;
    var active = countries.filter(function(r) { return pools[r].length || providerOnly; });
    if (!active.length) {
      console.warn('[Personal V1.4] 没有找到节点或节点提供器，未修改配置');
      return config;
    }
    function unique(xs) {
      var out = [], seen = {};
      (xs || []).forEach(function(x) {
        if (typeof x === 'string' && x && !seen['#' + x]) { seen['#' + x] = true; out.push(x); }
      });
      return out;
    }
    var filters = {
      '香港':'(?i)(香港|Hong.?Kong|HK[0-9 _-]|🇭🇰)',
      '日本':'(?i)(日本|Japan|Tokyo|Osaka|JP[0-9 _-]|🇯🇵)',
      '美国':'(?i)(美国|美國|United.?States|Seattle|Los.?Angeles|US[0-9 _-]|🇺🇸)',
      '新加坡':'(?i)(新加坡|狮城|Singapore|SG[0-9 _-]|🇸🇬)',
      '台湾':'(?i)(台湾|台灣|Taiwan|TW[0-9 _-]|🇹🇼)',
      '韩国':'(?i)(韩国|韓國|Korea|Seoul|KR[0-9 _-]|🇰🇷)',
      '其他地区':'(?i).*'
    };
    var excluded = '(?i)(流量|套餐|到期|剩余|过期|订阅|客服|traffic|expire)';
    var otherExcluded = '(?i)(流量|套餐|到期|剩余|过期|订阅|客服|traffic|expire|香港|日本|美国|美國|新加坡|台湾|台灣|韩国|韓國|Hong.?Kong|Japan|United.?States|Singapore|Taiwan|Korea|HK[0-9 _-]|JP[0-9 _-]|US[0-9 _-]|SG[0-9 _-]|TW[0-9 _-]|KR[0-9 _-]|🇭🇰|🇯🇵|🇺🇸|🇸🇬|🇹🇼|🇰🇷)';
    var generated = [], made = {};
    function addGroup(name, type, members, hidden, providerRegion) {
      var g = {name:name, type:type, proxies:unique(members)};
      if (hidden) g.hidden = true;
      if (type === 'url-test') {
        g.url = 'https://www.gstatic.com/generate_204';
        g.interval = 1200; g.tolerance = 100; g.lazy = true;
      }
      if (providerOnly && providerRegion) {
        g.use = providerNames.slice();
        g.filter = filters[providerRegion];
        g['exclude-filter'] = providerRegion === '其他地区' ? otherExcluded : excluded;
      }
      if (g.type === 'select' && g.proxies[0] === 'DIRECT') g['default-selected'] = 'DIRECT';
      generated.push(g); made[name] = true;
    }
    function available(list) { return list.filter(function(r) { return active.indexOf(r) >= 0; }); }
    function prefer(list) { var xs = available(list); return xs.length ? xs : ['机场总控']; }

    // 三个 Emby 组额外展示当前机场的香港/美国/日本 0.2 倍节点；只增加可手选节点。
    // 支持 0.2x、0.20x、0.2倍、0.20倍、20%，不将 2x / 1x 节点误判为低倍率。
    function isEmbyLowRate(name) {
      return /(?:^|[^0-9])(?:0[.．]2(?:0)?\s*(?:[x×倍])|20\s*%)(?![0-9])/i.test(name);
    }
    var embyLowRate = unique(['香港', '美国', '日本'].reduce(function(out, country) {
      return out.concat(pools[country].filter(isEmbyLowRate));
    }, []));

    // 当机场仅使用 proxy-providers 时，过滤来自提供器的 0.2 倍三地区节点。
    // 正则遵循 RE2 语法，不使用正向/负向预查。
    var embyCountryPattern = '(?:香港|Hong.?Kong|HK[0-9 _-]|🇭🇰|美国|美國|United.?States|Seattle|Los.?Angeles|US[0-9 _-]|🇺🇸|日本|Japan|Tokyo|Osaka|JP[0-9 _-]|🇯🇵)';
    var embyRatePattern = '(?:0[.]2(?:0)?[x×倍]|20[ ]*%)';
    var embyProviderFilter = '(?i)(?:' + embyCountryPattern + '.*' + embyRatePattern + '|' + embyRatePattern + '.*' + embyCountryPattern + ')';
    function addEmbyGroup(name, preferred) {
      addGroup(name, 'select', preferred.concat(embyLowRate));
      if (providerOnly) {
        var g = generated[generated.length - 1];
        g.use = providerNames.slice();
        g.filter = embyProviderFilter;
        g['exclude-filter'] = excluded;
      }
    }
    addGroup('机场总控', 'select', active.concat(['DIRECT']));
    active.forEach(function(r) {
      addGroup(r, 'select', [r + ' · 自动优选'].concat(pools[r]), false, providerOnly ? r : null);
    });
    addGroup('AI 服务', 'select', prefer(['美国','日本','新加坡','香港']).concat(pools['美国']));
    addEmbyGroup('SNTP-Emby', prefer(['美国','香港','日本','新加坡','其他地区']).concat(['DIRECT']));
    addEmbyGroup('1111 影院', prefer(['美国','香港','日本','新加坡']).concat(['DIRECT']));
    addEmbyGroup('Yusen 影院', ['DIRECT'].concat(available(['香港','日本','美国'])));
    addGroup('SNTP 机场服务', 'select', ['DIRECT','机场总控'].concat(available(['香港','日本','美国'])));
    addGroup('哔哩哔哩', 'select', ['DIRECT'].concat(available(['香港']), ['机场总控']));
    addGroup('国际流媒体', 'select', prefer(['香港','美国','日本','新加坡']).concat(['机场总控','DIRECT']));
    addGroup('Telegram / 社交', 'select', ['机场总控'].concat(available(['美国','香港','日本']), ['DIRECT']));
    addGroup('开发者工具', 'select', prefer(['新加坡','美国','日本','香港']).concat(['机场总控','DIRECT']));
    addGroup('Apple 服务', 'select', ['DIRECT','机场总控'].concat(available(['美国','香港'])));
    addGroup('Microsoft 服务', 'select', ['DIRECT','机场总控'].concat(available(['美国','香港'])));
    addGroup('Steam / 游戏', 'select', ['DIRECT','机场总控'].concat(available(['香港','美国'])));
    addGroup('国内服务', 'select', ['DIRECT','机场总控']);
    addGroup('国际服务', 'select', ['机场总控'].concat(available(['香港','美国','日本','新加坡']), ['DIRECT']));
    addGroup('网络检测', 'select', ['机场总控'].concat(available(['美国','香港']), ['DIRECT']));
    addGroup('漏网之鱼', 'select', ['DIRECT','机场总控'].concat(available(['香港','美国'])));
    active.forEach(function(r) {
      addGroup(r + ' · 自动优选', 'url-test', pools[r], true, providerOnly ? r : null);
    });
    // 原机场组仍供现有规则引用，避免切换后分流目标丢失。
    var legacy = oldGroups.filter(function(g) { return g && g.name && !made[g.name]; }).map(function(g) {
      var copy = Object.assign({}, g); copy.hidden = true; return copy;
    });
    var groups = generated.concat(legacy);

    // 仅增量加入六类规则源；1111 的官方列表存在过宽 IP 段，先用四条精确域名。
    var providers = Object.assign({}, config['rule-providers'] || {});
    function ensureProvider(key, url, behavior, format, ext) {
      var found = Object.keys(providers).filter(function(k) {
        return providers[k] && providers[k].url === url;
      });
      if (found.length) return found[0];
      var k = key, idx = 2;
      while (providers[k]) k = key + '_' + idx++;
      providers[k] = {type:'http', behavior:behavior, format:format, url:url,
        path:'./rule_provider/' + k + '.' + ext, interval:86400};
      return k;
    }
    var base = 'https://github.com/666OS/rules/raw/release/mihomo/';
    var pAI = ensureProvider('USR_AI',base+'domain/AI.mrs','domain','mrs','mrs');
    var pTG = ensureProvider('USR_Telegram',base+'domain/Telegram.mrs','domain','mrs','mrs');
    var pTGIP = ensureProvider('USR_TelegramIP',base+'ip/Telegram.mrs','ipcidr','mrs','mrs');
    var pDev = ensureProvider('USR_Dev',base+'domain/Dev.mrs','domain','mrs','mrs');
    var pBili = ensureProvider('USR_Bilibili','https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml','classical','yaml','yaml');
    var pStream = ensureProvider('USR_Streaming',base+'domain/Streaming.mrs','domain','mrs','mrs');

    var personal = [
      // 机场后台：两个独立机场配置中都可以选择 DIRECT 访问。
      'DOMAIN-SUFFIX,sntp.me,SNTP 机场服务',
      'DOMAIN-SUFFIX,sntp.uk,SNTP 机场服务',
      // SNTP 主线路只匹配一个主机；两个备用入口强制直连。
      'DOMAIN,std.cn2gias.uk,SNTP-Emby',
      'DOMAIN,s2.array2026.cc,DIRECT',
      'DOMAIN,s3.array2026.com,DIRECT',
      'DOMAIN,emby.yusen.cc.cd,Yusen 影院',
      'DOMAIN,aaa.yusen6.ccwu.cc,Yusen 影院',
      'DOMAIN,13.yusen.cyou,Yusen 影院',
      'DOMAIN,embya.yusen.cyou,Yusen 影院',
      'DOMAIN-KEYWORD,yusen,Yusen 影院',
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
      'RULE-SET,'+pAI+',AI 服务',
      'RULE-SET,'+pBili+',哔哩哔哩',
      'RULE-SET,'+pTG+',Telegram / 社交',
      'RULE-SET,'+pTGIP+',Telegram / 社交,no-resolve',
      'DOMAIN-SUFFIX,github.com,开发者工具',
      'DOMAIN-SUFFIX,githubusercontent.com,开发者工具',
      'DOMAIN-SUFFIX,githubassets.com,开发者工具',
      'DOMAIN-SUFFIX,github.io,开发者工具',
      'DOMAIN-SUFFIX,ghcr.io,开发者工具',
      'DOMAIN-SUFFIX,gitlab.com,开发者工具',
      'DOMAIN-SUFFIX,docker.io,开发者工具',
      'DOMAIN-SUFFIX,pypi.org,开发者工具',
      'DOMAIN-SUFFIX,npmjs.org,开发者工具',
      'RULE-SET,'+pDev+',开发者工具',
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
      'RULE-SET,'+pStream+',国际流媒体'
    ];

    // 更新旧策略目标：仅针对已确认的机场旧名称，不修改 DNS、节点等字段。
    var aliases = {
      'openAI':'AI 服务','ChatGPT / OpenAI':'AI 服务','其他 AI':'AI 服务',
      '💬 OpenAi':'AI 服务','💬 Cursor':'AI 服务','💬 Gemini':'AI 服务',
      '💬 Claude':'AI 服务','💬 Perplexity':'AI 服务',
      '🎬 Yusen Emby':'Yusen 影院',
      '📺 Bilibili':'哔哩哔哩',
      '📲 电报信息':'Telegram / 社交','📲 Telegram':'Telegram / 社交','电报信息':'Telegram / 社交',
      '社交媒体':'Telegram / 社交',
      '🌍 国外媒体':'国际流媒体','流媒体':'国际流媒体',
      '🌏 国内媒体':'国内服务','🎯 本地直连':'DIRECT',
      'Ⓜ️ 微软服务':'Microsoft 服务','微软服务':'Microsoft 服务','🛩 Copilot':'Microsoft 服务',
      '🍎 苹果服务':'Apple 服务','苹果服务':'Apple 服务','🍎 Apple':'Apple 服务',
      'SteamGame':'Steam / 游戏','🌏 Steam':'Steam / 游戏',
      '🐟 漏网之鱼':'漏网之鱼',
      '守候网络':'机场总控','🔰 节点选择':'机场总控',
      '🌏 GFWlist':'国际服务','网络云盘':'国际服务'
    };
    var oldEmbyGroups = {'🎬 守候网络 Emby':true,'📺 Emby影院':true};
    function parsedRule(s) {
      var pieces = s.split(',');
      var idx = pieces.length - 1;
      if (pieces[idx] === 'no-resolve') idx--;
      return {pieces:pieces, idx:idx, target:(pieces[idx]||'').trim()};
    }
    function safetyRule(s) {
      if (/^AND,\(\(NETWORK,UDP\),\(DST-PORT,53\)\),dns$/i.test(s)) return true;
      if (/^DOMAIN-SUFFIX,local,(DIRECT|🎯 本地直连)$/i.test(s)) return true;
      if (/^DOMAIN-SUFFIX,cn\.bing\.com,DIRECT$/i.test(s)) return true;
      var p = parsedRule(s);
      if (p.target !== 'DIRECT' && p.target !== '🎯 本地直连') return false;
      if (/^IP-CIDR,((127\.|10\.|192\.168\.|169\.254\.|100\.64\.)|172\.16\.)/i.test(s)) return true;
      if (/^IP-CIDR6?,(172\.16\.0\.0\/12|::1\/|fc00:|fe80:|fd00:)/i.test(s)) return true;
      return false;
    }
    var head = [], rest = [], seen = {}, stillHead = true;
    var priorityKeys = {};
    function ruleKey(s) {
      var p = s.split(',');
      return (p[0]||'')+'|'+(p[1]||'');
    }
    personal.forEach(function(s) { priorityKeys[ruleKey(s)] = true; });
    oldRules.forEach(function(s) {
      if (typeof s !== 'string' || !s.trim()) return;
      var p = parsedRule(s);
      if (p.pieces[0] === 'MATCH') return;
      if (oldEmbyGroups[p.target]) return; // 去掉旧守候 Emby 大范围匹配。
      if (/^(DOMAIN|DOMAIN-SUFFIX),((cn2gias\.uk)|(array2026\.(com|cc)))/i.test(s)) return;
      // 部分 SNTP 官网规则的策略名带前置空格，必须规范化。
      p.pieces[p.idx] = aliases[p.target] || p.target;
      var out = p.pieces.join(',');
      if (priorityKeys[ruleKey(out)] || seen[out]) return;
      seen[out] = true;
      if (stillHead && safetyRule(out)) head.push(out);
      else { stillHead = false; rest.push(out); }
    });
    var finalRules = unique(head.concat(personal, rest, ['MATCH,漏网之鱼']));
    // 原子提交：所有生成步骤完成后才写入配置，避免部分覆盖。
    config['proxy-groups'] = groups;
    config['rule-providers'] = providers;
    config.rules = finalRules;
    console.log('[Personal V1.5 FULL] OK | nodes='+Object.keys(knownNodes).length+
      ' regions='+active.length+' groups='+groups.length+' custom='+personal.length+
      ' original='+rest.length+' providers='+Object.keys(providers).length);
    return config;
  } catch (e) {
    if (typeof console !== 'undefined') console.error('[Personal V1.5 FULL] ERROR', e && (e.stack||e));
    return config;
  }
}
