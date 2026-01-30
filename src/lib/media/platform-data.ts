// 流媒体平台数据类型定义
export interface Platform {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  color: string; // Tailwind渐变类名
  url: string;
  region: string;
  popular: boolean;
  logoUrl?: string; // Logo URL
  fallbackEmoji?: string; // 默认emoji
}

// 流媒体平台数据
export const platforms: Platform[] = [
  // 全球平台
  {
    id: 'netflix',
    name: 'Netflix',
    category: '全球',
    description: '全球领先的流媒体平台',
    rating: 4.5,
    color: 'from-red-500 to-red-600',
    url: 'https://www.netflix.com',
    region: '全球',
    popular: true,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/netflix-logo-icon.svg',
    fallbackEmoji: '🎬'
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    category: '全球',
    description: '迪士尼官方流媒体平台',
    rating: 4.3,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.disneyplus.com',
    region: '全球',
    popular: true,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/disney-2.svg',
    fallbackEmoji: '🏰'
  },
  {
    id: 'amazon-prime',
    name: 'Amazon Prime Video',
    category: '全球',
    description: '亚马逊旗下流媒体服务',
    rating: 4.2,
    color: 'from-blue-600 to-cyan-500',
    url: 'https://www.primevideo.com',
    region: '全球',
    popular: true,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/amazon-prime-video-1.svg',
    fallbackEmoji: '📦'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: '全球',
    description: '全球最大的视频分享平台',
    rating: 4.1,
    color: 'from-red-500 to-red-600',
    url: 'https://www.youtube.com',
    region: '全球',
    popular: true,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/youtube-icon-5.svg',
    fallbackEmoji: '📺'
  },
  {
    id: 'apple-tv',
    name: 'Apple TV+',
    category: '全球',
    description: '苹果原创内容流媒体服务',
    rating: 4.2,
    color: 'from-gray-800 to-gray-900',
    url: 'https://tv.apple.com',
    region: '全球',
    popular: false,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/apple-tv-plus-logo.svg',
    fallbackEmoji: '🍎'
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    category: '全球',
    description: '专业动漫流媒体平台',
    rating: 4.3,
    color: 'from-orange-500 to-orange-600',
    url: 'https://www.crunchyroll.com',
    region: '全球',
    popular: true,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/crunchyroll-1.svg',
    fallbackEmoji: '🍜'
  },
  {
    id: 'funimation',
    name: 'Funimation',
    category: '全球',
    description: '索尼旗下动漫流媒体服务，提供日本动漫',
    rating: 4.1,
    color: 'from-purple-600 to-pink-600',
    url: 'https://www.funimation.com',
    region: '全球',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=funimation.com&sz=64',
    fallbackEmoji: '🎌'
  },

  // 美国平台
  {
    id: 'hbo-max',
    name: 'HBO Max',
    category: '美国',
    description: 'HBO高品质内容流媒体平台',
    rating: 4.4,
    color: 'from-purple-600 to-purple-700',
    url: 'https://www.hbomax.com',
    region: '美国',
    popular: true,
    logoUrl: 'https://cdn.cookielaw.org/logos/1b21e05d-c206-4e0b-970e-2d73a23e42e8/0197a675-cce2-7363-aa77-c0700565dd28/ab24c856-14e8-485a-ab26-fdc354c49b32/hbomax25_-_min_-_resized.png',
    fallbackEmoji: '🎭'
  },
  {
    id: 'hulu',
    name: 'Hulu',
    category: '美国',
    description: '美国主流流媒体平台',
    rating: 4.0,
    color: 'from-green-500 to-green-600',
    url: 'https://www.hulu.com',
    region: '美国',
    popular: false,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/hulu.svg',
    fallbackEmoji: '🟢'
  },
  {
    id: 'paramount-plus',
    name: 'Paramount+',
    category: '美国',
    description: '派拉蒙影业流媒体平台',
    rating: 3.9,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.paramountplus.com',
    region: '美国',
    popular: false,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/paramount-3.svg',
    fallbackEmoji: '⛰️'
  },
  {
    id: 'peacock',
    name: 'Peacock',
    category: '美国',
    description: 'NBC环球旗下流媒体服务',
    rating: 3.8,
    color: 'from-purple-500 to-pink-500',
    url: 'https://www.peacocktv.com',
    region: '美国',
    popular: false,
    logoUrl: 'https://cdn.worldvectorlogo.com/logos/peacock-1.svg',
    fallbackEmoji: '🦚'
  },

  // 中国大陆平台
  {
    id: 'iqiyi',
    name: '爱奇艺',
    category: '中国大陆',
    description: '中国领先的在线视频平台',
    rating: 4.2,
    color: 'from-green-500 to-green-600',
    url: 'https://www.iqiyi.com',
    region: '中国大陆',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=iqiyi.com&sz=64',
    fallbackEmoji: '🎯'
  },
  {
    id: 'tencent-video',
    name: '腾讯视频',
    category: '中国大陆',
    description: '腾讯旗下综合视频平台',
    rating: 4.1,
    color: 'from-blue-500 to-blue-600',
    url: 'https://v.qq.com',
    region: '中国大陆',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=v.qq.com&sz=64',
    fallbackEmoji: '🐧'
  },
  {
    id: 'youku',
    name: '优酷',
    category: '中国大陆',
    description: '阿里巴巴旗下视频平台',
    rating: 4.0,
    color: 'from-blue-400 to-blue-500',
    url: 'https://www.youku.com',
    region: '中国大陆',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=youku.com&sz=64',
    fallbackEmoji: '📱'
  },
  {
    id: 'bilibili',
    name: 'Bilibili',
    category: '中国大陆',
    description: '年轻人喜爱的弹幕视频网站',
    rating: 4.4,
    color: 'from-pink-500 to-pink-600',
    url: 'https://www.bilibili.com',
    region: '中国大陆',
    popular: true,
    logoUrl: 'https://www.google.com/s2/favicons?domain=bilibili.com&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'mango-tv',
    name: '芒果TV',
    category: '中国大陆',
    description: '湖南卫视官方视频平台',
    rating: 3.9,
    color: 'from-yellow-500 to-orange-500',
    url: 'https://www.mgtv.com',
    region: '中国大陆',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=mgtv.com&sz=64',
    fallbackEmoji: '🥭'
  },
  {
    id: 'migu-video',
    name: '咪咕视频',
    category: '中国大陆',
    description: '中国移动旗下视频平台',
    rating: 3.7,
    color: 'from-red-500 to-red-600',
    url: 'https://www.miguvideo.com',
    region: '中国大陆',
    popular: false,
    logoUrl: 'https://www.google.com/s2/favicons?domain=miguvideo.com&sz=64',
    fallbackEmoji: '📱'
  },

  // 日本平台
  {
    id: 'u-next',
    name: 'U-NEXT',
    category: '日本',
    description: '日本最大的视频点播服务',
    rating: 4.2,
    color: 'from-black to-gray-800',
    url: 'https://video.unext.jp',
    region: '日本',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=video.unext.jp&sz=64',
    fallbackEmoji: '🇯🇵'
  },
  {
    id: 'abema-tv',
    name: 'AbemaTV',
    category: '日本',
    description: '日本免费网络电视服务',
    rating: 4.0,
    color: 'from-green-500 to-green-600',
    url: 'https://abema.tv',
    region: '日本',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=abema.tv&sz=64',
    fallbackEmoji: '📡'
  },
  {
    id: 'tver',
    name: 'TVer',
    category: '日本',
    description: '日本民放联合视频服务',
    rating: 3.9,
    color: 'from-blue-500 to-blue-600',
    url: 'https://tver.jp',
    region: '日本',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=tver.jp&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'fod-premium',
    name: 'FOD Premium',
    category: '日本',
    description: '富士电视台官方视频服务',
    rating: 3.8,
    color: 'from-red-500 to-red-600',
    url: 'https://fod.fujitv.co.jp',
    region: '日本',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=fod.fujitv.co.jp&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'dtv',
    name: 'dTV',
    category: '日本',
    description: 'NTT DOCOMO旗下视频服务',
    rating: 3.7,
    color: 'from-red-600 to-red-700',
    url: 'https://video.dmkt-sp.jp',
    region: '日本',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=video.dmkt-sp.jp&sz=64',
    fallbackEmoji: '📱'
  },
  {
    id: 'd-anime-store',
    name: 'dアニメストア',
    category: '日本',
    description: '日本专业动画流媒体服务',
    rating: 4.3,
    color: 'from-orange-500 to-orange-600',
    url: 'https://animestore.docomo.ne.jp',
    region: '日本',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=animestore.docomo.ne.jp&sz=64',
    fallbackEmoji: '🎌'
  },
  {
    id: 'niconico',
    name: 'Niconico',
    category: '日本',
    description: '日本知名弹幕视频网站',
    rating: 4.0,
    color: 'from-gray-600 to-gray-700',
    url: 'https://www.nicovideo.jp',
    region: '日本',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=nicovideo.jp&sz=64',
    fallbackEmoji: '📺'
  },

  // 韩国平台
  {
    id: 'wavve',
    name: 'Wavve',
    category: '韩国',
    description: '韩国主流OTT平台',
    rating: 4.1,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.wavve.com',
    region: '韩国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=wavve.com&sz=64',
    fallbackEmoji: '🌊'
  },
  {
    id: 'tving',
    name: 'Tving',
    category: '韩国',
    description: 'CJ ENM旗下流媒体服务',
    rating: 4.0,
    color: 'from-red-500 to-pink-500',
    url: 'https://www.tving.com',
    region: '韩国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=tving.com&sz=64',
    fallbackEmoji: '🇰🇷'
  },
  {
    id: 'coupang-play',
    name: 'Coupang Play',
    category: '韩国',
    description: '韩国Coupang旗下视频服务',
    rating: 3.9,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.coupangplay.com',
    region: '韩国',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=coupangplay.com&sz=64',
    fallbackEmoji: '🛒'
  },
  {
    id: 'sbs',
    name: 'SBS',
    category: '韩国',
    description: '韩国SBS电视台官方流媒体服务',
    rating: 4.2,
    color: 'from-red-500 to-red-600',
    url: 'https://www.sbs.co.kr',
    region: '韩国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=sbs.co.kr&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'mbc',
    name: 'MBC',
    category: '韩国',
    description: '韩国MBC电视台官方流媒体服务',
    rating: 4.1,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.imbc.com',
    region: '韩国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=imbc.com&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'kbs',
    name: 'KBS',
    category: '韩国',
    description: '韩国KBS电视台官方流媒体服务',
    rating: 4.0,
    color: 'from-green-500 to-green-600',
    url: 'https://www.kbs.co.kr',
    region: '韩国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=kbs.co.kr&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'jtbc',
    name: 'JTBC',
    category: '韩国',
    description: '韩国JTBC电视台流媒体服务',
    rating: 4.1,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.jtbc.co.kr',
    region: '韩国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=jtbc.co.kr&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'tvn',
    name: 'tvN',
    category: '韩国',
    description: '韩国tvN频道官方流媒体服务',
    rating: 4.3,
    color: 'from-indigo-500 to-purple-600',
    url: 'https://www.tvn.co.kr',
    region: '韩国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=tvn.co.kr&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'ocn',
    name: 'OCN',
    category: '韩国',
    description: '韩国OCN频道流媒体服务',
    rating: 3.9,
    color: 'from-gray-600 to-gray-700',
    url: 'https://www.ocn.co.kr',
    region: '韩国',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=ocn.co.kr&sz=64',
    fallbackEmoji: '📺'
  },

  // 台湾平台
  {
    id: 'line-tv',
    name: 'LINE TV',
    category: '台湾',
    description: 'LINE旗下免费影音平台',
    rating: 3.8,
    color: 'from-green-500 to-green-600',
    url: 'https://www.linetv.tw',
    region: '台湾',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=linetv.tw&sz=64',
    fallbackEmoji: '💚'
  },
  {
    id: 'kktv',
    name: 'KKTV',
    category: '台湾',
    description: '台湾KKBOX旗下视频服务',
    rating: 3.7,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.kktv.me',
    region: '台湾',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=kktv.me&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'friday-video',
    name: 'FriDay影音',
    category: '台湾',
    description: '台湾远传电信旗下视频平台',
    rating: 3.6,
    color: 'from-purple-500 to-purple-600',
    url: 'https://video.friday.tw',
    region: '台湾',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=video.friday.tw&sz=64',
    fallbackEmoji: '📺'
  },

  // 香港平台
  {
    id: 'viu',
    name: 'Viu',
    category: '香港',
    description: '香港电讯盈科流媒体服务',
    rating: 3.9,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.viu.com',
    region: '香港',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=viu.com&sz=64',
    fallbackEmoji: '🏙️'
  },
  {
    id: 'now-tv',
    name: 'Now TV',
    category: '香港',
    description: '香港电讯盈科付费电视服务',
    rating: 3.8,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.nowtv.com',
    region: '香港',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=nowtv.com&sz=64',
    fallbackEmoji: '📺'
  },

  // 新加坡平台
  {
    id: 'starhub-go',
    name: 'StarHub Go',
    category: '新加坡',
    description: '新加坡StarHub流媒体服务',
    rating: 3.7,
    color: 'from-green-500 to-green-600',
    url: 'https://www.starhubgo.com',
    region: '新加坡',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=starhubgo.com&sz=64',
    fallbackEmoji: '🇸🇬'
  },
  {
    id: 'singtel-tv',
    name: 'Singtel TV',
    category: '新加坡',
    description: '新加坡电信旗下视频服务',
    rating: 3.6,
    color: 'from-red-500 to-red-600',
    url: 'https://www.singtel.com',
    region: '新加坡',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=singtel.com&sz=64',
    fallbackEmoji: '📺'
  },

  // 印度平台
  {
    id: 'sonyliv',
    name: 'SonyLIV',
    category: '印度',
    description: '印度Sony网络电视服务',
    rating: 3.9,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.sonyliv.com',
    region: '印度',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=sonyliv.com&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'hotstar',
    name: 'Hotstar',
    category: '印度',
    description: '印度Disney+Hotstar流媒体服务',
    rating: 4.0,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.hotstar.com',
    region: '印度',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=hotstar.com&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'mx-player',
    name: 'MX Player',
    category: '印度',
    description: '印度MX Player视频平台',
    rating: 3.7,
    color: 'from-orange-500 to-orange-600',
    url: 'https://www.mxplayer.in',
    region: '印度',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=mxplayer.in&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'jiocinema',
    name: 'JioCinema',
    category: '印度',
    description: '印度JioCinema流媒体服务',
    rating: 3.8,
    color: 'from-pink-500 to-red-500',
    url: 'https://www.jiocinema.com',
    region: '印度',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=jiocinema.com&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'alt-balaji',
    name: 'ALT Balaji',
    category: '印度',
    description: '印度Balaji Telefilms视频平台',
    rating: 3.6,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.altbalaji.com',
    region: '印度',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=altbalaji.com&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'eros-now',
    name: 'Eros Now',
    category: '印度',
    description: '印度Eros Now流媒体服务',
    rating: 3.7,
    color: 'from-red-600 to-red-700',
    url: 'https://www.erosnow.com',
    region: '印度',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=erosnow.com&sz=64',
    fallbackEmoji: '📺'
  },

  // 英国平台
  {
    id: 'bbc-iplayer',
    name: 'BBC iPlayer',
    category: '英国',
    description: '英国BBC官方流媒体服务',
    rating: 4.2,
    color: 'from-red-600 to-red-700',
    url: 'https://www.bbc.co.uk/iplayer',
    region: '英国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=bbc.co.uk&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'itv-hub',
    name: 'ITV Hub',
    category: '英国',
    description: '英国ITV流媒体服务',
    rating: 3.9,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.itv.com/hub',
    region: '英国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=itv.com&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'all-4',
    name: 'All 4',
    category: '英国',
    description: '英国Channel 4流媒体服务',
    rating: 3.8,
    color: 'from-green-500 to-green-600',
    url: 'https://www.channel4.com/now',
    region: '英国',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=channel4.com&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'uktv-play',
    name: 'UKTV Play',
    category: '英国',
    description: '英国UKTV流媒体服务',
    rating: 3.7,
    color: 'from-purple-500 to-purple-600',
    url: 'https://uktvplay.uktv.co.uk',
    region: '英国',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=uktvplay.uktv.co.uk&sz=64',
    fallbackEmoji: '📺'
  },

  // 澳大利亚平台
  {
    id: 'stan',
    name: 'Stan',
    category: '澳大利亚',
    description: '澳大利亚流媒体平台',
    rating: 3.9,
    color: 'from-red-500 to-red-600',
    url: 'https://www.stan.com.au',
    region: '澳大利亚',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=stan.com.au&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'abc-iview',
    name: 'ABC iView',
    category: '澳大利亚',
    description: '澳大利亚ABC官方流媒体服务',
    rating: 4.0,
    color: 'from-blue-500 to-blue-600',
    url: 'https://iview.abc.net.au',
    region: '澳大利亚',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=abc.net.au&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: '7plus',
    name: '7plus',
    category: '澳大利亚',
    description: '澳大利亚Seven Network流媒体服务',
    rating: 3.8,
    color: 'from-red-600 to-red-700',
    url: 'https://7plus.com.au',
    region: '澳大利亚',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=7plus.com.au&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: '9now',
    name: '9Now',
    category: '澳大利亚',
    description: '澳大利亚Nine Network流媒体服务',
    rating: 3.7,
    color: 'from-red-700 to-red-800',
    url: 'https://www.9now.com.au',
    region: '澳大利亚',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=9now.com.au&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: '10-play',
    name: '10 Play',
    category: '澳大利亚',
    description: '澳大利亚Network 10流媒体服务',
    rating: 3.6,
    color: 'from-purple-500 to-purple-600',
    url: 'https://10play.com.au',
    region: '澳大利亚',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=10play.com.au&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'animelab',
    name: 'AnimeLab',
    category: '澳大利亚',
    description: '澳洲动漫流媒体平台，提供日本动漫',
    rating: 4.0,
    color: 'from-orange-500 to-red-500',
    url: 'https://www.animelab.com',
    region: '澳大利亚',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=animelab.com&sz=64',
    fallbackEmoji: '🦘'
  },

  // 加拿大平台
  {
    id: 'cbc-gem',
    name: 'CBC Gem',
    category: '加拿大',
    description: '加拿大CBC官方流媒体服务',
    rating: 3.9,
    color: 'from-red-600 to-red-700',
    url: 'https://gem.cbc.ca',
    region: '加拿大',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=cbc.ca&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'crave',
    name: 'Crave',
    category: '加拿大',
    description: '加拿大Bell Media流媒体服务',
    rating: 3.8,
    color: 'from-red-500 to-red-600',
    url: 'https://www.crave.ca',
    region: '加拿大',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=crave.ca&sz=64',
    fallbackEmoji: '📺'
  },

  // 法国平台
  {
    id: 'salto',
    name: 'Salto',
    category: '法国',
    description: '法国流媒体平台',
    rating: 3.7,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.salto.fr',
    region: '法国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=salto.fr&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'molotov',
    name: 'Molotov',
    category: '法国',
    description: '法国免费电视流媒体服务',
    rating: 3.8,
    color: 'from-red-500 to-red-600',
    url: 'https://www.molotov.tv',
    region: '法国',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=molotov.tv&sz=64',
    fallbackEmoji: '📺'
  },

  // 泰国平台
  {
    id: 'pptv-thailand',
    name: 'PPTV Thailand',
    category: '泰国',
    description: '泰国PPTV，提供中文字幕泰剧',
    rating: 3.9,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.pptvhd36.com',
    region: '泰国',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=pptvhd36.com&sz=64',
    fallbackEmoji: '🇹🇭'
  },
  {
    id: 'gmm-25',
    name: 'GMM 25',
    category: '泰国',
    description: '泰国GMM集团，部分内容提供中文字幕',
    rating: 3.8,
    color: 'from-pink-500 to-red-500',
    url: 'https://www.gmm25.com',
    region: '泰国',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=gmm25.com&sz=64',
    fallbackEmoji: '📺'
  },

  // 印尼平台
  {
    id: 'wetv-indonesia',
    name: 'WeTV印尼',
    category: '印尼',
    description: '腾讯视频印尼版，提供中文内容',
    rating: 3.9,
    color: 'from-blue-500 to-blue-600',
    url: 'https://wetv.vip',
    region: '印尼',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=wetv.vip&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'iqiyi-indonesia',
    name: 'iQIYI印尼',
    category: '印尼',
    description: '爱奇艺印尼版，提供中文字幕内容',
    rating: 3.8,
    color: 'from-green-500 to-green-600',
    url: 'https://www.iq.com',
    region: '印尼',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=iq.com&sz=64',
    fallbackEmoji: '📺'
  },

  // 菲律宾平台
  {
    id: 'iwant-tfc',
    name: 'iWantTFC',
    category: '菲律宾',
    description: '菲律宾ABS-CBN流媒体，部分华语内容',
    rating: 3.7,
    color: 'from-blue-600 to-blue-700',
    url: 'https://iwanttfc.com',
    region: '菲律宾',
    popular: false,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=iwanttfc.com&sz=64',
    fallbackEmoji: '📺'
  },

  // 越南平台
  {
    id: 'wetv-vietnam',
    name: 'WeTV越南',
    category: '越南',
    description: '腾讯视频越南版，提供中文内容',
    rating: 3.8,
    color: 'from-blue-500 to-blue-600',
    url: 'https://wetv.vip',
    region: '越南',
    popular: true,
    
    logoUrl: 'https://www.google.com/s2/favicons?domain=wetv.vip&sz=64',
    fallbackEmoji: '📺'
  }
];

// 从平台数据中提取所有唯一的地区作为分类
const uniqueRegions = [...new Set(platforms.map(p => p.region))];

// 分类选项（按地区）
export const categories = ['全部', ...uniqueRegions.sort((a, b) => {
  // 自定义排序：全球/中国大陆优先，其他按字母顺序
  if (a === '全球') return -1;
  if (b === '全球') return 1;
  if (a === '中国大陆') return -1;
  if (b === '中国大陆') return 1;
  return a.localeCompare(b, 'zh-CN');
})] as const;
export type CategoryType = typeof categories[number];

// 获取筛选后的平台数据
export function getFilteredPlatforms(category: CategoryType): Platform[] {
  if (category === '全部') {
    return platforms;
  }
  return platforms.filter(platform => platform.region === category);
}

// 获取热门平台
export function getPopularPlatforms(): Platform[] {
  return platforms.filter(platform => platform.popular);
}

// 根据地区获取平台
export function getPlatformsByRegion(region: string): Platform[] {
  return platforms.filter(platform => platform.region === region);
}
