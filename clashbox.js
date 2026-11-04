
/* Personal Routing V1.3 | ClashBox HarmonyOS | Mihomo JavaScript override
 * IGG / SNTP: one active subscription at a time; never merge airports.
 * Changes only proxy-groups, rules, rule-providers.
 * Does not modify DNS, DoH, hosts, proxies, proxy-providers, TUN or sniffer.
 * Do not stack with another group/rule override script.
 * Safe for public GitHub: no tokens, subscription URLs or private DNS keys.
 */
function main(config, profileName) {
  if (!config || typeof config !== 'object') return config;
  var cfg = config;
  var rawNodes = Array.isArray(cfg.proxies) ? cfg.proxies : [];
  var providers = cfg['proxy-providers'] || {};
  var providerKeys = Object.keys(providers);
  if (!rawNodes.length && !providerKeys.length) return cfg;

  var regions = ['香港', '日本', '美国', '新加坡', '台湾', '韩国', '其他地区'];
  var pool = {}, nodeSeen = {};
  regions.forEach(function (r) { pool[r] = []; });
  var info = /流量|到期|套餐|剩余|订阅|客服|官网|过期|重置|traffic|expire|subscription|reset/i;

  function classify(n) {
    if (/🇹🇼|台灣|台湾|台北|\bTW\s*[-_#]?\s*\d|Taiwan/i.test(n)) return '台湾';
    if (/🇭🇰|香港|港区|Hong[ -]?Kong|\bHK\s*[-_#]?\s*\d/i.test(n)) return '香港';
    if (/🇯🇵|日本|东京|大阪|Japan|Tokyo|Osaka|\bJP\s*[-_#]?\s*\d/i.test(n)) return '日本';
    if (/🇸🇬|新加坡|狮城|獅城|Singapore|\bSG\s*[-_#]?\s*\d/i.test(n)) return '新加坡';
    if (/🇺🇸|美国|美國|洛杉矶|西雅图|纽约|圣何塞|硅谷|United[ -]?States|Seattle|Los[ -]?Angeles|\bUS\s*[-_#]?\s*\d/i.test(n)) return '美国';
    if (/🇰🇷|韩国|韓國|首尔|首爾|Korea|Seoul|\bKR\s*[-_#]?\s*\d/i.test(n)) return '韩国';
    return '其他地区';
  }

  function isLow(n) {
    return /(?:^|[^0-9])0[.]2(?:0)?\s*(?:x|×|倍|倍率)|(?:^|[^0-9])20\s*[%％]/i.test(n);
  }

  rawNodes.forEach(function (n) {
    if (!n || typeof n.name !== 'string' || n.type === 'dns' || info.test(n.name) || nodeSeen[n.name]) return;
    if (/^(DIRECT|REJECT|REJECT-DROP|PASS|DNS|GLOBAL)$/i.test(n.name)) return;
    nodeSeen[n.name] = true;
    pool[classify(n.name)].push(n.name);
  });

  var providerOnly = !Object.keys(nodeSeen).length && providerKeys.length > 0;
  if (!Object.keys(nodeSeen).length && !providerOnly) return cfg;

  var regionFilter = {
    '香港': '(?i)(香港|港区|HK[0-9 _-]|Hong.?Kong|🇭🇰)',
    '日本': '(?i)(日本|东京|大阪|JP[0-9 _-]|Japan|Tokyo|Osaka|🇯🇵)',
    '美国': '(?i)(美国|美國|US[0-9 _-]|United.?States|Seattle|Los.?Angeles|🇺🇸)',
    '新加坡': '(?i)(新加坡|狮城|獅城|SG[0-9 _-]|Singapore|🇸🇬)',
    '台湾': '(?i)(台湾|台灣|台北|TW[0-9 _-]|Taiwan|🇹🇼)',
    '韩国': '(?i)(韩国|韓國|首尔|首爾|KR[0-9 _-]|Korea|Seoul|🇰🇷)',
    '其他地区': '(?i)^(?!.*(?:香港|港区|Hong.?Kong|日本|Japan|美国|美國|United.?States|新加坡|Singapore|台湾|台灣|Taiwan|韩国|韓國|Korea|HK[0-9 _-]|JP[0-9 _-]|US[0-9 _-]|SG[0-9 _-]|TW[0-9 _-]|KR[0-9 _-]|🇭🇰|🇯🇵|🇺🇸|🇸🇬|🇹🇼|🇰🇷)).*$'
  };

  var active = regions.filter(function (r) { return providerOnly || pool[r].length; });
  var visible = {};
  active.forEach(function (r) { visible[r] = true; });
  visible['机场总控'] = true;

  function unique(xs) {
    var seen = {}, out = [];
    (xs || []).forEach(function (x) {
      if (typeof x !== 'string' || seen['$' + x]) return;
      seen['$' + x] = true;
      out.push(x);
    });
    return out;
  }

  var groups = [];

  function addGroup(name, type, items, hidden) {
    var g = {name:name, type:type, proxies:unique(items)};
    if (hidden) g.hidden = true;
    if (type === 'url-test') {
      g.url = 'http://www.gstatic.com/generate_204';
      g.interval = 1200;
      g.timeout = 5000;
      g.tolerance = 100;
      g.lazy = true;
    }
    if (type === 'select' && g.proxies.length) {
      g['default-selected'] = g.proxies[0];
    }
    groups.push(g);
    return g;
  }

  function enabled(items) {
    return unique((items || []).filter(function (x) {
      return x === 'DIRECT' || x === 'REJECT' || !!visible[x] || !!nodeSeen[x];
    }));
  }

  function choose(items) {
    var a = enabled(items);
    return a.length ? a : ['DIRECT'];
  }

  var us = visible['美国'] ? ['美国'] : [];
  var hk = visible['香港'] ? ['香港'] : [];
  var jp = visible['日本'] ? ['日本'] : [];
  var sg = visible['新加坡'] ? ['新加坡'] : [];
  var other = active.filter(function (r) {
    return ['美国','香港','日本','新加坡'].indexOf(r) === -1;
  });

  addGroup('机场总控', 'select', active.concat(['DIRECT']));

  active.forEach(function (r) {
    var auto = r + ' · 自动优选';
    var g = addGroup(r, 'select', [auto].concat(pool[r]));
    if (providerOnly) {
      g.use = providerKeys.slice();
      g.filter = regionFilter[r];
      g['exclude-filter'] = '(?i)(流量|套餐|到期|剩余|订阅|官网|客服|traffic|expire)';
    }
  });

  // Overseas AI: pin one actual non-discounted US node when available.
  // When a subscription supplies providers only, fall back to the US region group.
  var usFull = pool['美国'].filter(function (n) {
    return !isLow(n);
  });
  var pinnedUS = usFull[0] || pool['美国'][0] || '';

  addGroup(
    'AI 服务',
    'select',
    choose((pinnedUS ? [pinnedUS] : []).concat(us, jp, sg, hk, ['机场总控']))
  );

  // 0.2x nodes are direct Emby options, not separate proxy groups.
  var lowNames = ['香港','美国','日本','新加坡'].reduce(function (a, r) {
    return a.concat(pool[r].filter(isLow));
  }, []);

  function addEmby(name, choices) {
    var g = addGroup(name, 'select', unique(choose(choices).concat(lowNames)));

    if (providerOnly) {
      var region = '(香港|港区|HK[0-9 _-]|Hong.?Kong|🇭🇰|美国|美國|US[0-9 _-]|United.?States|🇺🇸|日本|JP[0-9 _-]|Japan|🇯🇵|新加坡|狮城|獅城|SG[0-9 _-]|Singapore|🇸🇬)';
      var rate = '(0[.]2(0)?[ ]*(x|×|倍|倍率)|20[ ]*[%％])';

      g.use = providerKeys.slice();
      g.filter = '(?i)(' + region + '.*' + rate + '|' + rate + '.*' + region + ')';
      g['exclude-filter'] = '(?i)(流量|套餐|到期|剩余|订阅|官网|客服|traffic|expire)';
    }
    return g;
  }

  addEmby('SNTP-Emby', us.concat(hk,jp,sg,other,['DIRECT']));
  addEmby('1111 影院', us.concat(hk,jp,sg,['DIRECT']));
  addEmby('Yusen 影院', ['DIRECT'].concat(hk,jp,us,sg));
  addEmby('宸澄影院', ['DIRECT'].concat(hk,us,jp,sg));

  addGroup('SNTP 机场服务', 'select',
    choose(['DIRECT','机场总控'].concat(hk,jp,us)));

  addGroup('哔哩哔哩', 'select',
    choose(['DIRECT'].concat(hk,['机场总控'])));

  addGroup('国际流媒体', 'select',
    choose(hk.concat(us,jp,sg,['机场总控','DIRECT'])));

  addGroup('Telegram / 社交', 'select',
    choose(['机场总控'].concat(us,hk,jp,['DIRECT'])));

  addGroup('开发者工具', 'select',
    choose(sg.concat(us,jp,hk,['机场总控','DIRECT'])));

  addGroup('Microsoft 服务', 'select',
    choose(['DIRECT','机场总控'].concat(us,hk)));

  addGroup('Apple 服务', 'select',
    choose(['DIRECT','机场总控'].concat(us,hk)));

  addGroup('Steam / 游戏', 'select',
    choose(['DIRECT','机场总控'].concat(hk,us)));

  addGroup('网络检测', 'select',
    choose(['机场总控'].concat(us,hk,['DIRECT'])));

  addGroup('国内服务', 'select', ['DIRECT','机场总控']);

  addGroup('国际服务', 'select',
    choose(['机场总控'].concat(hk,us,jp,sg,['DIRECT'])));

  addGroup('漏网之鱼', 'select',
    choose(['DIRECT','机场总控'].concat(hk,us)));

  active.forEach(function (r) {
    var g = addGroup(r + ' · 自动优选', 'url-test', pool[r], true);

    if (providerOnly) {
      g.use = providerKeys.slice();
      g.filter = regionFilter[r];
      g['exclude-filter'] = '(?i)(流量|套餐|到期|剩余|订阅|官网|客服|traffic|expire)';
    }
  });

  // Map original airport policy names before removing its old groups.
  var alias = {
    '🔰 节点选择':'机场总控',
    '守候网络':'机场总控',
    '节点总控':'机场总控',
    '♻️ 自动选择 - HK':'香港',
    '♻️ 自动选择 - JP':'日本',
    '♻️ 自动选择 - US':'美国',
    '🌍 国外媒体':'国际流媒体',
    '🌏 国内媒体':'国内服务',
    '📺 YouTube':'国际流媒体',
    '📺 Disney':'国际流媒体',
    '📺 Netflix':'国际流媒体',
    '📺 HBOMAX':'国际流媒体',
    '📺 HBO':'国际流媒体',
    '🐭 Twitch':'国际流媒体',
    '🍎 Apple TV':'国际流媒体',
    '流媒体':'国际流媒体',
    '📺 Bilibili':'哔哩哔哩',
    '📺 哔哩哔哩':'哔哩哔哩',
    '📲 Telegram':'Telegram / 社交',
    '📲 电报信息':'Telegram / 社交',
    '电报信息':'Telegram / 社交',
    '社交媒体':'Telegram / 社交',
    '🌏 Discord':'Telegram / 社交',
    '🌏 Twitter':'Telegram / 社交',
    '🌏 Tiktok':'Telegram / 社交',
    '🌏 巴哈姆特':'Telegram / 社交',
    '💬 OpenAi':'AI 服务',
    'openAI':'AI 服务',
    'ChatGPT / OpenAI':'AI 服务',
    '其他 AI':'AI 服务',
    '💬 Cursor':'AI 服务',
    '💬 Gemini':'AI 服务',
    '💬 Claude':'AI 服务',
    '💬 Perplexity':'AI 服务',
    '🛩 Copilot':'AI 服务',
    '✈️ Bing':'Microsoft 服务',
    'Ⓜ️ 微软服务':'Microsoft 服务',
    '微软服务':'Microsoft 服务',
    '🍎 Apple':'Apple 服务',
    '🍎 苹果服务':'Apple 服务',
    '苹果服务':'Apple 服务',
    'SteamGame':'Steam / 游戏',
    '🌏 Steam':'Steam / 游戏',
    '🌏 Xbox':'Steam / 游戏',
    '🌏 Dropbox':'国际服务',
    '网络云盘':'国际服务',
    '🌏 GFWlist':'国际服务',
    '🌏 PrivateTracker':'国际服务',
    '🎯 本地直连':'DIRECT',
    '🐟 漏网之鱼':'漏网之鱼',
    '🎬 Yusen Emby':'Yusen 影院',
    '守候影院':'SNTP-Emby',
    '🎬 守候网络 Emby':'SNTP-Emby',
    '🎬 守候网络 Emby影院':'SNTP-Emby',
    '🎬 1111影院':'1111 影院',
    '🎬 宸澄影院':'宸澄影院'
  };

  var oldGroupNames = {};
  (Array.isArray(cfg['proxy-groups']) ? cfg['proxy-groups'] : []).forEach(function (g) {
    if (g && g.name) oldGroupNames[g.name] = true;
  });

  var available = {};
  groups.forEach(function (g) {
    available[g.name] = true;
  });

  function targetOf(rule) {
    var parts = rule.split(',');
    var idx = parts.length - 1;
    if (parts[idx] === 'no-resolve') idx--;
    return {
      parts:parts,
      index:idx,
      target:String(parts[idx] || '').trim()
    };
  }

  function canonical(old) {
    var n = alias[old] || old;

    if (available[n] ||
        ['DIRECT','REJECT','REJECT-DROP','PASS','dns','DNS'].indexOf(n) !== -1) {
      return n;
    }

    if (oldGroupNames[old]) {
      if (/Emby|影院/i.test(old)) return 'SNTP-Emby';
      if (/AI|OpenAI|GPT|Claude|Gemini|Cursor/i.test(old)) return 'AI 服务';
      if (/Bili/i.test(old)) return '哔哩哔哩';
      if (/媒体|Netflix|Disney|YouTube|视频|影音/i.test(old)) return '国际流媒体';
      if (/国内|直连/i.test(old)) return 'DIRECT';
      return '机场总控';
    }

    return n;
  }

  var legacyEmby = {
    '📺 Emby影院':true,
    '🎬 守候网络 Emby':true,
    '🎬 守候网络 Emby影院':true,
    '守候影院':true,
    'SNTP-Emby':true
  };

  var safeHead = [], tail = [], leadingSafe = true;

  function safetyRule(s) {
    return /^(IP-CIDR6?,(?:127\.|10\.|172\.16\.|192\.168\.|169\.254\.|100\.64\.|::1\/|fc00:|fe80:))/i.test(s) ||
      /^DOMAIN-SUFFIX,local,/i.test(s) ||
      /^AND,\(\(NETWORK,UDP\),\(DST-PORT,53\)\),dns$/i.test(s);
  }

  (Array.isArray(cfg.rules) ? cfg.rules : []).forEach(function (old) {
    if (typeof old !== 'string') return;

    var obj = targetOf(old);
    if (obj.parts[0] === 'MATCH') return;
    if (legacyEmby[obj.target]) return;

    var mapped = canonical(obj.target);

    if (oldGroupNames[obj.target] && !available[mapped] && mapped !== 'DIRECT') {
      mapped = '机场总控';
    }

    obj.parts[obj.index] = mapped;
    var s = obj.parts.join(',');

    if (leadingSafe && safetyRule(s)) {
      safeHead.push(s);
    } else {
      leadingSafe = false;
      tail.push(s);
    }
  });

  var defs = cfg['rule-providers'] && typeof cfg['rule-providers'] === 'object'
    ? Object.assign({},cfg['rule-providers']) : {};

  function provider(name,url,behavior,format) {
    var keys = Object.keys(defs);

    for (var i=0;i<keys.length;i++) {
      if (defs[keys[i]] && defs[keys[i]].url === url) {
        return keys[i];
      }
    }

    var key=name,n=2;
    while (defs[key]) key=name+'_'+(n++);

    defs[key]={
      type:'http',
      behavior:behavior,
      format:format,
      url:url,
      path:'./rule_provider/'+key+(format==='mrs'?'.mrs':'.yaml'),
      interval:86400
    };

    return key;
  }

  var root='https://raw.githubusercontent.com/666OS/rules/release/mihomo/';

  var ai=provider('USR_AI',root+'domain/AI.mrs','domain','mrs');

  var tg=provider('USR_Telegram',
    root+'domain/Telegram.mrs','domain','mrs');

  var tgip=provider('USR_TelegramIP',
    root+'ip/Telegram.mrs','ipcidr','mrs');

  var dev=provider('USR_Dev',
    root+'domain/Dev.mrs','domain','mrs');

  var streaming=provider('USR_Streaming',
    root+'domain/Streaming.mrs','domain','mrs');

  var bili=provider(
    'USR_Bilibili',
    'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml',
    'classical','yaml'
  );

  // Order matters: domestic AI DIRECT before the broad overseas AI rule-set.
  var personal=[
    'DOMAIN-SUFFIX,deepseek.com,DIRECT',
    'DOMAIN-SUFFIX,deepseek.cn,DIRECT',
    'DOMAIN-SUFFIX,kimi.com,DIRECT',
    'DOMAIN-SUFFIX,kimi.ai,DIRECT',
    'DOMAIN-SUFFIX,moonshot.cn,DIRECT',
    'DOMAIN-SUFFIX,moonshot.ai,DIRECT',
    'DOMAIN-SUFFIX,qwen.ai,DIRECT',
    'DOMAIN-SUFFIX,tongyi.com,DIRECT',
    'DOMAIN-SUFFIX,doubao.com,DIRECT',
    'DOMAIN-SUFFIX,volcengine.com,DIRECT',
    'DOMAIN-SUFFIX,bigmodel.cn,DIRECT',
    'DOMAIN-SUFFIX,zhipuai.cn,DIRECT',

    'DOMAIN-SUFFIX,sntp.me,SNTP 机场服务',
    'DOMAIN-SUFFIX,sntp.uk,SNTP 机场服务',

    'DOMAIN,std.cn2gias.uk,SNTP-Emby',
    'DOMAIN,s2.array2026.cc,DIRECT',
    'DOMAIN,s3.array2026.com,DIRECT',

    'DOMAIN,emby.yusen.cc.cd,Yusen 影院',
    'DOMAIN,aaa.yusen6.ccwu.cc,Yusen 影院',
    'DOMAIN,13.yusen.cyou,Yusen 影院',
    'DOMAIN,embya.yusen.cyou,Yusen 影院',
    'DOMAIN-KEYWORD,yusen,Yusen 影院',

    'DOMAIN,embycc.wybcs.work,宸澄影院',

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

    'RULE-SET,'+ai+',AI 服务',
    'RULE-SET,'+bili+',哔哩哔哩',
    'RULE-SET,'+tg+',Telegram / 社交',
    'RULE-SET,'+tgip+',Telegram / 社交,no-resolve',

    'DOMAIN-SUFFIX,github.com,开发者工具',
    'DOMAIN-SUFFIX,githubusercontent.com,开发者工具',
    'DOMAIN-SUFFIX,githubassets.com,开发者工具',
    'DOMAIN-SUFFIX,github.io,开发者工具',
    'DOMAIN-SUFFIX,ghcr.io,开发者工具',
    'DOMAIN-SUFFIX,gitlab.com,开发者工具',
    'DOMAIN-SUFFIX,docker.io,开发者工具',
    'DOMAIN-SUFFIX,pypi.org,开发者工具',
    'DOMAIN-SUFFIX,npmjs.org,开发者工具',
    'RULE-SET,'+dev+',开发者工具',

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

    'RULE-SET,'+streaming+',国际流媒体'
  ];

  function key(s) {
    var p=s.split(',');
    return p[0]+'|'+(p[1]||'');
  }

  var priority={};
  personal.forEach(function (s) {
    priority[key(s)]=true;
  });

  var seen={};
  tail=tail.filter(function (s) {
    if (priority[key(s)] || seen[s]) return false;
    seen[s]=true;
    return true;
  });

  cfg['proxy-groups']=groups;
  cfg['rule-providers']=defs;
  cfg.rules=safeHead.concat(personal,tail,['MATCH,漏网之鱼']);

  if (typeof console!=='undefined') {
    console.log(
      '[ClashBox V1.3] '+(profileName||'')+
      ' groups='+groups.length+
      ' personalRules='+personal.length+
      ' originalRules='+tail.length
    );
  }

  return cfg;
}
