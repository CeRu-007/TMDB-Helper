import { StreamingPlatform } from '@/lib/platforms/types'

export const streamingPlatforms: StreamingPlatform[] = [
  // 国内影视平台
  {
    id: 'iqiyi',
    name: '爱奇艺',
    nameEn: 'iQIYI',
    logo: 'https://www.google.com/s2/favicons?domain=iqiyi.com&sz=32',
    url: 'https://www.iqiyi.com',
    description: '中国领先的在线视频平台，提供丰富的影视内容',
    region: 'domestic',
    category: 'comprehensive',
    features: ['原创剧集', '4K超清', 'VIP会员'],
    color: '#00be06'
  },
  {
    id: 'youku',
    name: '优酷',
    nameEn: 'Youku',
    logo: 'https://www.google.com/s2/favicons?domain=youku.com&sz=32',
    url: 'https://www.youku.com',
    description: '阿里巴巴旗下视频平台，海量优质影视内容',
    region: 'domestic',
    category: 'comprehensive',
    features: ['独播剧集', '综艺节目', '电影大片'],
    color: '#1890ff'
  },
  {
    id: 'tencent-video',
    name: '腾讯视频',
    nameEn: 'Tencent Video',
    logo: 'https://www.google.com/s2/favicons?domain=v.qq.com&sz=32',
    url: 'https://v.qq.com',
    description: '腾讯旗下视频平台，精品影视内容聚集地',
    region: 'domestic',
    category: 'comprehensive',
    features: ['腾讯独播', '热门剧集', '院线电影'],
    color: '#ff6900'
  },
  {
    id: 'mango-tv',
    name: '芒果TV',
    nameEn: 'Mango TV',
    logo: 'https://www.google.com/s2/favicons?domain=mgtv.com&sz=32',
    url: 'https://www.mgtv.com',
    description: '湖南广电旗下视频平台，综艺和影视内容丰富',
    region: 'domestic',
    category: 'comprehensive',
    features: ['综艺节目', '自制剧集', '明星资源'],
    color: '#ff8c00'
  },
  {
    id: 'bilibili',
    name: '哔哩哔哩',
    nameEn: 'Bilibili',
    logo: 'https://www.google.com/s2/favicons?domain=bilibili.com&sz=32',
    url: 'https://www.bilibili.com',
    description: '年轻人聚集的弹幕视频网站，动漫影视内容丰富',
    region: 'domestic',
    category: 'specialized',
    features: ['弹幕文化', '动漫番剧', '纪录片'],
    color: '#fb7299'
  },
  {
    id: 'migu-video',
    name: '咪咕视频',
    nameEn: 'Migu Video',
    logo: 'https://www.google.com/s2/favicons?domain=miguvideo.com&sz=32',
    url: 'https://www.miguvideo.com',
    description: '中国移动旗下视频平台，体育和影视内容并重',
    region: 'domestic',
    category: 'comprehensive',
    features: ['体育赛事', '影视剧集', '4K直播'],
    color: '#ff6b35'
  },
  {
    id: 'pptv',
    name: 'PP视频',
    nameEn: 'PPTV',
    logo: 'https://www.google.com/s2/favicons?domain=pptv.com&sz=32',
    url: 'https://www.pptv.com',
    description: '苏宁旗下视频平台，影视和体育内容丰富',
    region: 'domestic',
    category: 'comprehensive',
    features: ['影视剧集', '体育直播', '综艺节目'],
    color: '#1e88e5'
  },

  // 国外影视平台
  {
    id: 'netflix',
    name: 'Netflix',
    nameEn: 'Netflix',
    logo: 'https://cdn.worldvectorlogo.com/logos/netflix-logo-icon.svg',
    url: 'https://www.netflix.com',
    description: '全球领先的流媒体娱乐服务平台',
    region: 'international',
    category: 'comprehensive',
    features: ['原创剧集', '全球电影', '多语言字幕'],
    color: '#e50914'
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    nameEn: 'Disney Plus',
    logo: 'https://www.google.com/s2/favicons?domain=disneyplus.com&sz=32',
    url: 'https://www.disneyplus.com',
    description: '迪士尼官方流媒体平台，家庭娱乐首选',
    region: 'international',
    category: 'comprehensive',
    features: ['迪士尼经典', '漫威电影', '星球大战'],
    color: '#113ccf'
  },
  {
    id: 'amazon-prime',
    name: 'Amazon Prime Video',
    nameEn: 'Amazon Prime Video',
    logo: 'https://www.google.com/s2/favicons?domain=primevideo.com&sz=32',
    url: 'https://www.primevideo.com',
    description: '亚马逊旗下视频流媒体服务',
    region: 'international',
    category: 'comprehensive',
    features: ['Prime会员', '原创剧集', '电影租赁'],
    color: '#00a8e1'
  },
  {
    id: 'hbo-max',
    name: 'HBO Max',
    nameEn: 'HBO Max',
    logo: 'https://www.google.com/s2/favicons?domain=max.com&sz=32',
    url: 'https://www.max.com',
    description: 'HBO旗下流媒体平台，高质量影视内容',
    region: 'international',
    category: 'comprehensive',
    features: ['HBO剧集', '华纳电影', '同步首映'],
    color: '#673ab7'
  },
  {
    id: 'hulu',
    name: 'Hulu',
    nameEn: 'Hulu',
    logo: 'https://www.google.com/s2/favicons?domain=hulu.com&sz=32',
    url: 'https://www.hulu.com',
    description: '美国知名流媒体平台，电视剧和电影内容丰富',
    region: 'international',
    category: 'comprehensive',
    features: ['电视剧集', '原创内容', '直播电视'],
    color: '#1ce783'
  },
  {
    id: 'apple-tv',
    name: 'Apple TV+',
    nameEn: 'Apple TV Plus',
    logo: 'https://www.google.com/s2/favicons?domain=tv.apple.com&sz=32',
    url: 'https://tv.apple.com',
    description: '苹果公司推出的流媒体服务，原创内容精品化',
    region: 'international',
    category: 'comprehensive',
    features: ['原创剧集', '独家电影', '4K HDR'],
    color: '#000000'
  },
  {
    id: 'paramount-plus',
    name: 'Paramount+',
    nameEn: 'Paramount Plus',
    logo: 'https://www.google.com/s2/favicons?domain=paramountplus.com&sz=32',
    url: 'https://www.paramountplus.com',
    description: '派拉蒙旗下流媒体平台，经典影视内容丰富',
    region: 'international',
    category: 'comprehensive',
    features: ['经典电影', 'CBS剧集', '体育直播'],
    color: '#0066cc'
  },
  {
    id: 'peacock',
    name: 'Peacock',
    nameEn: 'Peacock',
    logo: 'https://www.google.com/s2/favicons?domain=peacocktv.com&sz=32',
    url: 'https://www.peacocktv.com',
    description: 'NBC环球旗下流媒体平台',
    region: 'international',
    category: 'comprehensive',
    features: ['NBC内容', '原创剧集', '免费观看'],
    color: '#673ab7'
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    nameEn: 'Crunchyroll',
    logo: 'https://www.google.com/s2/favicons?domain=crunchyroll.com&sz=32',
    url: 'https://www.crunchyroll.com',
    description: '全球最大的动漫流媒体平台',
    region: 'international',
    category: 'specialized',
    features: ['日本动漫', '同步更新', '多语言字幕'],
    color: '#f47521'
  }
]

export const platformCategories = [
  { id: 'all', label: '全部平台', count: streamingPlatforms.length },
  { id: 'domestic', label: '国内平台', count: streamingPlatforms.filter(p => p.region === 'domestic').length },
  { id: 'international', label: '国外平台', count: streamingPlatforms.filter(p => p.region === 'international').length }
]