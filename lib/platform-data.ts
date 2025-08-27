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
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/netflix-logo-icon.svg'
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
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/disney-2.svg'
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
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/amazon-prime-video-1.svg'
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
    logoUrl: 'https://cdn.cookielaw.org/logos/1b21e05d-c206-4e0b-970e-2d73a23e42e8/0197a675-cce2-7363-aa77-c0700565dd28/ab24c856-14e8-485a-ab26-fdc354c49b32/hbomax25_-_min_-_resized.png'
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
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/youtube-icon-5.svg'
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
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/hulu.svg'
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
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/apple-tv-plus-logo.svg'
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
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/paramount-3.svg'
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
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/peacock-1.svg'
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
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/crunchyroll-1.svg'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=iqiyi.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=v.qq.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=youku.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=bilibili.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=mgtv.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=migu.cn&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=video.unext.jp&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=abema.tv&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=tver.jp&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=fod.fujitv.co.jp&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=video.dmkt-sp.jp&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=animestore.docomo.ne.jp&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=nicovideo.jp&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=wavve.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=tving.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=coupangplay.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=linetv.tw&sz=64'
  },
  {
    id: 28,
    name: 'KKTV',
    category: '国际平台',
    description: '台湾KKBOX旗下视频服务',
    rating: 3.7,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.kktv.me',
    region: '台湾',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=kktv.me&sz=64'
  },
  {
    id: 29,
    name: 'FriDay影音',
    category: '国际平台',
    description: '台湾远传电信旗下视频平台',
    rating: 3.6,
    color: 'from-purple-500 to-purple-600',
    url: 'https://video.friday.tw',
    region: '台湾',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=video.friday.tw&sz=64'
  },

  // 香港平台
  {
    id: 30,
    name: 'Viu',
    category: '国际平台',
    description: '香港电讯盈科流媒体服务',
    rating: 3.9,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.viu.com',
    region: '香港',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=viu.com&sz=64'
  },
  {
    id: 31,
    name: 'Now TV',
    category: '国际平台',
    description: '香港电讯盈科付费电视服务',
    rating: 3.8,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.nowtv.com',
    region: '香港',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=nowtv.com&sz=64'
  },

  // 新加坡平台
  {
    id: 32,
    name: 'StarHub Go',
    category: '国际平台',
    description: '新加坡StarHub流媒体服务',
    rating: 3.7,
    color: 'from-green-500 to-green-600',
    url: 'https://www.starhubgo.com',
    region: '新加坡',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=starhubgo.com&sz=64'
  },
  {
    id: 33,
    name: 'Singtel TV',
    category: '国际平台',
    description: '新加坡电信旗下视频服务',
    rating: 3.6,
    color: 'from-red-500 to-red-600',
    url: 'https://www.singtel.com',
    region: '新加坡',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=singtel.com&sz=64'
  },

  // 印度平台
  {
    id: 34,
    name: 'SonyLIV',
    category: '国际平台',
    description: '印度Sony网络电视服务',
    rating: 3.9,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.sonyliv.com',
    region: '印度',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=sonyliv.com&sz=64'
  },
  {
    id: 35,
    name: 'Hotstar',
    category: '国际平台',
    description: '印度Disney+Hotstar流媒体服务',
    rating: 4.0,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.hotstar.com',
    region: '印度',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=hotstar.com&sz=64'
  },
  {
    id: 36,
    name: 'MX Player',
    category: '国际平台',
    description: '印度MX Player视频平台',
    rating: 3.7,
    color: 'from-orange-500 to-orange-600',
    url: 'https://www.mxplayer.in',
    region: '印度',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=mxplayer.in&sz=64'
  },
  {
    id: 37,
    name: 'JioCinema',
    category: '国际平台',
    description: '印度JioCinema流媒体服务',
    rating: 3.8,
    color: 'from-pink-500 to-red-500',
    url: 'https://www.jiocinema.com',
    region: '印度',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=jiocinema.com&sz=64'
  },
  {
    id: 38,
    name: 'ALT Balaji',
    category: '国际平台',
    description: '印度Balaji Telefilms视频平台',
    rating: 3.6,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.altbalaji.com',
    region: '印度',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=altbalaji.com&sz=64'
  },
  {
    id: 39,
    name: 'Eros Now',
    category: '国际平台',
    description: '印度Eros Now流媒体服务',
    rating: 3.7,
    color: 'from-red-600 to-red-700',
    url: 'https://www.erosnow.com',
    region: '印度',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=erosnow.com&sz=64'
  },

  // 英国平台
  {
    id: 40,
    name: 'BBC iPlayer',
    category: '国际平台',
    description: '英国BBC官方流媒体服务',
    rating: 4.2,
    color: 'from-red-600 to-red-700',
    url: 'https://www.bbc.co.uk/iplayer',
    region: '英国',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=bbc.co.uk&sz=64'
  },
  {
    id: 41,
    name: 'ITV Hub',
    category: '国际平台',
    description: '英国ITV流媒体服务',
    rating: 3.9,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.itv.com/hub',
    region: '英国',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=itv.com&sz=64'
  },
  {
    id: 42,
    name: 'All 4',
    category: '国际平台',
    description: '英国Channel 4流媒体服务',
    rating: 3.8,
    color: 'from-green-500 to-green-600',
    url: 'https://www.channel4.com/now',
    region: '英国',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=channel4.com&sz=64'
  },
  {
    id: 43,
    name: 'UKTV Play',
    category: '国际平台',
    description: '英国UKTV流媒体服务',
    rating: 3.7,
    color: 'from-purple-500 to-purple-600',
    url: 'https://uktvplay.uktv.co.uk',
    region: '英国',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=uktvplay.uktv.co.uk&sz=64'
  },

  // 澳大利亚平台
  {
    id: 44,
    name: 'Stan',
    category: '国际平台',
    description: '澳大利亚流媒体平台',
    rating: 3.9,
    color: 'from-red-500 to-red-600',
    url: 'https://www.stan.com.au',
    region: '澳大利亚',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=stan.com.au&sz=64'
  },
  {
    id: 45,
    name: 'ABC iView',
    category: '国际平台',
    description: '澳大利亚ABC官方流媒体服务',
    rating: 4.0,
    color: 'from-blue-500 to-blue-600',
    url: 'https://iview.abc.net.au',
    region: '澳大利亚',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=abc.net.au&sz=64'
  },
  {
    id: 46,
    name: '7plus',
    category: '国际平台',
    description: '澳大利亚Seven Network流媒体服务',
    rating: 3.8,
    color: 'from-red-600 to-red-700',
    url: 'https://7plus.com.au',
    region: '澳大利亚',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=7plus.com.au&sz=64'
  },
  {
    id: 47,
    name: '9Now',
    category: '国际平台',
    description: '澳大利亚Nine Network流媒体服务',
    rating: 3.7,
    color: 'from-red-700 to-red-800',
    url: 'https://www.9now.com.au',
    region: '澳大利亚',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=9now.com.au&sz=64'
  },
  {
    id: 48,
    name: '10 Play',
    category: '国际平台',
    description: '澳大利亚Network 10流媒体服务',
    rating: 3.6,
    color: 'from-purple-500 to-purple-600',
    url: 'https://10play.com.au',
    region: '澳大利亚',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=10play.com.au&sz=64'
  },

  // 加拿大平台
  {
    id: 49,
    name: 'CBC Gem',
    category: '国际平台',
    description: '加拿大CBC官方流媒体服务',
    rating: 3.9,
    color: 'from-red-600 to-red-700',
    url: 'https://gem.cbc.ca',
    region: '加拿大',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=cbc.ca&sz=64'
  },
  {
    id: 50,
    name: 'Crave',
    category: '国际平台',
    description: '加拿大Bell Media流媒体服务',
    rating: 3.8,
    color: 'from-red-500 to-red-600',
    url: 'https://www.crave.ca',
    region: '加拿大',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=crave.ca&sz=64'
  },

  // 法国平台
  {
    id: 51,
    name: 'Salto',
    category: '国际平台',
    description: '法国流媒体平台',
    rating: 3.7,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.salto.fr',
    region: '法国',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=salto.fr&sz=64'
  },
  {
    id: 52,
    name: 'Molotov',
    category: '国际平台',
    description: '法国免费电视流媒体服务',
    rating: 3.8,
    color: 'from-red-500 to-red-600',
    url: 'https://www.molotov.tv',
    region: '法国',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=molotov.tv&sz=64'
  },

  // 德国平台
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=funimation.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=animelab.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=pptvhd36.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=gmm25.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=wetv.vip&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=iq.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=iwanttfc.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=wetv.vip&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=sbs.co.kr&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=imbc.com&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=kbs.co.kr&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=jtbc.co.kr&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=tvn.co.kr&sz=64'
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
    logoUrl: 'https://www.google.com/s2/favicons?domain=ocn.co.kr&sz=64'
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