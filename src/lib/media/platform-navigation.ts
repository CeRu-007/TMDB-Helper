import { Platform, PlatformCategory } from '@/features/streaming-nav/lib/types'

// 分类配置
export const platformCategories: PlatformCategory[] = [
  { id: 'all', label: '全部', count: 0 },
  { id: '国际平台', label: '国际平台', count: 0 },
  { id: '国内平台', label: '国内平台', count: 0 }
]

// 全球和亚洲主流流媒体平台导航数据
export const streamingPlatformsNav: Platform[] = [
  // 全球平台
  {
    id: 'netflix',
    name: 'Netflix',
    category: '国际平台',
    description: '全球领先的流媒体娱乐服务平台，提供丰富的原创内容和热门影视作品',
    rating: 4.5,
    color: 'from-red-500 to-red-600',
    url: 'https://www.netflix.com',
    region: '全球',
    popular: true,
    logo: 'https://cdn.worldvectorlogo.com/logos/netflix-logo-icon.svg',
    fallbackEmoji: '🎬'
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    category: '国际平台',
    description: '迪士尼官方流媒体平台，汇集迪士尼、漫威、星球大战等经典内容',
    rating: 4.4,
    color: 'from-blue-500 to-blue-600',
    url: 'https://www.disneyplus.com',
    region: '全球',
    popular: true,
    logo: 'https://cdn.worldvectorlogo.com/logos/disney-2.svg',
    fallbackEmoji: '🏰'
  },
  {
    id: 'amazon-prime',
    name: 'Amazon Prime Video',
    category: '国际平台',
    description: '亚马逊旗下流媒体服务，提供独家原创剧集和电影内容',
    rating: 4.3,
    color: 'from-blue-600 to-cyan-500',
    url: 'https://www.primevideo.com',
    region: '全球',
    popular: true,
    logo: 'https://cdn.worldvectorlogo.com/logos/amazon-prime-video-1.svg',
    fallbackEmoji: '📦'
  },
  {
    id: 'hbo-max',
    name: 'HBO Max',
    category: '国际平台',
    description: 'HBO旗下流媒体平台，以高质量原创剧集和电影著称',
    rating: 4.2,
    color: 'from-purple-600 to-purple-700',
    url: 'https://www.hbomax.com',
    region: '全球',
    popular: true,
    logo: 'https://cdn.cookielaw.org/logos/1b21e05d-c206-4e0b-970e-2d73a23e42e8/0197a675-cce2-7363-aa77-c0700565dd28/ab24c856-14e8-485a-ab26-fdc354c49b32/hbomax25_-_min_-_resized.png',
    fallbackEmoji: '🎭'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: '国际平台',
    description: '全球最大的视频分享平台，提供海量用户生成内容和原创节目',
    rating: 4.6,
    color: 'from-red-500 to-red-600',
    url: 'https://www.youtube.com',
    region: '全球',
    popular: true,
    logo: 'https://cdn.worldvectorlogo.com/logos/youtube-icon-5.svg',
    fallbackEmoji: '📺'
  },
  {
    id: 'hulu',
    name: 'Hulu',
    category: '国际平台',
    description: '美国主流流媒体服务，提供电视节目、电影和原创内容',
    rating: 4.1,
    color: 'from-green-500 to-green-600',
    url: 'https://www.hulu.com',
    region: '美国',
    popular: false,
    logo: 'https://cdn.worldvectorlogo.com/logos/hulu.svg',
    fallbackEmoji: '🟢'
  },
  {
    id: 'apple-tv',
    name: 'Apple TV+',
    category: '国际平台',
    description: '苹果公司推出的流媒体服务，专注于高质量原创内容',
    rating: 4.0,
    color: 'from-gray-800 to-gray-900',
    url: 'https://tv.apple.com',
    region: '全球',
    popular: false,
    logo: 'https://cdn.worldvectorlogo.com/logos/apple-tv-plus-logo.svg',
    fallbackEmoji: '🍎'
  },
  {
    id: 'paramount-plus',
    name: 'Paramount+',
    category: '国际平台',
    description: '派拉蒙影业旗下流媒体平台，提供经典电影和原创剧集',
    rating: 3.9,
    color: 'from-blue-600 to-blue-700',
    url: 'https://www.paramountplus.com',
    region: '全球',
    popular: false,
    logo: 'https://cdn.worldvectorlogo.com/logos/paramount-3.svg',
    fallbackEmoji: '⛰️'
  },
  {
    id: 'peacock',
    name: 'Peacock',
    category: '国际平台',
    description: 'NBC环球旗下流媒体服务，提供新闻、体育和娱乐内容',
    rating: 3.8,
    color: 'from-purple-500 to-pink-500',
    url: 'https://www.peacocktv.com',
    region: '美国',
    popular: false,
    logo: 'https://cdn.worldvectorlogo.com/logos/peacock-1.svg',
    fallbackEmoji: '🦚'
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    category: '国际平台',
    description: '全球最大的动漫流媒体平台，提供海量日本动漫内容',
    rating: 4.3,
    color: 'from-orange-500 to-orange-600',
    url: 'https://www.crunchyroll.com',
    region: '全球',
    popular: true,
    logo: 'https://cdn.worldvectorlogo.com/logos/crunchyroll-1.svg',
    fallbackEmoji: '🍜'
  },

  // 中国大陆平台
  {
    id: 'iqiyi',
    name: '爱奇艺',
    category: '国内平台',
    description: '中国领先的在线视频平台，提供丰富的影视剧集和综艺节目',
    rating: 4.2,
    color: 'from-green-500 to-green-600',
    url: 'https://www.iqiyi.com',
    region: '中国大陆',
    popular: true,
    logo: 'https://www.google.com/s2/favicons?domain=iqiyi.com&sz=64',
    fallbackEmoji: '🎯'
  },
  {
    id: 'tencent-video',
    name: '腾讯视频',
    category: '国内平台',
    description: '腾讯旗下视频平台，拥有海量正版影视资源和独播内容',
    rating: 4.1,
    color: 'from-blue-500 to-blue-600',
    url: 'https://v.qq.com',
    region: '中国大陆',
    popular: true,
    logo: 'https://www.google.com/s2/favicons?domain=v.qq.com&sz=64',
    fallbackEmoji: '🐧'
  },
  {
    id: 'youku',
    name: '优酷',
    category: '国内平台',
    description: '阿里巴巴旗下视频平台，提供电影、电视剧、综艺等多元化内容',
    rating: 4.0,
    color: 'from-blue-400 to-blue-500',
    url: 'https://www.youku.com',
    region: '中国大陆',
    popular: true,
    logo: 'https://www.google.com/s2/favicons?domain=youku.com&sz=64',
    fallbackEmoji: '📱'
  },
  {
    id: 'bilibili',
    name: 'Bilibili',
    category: '国内平台',
    description: '中国年轻人聚集的文化社区和视频平台，以ACG内容为特色',
    rating: 4.4,
    color: 'from-pink-500 to-pink-600',
    url: 'https://www.bilibili.com',
    region: '中国大陆',
    popular: true,
    logo: 'https://www.google.com/s2/favicons?domain=bilibili.com&sz=64',
    fallbackEmoji: '📺'
  },
  {
    id: 'mango-tv',
    name: '芒果TV',
    category: '国内平台',
    description: '湖南广电旗下视频平台，以综艺节目和自制内容见长',
    rating: 3.9,
    color: 'from-yellow-500 to-orange-500',
    url: 'https://www.mgtv.com',
    region: '中国大陆',
    popular: false,
    logo: 'https://www.google.com/s2/favicons?domain=mgtv.com&sz=64',
    fallbackEmoji: '🥭'
  },
  {
    id: 'migu-video',
    name: '咪咕视频',
    category: '国内平台',
    description: '中国移动旗下视频平台，提供体育赛事和影视内容',
    rating: 3.8,
    color: 'from-red-500 to-red-600',
    url: 'https://www.miguvideo.com',
    region: '中国大陆',
    popular: false,
    logo: 'https://www.google.com/s2/favicons?domain=miguvideo.com&sz=64',
    fallbackEmoji: '📱'
  },

  // 日本平台
  {
    id: 'u-next',
    name: 'U-NEXT',
    category: '国际平台',
    description: '日本最大的视频点播服务，提供电影、动漫、电视剧等内容',
    rating: 4.2,
    color: 'from-black to-gray-800',
    url: 'https://video.unext.jp',
    region: '日本',
    popular: true,
    logo: 'https://www.google.com/s2/favicons?domain=video.unext.jp&sz=64',
    fallbackEmoji: '🇯🇵'
  },
  {
    id: 'abema-tv',
    name: 'AbemaTV',
    category: '国际平台',
    description: '日本免费网络电视服务，提供直播和点播内容',
    rating: 4.0,
    color: 'from-green-500 to-green-600',
    url: 'https://abema.tv',
    region: '日本',
    popular: false,
    logo: 'https://www.google.com/s2/favicons?domain=abema.tv&sz=64',
    fallbackEmoji: '📡'
  },

  // 韩国平台
  {
    id: 'wavve',
    name: 'Wavve',
    category: '国际平台',
    description: '韩国主要广播公司联合推出的流媒体服务',
    rating: 4.0,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.wavve.com',
    region: '韩国',
    popular: true,
    logo: 'https://www.google.com/s2/favicons?domain=wavve.com&sz=64',
    fallbackEmoji: '🌊'
  },
  {
    id: 'tving',
    name: 'Tving',
    category: '国际平台',
    description: 'CJ ENM旗下流媒体平台，提供韩剧、综艺和电影',
    rating: 4.1,
    color: 'from-red-500 to-pink-500',
    url: 'https://www.tving.com',
    region: '韩国',
    popular: true,
    logo: 'https://www.google.com/s2/favicons?domain=tving.com&sz=64',
    fallbackEmoji: '🇰🇷'
  },

  // 台湾平台
  {
    id: 'line-tv',
    name: 'LINE TV',
    category: '国际平台',
    description: 'LINE旗下免费影音平台，提供台湾和亚洲热门内容',
    rating: 4.0,
    color: 'from-green-500 to-green-600',
    url: 'https://www.linetv.tw',
    region: '台湾',
    popular: true,
    logo: 'https://www.google.com/s2/favicons?domain=linetv.tw&sz=64',
    fallbackEmoji: '💚'
  },

  // 香港平台
  {
    id: 'viu',
    name: 'Viu',
    category: '国际平台',
    description: '香港电讯盈科旗下流媒体平台，覆盖亚洲多个市场',
    rating: 4.1,
    color: 'from-purple-500 to-purple-600',
    url: 'https://www.viu.com',
    region: '香港',
    popular: true,
    logo: 'https://www.google.com/s2/favicons?domain=viu.com&sz=64',
    fallbackEmoji: '🏙️'
  },

  // 新加坡平台
  {
    id: 'toggle',
    name: 'Toggle',
    category: '国际平台',
    description: '新传媒旗下免费流媒体平台，提供本地和国际内容',
    rating: 3.9,
    color: 'from-teal-500 to-teal-600',
    url: 'https://www.toggle.sg',
    region: '新加坡',
    popular: true,
    logo: 'https://www.google.com/s2/favicons?domain=toggle.sg&sz=64',
    fallbackEmoji: '🇸🇬'
  }
]