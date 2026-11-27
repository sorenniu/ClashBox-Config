
/*
 * Clash Party V1.7
 * Overseas AI & Google Antigravity Enhanced
 *
 * Google Antigravity / Gemini / AI Studio
 * Google OAuth / Account / Security Verification
 * Google One / Google Payments
 *
 * All related traffic -> AI 服务
 *
 * Preserve original DNS / DoH / TUN
 * Preserve existing proxy groups and nodes
 * Preserve Emby and other routing rules
 */

(function () {
  var previousMain = main;

  main = function () {
    var config = previousMain.apply(this, arguments);

    if (
      !config ||
      !Array.isArray(config.rules) ||
      !Array.isArray(config["proxy-groups"])
    ) {
      return config;
    }

    var target = "AI 服务";

    var groupExists = config["proxy-groups"].some(
      function (group) {
        return group && group.name === target;
      }
    );

    if (!groupExists) {
      return config;
    }

    var aiRules = [

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

      // ======================================
      // Google Gemini
      // ======================================

      "DOMAIN-SUFFIX,gemini.google.com,AI 服务",
      "DOMAIN-SUFFIX,bard.google.com,AI 服务",
      "DOMAIN-SUFFIX,aistudio.google.com,AI 服务",
      "DOMAIN-SUFFIX,ai.google.dev,AI 服务",
      "DOMAIN-SUFFIX,deepmind.google,AI 服务",

      "DOMAIN,generativelanguage.googleapis.com,AI 服务",
      "DOMAIN,aiplatform.googleapis.com,AI 服务",
      "DOMAIN,discoveryengine.googleapis.com,AI 服务",

      // ======================================
      // Google AI related products
      // ======================================

      "DOMAIN-SUFFIX,notebooklm.google,AI 服务",
      "DOMAIN-SUFFIX,notebooklm.google.com,AI 服务",
      "DOMAIN-SUFFIX,labs.google,AI 服务",
      "DOMAIN-SUFFIX,opal.google,AI 服务",
      "DOMAIN-SUFFIX,jules.google,AI 服务",
      "DOMAIN-SUFFIX,stitch.withgoogle.com,AI 服务",
      "DOMAIN-SUFFIX,ai.google,AI 服务",

      // ======================================
      // Google account and OAuth
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
      // Security verification and CAPTCHA
      // ======================================

      "DOMAIN-SUFFIX,recaptcha.net,AI 服务",
      "DOMAIN,recaptcha.google.com,AI 服务",
      "DOMAIN,recaptchaenterprise.googleapis.com,AI 服务",
      "DOMAIN,content-recaptchaenterprise.googleapis.com,AI 服务",

      "DOMAIN-SUFFIX,gstatic.com,AI 服务",
      "DOMAIN-SUFFIX,googleusercontent.com,AI 服务",

      // ======================================
      // Google shared API and resources
      // ======================================

      "DOMAIN-SUFFIX,googleapis.com,AI 服务",
      "DOMAIN-SUFFIX,googleapis.cn,AI 服务",
      "DOMAIN-SUFFIX,ggpht.com,AI 服务",
      "DOMAIN-SUFFIX,googleadapis.com,AI 服务",

      // ======================================
      // Google subscription and payment
      // ======================================

      "DOMAIN-SUFFIX,one.google.com,AI 服务",
      "DOMAIN-SUFFIX,gemini.google,AI 服务",
      "DOMAIN-SUFFIX,pay.google.com,AI 服务",
      "DOMAIN-SUFFIX,payments.google.com,AI 服务",
      "DOMAIN-SUFFIX,wallet.google.com,AI 服务",

      // ======================================
      // Google download and developer services
      // ======================================

      "DOMAIN,dl.google.com,AI 服务",
      "DOMAIN,dl.googleusercontent.com,AI 服务",
      "DOMAIN,storage.googleapis.com,AI 服务",
      "DOMAIN,console.cloud.google.com,AI 服务",

      // ======================================
      // OpenAI / ChatGPT
      // ======================================

      "DOMAIN-SUFFIX,openai.com,AI 服务",
      "DOMAIN-SUFFIX,chatgpt.com,AI 服务",
      "DOMAIN-SUFFIX,oaistatic.com,AI 服务",
      "DOMAIN-SUFFIX,oaiusercontent.com,AI 服务",
      "DOMAIN-SUFFIX,sora.com,AI 服务",
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
      // Other overseas AI
      // ======================================

      "DOMAIN-SUFFIX,perplexity.ai,AI 服务",
      "DOMAIN-SUFFIX,grok.com,AI 服务",
      "DOMAIN-SUFFIX,x.ai,AI 服务",
      "DOMAIN-SUFFIX,cursor.com,AI 服务",
      "DOMAIN-SUFFIX,cursor.sh,AI 服务",
      "DOMAIN-SUFFIX,cursorapi.com,AI 服务",
      "DOMAIN-SUFFIX,openrouter.ai,AI 服务"

    ];

    // Remove duplicate rules with the same
    // domain and matching type.

    var priority = {};

    aiRules.forEach(function (rule) {
      var parts = rule.split(",");

      priority[
        parts[0] + "|" + parts[1]
      ] = true;
    });

    var remaining = config.rules.filter(
      function (rule) {
        if (typeof rule !== "string") {
          return true;
        }

        var parts = rule.split(",");

        return !priority[
          parts[0] + "|" + parts[1]
        ];
      }
    );

    // Preserve leading local-network safety
    // rules before applying AI routing.

    var head = [];

    while (remaining.length) {
      var rule = remaining[0];

      var isLocal =
        typeof rule === "string" &&
        (
          /^AND,\(\(NETWORK,UDP\),\(DST-PORT,53\)\),dns$/i.test(rule) ||
          /^DOMAIN-SUFFIX,local,DIRECT$/i.test(rule) ||
          /^IP-CIDR6?,(127\.|10\.|192\.168\.|169\.254\.|172\.16\.|100\.64\.|::1\/|fc00:|fe80:|fd00:).*?,DIRECT(?:,no-resolve)?$/i.test(rule)
        );

      if (!isLocal) {
        break;
      }

      head.push(remaining.shift());
    }

    config.rules = head.concat(
      aiRules,
      remaining
    );

    if (typeof console !== "undefined") {
      console.log(
        "[Clash Party V1.7] " +
        "Google AI / Antigravity rules applied: " +
        aiRules.length
      );
    }

    return config;
  };

})();
