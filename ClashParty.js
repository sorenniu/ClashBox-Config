
/* Clash Party · Personal V1.3 | 代理组安全验证版
 * 仅调整 proxy-groups，不触碰原机场的 DNS/DoH、proxies、rules、rule-providers。
 * 保留机场原有策略组并隐藏，避免原有 rules 引用的组失效。
 * 测试成功后再启用个人路由规则增强版。
 */
function main(config) {
  if (!config || typeof config !== 'object') return config;
  try {
    var source = Array.isArray(config['proxy-groups']) ? config['proxy-groups'] : [];
    var proxies = Array.isArray(config.proxies) ? config.proxies : [];
    var providers = config['proxy-providers'] || {};
    var pkeys = Object.keys(providers);
    var countries = ['香港','日本','美国','新加坡','台湾','韩国','其他地区'];
    var nodes = {};
    var buckets = {};
    countries.forEach(function(x) { buckets[x] = []; });

    function region(name) {
      if (/🇭🇰|香港|hong[ -]?kong|\bHK\s*[-_#]?\s*\d|\bHK\b/i.test(name)) return '香港';
      if (/🇯🇵|日本|东京|大阪|japan|tokyo|osaka|\bJP\s*[-_#]?\s*\d|\bJP\b/i.test(name)) return '日本';
      if (/🇺🇸|美国|美國|洛杉矶|西雅图|纽约|united[ -]?states|seattle|los[ -]?angeles|\bUS\s*[-_#]?\s*\d|\bUS\b/i.test(name)) return '美国';
      if (/🇸🇬|新加坡|狮城|singapore|\bSG\s*[-_#]?\s*\d|\bSG\b/i.test(name)) return '新加坡';
      if (/🇹🇼|🇨🇳\s*TW|台湾|台灣|台北|taiwan|\bTW\s*[-_#]?\s*\d|\bTW\b/i.test(name)) return '台湾';
      if (/🇰🇷|韩国|韓國|首尔|首爾|korea|seoul|\bKR\s*[-_#]?\s*\d|\bKR\b/i.test(name)) return '韩国';
      return '其他地区';
    }

    proxies.forEach(function(node) {
      if (!node || typeof node.name !== 'string' || !node.type || node.type === 'dns') return;
      if (/^(DIRECT|REJECT|PASS|GLOBAL|REJECT-DROP)$/i.test(node.name)) return;
      if (/流量|套餐|到期|剩余|过期|订阅|客服|traffic|expire/i.test(node.name)) return;
      if (nodes[node.name]) return;
      nodes[node.name] = true;
      buckets[region(node.name)].push(node.name);
    });

    var providerOnly = !Object.keys(nodes).length && pkeys.length > 0;
    var active = countries.filter(function(x) { return buckets[x].length > 0 || providerOnly; });

    if (!active.length) {
      // 显示可见诊断信息，避免和旧版一样静默提前退出。
      config['proxy-groups'] = [{name:'【V1.3无节点：核查订阅】',type:'select',proxies:['DIRECT']}].concat(source);
      console.warn('[Personal V1.3] 未检测到 proxies / proxy-providers，未进行覆盖');
      return config;
    }

    var generated = [], generatedNames = {};

    function uniq(a) {
      var seen = {}, o = [];
      (a || []).forEach(function(x) {
        if (typeof x === 'string' && !seen['!'+x]) {
          seen['!'+x] = true;
          o.push(x);
        }
      });
      return o;
    }

    function group(name,type,items,hide,code) {
      var g = {name:name,type:type,proxies:uniq(items)};
      if(hide) g.hidden = true;
      if(type === 'url-test') {
        g.url='https://www.gstatic.com/generate_204';
        g.interval=1200;
        g.tolerance=100;
        g.lazy=true;
      }
      if(providerOnly && code) {
        g.use=pkeys.slice();
        g.filter=code;
        g['exclude-filter']='(?i)(流量|套餐|到期|剩余|过期|订阅|客服|traffic|expire)';
      }
      if(type==='select' && g.proxies.length) {
        g['default-selected'] = g.proxies[0];
      }
      generated.push(g);
      generatedNames[name] = true;
    }

    var flags = {
      '香港':'(?i)(香港|HK[0-9 _-]|Hong.?Kong|🇭🇰)',
      '日本':'(?i)(日本|JP[0-9 _-]|Japan|Tokyo|Osaka|🇯🇵)',
      '美国':'(?i)(美国|美國|US[0-9 _-]|United.?States|Seattle|Los.?Angeles|🇺🇸)',
      '新加坡':'(?i)(新加坡|SG[0-9 _-]|Singapore|🇸🇬)',
      '台湾':'(?i)(台湾|台灣|TW[0-9 _-]|Taiwan|🇹🇼)',
      '韩国':'(?i)(韩国|韓國|KR[0-9 _-]|Korea|Seoul|🇰🇷)',
      '其他地区':'(?i)^(?!.*(?:香港|日本|美国|美國|新加坡|台湾|台灣|韩国|韓國|HK[0-9]|JP[0-9]|US[0-9]|SG[0-9]|TW[0-9]|KR[0-9]|🇭🇰|🇯🇵|🇺🇸|🇸🇬|🇹🇼|🇰🇷)).*$'
    };

    // 顶层地区及服务组。测试版不会改动原有 rules，因此旧策略组保留。
    group('机场总控','select',active.concat(['DIRECT']));

    active.forEach(function(r) {
      group(r,'select',[r+' · 自动优选'].concat(buckets[r]),false,providerOnly?flags[r]:null);
    });

    var avail = function(rs) {
      return rs.filter(function(r) { return active.indexOf(r)>=0; });
    };
    var options = function(rs) {
      var out=avail(rs);
      return out.length?out:['DIRECT'];
    };

    group('AI 服务','select',options(['美国','日本','新加坡','香港']).concat(buckets['美国']));
    group('SNTP-Emby','select',options(['美国','香港','日本','新加坡','其他地区']).concat(['DIRECT']));
    group('1111 影院','select',options(['美国','香港','日本','新加坡']).concat(['DIRECT']));
    group('Yusen 影院','select',['DIRECT'].concat(avail(['香港','日本','美国'])));
    group('SNTP 机场服务','select',['DIRECT','机场总控'].concat(avail(['香港','日本','美国'])));
    group('哔哩哔哩','select',['DIRECT'].concat(avail(['香港']),['机场总控']));
    group('国际流媒体','select',options(['香港','美国','日本','新加坡']).concat(['机场总控','DIRECT']));
    group('Telegram / 社交','select',['机场总控'].concat(avail(['美国','香港','日本']),['DIRECT']));
    group('开发者工具','select',options(['新加坡','美国','日本','香港']).concat(['机场总控','DIRECT']));
    group('Apple 服务','select',['DIRECT','机场总控'].concat(avail(['美国','香港'])));
    group('Microsoft 服务','select',['DIRECT','机场总控'].concat(avail(['美国','香港'])));
    group('Steam / 游戏','select',['DIRECT','机场总控'].concat(avail(['香港','美国'])));
    group('国内服务','select',['DIRECT','机场总控']);
    group('国际服务','select',['机场总控'].concat(avail(['香港','美国','日本','新加坡']),['DIRECT']));
    group('网络检测','select',['机场总控'].concat(avail(['美国','香港']),['DIRECT']));
    group('漏网之鱼','select',['DIRECT','机场总控'].concat(avail(['香港','美国'])));

    active.forEach(function(r) {
      group(r+' · 自动优选','url-test',buckets[r],true,providerOnly?flags[r]:null);
    });

    // 保留原机场策略组，隐藏旧组，维持原规则完整有效。
    var legacy = source.filter(function(g) {
      return g && typeof g.name === 'string' && !generatedNames[g.name];
    }).map(function(g) {
      var copy = Object.assign({},g);
      copy.hidden = true;
      return copy;
    });

    config['proxy-groups'] = generated.concat(legacy);

    console.log(
      '[Personal V1.3 GROUP-ONLY] OK | 节点='
      + Object.keys(nodes).length
      + ' | 地区=' + active.join('/')
      + ' | 新组=' + generated.length
      + ' | 保留旧组=' + legacy.length
    );
    return config;

  } catch (err) {
    console.error('[Personal V1.3 GROUP-ONLY] '+(err && err.stack || err));
    if (!Array.isArray(config['proxy-groups'])) config['proxy-groups'] = [];
    config['proxy-groups'].unshift({
      name:'【V1.3执行异常：请查看日志】',
      type:'select',
      proxies:['DIRECT']
    });
    return config;
  }
}
