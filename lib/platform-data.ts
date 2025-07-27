// 流媒体平台数据类型定义
export interface Platform {
  id: number;
  name: string;
  category: '国际平台' | '国内平台';
  description: string;
  rating: number;
  color: string; // Tailwind渐变类名
  url: string;
  region: string;
  popular: boolean;
  logoUrl?: string; // 用户可自定义的Logo URL
}

// 流媒体平台数据
export const platforms: Platform[] = [
  // 国际平台
  {
    id: 1,
    name: 'Netflix',
    category: '国际平台',
    description: '全球领先的流媒体平台',
    rating: 4.5,
    color: 'from-red-500 to-red-600',
    url: 'https://www.netflix.com',
    region: '全球',
    popular: true,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/netflix-logo-icon.svg' // 用户可自定义Logo地址
  },
  {
    id: 2,
    name: 'Disney+',
    category: '国际平台',
    description: '迪士尼官方流媒体平台',
    rating: 4.3,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.disneyplus.com',
    region: '全球',
    popular: true,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/disney-2.svg' // 用户可自定义Logo地址
  },
  {
    id: 3,
    name: 'Amazon Prime Video',
    category: '国际平台',
    description: '亚马逊旗下流媒体服务',
    rating: 4.2,
    color: 'from-blue-600 to-cyan-500',
    url: 'https://www.primevideo.com',
    region: '全球',
    popular: true,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/amazon-prime-video-1.svg' // 用户可自定义Logo地址
  },
  {
    id: 4,
    name: 'HBO Max',
    category: '国际平台',
    description: 'HBO高品质内容流媒体平台',
    rating: 4.4,
    color: 'from-purple-600 to-purple-700',
    url: 'https://www.hbomax.com',
    region: '美国',
    popular: true,
    logoUrl: 'https://cdn.cookielaw.org/logos/1b21e05d-c206-4e0b-970e-2d73a23e42e8/0197a675-cce2-7363-aa77-c0700565dd28/ab24c856-14e8-485a-ab26-fdc354c49b32/hbomax25_-_min_-_resized.png' // 用户可自定义Logo地址
  },
  {
    id: 5,
    name: 'YouTube',
    category: '国际平台',
    description: '全球最大的视频分享平台',
    rating: 4.1,
    color: 'from-red-500 to-red-600',
    url: 'https://www.youtube.com',
    region: '全球',
    popular: true,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/youtube-icon-5.svg' // 用户可自定义Logo地址
  },
  {
    id: 6,
    name: 'Hulu',
    category: '国际平台',
    description: '美国主流流媒体平台',
    rating: 4.0,
    color: 'from-green-500 to-green-600',
    url: 'https://www.hulu.com',
    region: '美国',
    popular: false,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/hulu.svg' // 用户填入Logo地址
  },
  {
    id: 7,
    name: 'Apple TV+',
    category: '国际平台',
    description: '苹果原创内容流媒体服务',
    rating: 4.2,
    color: 'from-gray-800 to-gray-900',
    url: 'https://tv.apple.com',
    region: '全球',
    popular: false,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/apple-tv-plus-logo.svg' // 用户填入Logo地址
  },
  {
    id: 8,
    name: 'Paramount+',
    category: '国际平台',
    description: '派拉蒙影业流媒体平台',
    rating: 3.9,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.paramountplus.com',
    region: '美国',
    popular: false,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/paramount-3.svg' // 用户填入Logo地址
  },
  {
    id: 9,
    name: 'Peacock',
    category: '国际平台',
    description: 'NBC环球旗下流媒体服务',
    rating: 3.8,
    color: 'from-purple-500 to-pink-500',
    url: 'https://www.peacocktv.com',
    region: '美国',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 10,
    name: 'Crunchyroll',
    category: '国际平台',
    description: '专业动漫流媒体平台',
    rating: 4.3,
    color: 'from-orange-500 to-orange-600',
    url: 'https://www.crunchyroll.com',
    region: '全球',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },

  // 中国大陆平台
  {
    id: 11,
    name: '爱奇艺',
    category: '国内平台',
    description: '中国领先的在线视频平台',
    rating: 4.2,
    color: 'from-green-500 to-green-600',
    url: 'https://www.iqiyi.com',
    region: '中国大陆',
    popular: true,
    logoUrl: '' // 用户可自定义Logo地址
  },
  {
    id: 12,
    name: '腾讯视频',
    category: '国内平台',
    description: '腾讯旗下综合视频平台',
    rating: 4.1,
    color: 'from-blue-500 to-blue-600',
    url: 'https://v.qq.com',
    region: '中国大陆',
    popular: true,
    logoUrl: '' // 用户可自定义Logo地址
  },
  {
    id: 13,
    name: '优酷',
    category: '国内平台',
    description: '阿里巴巴旗下视频平台',
    rating: 4.0,
    color: 'from-blue-400 to-blue-500',
    url: 'https://www.youku.com',
    region: '中国大陆',
    popular: true,
    logoUrl: '' // 用户可自定义Logo地址
  },
  {
    id: 14,
    name: 'Bilibili',
    category: '国内平台',
    description: '年轻人喜爱的弹幕视频网站',
    rating: 4.4,
    color: 'from-pink-500 to-pink-600',
    url: 'https://www.bilibili.com',
    region: '中国大陆',
    popular: true,
    logoUrl: '' // 用户可自定义Logo地址
  },
  {
    id: 15,
    name: '芒果TV',
    category: '国内平台',
    description: '湖南卫视官方视频平台',
    rating: 3.9,
    color: 'from-yellow-500 to-orange-500',
    url: 'https://www.mgtv.com',
    region: '中国大陆',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 16,
    name: '咪咕视频',
    category: '国内平台',
    description: '中国移动旗下视频平台',
    rating: 3.7,
    color: 'from-red-500 to-red-600',
    url: 'https://www.migu.cn',
    region: '中国大陆',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },

  // 日本平台
  {
    id: 17,
    name: 'U-NEXT',
    category: '国际平台',
    description: '日本最大的视频点播服务',
    rating: 4.2,
    color: 'from-black to-gray-800',
    url: 'https://video.unext.jp',
    region: '日本',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 18,
    name: 'AbemaTV',
    category: '国际平台',
    description: '日本免费网络电视服务',
    rating: 4.0,
    color: 'from-green-500 to-green-600',
    url: 'https://abema.tv',
    region: '日本',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 19,
    name: 'TVer',
    category: '国际平台',
    description: '日本民放联合视频服务',
    rating: 3.9,
    color: 'from-blue-500 to-blue-600',
    url: 'https://tver.jp',
    region: '日本',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 20,
    name: 'FOD Premium',
    category: '国际平台',
    description: '富士电视台官方视频服务',
    rating: 3.8,
    color: 'from-red-500 to-red-600',
    url: 'https://fod.fujitv.co.jp',
    region: '日本',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 21,
    name: 'dTV',
    category: '国际平台',
    description: 'NTT DOCOMO旗下视频服务',
    rating: 3.7,
    color: 'from-red-600 to-red-700',
    url: 'https://video.dmkt-sp.jp',
    region: '日本',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 22,
    name: 'dアニメストア',
    category: '国际平台',
    description: '日本专业动画流媒体服务',
    rating: 4.3,
    color: 'from-orange-500 to-orange-600',
    url: 'https://animestore.docomo.ne.jp',
    region: '日本',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 23,
    name: 'Niconico',
    category: '国际平台',
    description: '日本知名弹幕视频网站',
    rating: 4.0,
    color: 'from-gray-600 to-gray-700',
    url: 'https://www.nicovideo.jp',
    region: '日本',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },

  // 韩国平台
  {
    id: 24,
    name: 'Wavve',
    category: '国际平台',
    description: '韩国主流OTT平台',
    rating: 4.1,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.wavve.com',
    region: '韩国',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 25,
    name: 'Tving',
    category: '国际平台',
    description: 'CJ ENM旗下流媒体服务',
    rating: 4.0,
    color: 'from-red-500 to-pink-500',
    url: 'https://www.tving.com',
    region: '韩国',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 26,
    name: 'Coupang Play',
    category: '国际平台',
    description: '韩国Coupang旗下视频服务',
    rating: 3.9,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.coupangplay.com',
    region: '韩国',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },

  // 台湾平台
  {
    id: 27,
    name: 'LINE TV',
    category: '国际平台',
    description: 'LINE旗下免费影音平台',
    rating: 3.8,
    color: 'from-green-500 to-green-600',
    url: 'https://www.linetv.tw',
    region: '台湾',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 28,
    name: 'LiTV',
    category: '国际平台',
    description: '台湾本土OTT影音平台',
    rating: 3.7,
    color: 'from-orange-500 to-orange-600',
    url: 'https://www.litv.tv',
    region: '台湾',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 29,
    name: 'friDay影音',
    category: '国际平台',
    description: '远传电信旗下影音服务',
    rating: 3.6,
    color: 'from-blue-500 to-blue-600',
    url: 'https://video.friday.tw',
    region: '台湾',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 30,
    name: 'myVideo',
    category: '国际平台',
    description: '台湾大哥大影音服务',
    rating: 3.5,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.myvideo.net.tw',
    region: '台湾',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 31,
    name: 'KKTV',
    category: '国际平台',
    description: '专注亚洲内容的影音平台',
    rating: 3.9,
    color: 'from-red-500 to-red-600',
    url: 'https://www.kktv.me',
    region: '台湾',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },

  // 香港平台
  {
    id: 32,
    name: 'Viu',
    category: '国际平台',
    description: '亚洲领先的OTT视频平台',
    rating: 4.0,
    color: 'from-yellow-500 to-yellow-600',
    url: 'https://www.viu.com',
    region: '香港',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 33,
    name: 'myTV SUPER',
    category: '国际平台',
    description: '香港电视广播公司OTT服务',
    rating: 3.8,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.mytvsuper.com',
    region: '香港',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 34,
    name: 'Now E',
    category: '国际平台',
    description: '香港Now TV旗下串流服务',
    rating: 3.7,
    color: 'from-purple-500 to-purple-600',
    url: 'https://nowe.com',
    region: '香港',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },

  // 新加坡平台
  {
    id: 35,
    name: 'Toggle',
    category: '国际平台',
    description: '新传媒旗下免费视频平台',
    rating: 3.8,
    color: 'from-green-500 to-green-600',
    url: 'https://www.toggle.sg',
    region: '新加坡',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 36,
    name: 'Starhub TV+',
    category: '国际平台',
    description: '星和电信视频流媒体服务',
    rating: 3.6,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.starhub.com/personal/entertainment/tv-plus',
    region: '新加坡',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 37,
    name: 'mewatch',
    category: '国际平台',
    description: '新传媒集团官方流媒体平台',
    rating: 3.7,
    color: 'from-red-500 to-red-600',
    url: 'https://www.mewatch.sg',
    region: '新加坡',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },

  // 更多韩国热门平台
  {
    id: 38,
    name: 'Seezn',
    category: '国际平台',
    description: 'KT旗下综合OTT平台',
    rating: 3.8,
    color: 'from-indigo-500 to-indigo-600',
    url: 'https://www.seezn.com',
    region: '韩国',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 39,
    name: 'Watcha',
    category: '国际平台',
    description: '韩国知名影视推荐平台',
    rating: 4.2,
    color: 'from-pink-500 to-rose-500',
    url: 'https://watcha.com',
    region: '韩国',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 40,
    name: 'Olleh TV',
    category: '国际平台',
    description: 'KT集团IPTV服务',
    rating: 3.7,
    color: 'from-cyan-500 to-cyan-600',
    url: 'https://www.olleh.com',
    region: '韩国',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 41,
    name: 'U+모바일tv',
    category: '国际平台',
    description: 'LG U+移动电视服务',
    rating: 3.6,
    color: 'from-purple-600 to-purple-700',
    url: 'https://www.lguplus.com',
    region: '韩国',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },

  // 更多台湾热门平台
  {
    id: 42,
    name: 'CHOCO TV',
    category: '国际平台',
    description: '台湾免费追剧平台',
    rating: 3.9,
    color: 'from-amber-500 to-orange-500',
    url: 'https://www.chocotv.com.tw',
    region: '台湾',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 43,
    name: 'Vidol',
    category: '国际平台',
    description: '三立电视旗下影音平台',
    rating: 3.8,
    color: 'from-teal-500 to-teal-600',
    url: 'https://www.vidol.tv',
    region: '台湾',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 44,
    name: 'Hami Video',
    category: '国际平台',
    description: '中华电信影音服务',
    rating: 3.7,
    color: 'from-emerald-500 to-emerald-600',
    url: 'https://hamivideo.hinet.net',
    region: '台湾',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 45,
    name: 'CatchPlay+',
    category: '国际平台',
    description: '威望国际娱乐影音平台',
    rating: 4.0,
    color: 'from-violet-500 to-violet-600',
    url: 'https://www.catchplay.com',
    region: '台湾',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 46,
    name: 'GagaOOLala',
    category: '国际平台',
    description: '亚洲LGBTQ+影音平台',
    rating: 3.8,
    color: 'from-pink-500 to-purple-600',
    url: 'https://www.gagaoolala.com',
    region: '台湾',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },

  // 马来西亚华人流媒体平台
  {
    id: 47,
    name: 'Astro GO',
    category: '国际平台',
    description: '马来西亚Astro集团流媒体服务，提供中文内容',
    rating: 4.0,
    color: 'from-blue-500 to-purple-600',
    url: 'https://www.astro.com.my',
    region: '马来西亚',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 48,
    name: 'dimsum',
    category: '国际平台',
    description: '马来西亚华语内容流媒体平台',
    rating: 3.8,
    color: 'from-red-500 to-orange-500',
    url: 'https://www.dimsum.my',
    region: '马来西亚',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 49,
    name: 'iQIYI马来西亚',
    category: '国际平台',
    description: '爱奇艺马来西亚版，提供中文字幕内容',
    rating: 4.1,
    color: 'from-green-500 to-green-600',
    url: 'https://www.iq.com',
    region: '马来西亚',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 50,
    name: 'WeTV马来西亚',
    category: '国际平台',
    description: '腾讯视频海外版，提供中文内容',
    rating: 4.0,
    color: 'from-blue-500 to-blue-600',
    url: 'https://wetv.vip',
    region: '马来西亚',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },

  // 新加坡华人流媒体平台（补充）
  {
    id: 51,
    name: 'iQIYI新加坡',
    category: '国际平台',
    description: '爱奇艺新加坡版，提供中文字幕内容',
    rating: 4.1,
    color: 'from-green-500 to-green-600',
    url: 'https://www.iq.com',
    region: '新加坡',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 52,
    name: 'WeTV新加坡',
    category: '国际平台',
    description: '腾讯视频海外版，提供中文内容',
    rating: 4.0,
    color: 'from-blue-500 to-blue-600',
    url: 'https://wetv.vip',
    region: '新加坡',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },

  // 动漫专业平台（保留）
  {
    id: 53,
    name: 'Funimation',
    category: '国际平台',
    description: '索尼旗下动漫流媒体服务，提供日本动漫',
    rating: 4.1,
    color: 'from-purple-600 to-pink-600',
    url: 'https://www.funimation.com',
    region: '全球',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 54,
    name: 'AnimeLab',
    category: '国际平台',
    description: '澳洲动漫流媒体平台，提供日本动漫',
    rating: 4.0,
    color: 'from-orange-500 to-red-500',
    url: 'https://www.animelab.com',
    region: '澳大利亚',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },

  // 泰国华人平台
  {
    id: 55,
    name: 'PPTV Thailand',
    category: '国际平台',
    description: '泰国PPTV，提供中文字幕泰剧',
    rating: 3.9,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.pptvhd36.com',
    region: '泰国',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 56,
    name: 'GMM 25',
    category: '国际平台',
    description: '泰国GMM集团，部分内容提供中文字幕',
    rating: 3.8,
    color: 'from-pink-500 to-red-500',
    url: 'https://www.gmm25.com',
    region: '泰国',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },

  // 印尼华人平台
  {
    id: 57,
    name: 'WeTV印尼',
    category: '国际平台',
    description: '腾讯视频印尼版，提供中文内容',
    rating: 3.9,
    color: 'from-blue-500 to-blue-600',
    url: 'https://wetv.vip',
    region: '印尼',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 58,
    name: 'iQIYI印尼',
    category: '国际平台',
    description: '爱奇艺印尼版，提供中文字幕内容',
    rating: 3.8,
    color: 'from-green-500 to-green-600',
    url: 'https://www.iq.com',
    region: '印尼',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },

  // 菲律宾华人平台
  {
    id: 59,
    name: 'iWantTFC',
    category: '国际平台',
    description: '菲律宾ABS-CBN流媒体，部分华语内容',
    rating: 3.7,
    color: 'from-blue-600 to-blue-700',
    url: 'https://iwanttfc.com',
    region: '菲律宾',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  },

  // 越南华人平台
  {
    id: 60,
    name: 'WeTV越南',
    category: '国际平台',
    description: '腾讯视频越南版，提供中文内容',
    rating: 3.8,
    color: 'from-blue-500 to-blue-600',
    url: 'https://wetv.vip',
    region: '越南',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },

  // 更多韩国主要平台
  {
    id: 61,
    name: 'SBS',
    category: '国际平台',
    description: '韩国SBS电视台官方流媒体服务',
    rating: 4.2,
    color: 'from-red-500 to-red-600',
    url: 'https://www.sbs.co.kr',
    region: '韩国',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 62,
    name: 'MBC',
    category: '国际平台',
    description: '韩国MBC电视台官方流媒体服务',
    rating: 4.1,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.imbc.com',
    region: '韩国',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 63,
    name: 'KBS',
    category: '国际平台',
    description: '韩国KBS电视台官方流媒体服务',
    rating: 4.0,
    color: 'from-green-500 to-green-600',
    url: 'https://www.kbs.co.kr',
    region: '韩国',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 64,
    name: 'JTBC',
    category: '国际平台',
    description: '韩国JTBC电视台流媒体服务',
    rating: 4.1,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.jtbc.co.kr',
    region: '韩国',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 65,
    name: 'tvN',
    category: '国际平台',
    description: '韩国tvN频道官方流媒体服务',
    rating: 4.3,
    color: 'from-indigo-500 to-purple-600',
    url: 'https://www.tvn.co.kr',
    region: '韩国',
    popular: true,
    logoUrl: '' // 用户填入Logo地址
  },
  {
    id: 66,
    name: 'OCN',
    category: '国际平台',
    description: '韩国OCN频道流媒体服务',
    rating: 3.9,
    color: 'from-gray-600 to-gray-700',
    url: 'https://www.ocn.co.kr',
    region: '韩国',
    popular: false,
    logoUrl: '' // 用户填入Logo地址
  }
];

// 分类选项
export const categories = ['全部', '国际平台', '国内平台'] as const;
export type CategoryType = typeof categories[number];

// 获取筛选后的平台数据
export function getFilteredPlatforms(category: CategoryType): Platform[] {
  if (category === '全部') {
    return platforms;
  }
  return platforms.filter(platform => platform.category === category);
}

// 获取热门平台
export function getPopularPlatforms(): Platform[] {
  return platforms.filter(platform => platform.popular);
}

// 根据地区获取平台
export function getPlatformsByRegion(region: string): Platform[] {
  return platforms.filter(platform => platform.region === region);
}