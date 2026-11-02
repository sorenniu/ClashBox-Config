
/* FIClash-ohos | Personal Routing V1.0 | IGG / SNTP
 * Target: libo0118/FlClash-ohos v0.9.2 (HarmonyOS, JS script override)
 * Use one current airport subscription at a time; do NOT combine IGG and SNTP.
 * Only changes: proxy-groups, rules, rule-providers.
 * Does NOT modify: proxies, proxy-providers, dns, hosts, tun, sniffer, EasyTier.
 * Do not stack with other routing/group override scripts.
 */
function main(config) {
  if (!config || typeof config !== 'object') return config;
  try {
    var rawGroups = Array.isArray(config['proxy-groups']) ? config['proxy-groups'] : [];
    var rawRules = Array.isArray(config.rules) ? config.rules : [];
    var rawProxies = Array.isArray(config.proxies) ? config.proxies : [];
    var proxyProviders = config['proxy-providers'] || {};
    var providerNames = Object.keys(proxyProviders);
    var regions = ['香港', '日本', '美国', '新加坡', '台湾', '韩国', '其他地区'];
    var pools = {}, nodes = {};
    regions.forEach(function (r) { pools[r] = []; });

    function getRegion(name) {
      if (/🇭🇰|香港|港区|Hong[ -]?Kong|\bHK\s*[-_#]?\s*\d*\b/i.test(name)) return '香港';
      if (/🇯🇵|日本|东京|大阪|Japan|Tokyo|Osaka|\bJP\s*[-_#]?\s*\d*\b/i.test(name)) return '日本';
      if (/🇺🇸|美国|美國|洛杉矶|洛杉磯|西雅图|西雅圖|纽约|紐約|圣何塞|硅谷|United[ -]?States|Seattle|Los[ -]?Angeles|\bUS\s*[-_#]?\s*\d*\b/i.test(name)) return '美国';
      if (/🇸🇬|新加坡|狮城|獅城|Singapore|\bSG\s*[-_#]?\s*\d*\b/i.test(name)) return '新加坡';
      if (/🇹🇼|台湾|台灣|台北|Taiwan|\bTW\s*[-_#]?\s*\d*\b/i.test(name)) return '台湾';
      if (/🇰🇷|韩国|韓國|首尔|首爾|Korea|Seoul|\bKR\s*[-_#]?\s*\d*\b/i.test(name)) return '韩国';
      return '其他地区';
    }

    function isLowRate(name) {
      return /(?:^|[^0-9])0[.]2(?:0)?\s*(?:x|×|倍|倍率)|(?:^|[^0-9])20\s*[%％]/i.test(name);
    }

    var infoNode = /流量|到期|套餐|剩余|重置|过期|订阅|客服|官网|traffic|expire|reset|subscription/i;

    rawProxies.forEach(function (p) {
      if (!p || !p.type || typeof p.name !== 'string' || p.type === 'dns') return;
      if (/^(DIRECT|REJECT|REJECT-DROP|PASS|GLOBAL|DNS)$/i.test(p.name)) return;
      if (infoNode.test(p.name) || nodes[p.name]) return;
      nodes[p.name] = true;
      pools[getRegion(p.name)].push(p.name);
    });

    var providerOnly = Object.keys(nodes).length === 0 && providerNames.length > 0;
    var active = regions.filter(function (r) {
      return pools[r].length > 0 || providerOnly;
    });

    if (!active.length) {
      if (typeof console !== 'undefined') {
        console.warn('[FIClash Personal] No proxy nodes/providers; original config kept');
      }
      return config;
    }

    function unique(xs) {
      var seen = {}, result = [];
      (xs || []).forEach(function (x) {
        if (typeof x !== 'string' || !x || seen['!' + x]) return;
        seen['!' + x] = true;
        result.push(x);
      });
      return result;
    }

    function available(xs) {
      return xs.filter(function (r) {
        return active.indexOf(r) !== -1;
      });
    }

    function fallback(xs) {
      var a = available(xs);
      return a.length ? a : ['机场总控'];
    }

    var providerRegex = {
      '香港':'(?i)(香港|港区|Hong.?Kong|HK[0-9 _-]|🇭🇰)',
      '日本':'(?i)(日本|Japan|Tokyo|Osaka|JP[0-9 _-]|🇯🇵)',
      '美国':'(?i)(美国|美國|United.?States|Seattle|Los.?Angeles|US[0-9 _-]|🇺🇸)',
      '新加坡':'(?i)(新加坡|狮城|獅城|Singapore|SG[0-9 _-]|🇸🇬)',
      '台湾':'(?i)(台湾|台灣|台北|Taiwan|TW[0-9 _-]|🇹🇼)',
      '韩国':'(?i)(韩国|韓國|首尔|首爾|Korea|Seoul|KR[0-9 _-]|🇰🇷)',
      '其他地区':'(?i).*'
    };

    var infoExclude = '(?i)(流量|到期|套餐|剩余|重置|过期|订阅|客服|官网|traffic|expire|reset|subscription)';

    var otherExclude = infoExclude.slice(0, -1) +
      '|香港|日本|美国|美國|新加坡|台湾|台灣|韩国|韓國|Hong.?Kong|Japan|United.?States|Singapore|Taiwan|Korea|HK[0-9 _-]|JP[0-9 _-]|US[0-9 _-]|SG[0-9 _-]|TW[0-9 _-]|KR[0-9 _-]|🇭🇰|🇯🇵|🇺🇸|🇸🇬|🇹🇼|🇰🇷)';

    var generated = [], generatedName = {};

    function group(name, type, members, hidden, regionFilter) {
      var g = {
        name:name,
        type:type,
        proxies:unique(members)
      };

      if (hidden) g.hidden = true;

      if (type === 'url-test') {
        g.url = 'http://www.gstatic.com/generate_204';
        g.interval = 1200;
        g.tolerance = 100;
        g.lazy = true;
      }

      if (providerOnly && regionFilter) {
        g.use = providerNames.slice();
        g.filter = providerRegex[regionFilter];
        g['exclude-filter'] = regionFilter === '其他地区'
          ? otherExclude
          : infoExclude;
      }

      if (type === 'select' && g.proxies.length > 0) {
        g['default-selected'] = g.proxies[0];
      }

      generated.push(g);
      generatedName[name] = true;
      return g;
    }

    // 地区组：自动优选排第一，之后是具体节点。
    // 自动测速组自身隐藏，不作为独立首页分组。
    group('机场总控', 'select', active.concat(['DIRECT']));

    active.forEach(function (r) {
      group(
        r,
        'select',
        [r + ' · 自动优选'].concat(pools[r]),
        false,
        providerOnly ? r : null
      );
    });

    // AI 优先固定一个具体美国节点，避免自动测速频繁切换出口 IP。
    var usNonLow = pools['美国'].filter(function (n) {
      return !isLowRate(n);
    });

    var pinnedUS = usNonLow.length
      ? usNonLow[0]
      : (pools['美国'][0] || '');

    group(
      'AI 服务',
      'select',
      unique(
        (pinnedUS ? [pinnedUS] : [])
          .concat(
            fallback(['美国','日本','新加坡','香港']),
            pools['美国'],
            ['机场总控']
          )
      )
    );

    // 三个 Emby 分组都可以直接选择 HK / US / JP 的 0.2 倍节点。
    function embyLowMembers() {
      return ['香港','美国','日本'].reduce(function (out, r) {
        return out.concat(pools[r].filter(isLowRate));
      }, []);
    }

    function addEmbyGroup(name, members) {
      var g = group(
        name,
        'select',
        members.concat(embyLowMembers())
      );

      if (providerOnly) {
        var reg = '(香港|港区|HK[0-9 _-]|Hong.?Kong|🇭🇰|美国|美國|US[0-9 _-]|United.?States|🇺🇸|日本|JP[0-9 _-]|Japan|🇯🇵)';
        var rate = '(0[.]2(0)?[ ]*(x|×|倍|倍率)|20[ ]*[%％])';

        g.use = providerNames.slice();
        g.filter = '(?i)(' + reg + '.*' + rate +
          '|' + rate + '.*' + reg + ')';
        g['exclude-filter'] = infoExclude;
      }
    }

    addEmbyGroup(
      'SNTP-Emby',
      fallback(['美国','香港','日本','新加坡','其他地区'])
        .concat(['DIRECT'])
    );

    addEmbyGroup(
      '1111 影院',
      fallback(['美国','香港','日本','新加坡'])
        .concat(['DIRECT'])
    );

    addEmbyGroup(
      'Yusen 影院',
      ['DIRECT'].concat(available(['香港','日本','美国']))
    );

    group(
      'SNTP 机场服务',
      'select',
      ['DIRECT','机场总控']
        .concat(available(['香港','日本','美国']))
    );

    group(
      '哔哩哔哩',
      'select',
      ['DIRECT'].concat(available(['香港']), ['机场总控'])
    );

    group(
      '国际流媒体',
      'select',
      fallback(['香港','美国','日本','新加坡'])
        .concat(['机场总控','DIRECT'])
    );

    group(
      'Telegram / 社交',
      'select',
      ['机场总控']
        .concat(available(['美国','香港','日本']), ['DIRECT'])
    );

    group(
      '开发者工具',
      'select',
      fallback(['新加坡','美国','日本','香港'])
        .concat(['机场总控','DIRECT'])
    );

    group(
      'Apple 服务',
      'select',
      ['DIRECT','机场总控']
        .concat(available(['美国','香港']))
    );

    group(
      'Microsoft 服务',
      'select',
      ['DIRECT','机场总控']
        .concat(available(['美国','香港']))
    );

    group(
      'Steam / 游戏',
      'select',
      ['DIRECT','机场总控']
        .concat(available(['香港','美国']))
    );

    group('国内服务', 'select', ['DIRECT','机场总控']);

    group(
      '国际服务',
      'select',
      ['机场总控']
        .concat(available(['香港','美国','日本','新加坡']), ['DIRECT'])
    );

    group(
      '网络检测',
      'select',
      ['机场总控']
        .concat(available(['美国','香港']), ['DIRECT'])
    );

    group(
      '漏网之鱼',
      'select',
      ['DIRECT','机场总控']
        .concat(available(['香港','美国']))
    );

    active.forEach(function (r) {
      group(
        r + ' · 自动优选',
        'url-test',
        pools[r],
        true,
        providerOnly ? r : null
      );
    });

    // 保留机场旧策略组，供原有规则和代理链引用。
    var legacy = rawGroups.filter(function (g) {
      return g &&
        typeof g.name === 'string' &&
        !generatedName[g.name];
    }).map(function (g) {
      var copy = Object.assign({}, g);
      copy.hidden = true;
      return copy;
    });

    var finalGroups = generated.concat(legacy);

    // 追加个人规则提供器，不替换机场原有规则提供器。
    var ruleProviders = Object.assign(
      {},
      config['rule-providers'] || {}
    );

    function provider(key, url, behavior, format, ext) {
      var keys = Object.keys(ruleProviders);

      for (var k = 0; k < keys.length; k++) {
        if (ruleProviders[keys[k]] &&
            ruleProviders[keys[k]].url === url) {
          return keys[k];
        }
      }

      var name = key, suffix = 2;
      while (ruleProviders[name]) {
        name = key + '_' + (suffix++);
      }

      ruleProviders[name] = {
        type:'http',
        behavior:behavior,
        format:format,
        url:url,
        path:'./rule_provider/' + name + '.' + ext,
        interval:86400
      };

      return name;
    }

    var base =
      'https://raw.githubusercontent.com/666OS/rules/release/mihomo/';

    var ai = provider(
      'PERSONAL_AI',
      base + 'domain/AI.mrs',
      'domain', 'mrs', 'mrs'
    );

    var tg = provider(
      'PERSONAL_Telegram',
      base + 'domain/Telegram.mrs',
      'domain', 'mrs', 'mrs'
    );

    var tgip = provider(
      'PERSONAL_TelegramIP',
      base + 'ip/Telegram.mrs',
      'ipcidr', 'mrs', 'mrs'
    );

    var dev = provider(
      'PERSONAL_Dev',
      base + 'domain/Dev.mrs',
      'domain', 'mrs', 'mrs'
    );

    var bili = provider(
      'PERSONAL_Bilibili',
      'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml',
      'classical', 'yaml', 'yaml'
    );

    var stream = provider(
      'PERSONAL_Streaming',
      base + 'domain/Streaming.mrs',
      'domain', 'mrs', 'mrs'
    );

    var personalRules = [
      // SNTP 机场服务
      'DOMAIN-SUFFIX,sntp.me,SNTP 机场服务',
      'DOMAIN-SUFFIX,sntp.uk,SNTP 机场服务',

      // Emby 主线路及备用线路
      'DOMAIN,std.cn2gias.uk,SNTP-Emby',
      'DOMAIN,s2.array2026.cc,DIRECT',
      'DOMAIN,s3.array2026.com,DIRECT',

      // Yusen Emby
      'DOMAIN,emby.yusen.cc.cd,Yusen 影院',
      'DOMAIN,aaa.yusen6.ccwu.cc,Yusen 影院',
      'DOMAIN,13.yusen.cyou,Yusen 影院',
      'DOMAIN,embya.yusen.cyou,Yusen 影院',
      'DOMAIN-KEYWORD,yusen,Yusen 影院',

      // 1111 Emby
      'DOMAIN-SUFFIX,emby.moe,1111 影院',
      'DOMAIN-SUFFIX,xxlb.net,1111 影院',
      'DOMAIN-SUFFIX,loseremby.org,1111 影院',
      'DOMAIN-SUFFIX,zabc.net,1111 影院',

      // AI 服务
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
      'RULE-SET,' + ai + ',AI 服务',

      // Bilibili
      'RULE-SET,' + bili + ',哔哩哔哩',

      // Telegram
      'RULE-SET,' + tg + ',Telegram / 社交',
      'RULE-SET,' + tgip + ',Telegram / 社交,no-resolve',

      // 开发者工具
      'DOMAIN-SUFFIX,github.com,开发者工具',
      'DOMAIN-SUFFIX,githubusercontent.com,开发者工具',
      'DOMAIN-SUFFIX,githubassets.com,开发者工具',
      'DOMAIN-SUFFIX,github.io,开发者工具',
      'DOMAIN-SUFFIX,ghcr.io,开发者工具',
      'DOMAIN-SUFFIX,gitlab.com,开发者工具',
      'DOMAIN-SUFFIX,docker.io,开发者工具',
      'DOMAIN-SUFFIX,pypi.org,开发者工具',
      'DOMAIN-SUFFIX,npmjs.org,开发者工具',
      'RULE-SET,' + dev + ',开发者工具',

      // Steam
      'DOMAIN-SUFFIX,steamcommunity.com,Steam / 游戏',
      'DOMAIN-SUFFIX,steampowered.com,Steam / 游戏',
      'DOMAIN-SUFFIX,steamcontent.com,Steam / 游戏',

      // 网络检测
      'DOMAIN,ipinfo.io,网络检测',
      'DOMAIN,ip-api.com,网络检测',
      'DOMAIN,ip.sb,网络检测',
      'DOMAIN,ifconfig.me,网络检测',
      'DOMAIN,api.ipify.org,网络检测',
      'DOMAIN,ipcheck.ing,网络检测',

      // 常用国内应用
      'DOMAIN-SUFFIX,weixin.qq.com,DIRECT',
      'DOMAIN-SUFFIX,wechat.com,DIRECT',
      'DOMAIN-SUFFIX,alipay.com,DIRECT',
      'DOMAIN-SUFFIX,taobao.com,DIRECT',
      'DOMAIN-SUFFIX,jd.com,DIRECT',

      // 国际流媒体
      'RULE-SET,' + stream + ',国际流媒体'
    ];

    // 将部分机场旧策略组引用映射到统一的新分组。
    var alias = {
      'openAI':'AI 服务',
      'ChatGPT / OpenAI':'AI 服务',
      '其他 AI':'AI 服务',
      '💬 OpenAi':'AI 服务',
      '💬 Cursor':'AI 服务',
      '💬 Gemini':'AI 服务',
      '💬 Claude':'AI 服务',
      '💬 Perplexity':'AI 服务',

      '🎬 Yusen Emby':'Yusen 影院',
      '📺 Bilibili':'哔哩哔哩',

      '📲 电报信息':'Telegram / 社交',
      '📲 Telegram':'Telegram / 社交',
      '电报信息':'Telegram / 社交',
      '社交媒体':'Telegram / 社交',

      '🌍 国外媒体':'国际流媒体',
      '流媒体':'国际流媒体',
      '🌏 国内媒体':'国内服务',
      '🎯 本地直连':'DIRECT',

      'Ⓜ️ 微软服务':'Microsoft 服务',
      '微软服务':'Microsoft 服务',
      '🛩 Copilot':'Microsoft 服务',

      '🍎 苹果服务':'Apple 服务',
      '苹果服务':'Apple 服务',
      '🍎 Apple':'Apple 服务',

      'SteamGame':'Steam / 游戏',
      '🌏 Steam':'Steam / 游戏',

      '🐟 漏网之鱼':'漏网之鱼',
      '守候网络':'机场总控',
      '🔰 节点选择':'机场总控',
      '🌏 GFWlist':'国际服务',
      '网络云盘':'国际服务'
    };

    function parseRule(s) {
      var pieces = s.split(',');
      var index = pieces.length - 1;

      while (
        index > 1 &&
        (pieces[index] === 'no-resolve' ||
         pieces[index] === 'src')
      ) {
        index--;
      }

      return {
        pieces:pieces,
        index:index,
        target:String(pieces[index] || '').trim()
      };
    }

    function ruleKey(s) {
      var p = s.split(',');
      return p[0] + '|' + (p[1] || '');
    }

    function isSafety(s) {
      var r = parseRule(s);

      if (
        r.target !== 'DIRECT' &&
        r.target !== '🎯 本地直连'
      ) {
        return false;
      }

      if (/^DOMAIN-SUFFIX,local,/i.test(s)) {
        return true;
      }

      return /^IP-CIDR6?,(127\.|10\.|192\.168\.|169\.254\.|172\.16\.|100\.64\.|::1\/|fc00:|fe80:)/i.test(s);
    }

    var keys = {};
    personalRules.forEach(function (r) {
      keys[ruleKey(r)] = true;
    });

    var head = [], rest = [], seen = {};

    rawRules.forEach(function (raw) {
      if (typeof raw !== 'string' || !raw) return;

      var r = parseRule(raw);

      if (r.pieces[0] === 'MATCH') return;

      // 排除与个人指定 Emby 主线冲突的宽泛旧规则。
      // 其他机场 Emby 服务器规则仍然保留。
      if (
        /^(DOMAIN|DOMAIN-SUFFIX),((cn2gias[.]uk)|(array2026[.](com|cc)))(,|$)/i.test(raw)
      ) {
        return;
      }

      r.pieces[r.index] = alias[r.target] || r.target;

      var out = r.pieces.join(',');

      if (keys[ruleKey(out)] || seen['!' + out]) {
        return;
      }

      seen['!' + out] = true;

      if (isSafety(out)) {
        head.push(out);
      } else {
        rest.push(out);
      }
    });

    // 个人精确规则优先；机场其余规则继续生效。
    // 最后统一 MATCH 到漏网之鱼。
    var finalRules = unique(
      head.concat(
        personalRules,
        rest,
        ['MATCH,漏网之鱼']
      )
    );

    // 完成生成后统一写入，不触碰 DNS/DoH/EasyTier。
    config['proxy-groups'] = finalGroups;
    config['rule-providers'] = ruleProviders;
    config.rules = finalRules;

    if (typeof console !== 'undefined') {
      console.log(
        '[FIClash Personal V1.0] active=' +
        active.length +
        ' groups=' +
        finalGroups.length +
        ' rules=' +
        finalRules.length
      );
    }

    return config;

  } catch (error) {
    if (typeof console !== 'undefined') {
      console.error(
        '[FIClash Personal V1.0] ' +
        (error && error.message ? error.message : error)
      );
    }
    return config;
  }
}
