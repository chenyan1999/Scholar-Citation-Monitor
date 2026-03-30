// 测试 fetchCitingPapers 逻辑
// 用法: node test_citing.js [cited-by URL]
// 默认使用内置测试 URL

const https = require('https');

const cutoffYear = new Date().getFullYear() - 1;
const testUrl = process.argv[2] ||
  `https://scholar.google.com/scholar?oi=bibs&hl=zh-CN&cites=14142065265768915303&as_ylo=${cutoffYear}`;

console.log(`\n测试 URL: ${testUrl}`);
console.log(`年份过滤: ≥ ${cutoffYear}\n`);

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
  }
};

https.get(testUrl, options, (res) => {
  console.log(`HTTP 状态: ${res.statusCode}`);

  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // 与插件相同的解析逻辑: .gs_r.gs_or h3.gs_rt 里的第一个 <a> 文本
    const h3Pattern = /<h3[^>]*class="[^"]*gs_rt[^"]*"[^>]*>([\s\S]*?)<\/h3>/g;
    const linkPattern = /<a[^>]*>([\s\S]*?)<\/a>/;
    const stripTags = s => s.replace(/<[^>]*>/g, '').trim();

    // 只取在 .gs_r.gs_or 块内的 h3（简单判断：整页搜结果都在这类 div 里）
    const titles = [];
    let m;
    while ((m = h3Pattern.exec(data)) !== null) {
      const inner = m[1];
      const linkMatch = linkPattern.exec(inner);
      const title = stripTags(linkMatch ? linkMatch[1] : inner);
      if (title) titles.push(title);
    }

    if (titles.length === 0) {
      console.log('\n⚠️  未解析到任何标题');
      // 帮助诊断：检查是否被验证码拦截
      if (data.includes('gs_captcha') || data.includes('sorry/index')) {
        console.log('原因: Scholar 返回了验证码页面');
      } else if (data.includes('gs_rt')) {
        console.log('原因: 找到了 gs_rt 元素但解析失败，打印前 2000 字符供调试:');
        console.log(data.substring(0, 2000));
      } else {
        console.log('原因: 页面中没有 gs_rt 元素，可能结构不同');
        console.log('响应前 1000 字符:');
        console.log(data.substring(0, 1000));
      }
    } else {
      console.log(`✅ 解析到 ${titles.length} 篇引用文章:\n`);
      titles.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
    }
  });
}).on('error', err => {
  console.error('请求失败:', err.message);
});
